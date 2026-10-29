using FluentValidation;
using LibraryManagementSystem.Server.Dtos.Authors;
using LibraryManagementSystem.Server.Dtos.Books;
using LibraryManagementSystem.Server.Dtos.Floors;
using LibraryManagementSystem.Server.Dtos.Rows;
using LibraryManagementSystem.Server.Dtos.Sections;
using LibraryManagementSystem.Server.Dtos.Shelves;
using LibraryManagementSystem.Server.Dtos.Genres;
using LibraryManagementSystem.Server.Dtos.Languages;
using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Validators
{
    // Limits mirror the [StringLength] / [Range] attributes on the entities in Models/.

    public class AuthorRequestValidator : AbstractValidator<AuthorRequest>
    {
        public AuthorRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        }
    }

    public class GenreRequestValidator : AbstractValidator<GenreRequest>
    {
        public GenreRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Description).MaximumLength(500);
        }
    }

    public class LanguageRequestValidator : AbstractValidator<LanguageRequest>
    {
        public LanguageRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(50);
            RuleFor(x => x.Code).MaximumLength(5);
        }
    }

    public class BookRequestValidator : AbstractValidator<BookRequest>
    {
        public BookRequestValidator()
        {
            RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
            RuleFor(x => x.Isbn).NotEmpty().MaximumLength(17);
            RuleFor(x => x.Edition).MaximumLength(50);
            RuleFor(x => x.Pages).GreaterThan(0);
            RuleFor(x => x.Status).IsInEnum();
            RuleFor(x => x.DateAcquired).NotEqual(default(DateOnly)).WithMessage("Date acquired is required.");
            RuleFor(x => x.GenreId).NotEmpty();
            RuleFor(x => x.AuthorIds).NotNull();
            RuleFor(x => x.LanguageIds).NotNull();
            RuleFor(x => x.RowIds).NotNull();
        }
    }

    public class FloorRequestValidator : AbstractValidator<FloorRequest>
    {
        public FloorRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        }
    }

    public class ShelfRequestValidator : AbstractValidator<ShelfRequest>
    {
        public ShelfRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
            RuleFor(x => x.FloorId).NotEmpty();
            RuleFor(x => x.Rotation).Must(Shelf.IsValidRotation).WithMessage("Rotation must be 90 or 180 degrees.");
        }
    }

    public class RowRequestValidator : AbstractValidator<RowRequest>
    {
        public RowRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
            RuleFor(x => x.ShelfId).NotEmpty();
        }
    }

    public class SectionRequestValidator : AbstractValidator<SectionRequest>
    {
        public SectionRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
            RuleFor(x => x.FloorId).NotEmpty();
            RuleFor(x => x.ShelfId).NotEmpty();
        }
    }
}
