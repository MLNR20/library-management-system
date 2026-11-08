using LibraryManagementSystem.Server.Dtos.News;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public interface IFaqService
    {
        /// <summary>In display order: lowest position first, then oldest.</summary>
        Task<IReadOnlyList<FaqDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<FaqDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<FaqDto> CreateAsync(FaqRequest request, CancellationToken cancellationToken = default);

        Task<FaqDto?> UpdateAsync(Guid id, FaqRequest request, CancellationToken cancellationToken = default);

        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }

    public class FaqService(IUnitOfWork unitOfWork) : IFaqService
    {
        public async Task<IReadOnlyList<FaqDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var faqs = await unitOfWork.Repository<Faq>().Query()
                .OrderBy(f => f.Position)
                .ThenBy(f => f.CreatedAt)
                .ToListAsync(cancellationToken);

            return faqs.Select(NewsMapper.ToDto).ToList();
        }

        public async Task<FaqDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var faq = await unitOfWork.Repository<Faq>().GetByIdAsync(id, cancellationToken);

            return faq is null ? null : NewsMapper.ToDto(faq);
        }

        public async Task<FaqDto> CreateAsync(FaqRequest request, CancellationToken cancellationToken = default)
        {
            var faq = NewsMapper.ToEntity(request with { Answer = RichText.Sanitize(request.Answer) });
            await unitOfWork.Repository<Faq>().AddAsync(faq, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return NewsMapper.ToDto(faq);
        }

        public async Task<FaqDto?> UpdateAsync(Guid id, FaqRequest request, CancellationToken cancellationToken = default)
        {
            var faq = await unitOfWork.Repository<Faq>().Query(asNoTracking: false)
                .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
            if (faq is null)
            {
                return null;
            }

            NewsMapper.Apply(request with { Answer = RichText.Sanitize(request.Answer) }, faq);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return NewsMapper.ToDto(faq);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var faq = await unitOfWork.Repository<Faq>().GetByIdAsync(id, cancellationToken);
            if (faq is null)
            {
                return false;
            }

            unitOfWork.Repository<Faq>().Remove(faq);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
