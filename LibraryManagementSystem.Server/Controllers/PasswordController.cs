using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LibraryManagementSystem.Server.Controllers
{
    // "Forgot password": ask for a link by email, then use the link to choose a new password.
    [ApiController]
    [AllowAnonymous]
    [Route("api/auth")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public class PasswordController(IPasswordResetService passwordReset, IAuditService audit) : ControllerBase
    {
        // Always 202 with no body, whether or not the address has an account, so callers cannot probe for accounts.
        // The audit log is admin-only, so it can say what happened.
        [HttpPost("forgot-password")]
        [ProducesResponseType(StatusCodes.Status202Accepted)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Forgot(ForgotPasswordRequest request)
        {
            var result = await passwordReset.RequestAsync(request.Email);

            await audit.WriteAsync(
                AuditActions.PasswordResetRequested,
                success: result.Outcome is PasswordResetRequestOutcome.LinkSent or PasswordResetRequestOutcome.NoPassword,
                target: result.User?.UserName ?? request.Email,
                details: result.Outcome switch
                {
                    PasswordResetRequestOutcome.LinkSent => "Reset link emailed",
                    PasswordResetRequestOutcome.NoPassword => "Social sign-in account: emailed how to sign in",
                    PasswordResetRequestOutcome.UnknownEmail => "Unknown email",
                    PasswordResetRequestOutcome.TooSoon => "Asked again too soon; nothing sent",
                    _ => "Password reset is not set up"
                },
                userId: result.User?.Id,
                userName: result.User?.UserName);

            return Accepted();
        }

        [HttpPost("reset-password")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Reset(ResetPasswordRequest request, CancellationToken cancellationToken)
        {
            var result = await passwordReset.ResetAsync(request.UserId, request.Token, request.Password, cancellationToken);

            if (!result.Identity.Succeeded)
            {
                var badLink = result.Identity.Errors.Any(error => error.Code == "InvalidToken");
                await audit.WriteAsync(
                    AuditActions.PasswordReset,
                    success: false,
                    target: result.User?.UserName,
                    details: badLink ? "Invalid or expired link" : "The new password was rejected",
                    userId: result.User?.Id,
                    userName: result.User?.UserName,
                    cancellationToken: cancellationToken);

                foreach (var error in result.Identity.Errors)
                {
                    ModelState.AddModelError(
                        error.Code,
                        error.Code == "InvalidToken" ? "This reset link is invalid or has expired. Ask for a new one." : error.Description);
                }

                return ValidationProblem(ModelState);
            }

            await audit.WriteAsync(
                AuditActions.PasswordReset,
                target: result.User!.UserName,
                userId: result.User.Id,
                userName: result.User.UserName,
                cancellationToken: cancellationToken);

            return NoContent();
        }
    }
}
