using LibraryManagementSystem.Server.Dtos.Rows;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/rows")]
    public class RowsController(IRowService rows) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<RowDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await rows.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<RowDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var row = await rows.GetByIdAsync(id, cancellationToken);

            return row is null ? NotFound() : Ok(row);
        }

        [HttpPost]
        public async Task<ActionResult<RowDto>> Create(RowRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var row = await rows.CreateAsync(request, cancellationToken);

                return CreatedAtAction(nameof(GetById), new { id = row.Id }, row);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<RowDto>> Update(Guid id, RowRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var row = await rows.UpdateAsync(id, request, cancellationToken);

                return row is null ? NotFound() : Ok(row);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                return await rows.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                // Books are still shelved in the row.
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }
    }
}
