using LibraryManagementSystem.Server.Dtos.Floors;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class FloorService(IUnitOfWork unitOfWork) : IFloorService
    {
        public async Task<IReadOnlyList<FloorDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var floors = await unitOfWork.Floors.Query().OrderBy(f => f.Name).ToListAsync(cancellationToken);

            return floors.Select(FloorMapper.ToDto).ToList();
        }

        public async Task<FloorDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var floor = await unitOfWork.Floors.GetByIdAsync(id, cancellationToken);

            return floor is null ? null : FloorMapper.ToDto(floor);
        }

        public async Task<FloorDto> CreateAsync(FloorRequest request, CancellationToken cancellationToken = default)
        {
            var floor = FloorMapper.ToEntity(request);

            await unitOfWork.Floors.AddAsync(floor, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return FloorMapper.ToDto(floor);
        }

        public async Task<FloorDto?> UpdateAsync(Guid id, FloorRequest request, CancellationToken cancellationToken = default)
        {
            var floor = await unitOfWork.Floors.GetByIdAsync(id, cancellationToken);
            if (floor is null)
            {
                return null;
            }

            FloorMapper.Apply(request, floor);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return FloorMapper.ToDto(floor);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var floor = await unitOfWork.Floors.GetByIdAsync(id, cancellationToken);
            if (floor is null)
            {
                return false;
            }

            // The foreign keys are Restrict, so check up front instead of surfacing a raw database error.
            if (await unitOfWork.Shelves.AnyAsync(s => s.FloorId == id, cancellationToken))
            {
                throw new InvalidOperationException("Floor cannot be deleted while it still has shelves.");
            }

            if (await unitOfWork.Sections.AnyAsync(s => s.FloorId == id, cancellationToken))
            {
                throw new InvalidOperationException("Floor cannot be deleted while sections are assigned to it.");
            }

            unitOfWork.Floors.Remove(floor);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
