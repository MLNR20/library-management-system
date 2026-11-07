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
