using LibraryManagementSystem.Server.Data;

namespace LibraryManagementSystem.Server.Tests.Data
{
    public class CatalogueSeederTests
    {
        [Fact]
        public void Seeds_exactly_150_books_with_unique_titles()
        {
            var catalogue = CatalogueSeeder.Catalogue;

            Assert.Equal(150, catalogue.Count);
            Assert.Equal(150, catalogue.Select(b => b.Title).Distinct().Count());
        }

        [Fact]
        public void Every_book_has_a_known_genre_an_author_and_valid_sizes()
        {
            foreach (var (title, authors, genre, pages) in CatalogueSeeder.Catalogue)
            {
                Assert.Contains(genre, CatalogueSeeder.GenreNames);
                Assert.NotEmpty(authors);
                Assert.All(authors, author => Assert.InRange(author.Length, 1, 200));
                Assert.InRange(title.Length, 1, 300);
                Assert.True(pages >= 1, $"{title} has no pages");
            }
        }

        [Fact]
        public void Every_genre_is_used_by_at_least_one_book()
        {
            var used = CatalogueSeeder.Catalogue.Select(b => b.Genre).ToHashSet();

            Assert.All(CatalogueSeeder.GenreNames, genre => Assert.Contains(genre, used));
        }

        [Fact]
        public void Seeds_two_reading_rooms_with_distinct_names()
        {
            Assert.Equal(2, CatalogueSeeder.ReadingRoomSeedNames.Count);
            Assert.Equal(2, CatalogueSeeder.ReadingRoomSeedNames.Distinct(StringComparer.OrdinalIgnoreCase).Count());
        }

        [Fact]
        public void Floors_are_ranked_from_the_bottom_up_by_their_names()
        {
            string[] floors = ["Second Floor", "Level 4", "Ground floor", "Basement", "First floor", "Archive"];

            var bottomUp = floors.OrderBy(CatalogueSeeder.FloorRank).ToList();

            Assert.Equal(["Basement", "Ground floor", "First floor", "Second Floor", "Level 4", "Archive"], bottomUp);
        }

        [Theory]
        [InlineData(new string[0], "Shelf A")]
        [InlineData(new[] { "Shelf A", "shelf b", "Shelf C" }, "Shelf D")]
        [InlineData(new[] { "Shelf B", "Poetry" }, "Shelf A")]
        public void A_new_shelf_takes_the_next_free_letter(string[] taken, string expected)
        {
            Assert.Equal(expected, CatalogueSeeder.NextShelfName(taken));
        }

        [Fact]
        public void A_new_shelf_is_numbered_once_the_letters_run_out()
        {
            var letters = Enumerable.Range('A', 26).Select(letter => $"Shelf {(char)letter}").ToList();

            Assert.Equal("Shelf 27", CatalogueSeeder.NextShelfName(letters));
        }

        [Theory]
        [InlineData("Shelf B", new[] { "Row B1", "Row B2" }, "Row B3")]
        [InlineData("Shelf D", new string[0], "Row D1")]
        [InlineData("Shelf 27", new string[0], "Row 27.1")]
        [InlineData("Poetry", new[] { "Row 1" }, "Row 2")]
        public void A_new_row_is_named_after_its_shelf_and_takes_the_next_free_number(string shelf, string[] taken, string expected)
        {
            Assert.Equal(expected, CatalogueSeeder.NextRowName(shelf, taken));
        }

        [Fact]
        public void Isbns_are_unique_fit_the_column_and_have_a_valid_check_digit()
        {
            var isbns = Enumerable.Range(0, 150).Select(CatalogueSeeder.IsbnFor).ToList();

            Assert.Equal(150, isbns.Distinct().Count());
            Assert.All(isbns, isbn =>
            {
                Assert.Equal(17, isbn.Length);

                var digits = isbn.Replace("-", "");
                var sum = digits.Select((c, i) => (c - '0') * (i % 2 == 0 ? 1 : 3)).Sum();
                Assert.Equal(0, sum % 10);
            });
        }
    }
}
