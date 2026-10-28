using System.Linq.Expressions;
using LibraryManagementSystem.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Repositories
{
    public class Repository<T>(ApplicationDbContext context) : IRepository<T> where T : class
    {
        private readonly DbSet<T> _set = context.Set<T>();

        public async Task<T?> GetByIdAsync(object id, CancellationToken cancellationToken = default) =>
            await _set.FindAsync([id], cancellationToken);

        public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default) =>
            await _set.AsNoTracking().ToListAsync(cancellationToken);

        public async Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default) =>
            await _set.AsNoTracking().Where(predicate).ToListAsync(cancellationToken);

        public Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default) =>
            _set.FirstOrDefaultAsync(predicate, cancellationToken);

        public Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default) =>
            _set.AnyAsync(predicate, cancellationToken);

        public Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken cancellationToken = default) =>
            predicate is null ? _set.CountAsync(cancellationToken) : _set.CountAsync(predicate, cancellationToken);

        public IQueryable<T> Query(bool asNoTracking = true) =>
            asNoTracking ? _set.AsNoTracking() : _set;

        public async Task AddAsync(T entity, CancellationToken cancellationToken = default) =>
            await _set.AddAsync(entity, cancellationToken);

        public Task AddRangeAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default) =>
            _set.AddRangeAsync(entities, cancellationToken);

        public void Update(T entity) => _set.Update(entity);

        public void Remove(T entity) => _set.Remove(entity);

        public void RemoveRange(IEnumerable<T> entities) => _set.RemoveRange(entities);
    }
}
