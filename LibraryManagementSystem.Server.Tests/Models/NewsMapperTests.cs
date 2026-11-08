using LibraryManagementSystem.Server.Dtos.News;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class NewsMapperTests
    {
        private const string Image = "0123456789abcdef0123456789abcdef.png";

        [Fact]
        public void The_stored_image_name_is_exactly_what_was_uploaded()
        {
            var post = NewsMapper.ToEntity(new NewsPostRequest("Title", "<p>Body</p>", Image));

            Assert.Equal(Image, post.ImageFileName);
        }

        [Fact]
        public void Applying_a_request_keeps_the_plain_image_name()
        {
            var post = new NewsPost();

            NewsMapper.Apply(new NewsPostRequest("Title", "<p>Body</p>", Image), post);

            Assert.Equal(Image, post.ImageFileName);
        }

        [Fact]
        public void The_dto_turns_the_image_name_into_a_url()
        {
            var dto = NewsMapper.ToDto(new NewsPost { Title = "T", Body = "<p>B</p>", ImageFileName = Image });

            Assert.Equal($"/api/news/images/{Image}", dto.ImageUrl);
        }

        [Fact]
        public void An_article_without_an_image_has_no_url()
        {
            var dto = NewsMapper.ToDto(new NewsPost { Title = "T", Body = "<p>B</p>" });

            Assert.Null(dto.ImageUrl);
        }
    }
}
