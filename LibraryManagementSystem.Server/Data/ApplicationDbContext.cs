using LibraryManagementSystem.Server.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Data
{
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : IdentityDbContext<ApplicationUser, IdentityRole, string>(options)
    {
        public DbSet<Book> Books => Set<Book>();
        public DbSet<Genre> Genres => Set<Genre>();
        public DbSet<Author> Authors => Set<Author>();
        public DbSet<Language> Languages => Set<Language>();
        public DbSet<Floor> Floors => Set<Floor>();
        public DbSet<Shelf> Shelves => Set<Shelf>();
        public DbSet<Row> Rows => Set<Row>();
        public DbSet<Section> Sections => Set<Section>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Book>(book =>
            {
                book.HasIndex(b => b.Isbn).IsUnique();
                book.Property(b => b.Status).HasConversion<string>().HasMaxLength(20);

                // A genre has many books; a genre cannot be deleted while books still use it.
                book.HasOne(b => b.Genre)
                    .WithMany(g => g.Books)
                    .HasForeignKey(b => b.GenreId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Many-to-many: EF creates the AuthorBook / BookLanguage join tables.
                book.HasMany(b => b.Authors).WithMany(a => a.Books);
                book.HasMany(b => b.Languages).WithMany(l => l.Books);
                book.HasMany(b => b.Rows).WithMany(r => r.Books);
            });

            // Floor 1-* Shelf 1-* Row. Parents cannot be deleted while they still have children (checked in the services).
            builder.Entity<Floor>().HasIndex(f => f.Name).IsUnique();

            builder.Entity<Shelf>(shelf =>
            {
                shelf.HasIndex(s => new { s.FloorId, s.Name }).IsUnique();
                shelf.HasOne(s => s.Floor)
                    .WithMany(f => f.Shelves)
                    .HasForeignKey(s => s.FloorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Row>(row =>
            {
                row.HasIndex(r => new { r.ShelfId, r.Name }).IsUnique();
                row.HasOne(r => r.Shelf)
                    .WithMany(s => s.Rows)
                    .HasForeignKey(r => r.ShelfId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // A section points at a floor and a shelf; Restrict avoids multiple cascade paths in SQL Server.
            builder.Entity<Section>(section =>
            {
                section.HasIndex(s => s.Name).IsUnique();
                section.HasOne(s => s.Floor).WithMany().HasForeignKey(s => s.FloorId).OnDelete(DeleteBehavior.Restrict);
                section.HasOne(s => s.Shelf).WithMany().HasForeignKey(s => s.ShelfId).OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Genre>().HasIndex(g => g.Name).IsUnique();
            builder.Entity<Language>().HasIndex(l => l.Name).IsUnique();
        }
    }
}
