using LibraryManagementSystem.Server.Dtos.Authors;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/authors")]
    public class AuthorsController(IAuthorService authors) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<AuthorDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await authors.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<AuthorDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var author = await authors.GetByIdAsync(id, cancellationToken);

            return author is null ? NotFound() : Ok(author);
        }

        [HttpPost]
        public async Task<ActionResult<AuthorDto>> Create(AuthorRequest request, CancellationToken cancellationToken)
        {
            var author = await authors.CreateAsync(request, cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = author.Id }, author);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<AuthorDto>> Update(Guid id, AuthorRequest request, CancellationToken cancellationToken)
        {
            var author = await authors.UpdateAsync(id, request, cancellationToken);

            return author is null ? NotFound() : Ok(author);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
            await authors.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
