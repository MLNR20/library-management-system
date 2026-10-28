using LibraryManagementSystem.Server.Dtos.Genres;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class GenreService(IUnitOfWork unitOfWork) : IGenreService
    {
        public async Task<IReadOnlyList<GenreDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var genres = await unitOfWork.Genres.Query().OrderBy(g => g.Name).ToListAsync(cancellationToken);

            return genres.Select(GenreMapper.ToDto).ToList();
        }

        public async Task<GenreDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var genre = await unitOfWork.Genres.GetByIdAsync(id, cancellationToken);

            return genre is null ? null : GenreMapper.ToDto(genre);
        }

        public async Task<GenreDto> CreateAsync(GenreRequest request, CancellationToken cancellationToken = default)
        {
            var genre = GenreMapper.ToEntity(request);

            await unitOfWork.Genres.AddAsync(genre, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return GenreMapper.ToDto(genre);
        }

        public async Task<GenreDto?> UpdateAsync(Guid id, GenreRequest request, CancellationToken cancellationToken = default)
        {
            var genre = await unitOfWork.Genres.GetByIdAsync(id, cancellationToken);
            if (genre is null)
            {
                return null;
            }

            GenreMapper.Apply(request, genre);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return GenreMapper.ToDto(genre);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var genre = await unitOfWork.Genres.GetByIdAsync(id, cancellationToken);
            if (genre is null)
            {
                return false;
            }

            // The foreign key is Restrict, so check up front instead of surfacing a raw database error.
            if (await unitOfWork.Books.AnyAsync(b => b.GenreId == id, cancellationToken))
            {
                throw new InvalidOperationException("Genre cannot be deleted while books still use it.");
            }

            unitOfWork.Genres.Remove(genre);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
