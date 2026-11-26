using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Validators;

namespace LibraryManagementSystem.Server.Tests.Services
{
    public class PasswordResetTests
    {
        // Identity tokens are Base64, so they hold the characters a URL would mangle.
        private const string Token = "CfDJ8+ab/cd==";

        [Fact]
        public void A_link_carries_the_user_and_token_after_the_hash()
        {
            var link = new Uri(PasswordResetLinks.Build("https://library.example.com/", "user-1", Token));

            Assert.Equal("/reset-password", link.AbsolutePath);
            Assert.Empty(link.Query);
            Assert.StartsWith("#user=user-1&token=", link.Fragment);
        }

        [Fact]
        public void The_token_in_a_link_decodes_back_to_the_original()
        {
            var link = PasswordResetLinks.Build("https://library.example.com", "user-1", Token);
            var encoded = link[(link.IndexOf("token=", StringComparison.Ordinal) + "token=".Length)..];

            Assert.DoesNotContain(encoded, c => c is '+' or '/' or '=' or '&');
            Assert.True(PasswordResetLinks.TryDecodeToken(encoded, out var decoded));
            Assert.Equal(Token, decoded);
        }

        [Theory]
        [InlineData("not base64!")]
        [InlineData("abc+/")]
        [InlineData("a")]
        public void A_damaged_token_does_not_decode(string encoded)
        {
            Assert.False(PasswordResetLinks.TryDecodeToken(encoded, out _));
        }

        [Fact]
        public void The_reset_email_goes_to_the_account_and_holds_the_link()
        {
            var user = new ApplicationUser { UserName = "ada", FirstName = "Ada", Email = "ada@example.com" };

            var email = PasswordResetEmails.ResetLink(user, "https://library.example.com/reset-password#x", 60);

            Assert.Equal("ada@example.com", email.To);
            Assert.Contains("Hello Ada,", email.Body);
            Assert.Contains("ada", email.Body);
            Assert.Contains("https://library.example.com/reset-password#x", email.Body);
            Assert.Contains("60 minutes", email.Body);
        }

        [Theory]
        [InlineData("ada@example.com", true)]
        [InlineData("", false)]
        [InlineData("not-an-email", false)]
        public void Forgot_password_needs_an_email_address(string email, bool valid)
        {
            var result = new ForgotPasswordRequestValidator().Validate(new ForgotPasswordRequest(email));

            Assert.Equal(valid, result.IsValid);
        }

        [Theory]
        [InlineData("user-1", "token", "Passw0rd!", "Passw0rd!", true)]
        [InlineData("", "token", "Passw0rd!", "Passw0rd!", false)]
        [InlineData("user-1", "", "Passw0rd!", "Passw0rd!", false)]
        [InlineData("user-1", "token", "short", "short", false)]
        [InlineData("user-1", "token", "Passw0rd!", "Different1!", false)]
        public void A_reset_needs_the_link_values_and_a_confirmed_password(
            string userId, string token, string password, string confirm, bool valid)
        {
            var result = new ResetPasswordRequestValidator().Validate(new ResetPasswordRequest(userId, token, password, confirm));

            Assert.Equal(valid, result.IsValid);
        }
    }
}
