namespace LibraryManagementSystem.Server.Models
{
    // The kind of area a section adds to its floor in the 3D map. None keeps the section on the existing floor.
    // Serialised as a number; keep in sync with SectionModel in the client's api/resources.ts.
    public enum SectionModel
    {
        None = 0,
        Wing = 1,
        ReadingRoom = 2,
    }
}
