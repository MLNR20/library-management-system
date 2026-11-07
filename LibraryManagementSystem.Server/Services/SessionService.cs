using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using LibraryManagementSystem.Server.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LibraryManagementSystem.Server.Services
{
    public record IssuedSession(UserSession Session, string RefreshToken);

    // Session is set when the token named a real session (also for Reused, whose session was just revoked).
    public record RefreshResult(RefreshOutcome Outcome, UserSession? Session, string? RefreshToken);

    public interface ISessionService
    {
        // A new sign-in: records the device and returns the refresh token to hand to the client.
        Task<IssuedSession> StartAsync(string userId, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);

        // Swaps a refresh token for a new one. Only Rotated carries a new RefreshToken.
        Task<RefreshResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);

        // Ends the session the refresh token belongs to; null when the token is not a live one.
        Task<UserSession?> RevokeByRefreshTokenAsync(string refreshToken, string reason, CancellationToken cancellationToken = default);

        // Ends one of the user's own sessions; false when it is not theirs, does not exist or is already over.
        Task<bool> RevokeAsync(Guid sessionId, string userId, string reason, CancellationToken cancellationToken = default);

        // Ends every other live session of the user and returns how many.
        Task<int> RevokeOthersAsync(string userId, Guid keepSessionId, string reason, CancellationToken cancellationToken = default);

        // The user's live sessions, most recently used first.
        Task<IReadOnlyList<SessionDto>> GetActiveAsync(string userId, Guid? currentSessionId, CancellationToken cancellationToken = default);

        // Whether an access token's session is still live. Used on every request, so it must stay a single cheap query.
        Task<bool> IsActiveAsync(Guid sessionId, CancellationToken cancellationToken = default);
    }

    public class SessionService(IUnitOfWork unitOfWork, IOptions<JwtSettings> options) : ISessionService
    {
        private TimeSpan Lifetime => TimeSpan.FromDays(options.Value.RefreshTokenDays);

        public async Task<IssuedSession> StartAsync(string userId, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
        {
            var id = Guid.NewGuid();
            var (token, hash) = RefreshTokens.Create(id);
            var session = UserSession.Start(userId, hash, DateTime.UtcNow, Lifetime, ipAddress, userAgent);
            session.Id = id;

            await unitOfWork.Repository<UserSession>().AddAsync(session, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return new IssuedSession(session, token);
        }

        public async Task<RefreshResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
        {
            if (!RefreshTokens.TryParse(refreshToken, out var sessionId, out var presentedHash))
            {
                return new RefreshResult(RefreshOutcome.Invalid, null, null);
            }

            var session = await unitOfWork.Repository<UserSession>().Query(asNoTracking: false)
                .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);
            if (session is null)
            {
                return new RefreshResult(RefreshOutcome.Invalid, null, null);
            }

            var (newToken, newHash) = RefreshTokens.Create(session.Id);
            var outcome = session.Rotate(presentedHash, newHash, DateTime.UtcNow, Lifetime);

            // Saved for Reused too: that outcome has just revoked the session.
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return new RefreshResult(outcome, session, outcome == RefreshOutcome.Rotated ? newToken : null);
        }

        public async Task<UserSession?> RevokeByRefreshTokenAsync(string refreshToken, string reason, CancellationToken cancellationToken = default)
        {
            if (!RefreshTokens.TryParse(refreshToken, out var sessionId, out var presentedHash))
            {
                return null;
            }

            var session = await unitOfWork.Repository<UserSession>().Query(asNoTracking: false)
                .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

            // Proof of possession: the secret must be the current one (or the one just replaced).
            if (session is null || session.RevokedAtUtc is not null
                || (session.RefreshTokenHash != presentedHash && session.PreviousRefreshTokenHash != presentedHash))
            {
                return null;
            }

            session.Revoke(DateTime.UtcNow, reason);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return session;
        }

        public async Task<bool> RevokeAsync(Guid sessionId, string userId, string reason, CancellationToken cancellationToken = default)
        {
            var session = await unitOfWork.Repository<UserSession>().Query(asNoTracking: false)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, cancellationToken);
            if (session is null || !session.IsActive(DateTime.UtcNow))
            {
                return false;
            }

            session.Revoke(DateTime.UtcNow, reason);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }

        public async Task<int> RevokeOthersAsync(string userId, Guid keepSessionId, string reason, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var others = await unitOfWork.Repository<UserSession>().Query(asNoTracking: false)
                .Where(s => s.UserId == userId && s.Id != keepSessionId && s.RevokedAtUtc == null && s.ExpiresAtUtc > now)
                .ToListAsync(cancellationToken);

            foreach (var session in others)
            {
                session.Revoke(now, reason);
            }

            if (others.Count > 0)
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }

            return others.Count;
        }

        public async Task<IReadOnlyList<SessionDto>> GetActiveAsync(string userId, Guid? currentSessionId, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var sessions = await unitOfWork.Repository<UserSession>().Query()
                .Where(s => s.UserId == userId && s.RevokedAtUtc == null && s.ExpiresAtUtc > now)
                .OrderByDescending(s => s.LastSeenAtUtc)
                .ToListAsync(cancellationToken);

            return sessions
                .Select(s => new SessionDto(s.Id, s.CreatedAtUtc, s.LastSeenAtUtc, s.ExpiresAtUtc, s.IpAddress, s.UserAgent, s.Id == currentSessionId))
                .ToList();
        }

        public Task<bool> IsActiveAsync(Guid sessionId, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;

            return unitOfWork.Repository<UserSession>().AnyAsync(s => s.Id == sessionId && s.RevokedAtUtc == null && s.ExpiresAtUtc > now, cancellationToken);
        }
    }
}
