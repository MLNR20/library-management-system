using LibraryManagementSystem.Server.Dtos.Reservations;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public interface IStudyTableService
    {
        // Staff see every table; everyone else only the ones in service.
        Task<IReadOnlyList<StudyTableDto>> GetAllAsync(bool includeInactive, CancellationToken cancellationToken = default);

        // Create and update throw KeyNotFoundException when request.SectionId does not exist and StudyTableException when
        // that section is not a reading room.
        Task<StudyTableDto> CreateAsync(StudyTableRequest request, CancellationToken cancellationToken = default);

        Task<StudyTableDto?> UpdateAsync(Guid id, StudyTableRequest request, CancellationToken cancellationToken = default);

        // Throws InvalidOperationException while the table has reservations (take it out of service instead).
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }

    public class StudyTableService(IUnitOfWork unitOfWork) : IStudyTableService
    {
        public async Task<IReadOnlyList<StudyTableDto>> GetAllAsync(bool includeInactive, CancellationToken cancellationToken = default)
        {
            IQueryable<StudyTable> tables = unitOfWork.Repository<StudyTable>().Query().Include(t => t.Section);
            if (!includeInactive)
            {
                tables = tables.Where(t => t.IsActive);
            }

            return (await tables.OrderBy(t => t.Name).ToListAsync(cancellationToken)).Select(ToDto).ToList();
        }

        public async Task<StudyTableDto> CreateAsync(StudyTableRequest request, CancellationToken cancellationToken = default)
        {
            var table = new StudyTable { Id = Guid.NewGuid() };
            await ApplyAsync(table, request, cancellationToken);

            await unitOfWork.Repository<StudyTable>().AddAsync(table, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return ToDto(table);
        }

        public async Task<StudyTableDto?> UpdateAsync(Guid id, StudyTableRequest request, CancellationToken cancellationToken = default)
        {
            var table = await unitOfWork.Repository<StudyTable>().Query(asNoTracking: false)
                .Include(t => t.Section)
                .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
            if (table is null)
            {
                return null;
            }

            await ApplyAsync(table, request, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return ToDto(table);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var table = await unitOfWork.Repository<StudyTable>().GetByIdAsync(id, cancellationToken);
            if (table is null)
            {
                return false;
            }

            if (await unitOfWork.Repository<TableReservation>().AnyAsync(r => r.TableId == id, cancellationToken))
            {
                throw new InvalidOperationException("A table with reservations cannot be deleted. Take it out of service instead.");
            }

            unitOfWork.Repository<StudyTable>().Remove(table);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }

        // Copies the request onto the table. The section, when given, must exist and be a reading room.
        private async Task ApplyAsync(StudyTable table, StudyTableRequest request, CancellationToken cancellationToken)
        {
            Section? section = null;
            if (request.SectionId is { } sectionId)
            {
                section = await unitOfWork.Sections.GetByIdAsync(sectionId, cancellationToken)
                    ?? throw new KeyNotFoundException($"Section {sectionId} was not found.");
                StudyTable.EnsureSectionAllowsTables(section);
            }

            table.Name = request.Name.Trim();
            table.Seats = request.Seats;
            table.IsActive = request.IsActive;
            table.Section = section;
            table.SectionId = section?.Id;
        }

        private static StudyTableDto ToDto(StudyTable table) =>
            new(table.Id, table.Name, table.Seats, table.IsActive, table.SectionId, table.Section?.Name);
    }
}
