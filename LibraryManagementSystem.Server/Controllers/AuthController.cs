using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
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
        ISessionService sessions,
        IAuditService audit,
        ILogger<AuthController> logger) : ControllerBase
    {
        [AllowAnonymous]
        [HttpPost("register")]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
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
            await audit.WriteAsync(AuditActions.Register, target: user.UserName, userId: user.Id, userName: user.UserName, cancellationToken: cancellationToken);

            return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(user, cancellationToken));
        }

        [AllowAnonymous]
        [HttpPost("login")]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
        {
            var user = await userManager.FindByNameAsync(request.UserName);
            if (user is null)
            {
                await audit.WriteAsync(AuditActions.LoginFailed, success: false, target: request.UserName, details: "Unknown user", userName: request.UserName, cancellationToken: cancellationToken);
                return InvalidCredentials();
            }

            // Locked-out and wrong-password responses are identical so callers cannot probe for accounts;
            // the audit log is admin-only, so it can say which one it was.
            if (await userManager.IsLockedOutAsync(user))
            {
                logger.LogWarning("Login rejected for locked-out user {UserId}", user.Id);
                await audit.WriteAsync(AuditActions.LoginFailed, success: false, target: user.UserName, details: "Account is locked out", userId: user.Id, userName: user.UserName, cancellationToken: cancellationToken);
                return InvalidCredentials();
            }

            if (!await userManager.CheckPasswordAsync(user, request.Password))
            {
                await userManager.AccessFailedAsync(user);
                await audit.WriteAsync(AuditActions.LoginFailed, success: false, target: user.UserName, details: "Wrong password", userId: user.Id, userName: user.UserName, cancellationToken: cancellationToken);
                return InvalidCredentials();
            }

            await userManager.ResetAccessFailedCountAsync(user);
            await audit.WriteAsync(AuditActions.Login, target: user.UserName, userId: user.Id, userName: user.UserName, cancellationToken: cancellationToken);

            return Ok(await BuildResponseAsync(user, cancellationToken));
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

        // Ends the session the refresh token belongs to, so neither it nor that session's access token works again.
        // Open to callers whose access token has already expired: the refresh token is the proof. Always 204, so the
        // response says nothing about whether the token was real.
        [AllowAnonymous]
        [DisableRateLimiting]
        [HttpPost("logout")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken cancellationToken)
        {
            var ended = await sessions.RevokeByRefreshTokenAsync(request.RefreshToken, "Signed out", cancellationToken);
            if (ended is not null)
            {
                var user = await userManager.FindByIdAsync(ended.UserId);
                await audit.WriteAsync(AuditActions.Logout, target: user?.UserName, userId: ended.UserId, userName: user?.UserName, cancellationToken: cancellationToken);
            }

            return NoContent();
        }

        // Trades a refresh token for a new access token and a new refresh token (the old one stops working).
        // Showing an old, replaced token again revokes the whole session.
        [AllowAnonymous]
        [HttpPost("refresh")]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Refresh(RefreshRequest request, CancellationToken cancellationToken)
        {
            var result = await sessions.RefreshAsync(request.RefreshToken, cancellationToken);

            if (result.Outcome == RefreshOutcome.Reused && result.Session is { } reused)
            {
                logger.LogWarning("Refresh token reuse on session {SessionId}; the session was revoked", reused.Id);
                await audit.WriteAsync(AuditActions.TokenRefreshReused, success: false, target: reused.UserId, details: $"Session {reused.Id} revoked", userId: reused.UserId, cancellationToken: cancellationToken);
            }

            if (result is not { Outcome: RefreshOutcome.Rotated, Session: { } session, RefreshToken: { } refreshToken })
            {
                return SessionEnded();
            }

            var user = await userManager.FindByIdAsync(session.UserId);
            if (user is null || !user.IsActive || await userManager.IsLockedOutAsync(user))
            {
                await sessions.RevokeAsync(session.Id, session.UserId, "Account unavailable", cancellationToken);

                return SessionEnded();
            }

            return Ok(await ToResponseAsync(user, session.Id, refreshToken));
        }

        // A new sign-in: opens a session for this device and returns its first tokens.
        private async Task<AuthResponse> BuildResponseAsync(ApplicationUser user, CancellationToken cancellationToken)
        {
            var issued = await sessions.StartAsync(
                user.Id, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString(), cancellationToken);

            return await ToResponseAsync(user, issued.Session.Id, issued.RefreshToken);
        }

        private async Task<AuthResponse> ToResponseAsync(ApplicationUser user, Guid sessionId, string refreshToken)
        {
            var roles = await userManager.GetRolesAsync(user);
            var token = tokenService.CreateAccessToken(user, roles, sessionId);

            return new AuthResponse(token.Token, token.ExpiresAtUtc, refreshToken, AuthMapper.ToDto(user), roles);
        }

        private ObjectResult SessionEnded() =>
            Problem(statusCode: StatusCodes.Status401Unauthorized, title: "The session has ended. Sign in again.");

        private ObjectResult InvalidCredentials() =>
            Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid user name or password.");
    }
}
