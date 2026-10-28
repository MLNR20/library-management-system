using FluentValidation;
using LibraryManagementSystem.Server.Dtos.AuditLogs;
using LibraryManagementSystem.Server.Dtos.Roles;

namespace LibraryManagementSystem.Server.Validators
{
    public class RoleRequestValidator : AbstractValidator<RoleRequest>
    {
        public RoleRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(256);
        }
    }

    public class AssignRoleRequestValidator : AbstractValidator<AssignRoleRequest>
    {
        public AssignRoleRequestValidator()
        {
            RuleFor(x => x.RoleName).NotEmpty().MaximumLength(256);
        }
    }

    public class SetUserRolesRequestValidator : AbstractValidator<SetUserRolesRequest>
    {
        public SetUserRolesRequestValidator()
        {
            RuleFor(x => x.RoleNames).NotNull();
            RuleForEach(x => x.RoleNames).NotEmpty().MaximumLength(256);
        }
    }

    public class AuditLogQueryValidator : AbstractValidator<AuditLogQuery>
    {
        public AuditLogQueryValidator()
        {
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
            RuleFor(x => x.Search).MaximumLength(200);
            RuleFor(x => x.Action).MaximumLength(100);
        }
    }
}
