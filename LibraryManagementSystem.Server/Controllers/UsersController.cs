using LibraryManagementSystem.Server.Dtos.Roles;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Administrators only: valid JWT without the role gets 403.
    // A user's roles are baked into the JWT at sign-in, so a change here takes effect the next time that user signs in.
    [ApiController]
    [Authorize(Roles = AppRoles.Administrator)]
    [Route("api/users")]
    public class UsersController(IUserRoleService userRoles, IAuditService audit) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<UserRolesDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await userRoles.GetUsersAsync(cancellationToken));

        [HttpGet("{id}/roles")]
        public async Task<ActionResult<UserRolesDto>> GetRoles(string id, CancellationToken cancellationToken)
        {
            var user = await userRoles.GetUserRolesAsync(id, cancellationToken);

            return user is null ? NotFound() : Ok(user);
        }

        // Grants one role; assigning a role the user already holds changes nothing.
        [HttpPost("{id}/roles")]
        public async Task<ActionResult<UserRolesDto>> Assign(string id, AssignRoleRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var before = await userRoles.GetUserRolesAsync(id, cancellationToken);
                var after = await userRoles.AssignAsync(id, request, cancellationToken);
                if (before is null || after is null)
                {
                    return NotFound();
                }

                await AuditChangesAsync(before, after, cancellationToken);

                return Ok(after);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status404NotFound, detail: ex.Message);
            }
        }

        // Replaces every role the user has with exactly the roles in the request.
        [HttpPut("{id}/roles")]
        public async Task<ActionResult<UserRolesDto>> SetRoles(string id, SetUserRolesRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var before = await userRoles.GetUserRolesAsync(id, cancellationToken);
                var after = await userRoles.SetRolesAsync(id, request, cancellationToken);
                if (before is null || after is null)
                {
                    return NotFound();
                }

                await AuditChangesAsync(before, after, cancellationToken);

                return Ok(after);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status404NotFound, detail: ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                // Would leave the library without an administrator.
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }

        [HttpDelete("{id}/roles/{roleName}")]
        public async Task<ActionResult<UserRolesDto>> Remove(string id, string roleName, CancellationToken cancellationToken)
        {
            try
            {
                var before = await userRoles.GetUserRolesAsync(id, cancellationToken);
                var after = await userRoles.RemoveAsync(id, roleName, cancellationToken);
                if (before is null || after is null)
                {
                    return NotFound();
                }

                await AuditChangesAsync(before, after, cancellationToken);

                return Ok(after);
            }
            catch (InvalidOperationException ex)
            {
                // Would leave the library without an administrator.
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }

        // Activates or deactivates the account; only active users can borrow books.
        [HttpPut("{id}/active")]
        public async Task<ActionResult<UserRolesDto>> SetActive(string id, SetUserActiveRequest request, CancellationToken cancellationToken)
        {
            var user = await userRoles.SetActiveAsync(id, request.IsActive, cancellationToken);
            if (user is null)
            {
                return NotFound();
            }

            await audit.WriteAsync(
                request.IsActive ? AuditActions.UserActivated : AuditActions.UserDeactivated,
                target: user.User.UserName,
                cancellationToken: cancellationToken);

            return Ok(user);
        }

        // One audit row per role that was actually granted or revoked.
        private async Task AuditChangesAsync(UserRolesDto before, UserRolesDto after, CancellationToken cancellationToken)
        {
            var userName = after.User.UserName;

            foreach (var role in after.Roles.Except(before.Roles, StringComparer.OrdinalIgnoreCase))
            {
                await audit.WriteAsync(AuditActions.RoleAssigned, target: $"{userName}: {role}", cancellationToken: cancellationToken);
            }

            foreach (var role in before.Roles.Except(after.Roles, StringComparer.OrdinalIgnoreCase))
            {
                await audit.WriteAsync(AuditActions.RoleRemoved, target: $"{userName}: {role}", cancellationToken: cancellationToken);
            }
        }
    }
}
