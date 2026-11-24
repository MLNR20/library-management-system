using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class SectionModelTests
    {
        [Theory]
        [InlineData(SectionModel.ReadingRoom, true)]
        [InlineData(SectionModel.StudyRoom, true)]
        [InlineData(SectionModel.None, false)]
        [InlineData(SectionModel.Wing, false)]
        public void Only_reading_room_models_count_as_reading_rooms(SectionModel model, bool expected)
        {
            Assert.Equal(expected, model.IsReadingRoom());
        }
    }
}
