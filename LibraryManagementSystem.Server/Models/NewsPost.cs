using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class NewsPost
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(150)]
        public string Title { get; set; } = string.Empty;

        /// <summary>The article as sanitised HTML from the rich text editor.</summary>
        [Required]
        public string Body { get; set; } = string.Empty;

        /// <summary>Name of the cover image in the news image store, or null when the article has none.</summary>
        [StringLength(60)]
        public string? ImageFileName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
