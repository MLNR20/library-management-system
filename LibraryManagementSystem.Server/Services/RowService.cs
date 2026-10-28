using LibraryManagementSystem.Server.Dtos.Rows;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class RowService(IUnitOfWork unitOfWork) : IRowService
    {
        public async Task<IReadOnlyList<RowDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var rows = await WithLocation(unitOfWork.Rows.Query())
                .OrderBy(r => r.Shelf.Floor.Name).ThenBy(r => r.Shelf.Name).ThenBy(r => r.Name)
                .ToListAsync(cancellationToken);

            return rows.Select(RowMapper.ToDto).ToList();
        }

        public async Task<RowDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var row = await WithLocation(unitOfWork.Rows.Query()).FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

            return row is null ? null : RowMapper.ToDto(row);
        }

        public async Task<RowDto> CreateAsync(RowRequest request, CancellationToken cancellationToken = default)
        {
            var row = RowMapper.ToEntity(request);
            row.Shelf = await FindShelfAsync(request.ShelfId, cancellationToken);

            await unitOfWork.Rows.AddAsync(row, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return RowMapper.ToDto(row);
        }

        public async Task<RowDto?> UpdateAsync(Guid id, RowRequest request, CancellationToken cancellationToken = default)
        {
            var row = await WithLocation(unitOfWork.Rows.Query(asNoTracking: false)).FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
            if (row is null)
            {
                return null;
            }

            var shelf = await FindShelfAsync(request.ShelfId, cancellationToken);
            RowMapper.Apply(request, row);
            row.Shelf = shelf;
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return RowMapper.ToDto(row);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var row = await unitOfWork.Rows.Query(asNoTracking: false)
                .Include(r => r.Books)
                .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
            if (row is null)
            {
                return false;
            }

            if (row.Books.Count > 0)
            {
                throw new InvalidOperationException("Row cannot be deleted while books are shelved in it.");
            }

            unitOfWork.Rows.Remove(row);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }

        private static IQueryable<Row> WithLocation(IQueryable<Row> rows) =>
            rows.Include(r => r.Shelf).ThenInclude(s => s.Floor);

        // Loaded with its Floor so the returned DTO can show the full location.
        private async Task<Shelf> FindShelfAsync(Guid shelfId, CancellationToken cancellationToken) =>
            await unitOfWork.Shelves.Query(asNoTracking: false)
                .Include(s => s.Floor)
                .FirstOrDefaultAsync(s => s.Id == shelfId, cancellationToken)
                ?? throw new KeyNotFoundException($"Shelf {shelfId} was not found.");
    }
}
