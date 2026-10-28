using LibraryManagementSystem.Server.Dtos.Floors;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/floors")]
    public class FloorsController(IFloorService floors) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<FloorDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await floors.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<FloorDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var floor = await floors.GetByIdAsync(id, cancellationToken);

            return floor is null ? NotFound() : Ok(floor);
        }

        [HttpPost]
        public async Task<ActionResult<FloorDto>> Create(FloorRequest request, CancellationToken cancellationToken)
        {
            var floor = await floors.CreateAsync(request, cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = floor.Id }, floor);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<FloorDto>> Update(Guid id, FloorRequest request, CancellationToken cancellationToken)
        {
            var floor = await floors.UpdateAsync(id, request, cancellationToken);

            return floor is null ? NotFound() : Ok(floor);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                return await floors.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                // Shelves or sections still use the floor.
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }
    }
}
