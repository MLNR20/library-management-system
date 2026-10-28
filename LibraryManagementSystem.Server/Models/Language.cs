using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Language
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;

        // ISO 639-1 code, e.g. "en".
        [StringLength(5)]
        public string? Code { get; set; }

        public ICollection<Book> Books { get; set; } = [];
    }
}
