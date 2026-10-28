using LibraryManagementSystem.Server.Dtos.Sections;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class SectionService(IUnitOfWork unitOfWork) : ISectionService
    {
        public async Task<IReadOnlyList<SectionDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var sections = await WithLocation(unitOfWork.Sections.Query())
                .OrderBy(s => s.Name)
                .ToListAsync(cancellationToken);

            return sections.Select(SectionMapper.ToDto).ToList();
        }

        public async Task<SectionDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var section = await WithLocation(unitOfWork.Sections.Query()).FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

            return section is null ? null : SectionMapper.ToDto(section);
        }

        public async Task<SectionDto> CreateAsync(SectionRequest request, CancellationToken cancellationToken = default)
        {
            var section = SectionMapper.ToEntity(request);
            await ResolveLocationAsync(section, request, cancellationToken);

            await unitOfWork.Sections.AddAsync(section, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return SectionMapper.ToDto(section);
        }

        public async Task<SectionDto?> UpdateAsync(Guid id, SectionRequest request, CancellationToken cancellationToken = default)
        {
            var section = await WithLocation(unitOfWork.Sections.Query(asNoTracking: false)).FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
            if (section is null)
            {
                return null;
            }

            SectionMapper.Apply(request, section);
            await ResolveLocationAsync(section, request, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return SectionMapper.ToDto(section);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var section = await unitOfWork.Sections.GetByIdAsync(id, cancellationToken);
            if (section is null)
            {
                return false;
            }

            unitOfWork.Sections.Remove(section);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }

        private static IQueryable<Section> WithLocation(IQueryable<Section> sections) =>
            sections.Include(s => s.Floor).Include(s => s.Shelf);

        // A shelf belongs to exactly one floor, so the section's shelf must be on the section's floor.
        private async Task ResolveLocationAsync(Section section, SectionRequest request, CancellationToken cancellationToken)
        {
            var floor = await unitOfWork.Floors.GetByIdAsync(request.FloorId, cancellationToken)
                ?? throw new KeyNotFoundException($"Floor {request.FloorId} was not found.");
            var shelf = await unitOfWork.Shelves.GetByIdAsync(request.ShelfId, cancellationToken)
                ?? throw new KeyNotFoundException($"Shelf {request.ShelfId} was not found.");

            if (shelf.FloorId != floor.Id)
            {
                throw new ArgumentException($"Shelf '{shelf.Name}' is not on floor '{floor.Name}'.");
            }

            section.Floor = floor;
            section.Shelf = shelf;
        }
    }
}
