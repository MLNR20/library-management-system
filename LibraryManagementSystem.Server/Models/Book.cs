using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Book
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(300)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(17)]
        public string Isbn { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Edition { get; set; }

        [Range(1, int.MaxValue)]
        public int Pages { get; set; }

        public BookStatus Status { get; set; } = BookStatus.Available;

        public DateOnly DateAcquired { get; set; }

        public Guid GenreId { get; set; }

        public Genre Genre { get; set; } = null!;

        public ICollection<Author> Authors { get; set; } = [];

        public ICollection<Language> Languages { get; set; } = [];

        // Where the book is shelved; a book can be spread over several rows.
        public ICollection<Row> Rows { get; set; } = [];
    }
}
