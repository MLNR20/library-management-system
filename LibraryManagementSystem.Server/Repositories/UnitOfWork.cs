using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Repositories
{
    public class UnitOfWork(ApplicationDbContext context) : IUnitOfWork
    {
        private readonly Dictionary<Type, object> _repositories = [];

        public IRepository<Book> Books => Repository<Book>();

        public IRepository<Genre> Genres => Repository<Genre>();

        public IRepository<Author> Authors => Repository<Author>();

        public IRepository<Language> Languages => Repository<Language>();

        public IRepository<Floor> Floors => Repository<Floor>();

        public IRepository<Shelf> Shelves => Repository<Shelf>();

        public IRepository<Row> Rows => Repository<Row>();

        public IRepository<Section> Sections => Repository<Section>();

        // One repository instance per entity type, all sharing this scope's DbContext.
        public IRepository<T> Repository<T>() where T : class
        {
            if (!_repositories.TryGetValue(typeof(T), out var repository))
            {
                repository = new Repository<T>(context);
                _repositories[typeof(T)] = repository;
            }

            return (IRepository<T>)repository;
        }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
            context.SaveChangesAsync(cancellationToken);

        public Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken cancellationToken = default)
        {
            // Going through the execution strategy keeps this working if EnableRetryOnFailure is turned on later.
            var strategy = context.Database.CreateExecutionStrategy();

            return strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
                await action(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            });
        }
    }
}
