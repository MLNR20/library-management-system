using LibraryManagementSystem.Server.Dtos.Languages;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class LanguageService(IUnitOfWork unitOfWork) : ILanguageService
    {
        public async Task<IReadOnlyList<LanguageDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var languages = await unitOfWork.Languages.Query().OrderBy(l => l.Name).ToListAsync(cancellationToken);

            return languages.Select(LanguageMapper.ToDto).ToList();
        }

        public async Task<LanguageDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var language = await unitOfWork.Languages.GetByIdAsync(id, cancellationToken);

            return language is null ? null : LanguageMapper.ToDto(language);
        }

        public async Task<LanguageDto> CreateAsync(LanguageRequest request, CancellationToken cancellationToken = default)
        {
            var language = LanguageMapper.ToEntity(request);

            await unitOfWork.Languages.AddAsync(language, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return LanguageMapper.ToDto(language);
        }

        public async Task<LanguageDto?> UpdateAsync(Guid id, LanguageRequest request, CancellationToken cancellationToken = default)
        {
            var language = await unitOfWork.Languages.GetByIdAsync(id, cancellationToken);
            if (language is null)
            {
                return null;
            }

            LanguageMapper.Apply(request, language);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return LanguageMapper.ToDto(language);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var language = await unitOfWork.Languages.GetByIdAsync(id, cancellationToken);
            if (language is null)
            {
                return false;
            }

            // The BookLanguage join rows are removed by the database cascade; the books themselves stay.
            unitOfWork.Languages.Remove(language);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
