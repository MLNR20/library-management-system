using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Shelf
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>How the shelf is turned on the 3D map, in degrees. Only 90 or 180 are allowed.</summary>
        public int Rotation { get; set; } = RotationQuarter;

        public const int RotationQuarter = 90;
        public const int RotationHalf = 180;

        public static bool IsValidRotation(int rotation) => rotation is RotationQuarter or RotationHalf;

        public Guid FloorId { get; set; }

        public Floor Floor { get; set; } = null!;

        public ICollection<Row> Rows { get; set; } = [];
    }
}
