using LibraryManagementSystem.Server.Dtos.Contacts;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class ContactService(IUnitOfWork unitOfWork) : IContactService
    {
        public async Task<IReadOnlyList<ContactDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var contacts = await unitOfWork.Repository<Contact>().Query()
                .OrderBy(c => c.LastName).ThenBy(c => c.FirstName)
                .ToListAsync(cancellationToken);

            return contacts.Select(ContactMapper.ToDto).ToList();
        }

        public async Task<ContactDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var contact = await unitOfWork.Repository<Contact>().GetByIdAsync(id, cancellationToken);

            return contact is null ? null : ContactMapper.ToDto(contact);
        }

        public async Task<ContactDto> CreateAsync(ContactRequest request, CancellationToken cancellationToken = default)
        {
            var contact = ContactMapper.ToEntity(request);
            contact.CreatedAt = contact.UpdatedAt = DateTime.UtcNow;

            await unitOfWork.Repository<Contact>().AddAsync(contact, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return ContactMapper.ToDto(contact);
        }

        public async Task<ContactDto?> UpdateAsync(Guid id, ContactRequest request, CancellationToken cancellationToken = default)
        {
            var contact = await unitOfWork.Repository<Contact>().GetByIdAsync(id, cancellationToken);
            if (contact is null)
            {
                return null;
            }

            ContactMapper.Apply(request, contact);
            contact.UpdatedAt = DateTime.UtcNow;
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return ContactMapper.ToDto(contact);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var contact = await unitOfWork.Repository<Contact>().GetByIdAsync(id, cancellationToken);
            if (contact is null)
            {
                return false;
            }

            unitOfWork.Repository<Contact>().Remove(contact);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
