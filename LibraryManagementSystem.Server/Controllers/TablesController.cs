using LibraryManagementSystem.Server.Dtos.Reservations;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Everyone signed in can list the tables in service; only librarians and administrators manage them.
    [ApiController]
    [Authorize]
    [Route("api/tables")]
    public class TablesController(IStudyTableService tables) : ControllerBase
    {
        private bool IsStaff() => User.IsInRole(AppRoles.Administrator) || User.IsInRole(AppRoles.Librarian);

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<StudyTableDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await tables.GetAllAsync(includeInactive: IsStaff(), cancellationToken));

        [HttpPost]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<ActionResult<StudyTableDto>> Create(StudyTableRequest request, CancellationToken cancellationToken)
        {
            try
            {
                return Ok(await tables.CreateAsync(request, cancellationToken));
            }
            catch (Exception ex) when (ex is KeyNotFoundException or StudyTableException)
            {
                return TableProblem(ex);
            }
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<ActionResult<StudyTableDto>> Update(Guid id, StudyTableRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var table = await tables.UpdateAsync(id, request, cancellationToken);

                return table is null ? NotFound() : Ok(table);
            }
            catch (Exception ex) when (ex is KeyNotFoundException or StudyTableException)
            {
                return TableProblem(ex);
            }
        }

        // A missing section is a 404; a section that is not a reading room is a broken rule, a 409.
        private ObjectResult TableProblem(Exception ex) =>
            Problem(statusCode: ex is KeyNotFoundException ? StatusCodes.Status404NotFound : StatusCodes.Status409Conflict, detail: ex.Message);

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                return await tables.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }
    }
}
