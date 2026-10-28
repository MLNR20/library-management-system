using LibraryManagementSystem.Server.Dtos.Genres;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/genres")]
    public class GenresController(IGenreService genres) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<GenreDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await genres.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<GenreDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var genre = await genres.GetByIdAsync(id, cancellationToken);

            return genre is null ? NotFound() : Ok(genre);
        }

        [HttpPost]
        public async Task<ActionResult<GenreDto>> Create(GenreRequest request, CancellationToken cancellationToken)
        {
            var genre = await genres.CreateAsync(request, cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = genre.Id }, genre);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<GenreDto>> Update(Guid id, GenreRequest request, CancellationToken cancellationToken)
        {
            var genre = await genres.UpdateAsync(id, request, cancellationToken);

            return genre is null ? NotFound() : Ok(genre);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                return await genres.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                // The genre is still referenced by books.
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }
    }
}
