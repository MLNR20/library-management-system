using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Tests.Data
{
    // Runs the book's RowVersion check against a real SQL Server (the in-memory provider has no rowversion). Set
    // LMS_TEST_SQLSERVER to a connection string for a server you can create databases on, with no database named, e.g.
    //   Server=localhost\MSSQLSERVER2025;Trusted_Connection=True;TrustServerCertificate=True
    // Each test class run creates its own throwaway database and drops it afterwards. Without the variable the tests skip.
    public class SqlServerFactAttribute : FactAttribute
    {
        public const string Variable = "LMS_TEST_SQLSERVER";

        public SqlServerFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(Variable)))
            {
                Skip = $"Set {Variable} to a SQL Server connection string to run this test.";
            }
        }
    }

    public sealed class BookConcurrencyTests : IAsyncLifetime
    {
        private readonly string databaseName = $"LmsConcurrency_{Guid.NewGuid():N}";
        private readonly string? server = Environment.GetEnvironmentVariable(SqlServerFactAttribute.Variable);

        private ApplicationDbContext NewContext() => new(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlServer($"{server};Database={databaseName}")
                .Options);

        public async Task InitializeAsync()
        {
            if (string.IsNullOrWhiteSpace(server))
            {
                return;
            }

            await using var db = NewContext();
            await db.Database.EnsureCreatedAsync();
        }

        public async Task DisposeAsync()
        {
            if (string.IsNullOrWhiteSpace(server))
            {
                return;
            }

            await using var db = NewContext();
            await db.Database.EnsureDeletedAsync();
        }

        private async Task<Guid> SeedBookAsync()
        {
            await using var db = NewContext();
            var genre = new Genre { Id = Guid.NewGuid(), Name = "Fiction" };
            var book = new Book
            {
                Id = Guid.NewGuid(),
                Title = "Dune",
                Isbn = "9780441013593",
                Pages = 600,
                DateAcquired = new DateOnly(2024, 1, 1),
                Genre = genre
            };
            db.Books.Add(book);
            await db.SaveChangesAsync();

            return book.Id;
        }

        [SqlServerFact]
        public async Task The_database_gives_a_new_book_a_row_version()
        {
            var id = await SeedBookAsync();

            await using var db = NewContext();
            var book = await db.Books.SingleAsync(b => b.Id == id);

            Assert.NotEmpty(book.RowVersion);
        }

        [SqlServerFact]
        public async Task Two_people_taking_the_last_copy_at_once_cannot_both_succeed()
        {
            var id = await SeedBookAsync();

            // Both load the book while it is still Available...
            await using var first = NewContext();
            await using var second = NewContext();
            var firstBook = await first.Books.SingleAsync(b => b.Id == id);
            var secondBook = await second.Books.SingleAsync(b => b.Id == id);

            // ...and both pass the "is it available?" check in the model.
            firstBook.TransitionTo(BookStatus.Borrowed);
            secondBook.TransitionTo(BookStatus.Reserved);

            await first.SaveChangesAsync();
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => second.SaveChangesAsync());

            // The first writer won and nothing of the second was saved.
            await using var check = NewContext();
            Assert.Equal(BookStatus.Borrowed, (await check.Books.SingleAsync(b => b.Id == id)).Status);
        }

        [SqlServerFact]
        public async Task A_stale_edit_does_not_overwrite_a_newer_change()
        {
            var id = await SeedBookAsync();

            await using var librarian = NewContext();
            await using var student = NewContext();
            var edited = await librarian.Books.SingleAsync(b => b.Id == id);
            var borrowed = await student.Books.SingleAsync(b => b.Id == id);

            borrowed.TransitionTo(BookStatus.Borrowed);
            await student.SaveChangesAsync();

            edited.Title = "Dune (revised)";
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => librarian.SaveChangesAsync());
        }

        // Changes only the reservation row (the book is untouched), so this is the reservation's own token at work.
        [SqlServerFact]
        public async Task Two_people_deciding_the_same_reservation_at_once_cannot_both_succeed()
        {
            var bookId = await SeedBookAsync();
            Guid reservationId;
            await using (var setup = NewContext())
            {
                var student = new ApplicationUser { Id = "student-1", UserName = "reader", NormalizedUserName = "READER" };
                setup.Users.Add(student);
                var reservation = new BookReservation
                {
                    Id = Guid.NewGuid(),
                    BookId = bookId,
                    StudentId = student.Id,
                    ReservedAtUtc = DateTime.UtcNow
                };
                setup.BookReservations.Add(reservation);
                await setup.SaveChangesAsync();
                reservationId = reservation.Id;
            }

            await using var first = NewContext();
            await using var second = NewContext();
            var firstCopy = await first.BookReservations.SingleAsync(r => r.Id == reservationId);
            var secondCopy = await second.BookReservations.SingleAsync(r => r.Id == reservationId);
            Assert.NotEmpty(firstCopy.RowVersion);

            firstCopy.MarkReturnRequested(DateTime.UtcNow);
            secondCopy.MarkReturnRequested(DateTime.UtcNow);

            await first.SaveChangesAsync();
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => second.SaveChangesAsync());
        }

        [SqlServerFact]
        public async Task A_save_that_follows_a_reload_succeeds()
        {
            var id = await SeedBookAsync();

            await using (var first = NewContext())
            {
                var book = await first.Books.SingleAsync(b => b.Id == id);
                book.TransitionTo(BookStatus.Borrowed);
                await first.SaveChangesAsync();
            }

            await using var second = NewContext();
            var reloaded = await second.Books.SingleAsync(b => b.Id == id);
            reloaded.TransitionTo(BookStatus.ReturnPending);
            await second.SaveChangesAsync();

            await using var check = NewContext();
            Assert.Equal(BookStatus.ReturnPending, (await check.Books.SingleAsync(b => b.Id == id)).Status);
        }
    }
}
