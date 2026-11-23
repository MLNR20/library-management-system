using System.Text.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace LibraryManagementSystem.Server.Services
{
    // Who a verified token says the person is. Provider is "google.com";
    // ProviderKey is that provider's own id for the person, so the link survives a change of Firebase project.
    public record ExternalIdentity(string Provider, string ProviderKey, string? Email, bool EmailVerified, string? Name);

    public interface IFirebaseTokenValidator
    {
        bool IsConfigured { get; }

        // Null when the token is not a valid, current Firebase token for this project from an allowed provider.
        Task<ExternalIdentity?> ValidateAsync(string idToken, CancellationToken cancellationToken = default);
    }

    public class FirebaseTokenValidator : IFirebaseTokenValidator
    {
        // Google only. Email-and-password or anonymous Firebase users are not accepted either: this app has its own
        // passwords. A provider switched on in the Firebase console is still refused here until it is added to this list.
        private static readonly HashSet<string> AllowedProviders = ["google.com"];

        private readonly string _projectId;
        private readonly IConfigurationManager<OpenIdConnectConfiguration>? _configuration;
        private readonly JsonWebTokenHandler _handler = new();

        // The configuration manager fetches and caches Google's signing keys; tests pass their own.
        public FirebaseTokenValidator(string projectId, IConfigurationManager<OpenIdConnectConfiguration>? configuration = null)
        {
            _projectId = projectId.Trim();
            if (_projectId.Length == 0)
            {
                return;
            }

            _configuration = configuration ?? new ConfigurationManager<OpenIdConnectConfiguration>(
                $"https://securetoken.google.com/{_projectId}/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever());
        }

        public bool IsConfigured => _configuration is not null;

        public async Task<ExternalIdentity?> ValidateAsync(string idToken, CancellationToken cancellationToken = default)
        {
            if (_configuration is null)
            {
                return null;
            }

            var configuration = await _configuration.GetConfigurationAsync(cancellationToken);

            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = $"https://securetoken.google.com/{_projectId}",
                ValidateAudience = true,
                ValidAudience = _projectId,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = configuration.SigningKeys,
                ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            };

            var result = await _handler.ValidateTokenAsync(idToken, parameters);
            if (!result.IsValid || result.SecurityToken is not JsonWebToken token)
            {
                return null;
            }

            using var payload = JsonDocument.Parse(Base64UrlEncoder.DecodeBytes(token.EncodedPayload));
            var root = payload.RootElement;

            var subject = GetString(root, "sub");
            if (string.IsNullOrEmpty(subject) || !root.TryGetProperty("firebase", out var firebase) || firebase.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            var provider = GetString(firebase, "sign_in_provider");
            if (provider is null || !AllowedProviders.Contains(provider))
            {
                return null;
            }

            return new ExternalIdentity(
                provider,
                ProviderKey: ProviderIdOf(firebase, provider) ?? subject,
                Email: GetString(root, "email"),
                EmailVerified: root.TryGetProperty("email_verified", out var verified) && verified.ValueKind == JsonValueKind.True,
                Name: GetString(root, "name"));
        }

        // "identities": { "google.com": ["1234567890"], "email": ["a@b.c"] }
        private static string? ProviderIdOf(JsonElement firebase, string provider)
        {
            if (firebase.TryGetProperty("identities", out var identities)
                && identities.ValueKind == JsonValueKind.Object
                && identities.TryGetProperty(provider, out var ids)
                && ids.ValueKind == JsonValueKind.Array
                && ids.GetArrayLength() > 0
                && ids[0].ValueKind == JsonValueKind.String)
            {
                var id = ids[0].GetString();
                return string.IsNullOrEmpty(id) ? null : id;
            }

            return null;
        }

        private static string? GetString(JsonElement element, string name) =>
            element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    }
}
