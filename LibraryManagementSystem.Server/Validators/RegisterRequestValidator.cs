using FluentValidation;
using LibraryManagementSystem.Server.Dtos.Auth;

namespace LibraryManagementSystem.Server.Validators
{
    public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
    {
        public RegisterRequestValidator()
        {
            // Matches Identity's default AllowedUserNameCharacters.
            RuleFor(x => x.UserName)
                .NotEmpty()
                .MinimumLength(3)
                .MaximumLength(50)
                .Matches("^[A-Za-z0-9._@+-]+$")
                .WithMessage("User name may only contain letters, digits and . _ @ + -");

            RuleFor(x => x.Email)
                .NotEmpty()
                .EmailAddress()
                .MaximumLength(256);

            // Complexity rules (digit, upper/lower case, symbol) are enforced by ASP.NET Core Identity.
            RuleFor(x => x.Password)
                .NotEmpty()
                .MinimumLength(8)
                .MaximumLength(128);

            RuleFor(x => x.ConfirmPassword)
                .Equal(x => x.Password).WithMessage("Passwords do not match.");
        }
    }
}
