using System.Security.Cryptography;
using LibraryManagementSystem.Server.Services;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace LibraryManagementSystem.Server.Tests.Services
{
    public class FirebaseTokenValidatorTests : IDisposable
    {
        private const string ProjectId = "test-project";

        private readonly RSA _rsa = RSA.Create(2048);
        private readonly RsaSecurityKey _key;
        private readonly FirebaseTokenValidator _validator;

        public FirebaseTokenValidatorTests()
        {
            _key = new RsaSecurityKey(_rsa) { KeyId = "k1" };
            _validator = new FirebaseTokenValidator(ProjectId, ConfigurationWith(_key));
        }

        public void Dispose() => _rsa.Dispose();

        private static StaticConfigurationManager<OpenIdConnectConfiguration> ConfigurationWith(SecurityKey key)
        {
            var configuration = new OpenIdConnectConfiguration();
            configuration.SigningKeys.Add(key);
            return new StaticConfigurationManager<OpenIdConnectConfiguration>(configuration);
        }

        private string Token(
            string provider = "google.com",
            string audience = ProjectId,
            string? issuer = null,
            DateTime? expires = null,
            SecurityKey? key = null,
            string? email = "ada@example.com",
            bool emailVerified = true,
            string? providerId = "g-123")
        {
            var claims = new Dictionary<string, object>
            {
                ["sub"] = "firebase-uid",
                ["email_verified"] = emailVerified,
                ["name"] = "Ada Lovelace",
                ["firebase"] = new Dictionary<string, object>
                {
                    ["sign_in_provider"] = provider,
                    ["identities"] = providerId is null
                        ? new Dictionary<string, object>()
                        : new Dictionary<string, object> { [provider] = new[] { providerId } }
                }
            };
            if (email is not null)
            {
                claims["email"] = email;
            }

            var now = DateTime.UtcNow;
            var descriptor = new SecurityTokenDescriptor
            {
                Issuer = issuer ?? $"https://securetoken.google.com/{ProjectId}",
                Audience = audience,
                NotBefore = now.AddMinutes(-10),
                IssuedAt = now.AddMinutes(-10),
                Expires = expires ?? now.AddMinutes(30),
                Claims = claims,
                SigningCredentials = new SigningCredentials(key ?? _key, SecurityAlgorithms.RsaSha256)
            };

            return new JsonWebTokenHandler().CreateToken(descriptor);
        }

        [Fact]
        public async Task A_valid_token_gives_the_providers_own_id_and_the_profile()
        {
            var identity = await _validator.ValidateAsync(Token());

            Assert.NotNull(identity);
            Assert.Equal("google.com", identity.Provider);
            Assert.Equal("g-123", identity.ProviderKey);
            Assert.Equal("ada@example.com", identity.Email);
            Assert.True(identity.EmailVerified);
            Assert.Equal("Ada Lovelace", identity.Name);
        }

        [Theory]
        [InlineData("password")]
        [InlineData("anonymous")]
        [InlineData("github.com")]
        [InlineData("facebook.com")]
        [InlineData("apple.com")]
        public async Task Other_sign_in_methods_are_refused(string provider)
        {
            Assert.Null(await _validator.ValidateAsync(Token(provider: provider)));
        }

        [Fact]
        public async Task The_provider_id_falls_back_to_the_firebase_uid()
        {
            var identity = await _validator.ValidateAsync(Token(providerId: null));

            Assert.Equal("firebase-uid", identity?.ProviderKey);
        }

        [Fact]
        public async Task An_unverified_email_is_reported_as_unverified()
        {
            var identity = await _validator.ValidateAsync(Token(emailVerified: false));

            Assert.False(identity?.EmailVerified);
        }

        [Fact]
        public async Task A_token_without_an_email_still_validates_with_a_null_email()
        {
            var identity = await _validator.ValidateAsync(Token(email: null));

            Assert.NotNull(identity);
            Assert.Null(identity.Email);
        }

        [Fact]
        public async Task A_token_for_another_project_is_refused()
        {
            Assert.Null(await _validator.ValidateAsync(Token(audience: "someone-else")));
            Assert.Null(await _validator.ValidateAsync(Token(issuer: "https://securetoken.google.com/someone-else")));
        }

        [Fact]
        public async Task An_expired_token_is_refused()
        {
            Assert.Null(await _validator.ValidateAsync(Token(expires: DateTime.UtcNow.AddMinutes(-5))));
        }

        [Fact]
        public async Task A_token_signed_with_a_different_key_is_refused()
        {
            using var other = RSA.Create(2048);

            Assert.Null(await _validator.ValidateAsync(Token(key: new RsaSecurityKey(other) { KeyId = "k1" })));
        }

        [Theory]
        [InlineData("")]
        [InlineData("not-a-token")]
        [InlineData("a.b.c")]
        public async Task Garbage_is_refused(string token)
        {
            Assert.Null(await _validator.ValidateAsync(token));
        }

        [Fact]
        public async Task A_tampered_payload_is_refused()
        {
            var parts = Token().Split('.');
            var forged = $"{parts[0]}.{Base64UrlEncoder.Encode("{\"sub\":\"x\"}")}.{parts[2]}";

            Assert.Null(await _validator.ValidateAsync(forged));
        }

        [Fact]
        public async Task Without_a_project_id_nothing_is_configured_and_nothing_validates()
        {
            var off = new FirebaseTokenValidator("  ");

            Assert.False(off.IsConfigured);
            Assert.Null(await off.ValidateAsync(Token()));
        }
    }
}
