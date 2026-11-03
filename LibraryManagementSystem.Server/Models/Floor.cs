using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Floor
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        // Cube-sized wings built beside the floor on the 3D map; they widen every floor of the building.
        // A floor always has 2 or 4 of them.
        [Range(2, 4)]
        public int Wings { get; set; } = 4;

        public ICollection<Shelf> Shelves { get; set; } = [];
    }
}
