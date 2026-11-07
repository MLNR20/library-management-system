using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class StudyTableTests
    {
        private static Section SectionOf(SectionModel model) => new() { Id = Guid.NewGuid(), Name = "Quiet Hall", Model = model };

        [Fact]
        public void A_reading_room_can_hold_tables()
        {
            var exception = Record.Exception(() => StudyTable.EnsureSectionAllowsTables(SectionOf(SectionModel.ReadingRoom)));

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(SectionModel.None)]
        [InlineData(SectionModel.Wing)]
        public void A_section_that_is_not_a_reading_room_cannot_hold_tables(SectionModel model)
        {
            var exception = Assert.Throws<StudyTableException>(() => StudyTable.EnsureSectionAllowsTables(SectionOf(model)));

            Assert.Contains("Quiet Hall", exception.Message);
            Assert.Contains("reading room", exception.Message);
        }
    }
}
