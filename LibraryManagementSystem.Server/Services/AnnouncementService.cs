using LibraryManagementSystem.Server.Dtos.Announcements;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class AnnouncementService(IUnitOfWork unitOfWork) : IAnnouncementService
    {
        public async Task<IReadOnlyList<AnnouncementDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var announcements = await unitOfWork.Repository<Announcement>().Query()
                .Include(a => a.Floor)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync(cancellationToken);

            return announcements.Select(AnnouncementMapper.ToDto).ToList();
        }

        public async Task<AnnouncementDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var announcement = await unitOfWork.Repository<Announcement>().Query()
                .Include(a => a.Floor)
                .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

            return announcement is null ? null : AnnouncementMapper.ToDto(announcement);
        }

        public async Task<AnnouncementDto> CreateAsync(AnnouncementRequest request, CancellationToken cancellationToken = default)
        {
            var announcement = AnnouncementMapper.ToEntity(request with { Body = RichText.Sanitize(request.Body) });
            announcement.Floor = await FindFloorAsync(request.FloorId, cancellationToken);

            await unitOfWork.Repository<Announcement>().AddAsync(announcement, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return AnnouncementMapper.ToDto(announcement);
        }

        public async Task<AnnouncementDto?> UpdateAsync(Guid id, AnnouncementRequest request, CancellationToken cancellationToken = default)
        {
            var announcement = await unitOfWork.Repository<Announcement>().Query(asNoTracking: false)
                .Include(a => a.Floor)
                .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
            if (announcement is null)
            {
                return null;
            }

            var floor = await FindFloorAsync(request.FloorId, cancellationToken);
            AnnouncementMapper.Apply(request with { Body = RichText.Sanitize(request.Body) }, announcement);
            announcement.Floor = floor;
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return AnnouncementMapper.ToDto(announcement);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var announcement = await unitOfWork.Repository<Announcement>().GetByIdAsync(id, cancellationToken);
            if (announcement is null)
            {
                return false;
            }

            unitOfWork.Repository<Announcement>().Remove(announcement);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }

        private async Task<Floor?> FindFloorAsync(Guid? floorId, CancellationToken cancellationToken)
        {
            if (floorId is null)
            {
                return null;
            }

            return await unitOfWork.Floors.GetByIdAsync(floorId.Value, cancellationToken)
                ?? throw new KeyNotFoundException($"Floor {floorId} was not found.");
        }
    }
}
