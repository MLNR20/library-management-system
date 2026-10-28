using LibraryManagementSystem.Server.Dtos.Shelves;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class ShelfService(IUnitOfWork unitOfWork) : IShelfService
    {
        public async Task<IReadOnlyList<ShelfDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var shelves = await unitOfWork.Shelves.Query()
                .Include(s => s.Floor)
                .OrderBy(s => s.Floor.Name).ThenBy(s => s.Name)
                .ToListAsync(cancellationToken);

            return shelves.Select(ShelfMapper.ToDto).ToList();
        }

        public async Task<ShelfDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var shelf = await unitOfWork.Shelves.Query().Include(s => s.Floor).FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

            return shelf is null ? null : ShelfMapper.ToDto(shelf);
        }

        public async Task<ShelfDto> CreateAsync(ShelfRequest request, CancellationToken cancellationToken = default)
        {
            var shelf = ShelfMapper.ToEntity(request);
            shelf.Floor = await FindFloorAsync(request.FloorId, cancellationToken);

            await unitOfWork.Shelves.AddAsync(shelf, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return ShelfMapper.ToDto(shelf);
        }

        public async Task<ShelfDto?> UpdateAsync(Guid id, ShelfRequest request, CancellationToken cancellationToken = default)
        {
            var shelf = await unitOfWork.Shelves.Query(asNoTracking: false)
                .Include(s => s.Floor)
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
            if (shelf is null)
            {
                return null;
            }

            // A section stores both its floor and shelf, so moving the shelf would leave those sections inconsistent.
            if (shelf.FloorId != request.FloorId
                && await unitOfWork.Sections.AnyAsync(s => s.ShelfId == id, cancellationToken))
            {
                throw new InvalidOperationException("Shelf cannot move to another floor while sections are assigned to it.");
            }

            var floor = await FindFloorAsync(request.FloorId, cancellationToken);
            ShelfMapper.Apply(request, shelf);
            shelf.Floor = floor;
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return ShelfMapper.ToDto(shelf);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var shelf = await unitOfWork.Shelves.GetByIdAsync(id, cancellationToken);
            if (shelf is null)
            {
                return false;
            }

            if (await unitOfWork.Rows.AnyAsync(r => r.ShelfId == id, cancellationToken))
            {
                throw new InvalidOperationException("Shelf cannot be deleted while it still has rows.");
            }

            if (await unitOfWork.Sections.AnyAsync(s => s.ShelfId == id, cancellationToken))
            {
                throw new InvalidOperationException("Shelf cannot be deleted while sections are assigned to it.");
            }

            unitOfWork.Shelves.Remove(shelf);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }

        private async Task<Floor> FindFloorAsync(Guid floorId, CancellationToken cancellationToken) =>
            await unitOfWork.Floors.GetByIdAsync(floorId, cancellationToken)
                ?? throw new KeyNotFoundException($"Floor {floorId} was not found.");
    }
}
