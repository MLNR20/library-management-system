using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    // A table in the library that students can reserve. One table has many reservations (one-to-many).
    public class StudyTable
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Range(1, 50)]
        public int Seats { get; set; } = 4;

        // An inactive table is out of service and cannot be reserved; its past reservations stay as history.
        public bool IsActive { get; set; } = true;

        // The area the table is in. Optional, but when set it must be a reading room (see EnsureSectionAllowsTables).
        public Guid? SectionId { get; set; }

        public Section? Section { get; set; }

        // Tables only go in reading rooms: not in a plain section and not in a wing (those are for shelves).
        public static void EnsureSectionAllowsTables(Section section)
        {
            if (section.Model != SectionModel.ReadingRoom)
            {
                throw new StudyTableException(
                    $"Section '{section.Name}' is not a reading room. Tables can only be assigned to reading rooms.");
            }
        }

        public ICollection<TableReservation> Reservations { get; set; } = [];
    }

    // A table was put somewhere it does not belong (a section that is not a reading room).
    public class StudyTableException(string message) : InvalidOperationException(message);
}
