using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    // A named area of the library (e.g. "Reference") assigned to a floor and one of that floor's shelves.
    public class Section
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public Guid FloorId { get; set; }

        public Floor Floor { get; set; } = null!;

        public Guid ShelfId { get; set; }

        public Shelf Shelf { get; set; } = null!;
    }
}
