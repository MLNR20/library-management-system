using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Announcement
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(150)]
        public string Title { get; set; } = string.Empty;

        /// <summary>The message as sanitised HTML from the rich text editor.</summary>
        [Required]
        public string Body { get; set; } = string.Empty;

        /// <summary>The floor the announcement is for, or null when it applies to the entire library.</summary>
        public Guid? FloorId { get; set; }

        public Floor? Floor { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
