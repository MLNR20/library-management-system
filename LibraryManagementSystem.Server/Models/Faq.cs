using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Faq
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(250)]
        public string Question { get; set; } = string.Empty;

        /// <summary>The answer as sanitised HTML from the rich text editor.</summary>
        [Required]
        public string Answer { get; set; } = string.Empty;

        /// <summary>Questions are listed lowest position first; ties go to the older one.</summary>
        public int Position { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
