using LibraryManagementSystem.Server.Dtos.Books;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/books")]
    public class BooksController(IBookService books) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<BookDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await books.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<BookDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var book = await books.GetByIdAsync(id, cancellationToken);

            return book is null ? NotFound() : Ok(book);
        }

        [HttpPost]
        public async Task<ActionResult<BookDto>> Create(BookRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var book = await books.CreateAsync(request, cancellationToken);

                return CreatedAtAction(nameof(GetById), new { id = book.Id }, book);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<BookDto>> Update(Guid id, BookRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var book = await books.UpdateAsync(id, request, cancellationToken);

                return book is null ? NotFound() : Ok(book);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
            await books.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
