using System.Security.Cryptography;
using System.Text;

namespace LibraryManagementSystem.Server.Services
{
    // A refresh token is "{sessionId}.{secret}": the id finds the session, the secret proves possession and is stored hashed.
    public static class RefreshTokens
    {
        public static (string Token, string Hash) Create(Guid sessionId)
        {
            var secret = Base64Url(RandomNumberGenerator.GetBytes(32));

            return ($"{sessionId:N}.{secret}", Hash(secret));
        }

        // False for anything that is not in the expected shape.
        public static bool TryParse(string? token, out Guid sessionId, out string hash)
        {
            sessionId = Guid.Empty;
            hash = string.Empty;

            if (string.IsNullOrWhiteSpace(token))
            {
                return false;
            }

            var parts = token.Split('.');
            if (parts.Length != 2 || parts[1].Length == 0 || !Guid.TryParseExact(parts[0], "N", out sessionId))
            {
                return false;
            }

            hash = Hash(parts[1]);

            return true;
        }

        public static string Hash(string secret) => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(secret)));

        private static string Base64Url(byte[] bytes) =>
            Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
