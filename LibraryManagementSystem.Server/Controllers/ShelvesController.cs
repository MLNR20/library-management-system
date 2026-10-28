using LibraryManagementSystem.Server.Dtos.Shelves;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/shelves")]
    public class ShelvesController(IShelfService shelves) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<ShelfDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await shelves.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ShelfDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var shelf = await shelves.GetByIdAsync(id, cancellationToken);

            return shelf is null ? NotFound() : Ok(shelf);
        }

        [HttpPost]
        public async Task<ActionResult<ShelfDto>> Create(ShelfRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var shelf = await shelves.CreateAsync(request, cancellationToken);

                return CreatedAtAction(nameof(GetById), new { id = shelf.Id }, shelf);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<ShelfDto>> Update(Guid id, ShelfRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var shelf = await shelves.UpdateAsync(id, request, cancellationToken);

                return shelf is null ? NotFound() : Ok(shelf);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                return await shelves.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                // Rows or sections still use the shelf.
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }
    }
}
