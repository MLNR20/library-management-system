using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Dtos.Roles;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Administrators only: valid JWT without the role gets 403.
    [ApiController]
    [Authorize(Roles = AppRoles.Administrator)]
    [Route("api/roles")]
    public class RolesController(IRoleService roles, IUserRoleService userRoles, IAuditService audit) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<RoleDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await roles.GetAllAsync(cancellationToken));

        [HttpGet("{id}")]
        public async Task<ActionResult<RoleDto>> GetById(string id, CancellationToken cancellationToken)
        {
            var role = await roles.GetByIdAsync(id, cancellationToken);

            return role is null ? NotFound() : Ok(role);
        }

        // The users who hold the role.
        [HttpGet("{id}/users")]
        public async Task<ActionResult<IReadOnlyList<UserDto>>> GetUsers(string id, CancellationToken cancellationToken)
        {
            var users = await userRoles.GetUsersInRoleAsync(id, cancellationToken);

            return users is null ? NotFound() : Ok(users);
        }

        [HttpPost]
        public async Task<ActionResult<RoleDto>> Create(RoleRequest request, CancellationToken cancellationToken)
        {
            var role = await roles.CreateAsync(request, cancellationToken);
            await audit.WriteAsync(AuditActions.RoleCreated, target: role.Name, cancellationToken: cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = role.Id }, role);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<RoleDto>> Update(string id, RoleRequest request, CancellationToken cancellationToken)
        {
            var before = await roles.GetByIdAsync(id, cancellationToken);
            if (before is null)
            {
                return NotFound();
            }

            try
            {
                var role = await roles.UpdateAsync(id, request, cancellationToken);
                if (role is null)
                {
                    return NotFound();
                }

                await audit.WriteAsync(
                    AuditActions.RoleRenamed, target: role.Name, details: $"Renamed from '{before.Name}'", cancellationToken: cancellationToken);

                return Ok(role);
            }
            catch (InvalidOperationException ex)
            {
                // The built-in Administrator role.
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            var role = await roles.GetByIdAsync(id, cancellationToken);
            if (role is null)
            {
                return NotFound();
            }

            try
            {
                if (!await roles.DeleteAsync(id, cancellationToken))
                {
                    return NotFound();
                }
            }
            catch (InvalidOperationException ex)
            {
                // Built in, or users still hold the role.
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }

            await audit.WriteAsync(AuditActions.RoleDeleted, target: role.Name, cancellationToken: cancellationToken);

            return NoContent();
        }
    }
}
