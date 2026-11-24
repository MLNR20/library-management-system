namespace LibraryManagementSystem.Server.Models
{
    // The kind of area a section adds to its floor in the 3D map. None keeps the section on the existing floor.
    // Serialised as a number; keep in sync with SectionModel in the client's api/resources.ts.
    public enum SectionModel
    {
        None = 0,
        Wing = 1,
        ReadingRoom = 2,
        // A reading room built as a glass-walled room (walls, a glass door, a TV on the wall and a table). It is a reading
        // room in every other way: tables can be assigned to it and the whole room can be reserved.
        StudyRoom = 3,
    }

    public static class SectionModelExtensions
    {
        // True for the models that are reading rooms: tables go in them and they can be reserved.
        public static bool IsReadingRoom(this SectionModel model) => model is SectionModel.ReadingRoom or SectionModel.StudyRoom;
    }
}
