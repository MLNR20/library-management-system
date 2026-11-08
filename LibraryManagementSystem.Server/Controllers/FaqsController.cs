using LibraryManagementSystem.Server.Dtos.News;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Questions and answers are public (the landing page shows them); only librarians and administrators write.
    [ApiController]
    [Route("api/faqs")]
    public class FaqsController(IFaqService faqs) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<FaqDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await faqs.GetAllAsync(cancellationToken));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<FaqDto>> GetById(Guid id, CancellationToken cancellationToken)
        {
            var faq = await faqs.GetByIdAsync(id, cancellationToken);

            return faq is null ? NotFound() : Ok(faq);
        }

        [HttpPost]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<ActionResult<FaqDto>> Create(FaqRequest request, CancellationToken cancellationToken)
        {
            var faq = await faqs.CreateAsync(request, cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = faq.Id }, faq);
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<ActionResult<FaqDto>> Update(Guid id, FaqRequest request, CancellationToken cancellationToken)
        {
            var faq = await faqs.UpdateAsync(id, request, cancellationToken);

            return faq is null ? NotFound() : Ok(faq);
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = AppRoles.Staff)]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
            await faqs.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
