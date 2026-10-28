using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LibraryManagementSystem.Server.Controllers
{
    // Request bodies are validated by ValidationFilter before these actions run.
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public class AuthController(
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        ILogger<AuthController> logger) : ControllerBase
    {
        [AllowAnonymous]
        [HttpPost("register")]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var user = AuthMapper.ToUser(request);
            var result = await userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(error.Code, error.Description);
                }

                return ValidationProblem(ModelState);
            }

            logger.LogInformation("Registered user {UserId}", user.Id);

            return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(user));
        }

        [AllowAnonymous]
        [HttpPost("login")]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var user = await userManager.FindByNameAsync(request.UserName);
            if (user is null)
            {
                return InvalidCredentials();
            }

            // Locked-out and wrong-password responses are identical so callers cannot probe for accounts.
            if (await userManager.IsLockedOutAsync(user))
            {
                logger.LogWarning("Login rejected for locked-out user {UserId}", user.Id);
                return InvalidCredentials();
            }

            if (!await userManager.CheckPasswordAsync(user, request.Password))
            {
                await userManager.AccessFailedAsync(user);
                return InvalidCredentials();
            }

            await userManager.ResetAccessFailedCountAsync(user);

            return Ok(await BuildResponseAsync(user));
        }

        // Not subject to the strict "auth" policy (that is for credential guessing); the global limit still applies.
        [Authorize]
        [DisableRateLimiting]
        [HttpGet("me")]
        [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Me()
        {
            var user = await userManager.GetUserAsync(User);
            if (user is null)
            {
                return Unauthorized();
            }

            var roles = await userManager.GetRolesAsync(user);

            return Ok(new CurrentUserResponse(AuthMapper.ToDto(user), roles));
        }

        private async Task<AuthResponse> BuildResponseAsync(ApplicationUser user)
        {
            var roles = await userManager.GetRolesAsync(user);
            var token = tokenService.CreateAccessToken(user, roles);

            return new AuthResponse(token.Token, token.ExpiresAtUtc, AuthMapper.ToDto(user), roles);
        }

        private ObjectResult InvalidCredentials() =>
            Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid user name or password.");
    }
}
