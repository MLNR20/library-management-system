using Microsoft.AspNetCore.Identity;

namespace LibraryManagementSystem.Server.Services
{
    // Thrown when ASP.NET Identity rejects an operation (duplicate or invalid role name, and so on).
    public class IdentityException(IEnumerable<IdentityError> errors)
        : Exception(string.Join(" ", errors.Select(e => e.Description)))
    {
        public IReadOnlyList<IdentityError> Errors { get; } = errors.ToList();

        public static void ThrowIfFailed(IdentityResult result)
        {
            if (!result.Succeeded)
            {
                throw new IdentityException(result.Errors);
            }
        }
    }
}
