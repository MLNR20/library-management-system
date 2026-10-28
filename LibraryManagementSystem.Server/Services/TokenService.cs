using System.Security.Claims;
using System.Text;
using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace LibraryManagementSystem.Server.Services
{
    public record AccessToken(string Token, DateTime ExpiresAtUtc);

    public interface ITokenService
    {
        AccessToken CreateAccessToken(ApplicationUser user, IEnumerable<string> roles);
    }

    public class TokenService(IOptions<JwtSettings> options) : ITokenService
    {
        private readonly JsonWebTokenHandler _handler = new();

        public AccessToken CreateAccessToken(ApplicationUser user, IEnumerable<string> roles)
        {
            var settings = options.Value;
            var now = DateTime.UtcNow;
            var expires = now.AddMinutes(settings.AccessTokenMinutes);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (user.Email is not null)
            {
                claims.Add(new Claim(JwtRegisteredClaimNames.Email, user.Email));
            }

            if (user.UserName is not null)
            {
                claims.Add(new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName));
            }

            // JwtBearer maps the short "role" claim back to ClaimTypes.Role, so [Authorize(Roles = ...)] works.
            claims.AddRange(roles.Select(role => new Claim("role", role)));

            var descriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Issuer = settings.Issuer,
                Audience = settings.Audience,
                NotBefore = now,
                Expires = expires,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SigningKey)),
                    SecurityAlgorithms.HmacSha256)
            };

            return new AccessToken(_handler.CreateToken(descriptor), expires);
        }
    }
}
