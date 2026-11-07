using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class UserSessionTests
    {
        private static readonly DateTime Now = new(2026, 11, 7, 9, 0, 0, DateTimeKind.Utc);
        private static readonly TimeSpan Lifetime = TimeSpan.FromDays(14);

        private static UserSession NewSession() => UserSession.Start("user-1", "hash-1", Now, Lifetime, "10.0.0.1", "Mozilla/5.0");

        [Fact]
        public void Start_records_the_device_and_a_sliding_expiry()
        {
            var session = NewSession();

            Assert.Equal("user-1", session.UserId);
            Assert.Equal("10.0.0.1", session.IpAddress);
            Assert.Equal("Mozilla/5.0", session.UserAgent);
            Assert.Equal(Now, session.CreatedAtUtc);
            Assert.Equal(Now + Lifetime, session.ExpiresAtUtc);
            Assert.True(session.IsActive(Now));
        }

        [Fact]
        public void Start_trims_an_overlong_user_agent_and_drops_a_blank_one()
        {
            Assert.Equal(300, UserSession.Start("u", "h", Now, Lifetime, null, new string('x', 500)).UserAgent!.Length);
            Assert.Null(UserSession.Start("u", "h", Now, Lifetime, null, "").UserAgent);
        }

        [Fact]
        public void Rotate_with_the_current_token_swaps_it_and_extends_the_session()
        {
            var session = NewSession();
            var later = Now.AddDays(3);

            var outcome = session.Rotate("hash-1", "hash-2", later, Lifetime);

            Assert.Equal(RefreshOutcome.Rotated, outcome);
            Assert.Equal("hash-2", session.RefreshTokenHash);
            Assert.Equal("hash-1", session.PreviousRefreshTokenHash);
            Assert.Equal(later, session.LastSeenAtUtc);
            Assert.Equal(later + Lifetime, session.ExpiresAtUtc);
        }

        [Fact]
        public void Rotate_with_an_unknown_token_is_invalid_and_changes_nothing()
        {
            var session = NewSession();

            var outcome = session.Rotate("guess", "hash-2", Now, Lifetime);

            Assert.Equal(RefreshOutcome.Invalid, outcome);
            Assert.Equal("hash-1", session.RefreshTokenHash);
            Assert.Null(session.RevokedAtUtc);
        }

        [Fact]
        public void Rotate_refuses_an_expired_session()
        {
            var session = NewSession();

            var outcome = session.Rotate("hash-1", "hash-2", Now + Lifetime, Lifetime);

            Assert.Equal(RefreshOutcome.Expired, outcome);
            Assert.False(session.IsActive(Now + Lifetime));
        }

        [Fact]
        public void Replaying_the_previous_token_right_away_is_a_harmless_race()
        {
            var session = NewSession();
            session.Rotate("hash-1", "hash-2", Now, Lifetime);

            var outcome = session.Rotate("hash-1", "hash-3", Now.AddSeconds(5), Lifetime);

            Assert.Equal(RefreshOutcome.Superseded, outcome);
            Assert.Null(session.RevokedAtUtc);
            Assert.Equal("hash-2", session.RefreshTokenHash);
        }

        [Fact]
        public void Replaying_the_previous_token_later_revokes_the_whole_session()
        {
            var session = NewSession();
            session.Rotate("hash-1", "hash-2", Now, Lifetime);
            var later = Now + UserSession.RotationGrace + TimeSpan.FromSeconds(1);

            var outcome = session.Rotate("hash-1", "hash-3", later, Lifetime);

            Assert.Equal(RefreshOutcome.Reused, outcome);
            Assert.Equal(later, session.RevokedAtUtc);
            Assert.Contains("reuse", session.RevokedReason);
            // The thief and the real owner are both locked out, even with the newest token.
            Assert.Equal(RefreshOutcome.Invalid, session.Rotate("hash-2", "hash-3", later, Lifetime));
        }

        [Fact]
        public void A_revoked_session_is_inactive_and_cannot_rotate()
        {
            var session = NewSession();

            session.Revoke(Now, "Signed out");

            Assert.False(session.IsActive(Now));
            Assert.Equal(RefreshOutcome.Invalid, session.Rotate("hash-1", "hash-2", Now, Lifetime));
        }

        [Fact]
        public void Revoking_twice_keeps_the_first_time_and_reason()
        {
            var session = NewSession();

            session.Revoke(Now, "Signed out");
            session.Revoke(Now.AddHours(1), "Something else");

            Assert.Equal(Now, session.RevokedAtUtc);
            Assert.Equal("Signed out", session.RevokedReason);
        }
    }
}
