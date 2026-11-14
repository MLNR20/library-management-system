using LibraryManagementSystem.Server.Filters;
using LibraryManagementSystem.Server.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LibraryManagementSystem.Server.Tests.Services
{
    public class ConflictExceptionHandlerTests
    {
        private static async Task<(bool Handled, int Status, string Body)> RunAsync(Exception exception)
        {
            var services = new ServiceCollection().AddLogging().AddProblemDetails().BuildServiceProvider();
            var context = new DefaultHttpContext { RequestServices = services };
            context.Response.Body = new MemoryStream();

            var handled = await new ConflictExceptionHandler().TryHandleAsync(context, exception, CancellationToken.None);

            context.Response.Body.Position = 0;
            var body = await new StreamReader(context.Response.Body).ReadToEndAsync();

            return (handled, context.Response.StatusCode, body);
        }

        [Fact]
        public async Task A_concurrency_conflict_becomes_a_409()
        {
            var (handled, status, body) = await RunAsync(new DbUpdateConcurrencyException("stale row"));

            Assert.True(handled);
            Assert.Equal(StatusCodes.Status409Conflict, status);
            Assert.Contains("changed by someone else", body);
            Assert.DoesNotContain("stale row", body);
        }

        [Fact]
        public async Task A_book_state_error_becomes_a_409_with_its_message()
        {
            var (handled, status, body) = await RunAsync(new BookStateException("'Dune' cannot go from lost to borrowed."));

            Assert.True(handled);
            Assert.Equal(StatusCodes.Status409Conflict, status);
            Assert.Contains("cannot go from lost to borrowed", body);
        }

        [Fact]
        public async Task Other_exceptions_are_left_for_the_next_handler()
        {
            var (handled, _, _) = await RunAsync(new InvalidOperationException("boom"));

            Assert.False(handled);
        }
    }
}
