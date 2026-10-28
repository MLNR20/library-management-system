using LibraryManagementSystem.Server.Dtos.Sections;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/sections")]
    public class SectionsController(ISectionService sections) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<SectionDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await sections.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<SectionDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var section = await sections.GetByIdAsync(id, cancellationToken);

            return section is null ? NotFound() : Ok(section);
        }

        [HttpPost]
        public async Task<ActionResult<SectionDto>> Create(SectionRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var section = await sections.CreateAsync(request, cancellationToken);

                return CreatedAtAction(nameof(GetById), new { id = section.Id }, section);
            }
            catch (Exception ex) when (ex is KeyNotFoundException or ArgumentException)
            {
                // Unknown floor/shelf, or the shelf is not on the chosen floor.
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<SectionDto>> Update(Guid id, SectionRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var section = await sections.UpdateAsync(id, request, cancellationToken);

                return section is null ? NotFound() : Ok(section);
            }
            catch (Exception ex) when (ex is KeyNotFoundException or ArgumentException)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
            await sections.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
