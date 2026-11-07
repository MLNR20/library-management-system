using LibraryManagementSystem.Server.Services;

namespace LibraryManagementSystem.Server.Tests.Services
{
    public class RefreshTokensTests
    {
        [Fact]
        public void A_created_token_parses_back_to_its_session_and_hash()
        {
            var sessionId = Guid.NewGuid();

            var (token, hash) = RefreshTokens.Create(sessionId);

            Assert.True(RefreshTokens.TryParse(token, out var parsedId, out var parsedHash));
            Assert.Equal(sessionId, parsedId);
            Assert.Equal(hash, parsedHash);
        }

        [Fact]
        public void Tokens_are_unique_and_url_safe()
        {
            var id = Guid.NewGuid();

            var tokens = Enumerable.Range(0, 50).Select(_ => RefreshTokens.Create(id).Token).ToList();

            Assert.Equal(50, tokens.Distinct().Count());
            Assert.All(tokens, token => Assert.DoesNotContain(token, c => c is '+' or '/' or '='));
        }

        [Fact]
        public void The_hash_fits_the_column_and_is_not_the_secret()
        {
            var (token, hash) = RefreshTokens.Create(Guid.NewGuid());

            Assert.True(hash.Length <= 64);
            Assert.DoesNotContain(hash, token);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("no-dot")]
        [InlineData("not-a-guid.secret")]
        [InlineData("0123456789abcdef0123456789abcdef.")]
        [InlineData("0123456789abcdef0123456789abcdef.a.b")]
        public void Malformed_tokens_do_not_parse(string? token)
        {
            Assert.False(RefreshTokens.TryParse(token, out _, out _));
        }

        [Fact]
        public void The_same_secret_always_hashes_the_same_and_different_secrets_differ()
        {
            Assert.Equal(RefreshTokens.Hash("abc"), RefreshTokens.Hash("abc"));
            Assert.NotEqual(RefreshTokens.Hash("abc"), RefreshTokens.Hash("abd"));
        }
    }
}
