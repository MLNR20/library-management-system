using FluentValidation;
using LibraryManagementSystem.Server.Dtos.Borrowings;

namespace LibraryManagementSystem.Server.Validators
{
    public class BorrowRequestValidator : AbstractValidator<BorrowRequest>
    {
        public BorrowRequestValidator()
        {
            RuleFor(x => x.BookId).NotEmpty();
            RuleFor(x => x.UserId).MaximumLength(450);
        }
    }
}
