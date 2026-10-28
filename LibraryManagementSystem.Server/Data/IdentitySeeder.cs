using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Identity;

namespace LibraryManagementSystem.Server.Data
{
    public static class IdentitySeeder
    {
        // Idempotent; runs at every startup. Needs the database to be migrated already.
        // Seed:AdministratorUserName (set it in user-secrets or appsettings.Development.json) names an existing user to
        // promote, which is how the very first administrator is created - nobody can grant the role before that.
        public static async Task SeedAsync(IServiceProvider services, IConfiguration configuration)
        {
            using var scope = services.CreateScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var audit = scope.ServiceProvider.GetRequiredService<IAuditService>();
            var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(IdentitySeeder));

            if (!await roleManager.RoleExistsAsync(AppRoles.Administrator))
            {
                IdentityException.ThrowIfFailed(await roleManager.CreateAsync(new IdentityRole(AppRoles.Administrator)));
                logger.LogInformation("Created the {Role} role", AppRoles.Administrator);
            }

            var userName = configuration["Seed:AdministratorUserName"];
            if (string.IsNullOrWhiteSpace(userName))
            {
                return;
            }

            var user = await userManager.FindByNameAsync(userName);
            if (user is null)
            {
                logger.LogWarning("Seed:AdministratorUserName '{UserName}' does not exist yet; register it and restart", userName);
                return;
            }

            if (!await userManager.IsInRoleAsync(user, AppRoles.Administrator))
            {
                IdentityException.ThrowIfFailed(await userManager.AddToRoleAsync(user, AppRoles.Administrator));
                logger.LogInformation("Made {UserName} an administrator", userName);
                await audit.WriteAsync(
                    AuditActions.RoleAssigned,
                    target: $"{user.UserName}: {AppRoles.Administrator}",
                    details: "Bootstrap administrator from configuration",
                    userId: user.Id,
                    userName: "system");
            }
        }
    }
}
