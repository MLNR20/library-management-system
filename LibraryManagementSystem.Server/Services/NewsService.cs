using LibraryManagementSystem.Server.Dtos.News;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public interface INewsService
    {
        /// <summary>Newest first; <paramref name="take"/> limits how many (all when null).</summary>
        Task<IReadOnlyList<NewsPostDto>> GetAllAsync(int? take = null, CancellationToken cancellationToken = default);

        Task<NewsPostDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <exception cref="KeyNotFoundException">The named cover image was never uploaded.</exception>
        Task<NewsPostDto> CreateAsync(NewsPostRequest request, CancellationToken cancellationToken = default);

        Task<NewsPostDto?> UpdateAsync(Guid id, NewsPostRequest request, CancellationToken cancellationToken = default);

        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }

    public class NewsService(IUnitOfWork unitOfWork, INewsImageStore images) : INewsService
    {
        public async Task<IReadOnlyList<NewsPostDto>> GetAllAsync(int? take = null, CancellationToken cancellationToken = default)
        {
            var query = unitOfWork.Repository<NewsPost>().Query().OrderByDescending(n => n.CreatedAt);
            var posts = await (take is null ? query : query.Take(take.Value)).ToListAsync(cancellationToken);

            return posts.Select(NewsMapper.ToDto).ToList();
        }

        public async Task<NewsPostDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var post = await unitOfWork.Repository<NewsPost>().GetByIdAsync(id, cancellationToken);

            return post is null ? null : NewsMapper.ToDto(post);
        }

        public async Task<NewsPostDto> CreateAsync(NewsPostRequest request, CancellationToken cancellationToken = default)
        {
            EnsureImageExists(request.ImageFileName);

            var post = NewsMapper.ToEntity(request with { Body = RichText.Sanitize(request.Body) });
            await unitOfWork.Repository<NewsPost>().AddAsync(post, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return NewsMapper.ToDto(post);
        }

        public async Task<NewsPostDto?> UpdateAsync(Guid id, NewsPostRequest request, CancellationToken cancellationToken = default)
        {
            var post = await unitOfWork.Repository<NewsPost>().Query(asNoTracking: false)
                .FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
            if (post is null)
            {
                return null;
            }

            // Keeping the same image needs no check; a new one must exist.
            if (request.ImageFileName != post.ImageFileName)
            {
                EnsureImageExists(request.ImageFileName);
            }

            var previousImage = post.ImageFileName;
            NewsMapper.Apply(request with { Body = RichText.Sanitize(request.Body) }, post);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            // The old file is only removed once the article no longer points at it.
            if (previousImage is not null && previousImage != post.ImageFileName)
            {
                images.Delete(previousImage);
            }

            return NewsMapper.ToDto(post);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var post = await unitOfWork.Repository<NewsPost>().GetByIdAsync(id, cancellationToken);
            if (post is null)
            {
                return false;
            }

            unitOfWork.Repository<NewsPost>().Remove(post);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            if (post.ImageFileName is not null)
            {
                images.Delete(post.ImageFileName);
            }

            return true;
        }

        private void EnsureImageExists(string? fileName)
        {
            if (fileName is not null && !images.Exists(fileName))
            {
                throw new KeyNotFoundException("The cover image was not found. Upload it again.");
            }
        }
    }
}
