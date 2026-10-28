using LibraryManagementSystem.Server.Dtos.Authors;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class AuthorService(IUnitOfWork unitOfWork) : IAuthorService
    {
        public async Task<IReadOnlyList<AuthorDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var authors = await unitOfWork.Authors.Query().OrderBy(a => a.Name).ToListAsync(cancellationToken);

            return authors.Select(AuthorMapper.ToDto).ToList();
        }

        public async Task<AuthorDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var author = await unitOfWork.Authors.GetByIdAsync(id, cancellationToken);

            return author is null ? null : AuthorMapper.ToDto(author);
        }

        public async Task<AuthorDto> CreateAsync(AuthorRequest request, CancellationToken cancellationToken = default)
        {
            var author = AuthorMapper.ToEntity(request);

            await unitOfWork.Authors.AddAsync(author, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return AuthorMapper.ToDto(author);
        }

        public async Task<AuthorDto?> UpdateAsync(Guid id, AuthorRequest request, CancellationToken cancellationToken = default)
        {
            var author = await unitOfWork.Authors.GetByIdAsync(id, cancellationToken);
            if (author is null)
            {
                return null;
            }

            AuthorMapper.Apply(request, author);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return AuthorMapper.ToDto(author);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var author = await unitOfWork.Authors.GetByIdAsync(id, cancellationToken);
            if (author is null)
            {
                return false;
            }

            // The AuthorBook join rows are removed by the database cascade; the books themselves stay.
            unitOfWork.Authors.Remove(author);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
