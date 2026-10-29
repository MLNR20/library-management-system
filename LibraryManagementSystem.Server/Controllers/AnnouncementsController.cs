using LibraryManagementSystem.Server.Dtos.Announcements;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/announcements")]
    public class AnnouncementsController(IAnnouncementService announcements) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<AnnouncementDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await announcements.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<AnnouncementDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var announcement = await announcements.GetByIdAsync(id, cancellationToken);

            return announcement is null ? NotFound() : Ok(announcement);
        }

        [HttpPost]
        public async Task<ActionResult<AnnouncementDto>> Create(AnnouncementRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var announcement = await announcements.CreateAsync(request, cancellationToken);

                return CreatedAtAction(nameof(GetById), new { id = announcement.Id }, announcement);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<AnnouncementDto>> Update(Guid id, AnnouncementRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var announcement = await announcements.UpdateAsync(id, request, cancellationToken);

                return announcement is null ? NotFound() : Ok(announcement);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
            await announcements.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
