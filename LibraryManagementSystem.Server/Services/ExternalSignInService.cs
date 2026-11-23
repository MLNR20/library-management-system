using System.Text;
using LibraryManagementSystem.Server.Data;
using Microsoft.AspNetCore.Identity;

namespace LibraryManagementSystem.Server.Services
{
    public enum ExternalSignInFailure
    {
        // The provider did not share an email address, and this app needs one per account.
        NoEmail,

        // A password account already uses this email. It is never linked automatically: nobody has proven they own that
        // address (there is no email confirmation), so linking would let whoever registered it first keep access.
        EmailInUse
    }

    public record ExternalSignInResult(ApplicationUser? User, bool Created, ExternalSignInFailure? Failure = null);

    public interface IExternalSignInService
    {
        // Finds the user this provider login belongs to, or creates one. The account has no password and no role,
        // exactly like a fresh registration: an administrator grants the role.
        Task<ExternalSignInResult> FindOrCreateAsync(ExternalIdentity identity, CancellationToken cancellationToken = default);
    }

    public class ExternalSignInService(UserManager<ApplicationUser> users, ILogger<ExternalSignInService> logger) : IExternalSignInService
    {
        public async Task<ExternalSignInResult> FindOrCreateAsync(ExternalIdentity identity, CancellationToken cancellationToken = default)
        {
            var existing = await users.FindByLoginAsync(identity.Provider, identity.ProviderKey);
            if (existing is not null)
            {
                return new ExternalSignInResult(existing, Created: false);
            }

            if (string.IsNullOrWhiteSpace(identity.Email))
            {
                return new ExternalSignInResult(null, Created: false, ExternalSignInFailure.NoEmail);
            }

            var byEmail = await users.FindByEmailAsync(identity.Email);
            if (byEmail is not null)
            {
                // Only an account that was itself made by a verified social sign-in has a proven email, so only that one
                // may gain another provider.
                if (identity.EmailVerified && byEmail.EmailConfirmed)
                {
                    IdentityException.ThrowIfFailed(await users.AddLoginAsync(byEmail, ToLoginInfo(identity)));
                    logger.LogInformation("Linked {Provider} to user {UserId}", identity.Provider, byEmail.Id);

                    return new ExternalSignInResult(byEmail, Created: false);
                }

                return new ExternalSignInResult(null, Created: false, ExternalSignInFailure.EmailInUse);
            }

            var (firstName, lastName) = SplitName(identity.Name);
            var user = new ApplicationUser
            {
                UserName = await UserNames.UniqueAsync(UserNames.Suggest(identity.Email), async name => await users.FindByNameAsync(name) is not null),
                Email = identity.Email,
                // Only a verified address counts as confirmed; this is what lets a later provider link to the account.
                EmailConfirmed = identity.EmailVerified,
                FirstName = firstName,
                LastName = lastName
            };

            IdentityException.ThrowIfFailed(await users.CreateAsync(user));
            IdentityException.ThrowIfFailed(await users.AddLoginAsync(user, ToLoginInfo(identity)));
            logger.LogInformation("Created user {UserId} from {Provider}", user.Id, identity.Provider);

            return new ExternalSignInResult(user, Created: true);
        }

        private static UserLoginInfo ToLoginInfo(ExternalIdentity identity) =>
            new(identity.Provider, identity.ProviderKey, identity.Provider);

        // "Ada Lovelace King" becomes ("Ada", "Lovelace King"); both are capped at the lengths the register form allows.
        public static (string First, string Last) SplitName(string? name)
        {
            var parts = (name ?? string.Empty).Split(' ', 2, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var first = parts.Length > 0 ? parts[0] : string.Empty;
            var last = parts.Length > 1 ? parts[1] : string.Empty;

            return (Truncate(first, 50), Truncate(last, 50));
        }

        private static string Truncate(string value, int length) => value.Length <= length ? value : value[..length];
    }

    // User names are what people sign in with, so a generated one follows the same rules as a registered one.
    public static class UserNames
    {
        private const int MaxLength = 50;
        private const int MinLength = 3;

        // The part of the email before the @, reduced to the characters Identity allows.
        public static string Suggest(string email)
        {
            var local = email.Split('@')[0];
            var builder = new StringBuilder();
            foreach (var c in local.ToLowerInvariant())
            {
                var allowed = c is (>= 'a' and <= 'z') or (>= '0' and <= '9') or '.' or '_' or '-' or '+';
                builder.Append(allowed ? c : '.');
            }

            var name = builder.ToString().Trim('.');
            if (name.Length < MinLength)
            {
                name = name.Length == 0 ? "reader" : name + "reader";
            }

            // Leave room for a number on the end.
            return name.Length > MaxLength - 6 ? name[..(MaxLength - 6)] : name;
        }

        // The suggestion if it is free, otherwise it with 2, 3, ... on the end, and finally a random tail.
        public static async Task<string> UniqueAsync(string suggestion, Func<string, Task<bool>> isTaken)
        {
            if (!await isTaken(suggestion))
            {
                return suggestion;
            }

            for (var number = 2; number <= 20; number++)
            {
                var candidate = suggestion + number;
                if (!await isTaken(candidate))
                {
                    return candidate;
                }
            }

            return suggestion + Guid.NewGuid().ToString("N")[..5];
        }
    }
}
