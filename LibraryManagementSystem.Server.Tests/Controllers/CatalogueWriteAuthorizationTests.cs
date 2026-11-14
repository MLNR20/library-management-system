using System.Reflection;
using LibraryManagementSystem.Server.Controllers;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;

namespace LibraryManagementSystem.Server.Tests.Controllers
{
    // Changing the catalogue is staff work: a signed-in student (or a freshly registered account with no role) must get
    // 403 from every create, update and delete, while administrators and librarians pass. Reads stay open to any signed-in user.
    public class CatalogueWriteAuthorizationTests
    {
        public static TheoryData<Type> CatalogueControllers =>
        [
            typeof(BooksController),
            typeof(AuthorsController),
            typeof(GenresController),
            typeof(LanguagesController),
            typeof(FloorsController),
            typeof(ShelvesController),
            typeof(RowsController),
            typeof(SectionsController),
            typeof(ContactsController),
            typeof(AnnouncementsController)
        ];

        [Theory]
        [MemberData(nameof(CatalogueControllers))]
        public void Every_write_action_is_limited_to_staff(Type controller)
        {
            var writes = controller
                .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .Where(m => m.GetCustomAttributes<HttpMethodAttribute>().Any(a => a is HttpPostAttribute or HttpPutAttribute or HttpDeleteAttribute))
                .ToList();

            Assert.NotEmpty(writes);

            foreach (var action in writes)
            {
                var roles = action.GetCustomAttributes<AuthorizeAttribute>().Select(a => a.Roles).ToList();

                Assert.True(
                    roles.Contains(AppRoles.Staff),
                    $"{controller.Name}.{action.Name} must have [Authorize(Roles = AppRoles.Staff)].");
            }
        }

        [Fact]
        public void Staff_means_administrators_and_librarians()
        {
            var roles = AppRoles.Staff.Split(',');

            Assert.Contains(AppRoles.Administrator, roles);
            Assert.Contains(AppRoles.Librarian, roles);
            Assert.DoesNotContain(AppRoles.Student, roles);
            Assert.DoesNotContain(AppRoles.Visitor, roles);
        }
    }
}
