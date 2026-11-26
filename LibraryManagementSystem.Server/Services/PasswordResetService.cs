using System.Buffers.Text;
using System.Text;
using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Services.Email;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace LibraryManagementSystem.Server.Services
{
    public enum PasswordResetRequestOutcome
    {
        LinkSent,

        // A social sign-in account has no password to reset; it was emailed how to sign in instead.
        NoPassword,

        UnknownEmail,

        // The account was emailed moments ago.
        TooSoon,

        // PasswordReset:ClientUrl is missing, so there is no address to link to.
        NotConfigured
    }

    public record PasswordResetRequestResult(PasswordResetRequestOutcome Outcome, ApplicationUser? User = null);

    // User is set whenever the link named a real account, also when the reset failed.
    public record PasswordResetResult(IdentityResult Identity, ApplicationUser? User = null);

    public interface IPasswordResetService
    {
        // Emails a reset link when the address belongs to a password account. Callers must not tell the requester the outcome.
        Task<PasswordResetRequestResult> RequestAsync(string email);

        // Sets the new password if the link is still good, then signs the account out everywhere.
        Task<PasswordResetResult> ResetAsync(string userId, string token, string newPassword, CancellationToken cancellationToken = default);
    }

    public class PasswordResetService(
        UserManager<ApplicationUser> users,
        ISessionService sessions,
        IEmailQueue emails,
        IMemoryCache cache,
        IOptions<PasswordResetSettings> options,
        ILogger<PasswordResetService> logger) : IPasswordResetService
    {
        public async Task<PasswordResetRequestResult> RequestAsync(string email)
        {
            var settings = options.Value;
            if (string.IsNullOrWhiteSpace(settings.ClientUrl))
            {
                logger.LogError("PasswordReset:ClientUrl is empty, so no reset email can be sent");
                return new PasswordResetRequestResult(PasswordResetRequestOutcome.NotConfigured);
            }

            var user = await users.FindByEmailAsync(email.Trim());
            if (user?.Email is null)
            {
                return new PasswordResetRequestResult(PasswordResetRequestOutcome.UnknownEmail);
            }

            var cooldownKey = $"password-reset:{user.Id}";
            if (cache.TryGetValue(cooldownKey, out _))
            {
                return new PasswordResetRequestResult(PasswordResetRequestOutcome.TooSoon, user);
            }

            if (settings.ResendCooldownSeconds > 0)
            {
                cache.Set(cooldownKey, true, TimeSpan.FromSeconds(settings.ResendCooldownSeconds));
            }

            if (!await users.HasPasswordAsync(user))
            {
                emails.Enqueue(PasswordResetEmails.SocialAccount(user, settings.ClientUrl));
                return new PasswordResetRequestResult(PasswordResetRequestOutcome.NoPassword, user);
            }

            var token = await users.GeneratePasswordResetTokenAsync(user);
            var link = PasswordResetLinks.Build(settings.ClientUrl, user.Id, token);
            emails.Enqueue(PasswordResetEmails.ResetLink(user, link, settings.TokenLifetimeMinutes));

            return new PasswordResetRequestResult(PasswordResetRequestOutcome.LinkSent, user);
        }

        public async Task<PasswordResetResult> ResetAsync(string userId, string token, string newPassword, CancellationToken cancellationToken = default)
        {
            // A missing account answers like a bad token, so the response does not say which user ids exist.
            var invalidToken = IdentityResult.Failed(users.ErrorDescriber.InvalidToken());

            var user = await users.FindByIdAsync(userId);
            if (user is null)
            {
                return new PasswordResetResult(invalidToken);
            }

            if (!PasswordResetLinks.TryDecodeToken(token, out var identityToken))
            {
                return new PasswordResetResult(invalidToken, user);
            }

            // Checks the token first, then the password rules. Success changes the security stamp, so the link works once.
            var result = await users.ResetPasswordAsync(user, identityToken, newPassword);
            if (!result.Succeeded)
            {
                return new PasswordResetResult(result, user);
            }

            await ClearFailedSignInLockoutAsync(user);
            await sessions.RevokeAllAsync(user.Id, "Password reset", cancellationToken);

            return new PasswordResetResult(result, user);
        }

        // Someone who forgot their password has often locked themselves out guessing it. Only that short lockout is lifted:
        // one that runs longer was set on purpose and stays.
        private async Task ClearFailedSignInLockoutAsync(ApplicationUser user)
        {
            var longestAutomatic = DateTimeOffset.UtcNow + users.Options.Lockout.DefaultLockoutTimeSpan;
            if (user.LockoutEnd is { } end && end > longestAutomatic)
            {
                return;
            }

            IdentityException.ThrowIfFailed(await users.SetLockoutEndDateAsync(user, null));
            IdentityException.ThrowIfFailed(await users.ResetAccessFailedCountAsync(user));
        }
    }

    public static class PasswordResetLinks
    {
        // The values ride in the fragment (after #), which browsers never send to a server, so the token stays out of
        // request logs and referrer headers. The client reads them in ResetPasswordPage.
        public static string Build(string clientUrl, string userId, string token)
        {
            var encoded = Base64Url.EncodeToString(Encoding.UTF8.GetBytes(token));

            return $"{clientUrl.TrimEnd('/')}/reset-password#user={Uri.EscapeDataString(userId)}&token={encoded}";
        }

        // Undoes the encoding Build applied to the token; false for anything that is not valid Base64Url.
        public static bool TryDecodeToken(string encoded, out string token)
        {
            if (!Base64Url.IsValid(encoded))
            {
                token = string.Empty;
                return false;
            }

            token = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(encoded));
            return true;
        }
    }

    public static class PasswordResetEmails
    {
        public static EmailMessage ResetLink(ApplicationUser user, string link, int lifetimeMinutes) => new(
            user.Email!,
            "Reset your library password",
            $"""
            {Greeting(user)}

            Someone asked to reset the password for your library account (user name: {user.UserName}).
            Open this link to choose a new password:

            {link}

            The link works once and expires in {lifetimeMinutes} minutes.
            If you did not ask for this, ignore this email. Your password has not changed.
            """);

        public static EmailMessage SocialAccount(ApplicationUser user, string clientUrl) => new(
            user.Email!,
            "How to sign in to your library account",
            $"""
            {Greeting(user)}

            Someone asked to reset the password for your library account, but this account has no password: it signs in with Google.
            Choose "Continue with Google" here:

            {clientUrl.TrimEnd('/')}/login

            If you did not ask for this, ignore this email.
            """);

        private static string Greeting(ApplicationUser user) =>
            string.IsNullOrWhiteSpace(user.FirstName) ? "Hello," : $"Hello {user.FirstName},";
    }
}
