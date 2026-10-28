using LibraryManagementSystem.Server.Dtos.Languages;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every action needs a valid JWT; anonymous callers get 401.
    [ApiController]
    [Authorize]
    [Route("api/languages")]
    public class LanguagesController(ILanguageService languages) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<LanguageDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await languages.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<LanguageDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var language = await languages.GetByIdAsync(id, cancellationToken);

            return language is null ? NotFound() : Ok(language);
        }

        [HttpPost]
        public async Task<ActionResult<LanguageDto>> Create(LanguageRequest request, CancellationToken cancellationToken)
        {
            var language = await languages.CreateAsync(request, cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = language.Id }, language);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<LanguageDto>> Update(Guid id, LanguageRequest request, CancellationToken cancellationToken)
        {
            var language = await languages.UpdateAsync(id, request, cancellationToken);

            return language is null ? NotFound() : Ok(language);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
            await languages.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
