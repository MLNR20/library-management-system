using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Genre
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        // One Dewey Decimal number, not a range: three digits with an optional decimal part, e.g. "510" or "516.3".
        [StringLength(20)]
        [RegularExpression(DeweyPattern)]
        public string? DeweyNumber { get; set; }

        public const string DeweyPattern = @"^\d{3}(\.\d+)?$";

        public ICollection<Book> Books { get; set; } = [];
    }
}
