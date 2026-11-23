using FluentValidation;
using LibraryManagementSystem.Server.Dtos.Auth;

namespace LibraryManagementSystem.Server.Validators
{
    public class ExternalSignInRequestValidator : AbstractValidator<ExternalSignInRequest>
    {
        public ExternalSignInRequestValidator()
        {
            // Firebase ID tokens are a few kilobytes; the cap only stops absurd bodies.
            RuleFor(x => x.IdToken).NotEmpty().MaximumLength(8192);
        }
    }
}
