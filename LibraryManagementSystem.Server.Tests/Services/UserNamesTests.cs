using LibraryManagementSystem.Server.Services;

namespace LibraryManagementSystem.Server.Tests.Services
{
    public class UserNamesTests
    {
        [Theory]
        [InlineData("ada.lovelace@example.com", "ada.lovelace")]
        [InlineData("Ada_Lovelace@example.com", "ada_lovelace")]
        [InlineData("ada+library@example.com", "ada+library")]
        [InlineData("ada lovelace@example.com", "ada.lovelace")]
        [InlineData("..ada..@example.com", "ada")]
        public void The_suggestion_is_the_local_part_in_allowed_characters(string email, string expected)
        {
            // "ada" alone is exactly three characters, the minimum.
            Assert.Equal(expected, UserNames.Suggest(email));
        }

        [Theory]
        [InlineData("a@example.com")]
        [InlineData("é@example.com")]
        [InlineData("@example.com")]
        public void A_suggestion_is_never_shorter_than_three_characters(string email)
        {
            Assert.True(UserNames.Suggest(email).Length >= 3);
        }

        [Fact]
        public void A_long_local_part_is_cut_to_leave_room_for_a_number()
        {
            var suggestion = UserNames.Suggest(new string('a', 120) + "@example.com");

            Assert.True(suggestion.Length <= 44);
        }

        [Fact]
        public void Every_suggestion_matches_the_register_form_rules()
        {
            var pattern = new System.Text.RegularExpressions.Regex("^[A-Za-z0-9._@+-]{3,50}$");

            foreach (var email in new[] { "ada@example.com", "Ünï.cödé@example.com", "a b c@example.com", "x@example.com" })
            {
                Assert.Matches(pattern, UserNames.Suggest(email));
            }
        }

        [Fact]
        public async Task A_free_name_is_used_as_it_is()
        {
            Assert.Equal("ada", await UserNames.UniqueAsync("ada", _ => Task.FromResult(false)));
        }

        [Fact]
        public async Task A_taken_name_gets_the_next_free_number()
        {
            var taken = new HashSet<string> { "ada", "ada2", "ada3" };

            Assert.Equal("ada4", await UserNames.UniqueAsync("ada", name => Task.FromResult(taken.Contains(name))));
        }

        [Fact]
        public async Task When_every_number_is_taken_a_random_tail_is_used()
        {
            var name = await UserNames.UniqueAsync("ada", name => Task.FromResult(name.Length <= 5 && name.StartsWith("ada")));

            Assert.StartsWith("ada", name);
            Assert.True(name.Length > 5);
        }

        [Theory]
        [InlineData("Ada Lovelace", "Ada", "Lovelace")]
        [InlineData("  Ada   Lovelace King ", "Ada", "Lovelace King")]
        [InlineData("Ada", "Ada", "")]
        [InlineData("", "", "")]
        [InlineData(null, "", "")]
        public void A_display_name_splits_into_first_and_last(string? name, string first, string last)
        {
            Assert.Equal((first, last), ExternalSignInService.SplitName(name));
        }

        [Fact]
        public void Names_are_cut_to_the_length_the_register_form_allows()
        {
            var (first, last) = ExternalSignInService.SplitName(new string('a', 80) + " " + new string('b', 80));

            Assert.Equal(50, first.Length);
            Assert.Equal(50, last.Length);
        }
    }
}
