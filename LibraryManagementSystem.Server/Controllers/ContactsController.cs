using LibraryManagementSystem.Server.Dtos.Contacts;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/contacts")]
    public class ContactsController(IContactService contacts) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<ContactDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await contacts.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ContactDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var contact = await contacts.GetByIdAsync(id, cancellationToken);

            return contact is null ? NotFound() : Ok(contact);
        }

        [HttpPost]
        public async Task<ActionResult<ContactDto>> Create(ContactRequest request, CancellationToken cancellationToken)
        {
            var contact = await contacts.CreateAsync(request, cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = contact.Id }, contact);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<ContactDto>> Update(Guid id, ContactRequest request, CancellationToken cancellationToken)
        {
            var contact = await contacts.UpdateAsync(id, request, cancellationToken);

            return contact is null ? NotFound() : Ok(contact);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
            await contacts.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
