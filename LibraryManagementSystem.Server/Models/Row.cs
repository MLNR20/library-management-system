using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    // A row on a shelf. Books are placed in rows.
    public class Row
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public Guid ShelfId { get; set; }

        public Shelf Shelf { get; set; } = null!;

        public ICollection<Book> Books { get; set; } = [];
    }
}
