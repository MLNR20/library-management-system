using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Repositories
{
    public interface IUnitOfWork
    {
        IRepository<Book> Books { get; }

        IRepository<Genre> Genres { get; }

        IRepository<Author> Authors { get; }

        IRepository<Language> Languages { get; }

        IRepository<Floor> Floors { get; }

        IRepository<Shelf> Shelves { get; }

        IRepository<Row> Rows { get; }

        IRepository<Section> Sections { get; }

        // For any entity without a named property above.
        IRepository<T> Repository<T>() where T : class;

        // Writes every change staged through the repositories in a single database transaction.
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

        // Runs several SaveChangesAsync calls atomically; the transaction rolls back if the action throws.
        Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken cancellationToken = default);
    }
}
