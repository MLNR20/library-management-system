using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Filters;
using LibraryManagementSystem.Server.Hubs;
using LibraryManagementSystem.Server.Repositories;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Services.Exports;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    // Add services to the container.

    builder.Services.AddControllers(options => options.Filters.Add<ValidationFilter>());
    builder.Services.AddProblemDetails();
    builder.Services.AddExceptionHandler<UniqueConstraintExceptionHandler>();
    builder.Services.AddExceptionHandler<IdentityExceptionHandler>();
    builder.Services.AddHttpContextAccessor();
    // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
    builder.Services.AddOpenApi();

    // Entity Framework Core + Identity
    builder.Services.AddSingleton<AuditSaveChangesInterceptor>();
    builder.Services.AddDbContext<ApplicationDbContext>((services, options) =>
        options
            .UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found."))
            .AddInterceptors(services.GetRequiredService<AuditSaveChangesInterceptor>()));

    builder.Services
        .AddIdentityCore<ApplicationUser>(options =>
        {
            options.User.RequireUniqueEmail = true;
            options.Password.RequiredLength = 8;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        })
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

    // JWT authentication
    builder.Services.AddOptions<JwtSettings>()
        .BindConfiguration(JwtSettings.SectionName)
        .ValidateDataAnnotations()
        .ValidateOnStart();

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer();

    builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
        .Configure<IOptions<JwtSettings>>((options, jwt) =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwt.Value.Issuer,
                ValidateAudience = true,
                ValidAudience = jwt.Value.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Value.SigningKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            };

            // Browsers cannot set an Authorization header on a WebSocket, so SignalR sends the token as ?access_token=.
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var token = context.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments(BorrowingHub.Path))
                    {
                        context.Token = token;
                    }

                    return Task.CompletedTask;
                }
            };
        });

    builder.Services.AddSingleton<ITokenService, TokenService>();

    // Generic repository + unit of work (both share the request-scoped DbContext).
    builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
    builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

    // Domain services: each one runs its CRUD through the unit of work.
    builder.Services.AddScoped<IBookService, BookService>();
    // Book export: the factory is handed every registered exporter and picks one by format.
    builder.Services.AddSingleton<IBookExporter, CsvBookExporter>();
    builder.Services.AddSingleton<IBookExporter, PdfBookExporter>();
    builder.Services.AddSingleton<IBookExporterFactory, BookExporterFactory>();
    builder.Services.AddScoped<IGenreService, GenreService>();
    builder.Services.AddScoped<IAuthorService, AuthorService>();
    builder.Services.AddScoped<ILanguageService, LanguageService>();
    builder.Services.AddScoped<IFloorService, FloorService>();
    builder.Services.AddScoped<IShelfService, ShelfService>();
    builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
    builder.Services.AddScoped<IContactService, ContactService>();
    builder.Services.AddScoped<IRowService, RowService>();
    builder.Services.AddScoped<ISectionService, SectionService>();
    builder.Services.AddScoped<IRoleService, RoleService>();
    builder.Services.AddScoped<IUserRoleService, UserRoleService>();
    builder.Services.AddScoped<IAuditService, AuditService>();
    builder.Services.AddScoped<IClockService, ClockService>();

    // Borrowing: loans, plus a SignalR hub and a background monitor that push overdue penalties in real time.
    builder.Services.AddOptions<BorrowingSettings>()
        .BindConfiguration(BorrowingSettings.SectionName)
        .ValidateDataAnnotations()
        .ValidateOnStart();
    builder.Services.AddSignalR();
    builder.Services.AddScoped<IBorrowingService, BorrowingService>();
    builder.Services.AddSingleton<IBorrowingNotifier, SignalRBorrowingNotifier>();
    builder.Services.AddHostedService<OverdueBorrowingMonitor>();

    builder.Services.AddAuthorization();

    // Rate limiting: a global per-client cap, plus a stricter "auth" policy for login/register endpoints.
    builder.Services.AddRateLimiter(options =>
    {
        static string ClientKey(HttpContext context) =>
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

        options.AddPolicy(RateLimitPolicies.Auth, context =>
            RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    });

    // FluentValidation: registers every public AbstractValidator<T> in this assembly.
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    var app = builder.Build();

    // Needs the latest migration applied (dotnet ef database update).
    await IdentitySeeder.SeedAsync(app.Services, app.Configuration);

    app.UseExceptionHandler();

    app.UseSerilogRequestLogging();

    app.UseDefaultFiles();
    app.MapStaticAssets();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseHttpsRedirection();

    app.UseRateLimiter();

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<BorrowingHub>(BorrowingHub.Path);

    app.MapFallbackToFile("/index.html");

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
