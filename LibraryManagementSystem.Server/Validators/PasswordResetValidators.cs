using FluentValidation;
using LibraryManagementSystem.Server.Dtos.Auth;

namespace LibraryManagementSystem.Server.Validators
{
    public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
    {
        public ForgotPasswordRequestValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty()
                .EmailAddress()
                .MaximumLength(256);
        }
    }

    public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
    {
        public ResetPasswordRequestValidator()
        {
            RuleFor(x => x.UserId)
                .NotEmpty()
                .MaximumLength(450);

            RuleFor(x => x.Token)
                .NotEmpty()
                .MaximumLength(2000);

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
