using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace LibraryManagementSystem.Server.Data
{
    // Writes an AuditLog row for every catalogue entity that is created, changed or deleted, in the same
    // SaveChanges (and so the same transaction) as the change itself. Only catalogue types are listed:
    // identity tables and AuditLog are deliberately not audited here.
    public class AuditSaveChangesInterceptor(IHttpContextAccessor httpContextAccessor) : SaveChangesInterceptor
    {
        private static readonly HashSet<Type> AuditedTypes =
            [typeof(Book), typeof(Genre), typeof(Author), typeof(Language), typeof(Floor), typeof(Shelf), typeof(Row), typeof(Section), typeof(Announcement), typeof(Contact)];

        public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
        {
            Record(eventData.Context);

            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            Record(eventData.Context);

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        private void Record(DbContext? context)
        {
            if (context is null)
            {
                return;
            }

            context.ChangeTracker.DetectChanges();

            var http = httpContextAccessor.HttpContext;
            var entries = context.ChangeTracker.Entries()
                .Where(e => AuditedTypes.Contains(e.Entity.GetType()) && ChangeKind(e) is not null)
                .ToList();

            foreach (var entry in entries)
            {
                var typeName = entry.Entity.GetType().Name;
                var action = $"{typeName}.{ChangeKind(entry)}";

                context.Set<AuditLog>().Add(AuditEntry.Create(http, action, success: true, $"{typeName}: {Describe(entry.Entity)}", Details(entry)));
            }
        }

        // Created / Updated / Deleted, or null when nothing worth recording changed.
        // An Unchanged row with modified collections is a many-to-many edit (a book's authors, languages or rows).
        private static string? ChangeKind(EntityEntry entry) => entry.State switch
        {
            EntityState.Added => "Created",
            EntityState.Deleted => "Deleted",
            EntityState.Modified => "Updated",
            EntityState.Unchanged when entry.Collections.Any(c => c.IsModified) => "Updated",
            _ => null
        };

        private static string Describe(object entity) => entity switch
        {
            Book book => book.Title,
            Genre genre => genre.Name,
            Author author => author.Name,
            Language language => language.Name,
            Floor floor => floor.Name,
            Shelf shelf => shelf.Name,
            Row row => row.Name,
            Section section => section.Name,
            Announcement announcement => announcement.Title,
            Contact contact => $"{contact.FirstName} {contact.LastName}",
            _ => entity.GetType().Name
        };

        // For an update: "Title: 'Old' → 'New'; Pages: '300' → '320'". Creates and deletes need no detail.
        private static string? Details(EntityEntry entry)
        {
            if (entry.State is EntityState.Added or EntityState.Deleted)
            {
                return null;
            }

            var changes = entry.Properties
                .Where(p => p.IsModified && !p.Metadata.IsPrimaryKey())
                .Select(p => $"{p.Metadata.Name}: '{p.OriginalValue}' → '{p.CurrentValue}'")
                .ToList();

            if (entry.Collections.Any(c => c.IsModified))
            {
                changes.Add("Relations changed");
            }

            return changes.Count == 0 ? null : string.Join("; ", changes);
        }
    }
}
