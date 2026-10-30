using FluentValidation;
using LibraryManagementSystem.Server.Dtos.Contacts;

namespace LibraryManagementSystem.Server.Validators
{
    // Limits mirror the [StringLength] attributes on Models/Contact.cs.
    public class ContactRequestValidator : AbstractValidator<ContactRequest>
    {
        public ContactRequestValidator()
        {
            RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
            RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Email).NotEmpty().MaximumLength(256).EmailAddress();
            RuleFor(x => x.PhoneNumber).NotEmpty().MaximumLength(30)
                .Matches(@"^\+?[0-9\s\-().]+$").WithMessage("Phone number may only contain digits, spaces and + - ( ) .");
            RuleFor(x => x.Address).NotEmpty().MaximumLength(500);
        }
    }
}
