using FluentValidation;
using LibraryManagementSystem.Server.Dtos.Announcements;
using LibraryManagementSystem.Server.Dtos.Authors;
using LibraryManagementSystem.Server.Dtos.Books;
using LibraryManagementSystem.Server.Dtos.Floors;
using LibraryManagementSystem.Server.Dtos.News;
using LibraryManagementSystem.Server.Dtos.Reservations;
using LibraryManagementSystem.Server.Dtos.Rows;
using LibraryManagementSystem.Server.Dtos.Sections;
using LibraryManagementSystem.Server.Dtos.Shelves;
using LibraryManagementSystem.Server.Dtos.Genres;
using LibraryManagementSystem.Server.Dtos.Languages;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Services;

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
            RuleFor(x => x.DeweyNumber)
                .Matches(Genre.DeweyPattern)
                .WithMessage("Dewey number must be a single number such as 510 or 516.3, not a range.")
                .When(x => !string.IsNullOrEmpty(x.DeweyNumber));
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
            RuleFor(x => x.Wings).Must(wings => wings is 2 or 4).WithMessage("A floor has 2 or 4 wings.");
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

    public class AnnouncementRequestValidator : AbstractValidator<AnnouncementRequest>
    {
        public AnnouncementRequestValidator()
        {
            RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
            RuleFor(x => x.Body).NotEmpty().MaximumLength(20000)
                .Must(body => RichText.ToPlainText(RichText.Sanitize(body)).Length > 0).WithMessage("Write a message.");
            RuleFor(x => x.FloorId).NotEqual(Guid.Empty).When(x => x.FloorId is not null);
        }
    }

    public class NewsPostRequestValidator : AbstractValidator<NewsPostRequest>
    {
        public NewsPostRequestValidator()
        {
            RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
            RuleFor(x => x.Body).NotEmpty().MaximumLength(50000)
                .Must(body => RichText.ToPlainText(RichText.Sanitize(body)).Length > 0).WithMessage("Write the article.");
            RuleFor(x => x.ImageFileName).Must(NewsImageStore.IsValidName).WithMessage("The cover image is not valid.")
                .When(x => x.ImageFileName is not null);
        }
    }

    public class FaqRequestValidator : AbstractValidator<FaqRequest>
    {
        public FaqRequestValidator()
        {
            RuleFor(x => x.Question).NotEmpty().MaximumLength(250);
            RuleFor(x => x.Answer).NotEmpty().MaximumLength(20000)
                .Must(answer => RichText.ToPlainText(RichText.Sanitize(answer)).Length > 0).WithMessage("Write an answer.");
            RuleFor(x => x.Position).InclusiveBetween(0, 10000);
        }
    }

    public class StudyTableRequestValidator: AbstractValidator<StudyTableRequest>
    {
        public StudyTableRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Seats).InclusiveBetween(1, 50);
            RuleFor(x => x.SectionId).NotEqual(Guid.Empty).When(x => x.SectionId is not null);
        }
    }

    public class TableReservationRequestValidator : AbstractValidator<TableReservationRequest>
    {
        public TableReservationRequestValidator()
        {
            RuleFor(x => x.TableId).NotEmpty();
            RuleFor(x => x.StartUtc).NotEqual(default(DateTime)).WithMessage("Start time is required.");
            RuleFor(x => x.EndUtc).GreaterThan(x => x.StartUtc).WithMessage("The reservation must end after it starts.");
            RuleFor(x => x.Note).MaximumLength(TableReservation.NoteMaxLength);
        }
    }

    public class RoomReservationRequestValidator : AbstractValidator<RoomReservationRequest>
    {
        public RoomReservationRequestValidator()
        {
            RuleFor(x => x.SectionId).NotEmpty();
            RuleFor(x => x.StartUtc).NotEqual(default(DateTime)).WithMessage("Start time is required.");
            RuleFor(x => x.EndUtc).GreaterThan(x => x.StartUtc).WithMessage("The reservation must end after it starts.");
            RuleFor(x => x.Note).MaximumLength(ReservationBase.NoteMaxLength);
        }
    }

    public class RejectReservationRequestValidator : AbstractValidator<RejectReservationRequest>
    {
        public RejectReservationRequestValidator()
        {
            RuleFor(x => x.Reason).MaximumLength(TableReservation.NoteMaxLength);
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
            RuleFor(x => x.Model).IsInEnum();
        }
    }
}
