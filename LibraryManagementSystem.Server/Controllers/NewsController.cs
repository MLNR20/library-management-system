using LibraryManagementSystem.Server.Dtos.News;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // News is public: anyone can read it and fetch its images (the landing page shows it).
    // Only librarians and administrators write.
    [ApiController]
    [Route("api/news")]
    public class NewsController(INewsService news, INewsImageStore images) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<NewsPostDto>>> GetAll([FromQuery] int? take, CancellationToken cancellationToken) =>
            Ok(await news.GetAllAsync(take is > 0 ? Math.Min(take.Value, 100) : null, cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<NewsPostDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var post = await news.GetByIdAsync(id, cancellationToken);

            return post is null ? NotFound() : Ok(post);
        }

        [HttpPost]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<ActionResult<NewsPostDto>> Create(NewsPostRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var post = await news.CreateAsync(request, cancellationToken);

                return CreatedAtAction(nameof(GetById), new { id = post.Id }, post);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<ActionResult<NewsPostDto>> Update(Guid id, NewsPostRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var post = await news.UpdateAsync(id, request, cancellationToken);

                return post is null ? NotFound() : Ok(post);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
            await news.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();

        // Upload first, then save the article with the returned file name. A multipart body with a single "file" part.
        [HttpPost("images")]
        [Authorize(Roles = AppRoles.Staff)]
        [RequestSizeLimit(NewsImageStore.MaxBytes + 64 * 1024)]
        public async Task<ActionResult<NewsImageDto>> UploadImage(IFormFile file, CancellationToken cancellationToken)
        {
            try
            {
                var fileName = await images.SaveAsync(file, cancellationToken);

                return Ok(new NewsImageDto(fileName, NewsImageStore.UrlFor(fileName)));
            }
            catch (NewsImageException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
        }

        // The file name is a random id, so a given URL never changes content and can be cached for a long time.
        [HttpGet("images/{fileName}")]
        public IActionResult GetImage(string fileName)
        {
            var image = images.Open(fileName);
            if (image is null)
            {
                return NotFound();
            }

            Response.Headers.CacheControl = "public,max-age=31536000,immutable";

            return File(image.Value.Content, image.Value.ContentType);
        }
    }
}
