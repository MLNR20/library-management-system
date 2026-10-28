using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Shelf
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public Guid FloorId { get; set; }

        public Floor Floor { get; set; } = null!;

        public ICollection<Row> Rows { get; set; } = [];
    }
}
