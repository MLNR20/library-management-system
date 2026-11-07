using LibraryManagementSystem.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Data
{
    // Sample catalogue for development: 150 well-known books, shelved. Opt in with Seed:SampleCatalogue = true.
    // Idempotent: genres, authors and languages are matched by name and books by ISBN, so a book that already exists is
    // left exactly as it is (including where it is shelved). The ISBNs are generated placeholders with valid check digits,
    // not the books' real ones.
    public static class CatalogueSeeder
    {
        private const string English = "English";

        private sealed record GenreSeed(string Name, string Dewey, string Description);

        // Authors are separated by ';'. Languages beyond English are optional, as "Name:code".
        private sealed record BookSeed(string Title, string Authors, string Genre, int Pages, string? ExtraLanguage = null);

        private static readonly GenreSeed[] Genres =
        [
            new("Classic Literature", "823", "Enduring novels from the 18th to the early 20th century."),
            new("Science Fiction", "813.0876", "Speculative fiction about science, technology and the future."),
            new("Fantasy", "823.91", "Imaginary worlds, magic and myth."),
            new("Mystery & Crime", "823.0872", "Detectives, thrillers and true crime."),
            new("Romance", "813.085", "Love stories and relationships."),
            new("Horror", "813.0873", "Fiction meant to unsettle and frighten."),
            new("History", "900", "The past, from antiquity to the modern world."),
            new("Biography", "920", "Lives and memoirs."),
            new("Science", "500", "Natural science for the general reader."),
            new("Technology & Computing", "004", "Programming, software engineering and computer science."),
            new("Philosophy", "100", "Ethics, metaphysics and ways of thinking."),
            new("Self-Help", "158", "Habits, psychology and personal growth."),
            new("Children & Young Adult", "813.6", "Stories for younger readers."),
            new("Poetry", "821", "Verse, epics and collections."),
            new("Business & Economics", "330", "Markets, management and money.")
        ];

        private static readonly BookSeed[] Books =
        [
            // Classic Literature
            new("Pride and Prejudice", "Jane Austen", "Classic Literature", 432),
            new("Jane Eyre", "Charlotte Brontë", "Classic Literature", 532),
            new("Wuthering Heights", "Emily Brontë", "Classic Literature", 416),
            new("Great Expectations", "Charles Dickens", "Classic Literature", 544),
            new("A Tale of Two Cities", "Charles Dickens", "Classic Literature", 448),
            new("Moby-Dick", "Herman Melville", "Classic Literature", 635),
            new("Crime and Punishment", "Fyodor Dostoevsky", "Classic Literature", 671),
            new("War and Peace", "Leo Tolstoy", "Classic Literature", 1225),
            new("Anna Karenina", "Leo Tolstoy", "Classic Literature", 864),
            new("Don Quixote", "Miguel de Cervantes", "Classic Literature", 992, "Spanish:es"),
            new("Les Misérables", "Victor Hugo", "Classic Literature", 1463, "French:fr"),
            new("The Great Gatsby", "F. Scott Fitzgerald", "Classic Literature", 180),
            new("Frankenstein", "Mary Shelley", "Classic Literature", 280),

            // Science Fiction
            new("Dune", "Frank Herbert", "Science Fiction", 612),
            new("Foundation", "Isaac Asimov", "Science Fiction", 255),
            new("I, Robot", "Isaac Asimov", "Science Fiction", 224),
            new("Neuromancer", "William Gibson", "Science Fiction", 271),
            new("The Left Hand of Darkness", "Ursula K. Le Guin", "Science Fiction", 304),
            new("Ender's Game", "Orson Scott Card", "Science Fiction", 324),
            new("The Martian", "Andy Weir", "Science Fiction", 369),
            new("Nineteen Eighty-Four", "George Orwell", "Science Fiction", 328),
            new("Brave New World", "Aldous Huxley", "Science Fiction", 288),
            new("Fahrenheit 451", "Ray Bradbury", "Science Fiction", 249),
            new("The War of the Worlds", "H. G. Wells", "Science Fiction", 192),
            new("Hyperion", "Dan Simmons", "Science Fiction", 482),

            // Fantasy
            new("The Hobbit", "J. R. R. Tolkien", "Fantasy", 310),
            new("The Fellowship of the Ring", "J. R. R. Tolkien", "Fantasy", 423),
            new("A Wizard of Earthsea", "Ursula K. Le Guin", "Fantasy", 183),
            new("The Name of the Wind", "Patrick Rothfuss", "Fantasy", 662),
            new("Harry Potter and the Philosopher's Stone", "J. K. Rowling", "Fantasy", 223),
            new("The Lion, the Witch and the Wardrobe", "C. S. Lewis", "Fantasy", 208),
            new("American Gods", "Neil Gaiman", "Fantasy", 465),
            new("Mistborn: The Final Empire", "Brandon Sanderson", "Fantasy", 541),
            new("A Game of Thrones", "George R. R. Martin", "Fantasy", 694),
            new("The Way of Kings", "Brandon Sanderson", "Fantasy", 1007),

            // Mystery & Crime
            new("The Hound of the Baskervilles", "Arthur Conan Doyle", "Mystery & Crime", 256),
            new("A Study in Scarlet", "Arthur Conan Doyle", "Mystery & Crime", 166),
            new("Murder on the Orient Express", "Agatha Christie", "Mystery & Crime", 256),
            new("And Then There Were None", "Agatha Christie", "Mystery & Crime", 272),
            new("The Big Sleep", "Raymond Chandler", "Mystery & Crime", 231),
            new("The Maltese Falcon", "Dashiell Hammett", "Mystery & Crime", 217),
            new("Gone Girl", "Gillian Flynn", "Mystery & Crime", 432),
            new("The Girl with the Dragon Tattoo", "Stieg Larsson", "Mystery & Crime", 465),
            new("The Silence of the Lambs", "Thomas Harris", "Mystery & Crime", 338),
            new("In Cold Blood", "Truman Capote", "Mystery & Crime", 343),
            new("The Name of the Rose", "Umberto Eco", "Mystery & Crime", 512),

            // Romance
            new("Emma", "Jane Austen", "Romance", 474),
            new("Sense and Sensibility", "Jane Austen", "Romance", 352),
            new("Persuasion", "Jane Austen", "Romance", 249),
            new("Outlander", "Diana Gabaldon", "Romance", 640),
            new("The Notebook", "Nicholas Sparks", "Romance", 214),
            new("Me Before You", "Jojo Moyes", "Romance", 369),
            new("The Time Traveler's Wife", "Audrey Niffenegger", "Romance", 546),
            new("Love in the Time of Cholera", "Gabriel García Márquez", "Romance", 348, "Spanish:es"),
            new("Normal People", "Sally Rooney", "Romance", 266),

            // Horror
            new("Dracula", "Bram Stoker", "Horror", 418),
            new("The Shining", "Stephen King", "Horror", 447),
            new("It", "Stephen King", "Horror", 1138),
            new("Pet Sematary", "Stephen King", "Horror", 374),
            new("Carrie", "Stephen King", "Horror", 199),
            new("The Haunting of Hill House", "Shirley Jackson", "Horror", 246),
            new("Interview with the Vampire", "Anne Rice", "Horror", 371),
            new("The Exorcist", "William Peter Blatty", "Horror", 340),

            // History
            new("Sapiens", "Yuval Noah Harari", "History", 443),
            new("Guns, Germs, and Steel", "Jared Diamond", "History", 528),
            new("The Rise and Fall of the Third Reich", "William L. Shirer", "History", 1280),
            new("SPQR", "Mary Beard", "History", 608),
            new("A People's History of the United States", "Howard Zinn", "History", 729),
            new("The Guns of August", "Barbara W. Tuchman", "History", 511),
            new("Team of Rivals", "Doris Kearns Goodwin", "History", 944),
            new("History of the Peloponnesian War", "Thucydides", "History", 648),
            new("Postwar", "Tony Judt", "History", 878),
            new("The Silk Roads", "Peter Frankopan", "History", 636),
            new("1491", "Charles C. Mann", "History", 541),

            // Biography
            new("The Diary of a Young Girl", "Anne Frank", "Biography", 283),
            new("Long Walk to Freedom", "Nelson Mandela", "Biography", 656),
            new("Steve Jobs", "Walter Isaacson", "Biography", 656),
            new("Einstein: His Life and Universe", "Walter Isaacson", "Biography", 675),
            new("Leonardo da Vinci", "Walter Isaacson", "Biography", 624),
            new("Educated", "Tara Westover", "Biography", 352),
            new("Becoming", "Michelle Obama", "Biography", 448),
            new("The Autobiography of Malcolm X", "Malcolm X; Alex Haley", "Biography", 466),
            new("Alexander Hamilton", "Ron Chernow", "Biography", 818),
            new("Churchill: Walking with Destiny", "Andrew Roberts", "Biography", 1105),

            // Science
            new("A Brief History of Time", "Stephen Hawking", "Science", 212),
            new("Cosmos", "Carl Sagan", "Science", 396),
            new("The Selfish Gene", "Richard Dawkins", "Science", 360),
            new("On the Origin of Species", "Charles Darwin", "Science", 502),
            new("Silent Spring", "Rachel Carson", "Science", 378),
            new("The Structure of Scientific Revolutions", "Thomas S. Kuhn", "Science", 264),
            new("Astrophysics for People in a Hurry", "Neil deGrasse Tyson", "Science", 222),
            new("The Gene", "Siddhartha Mukherjee", "Science", 592),
            new("The Immortal Life of Henrietta Lacks", "Rebecca Skloot", "Science", 381),
            new("The Elegant Universe", "Brian Greene", "Science", 448),

            // Technology & Computing
            new("Clean Code", "Robert C. Martin", "Technology & Computing", 464),
            new("The Pragmatic Programmer", "Andrew Hunt; David Thomas", "Technology & Computing", 352),
            new("Design Patterns", "Erich Gamma; Richard Helm; Ralph Johnson; John Vlissides", "Technology & Computing", 395),
            new("Introduction to Algorithms", "Thomas H. Cormen; Charles E. Leiserson; Ronald L. Rivest; Clifford Stein", "Technology & Computing", 1312),
            new("The Mythical Man-Month", "Frederick P. Brooks Jr.", "Technology & Computing", 322),
            new("Code Complete", "Steve McConnell", "Technology & Computing", 960),
            new("Refactoring", "Martin Fowler", "Technology & Computing", 448),
            new("Structure and Interpretation of Computer Programs", "Harold Abelson; Gerald Jay Sussman", "Technology & Computing", 657),
            new("The C Programming Language", "Brian W. Kernighan; Dennis M. Ritchie", "Technology & Computing", 272),
            new("Designing Data-Intensive Applications", "Martin Kleppmann", "Technology & Computing", 616),
            new("Artificial Intelligence: A Modern Approach", "Stuart Russell; Peter Norvig", "Technology & Computing", 1136),
            new("Computer Networking: A Top-Down Approach", "James F. Kurose; Keith W. Ross", "Technology & Computing", 864),

            // Philosophy
            new("Meditations", "Marcus Aurelius", "Philosophy", 254),
            new("The Republic", "Plato", "Philosophy", 416),
            new("Nicomachean Ethics", "Aristotle", "Philosophy", 368),
            new("Critique of Pure Reason", "Immanuel Kant", "Philosophy", 785),
            new("Thus Spoke Zarathustra", "Friedrich Nietzsche", "Philosophy", 352),
            new("Beyond Good and Evil", "Friedrich Nietzsche", "Philosophy", 240),
            new("Being and Time", "Martin Heidegger", "Philosophy", 589),
            new("The Myth of Sisyphus", "Albert Camus", "Philosophy", 212),
            new("Leviathan", "Thomas Hobbes", "Philosophy", 720),
            new("Man's Search for Meaning", "Viktor E. Frankl", "Philosophy", 184),

            // Self-Help
            new("Atomic Habits", "James Clear", "Self-Help", 320),
            new("How to Win Friends and Influence People", "Dale Carnegie", "Self-Help", 288),
            new("The 7 Habits of Highly Effective People", "Stephen R. Covey", "Self-Help", 381),
            new("Deep Work", "Cal Newport", "Self-Help", 304),
            new("Thinking, Fast and Slow", "Daniel Kahneman", "Self-Help", 499),
            new("Mindset", "Carol S. Dweck", "Self-Help", 276),
            new("The Power of Habit", "Charles Duhigg", "Self-Help", 371),
            new("Grit", "Angela Duckworth", "Self-Help", 352),

            // Children & Young Adult
            new("Charlotte's Web", "E. B. White", "Children & Young Adult", 184),
            new("Matilda", "Roald Dahl", "Children & Young Adult", 240),
            new("Charlie and the Chocolate Factory", "Roald Dahl", "Children & Young Adult", 176),
            new("The Giver", "Lois Lowry", "Children & Young Adult", 240),
            new("Hatchet", "Gary Paulsen", "Children & Young Adult", 195),
            new("Holes", "Louis Sachar", "Children & Young Adult", 233),
            new("The Hunger Games", "Suzanne Collins", "Children & Young Adult", 374),
            new("Wonder", "R. J. Palacio", "Children & Young Adult", 316),
            new("The Little Prince", "Antoine de Saint-Exupéry", "Children & Young Adult", 96, "French:fr"),
            new("Anne of Green Gables", "L. M. Montgomery", "Children & Young Adult", 320),

            // Poetry
            new("Leaves of Grass", "Walt Whitman", "Poetry", 480),
            new("The Waste Land", "T. S. Eliot", "Poetry", 64),
            new("Milk and Honey", "Rupi Kaur", "Poetry", 208),
            new("Selected Poems", "Emily Dickinson", "Poetry", 160),
            new("The Odyssey", "Homer", "Poetry", 541, "Greek:el"),
            new("The Divine Comedy", "Dante Alighieri", "Poetry", 798, "Italian:it"),
            new("Paradise Lost", "John Milton", "Poetry", 453),
            new("Ariel", "Sylvia Plath", "Poetry", 81),

            // Business & Economics
            new("The Wealth of Nations", "Adam Smith", "Business & Economics", 1264),
            new("Capital in the Twenty-First Century", "Thomas Piketty", "Business & Economics", 696),
            new("Freakonomics", "Steven D. Levitt; Stephen J. Dubner", "Business & Economics", 315),
            new("Good to Great", "Jim Collins", "Business & Economics", 320),
            new("The Lean Startup", "Eric Ries", "Business & Economics", 336),
            new("Zero to One", "Peter Thiel; Blake Masters", "Business & Economics", 224),
            new("The Intelligent Investor", "Benjamin Graham", "Business & Economics", 640),
            new("Rich Dad Poor Dad", "Robert T. Kiyosaki", "Business & Economics", 336)
        ];

        // For tests: what the seeder would create.
        public static IReadOnlyList<string> GenreNames => Genres.Select(g => g.Name).ToList();

        public static IReadOnlyList<(string Title, IReadOnlyList<string> Authors, string Genre, int Pages)> Catalogue =>
            Books.Select(b => (b.Title, (IReadOnlyList<string>)b.Authors.Split(';', StringSplitOptions.TrimEntries), b.Genre, b.Pages)).ToList();

        // Rows created only when the library has none yet: one shelf per genre on a ground floor.
        private const string DefaultFloorName = "Ground Floor";
        private const int DefaultRowsPerShelf = 3;

        public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
        {
            using var scope = services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(CatalogueSeeder));

            var genres = await EnsureGenresAsync(db, cancellationToken);
            var authors = await EnsureAuthorsAsync(db, cancellationToken);
            var languages = await EnsureLanguagesAsync(db, cancellationToken);
            var shelvesByGenre = await EnsureShelvingAsync(db, genres, cancellationToken);

            var existingIsbns = (await db.Books.Select(b => b.Isbn).ToListAsync(cancellationToken)).ToHashSet();
            var nextRowByShelf = new Dictionary<Guid, int>();
            var added = 0;

            for (var index = 0; index < Books.Length; index++)
            {
                var seed = Books[index];
                var isbn = IsbnFor(index);
                if (existingIsbns.Contains(isbn))
                {
                    continue;
                }

                var book = new Book
                {
                    Id = Guid.NewGuid(),
                    Title = seed.Title,
                    Isbn = isbn,
                    Edition = index % 4 == 0 ? "Revised edition" : "First edition",
                    Pages = seed.Pages,
                    Status = StatusFor(index),
                    DateAcquired = new DateOnly(2019, 1, 1).AddDays(index * 17 % 2800),
                    GenreId = genres[seed.Genre].Id,
                    Authors = seed.Authors.Split(';', StringSplitOptions.TrimEntries).Select(name => authors[name]).ToList(),
                    Languages = LanguagesFor(seed, languages)
                };

                // A genre's books are spread over the rows of its shelf, one after another.
                var shelfRows = shelvesByGenre[seed.Genre];
                var key = shelfRows[0].ShelfId;
                var next = nextRowByShelf.GetValueOrDefault(key);
                book.Rows.Add(shelfRows[next % shelfRows.Count]);
                nextRowByShelf[key] = next + 1;

                db.Books.Add(book);
                added++;
            }

            // A welcome notice for the landing page, only when no announcement is meant for the whole library yet.
            if (!await db.Announcements.AnyAsync(a => a.FloorId == null, cancellationToken))
            {
                db.Announcements.Add(new Announcement
                {
                    Id = Guid.NewGuid(),
                    Title = "Welcome to Alexandria",
                    Body = "<p>Our catalogue is open. You can now <strong>reserve a reading-room table</strong> from your student page; a librarian will confirm your request.</p>",
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Some tables for students to reserve, only when the library has none.
            if (!await db.StudyTables.AnyAsync(cancellationToken))
            {
                var readingRoom = await db.Sections.FirstOrDefaultAsync(s => s.Model == SectionModel.ReadingRoom, cancellationToken);
                int[] seats = [4, 4, 4, 6, 6, 8];
                db.StudyTables.AddRange(seats.Select((count, i) => new StudyTable
                {
                    Id = Guid.NewGuid(), Name = $"Table {i + 1}", Seats = count, SectionId = readingRoom?.Id
                }));
            }

            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Sample catalogue: {Added} books added, {Skipped} already there", added, Books.Length - added);
        }

        private static async Task<Dictionary<string, Genre>> EnsureGenresAsync(ApplicationDbContext db, CancellationToken cancellationToken)
        {
            var genres = await db.Genres.ToDictionaryAsync(g => g.Name, StringComparer.OrdinalIgnoreCase, cancellationToken);

            foreach (var seed in Genres.Where(seed => !genres.ContainsKey(seed.Name)))
            {
                var genre = new Genre { Id = Guid.NewGuid(), Name = seed.Name, DeweyNumber = seed.Dewey, Description = seed.Description };
                db.Genres.Add(genre);
                genres[genre.Name] = genre;
            }

            return genres;
        }

        private static async Task<Dictionary<string, Author>> EnsureAuthorsAsync(ApplicationDbContext db, CancellationToken cancellationToken)
        {
            var authors = await db.Authors.ToDictionaryAsync(a => a.Name, StringComparer.OrdinalIgnoreCase, cancellationToken);
            var names = Books.SelectMany(b => b.Authors.Split(';', StringSplitOptions.TrimEntries)).Distinct();

            foreach (var name in names.Where(name => !authors.ContainsKey(name)))
            {
                var author = new Author { Id = Guid.NewGuid(), Name = name };
                db.Authors.Add(author);
                authors[name] = author;
            }

            return authors;
        }

        private static async Task<Dictionary<string, Language>> EnsureLanguagesAsync(ApplicationDbContext db, CancellationToken cancellationToken)
        {
            var languages = await db.Languages.ToDictionaryAsync(l => l.Name, StringComparer.OrdinalIgnoreCase, cancellationToken);
            var wanted = new List<(string Name, string Code)> { (English, "en") };
            wanted.AddRange(Books.Where(b => b.ExtraLanguage is not null).Select(b => b.ExtraLanguage!.Split(':')).Select(p => (p[0], p[1])));

            foreach (var (name, code) in wanted.Distinct().Where(l => !languages.ContainsKey(l.Name)))
            {
                var language = new Language { Id = Guid.NewGuid(), Name = name, Code = code };
                db.Languages.Add(language);
                languages[name] = language;
            }

            return languages;
        }

        // Where each genre is shelved. With existing rows, genres take the existing shelves in turn (so same-genre books
        // share a shelf) and the library's layout is left alone. With none, a ground floor gets a shelf per genre.
        private static async Task<Dictionary<string, List<Row>>> EnsureShelvingAsync(
            ApplicationDbContext db, Dictionary<string, Genre> genres, CancellationToken cancellationToken)
        {
            var rows = await db.Rows
                .Include(r => r.Shelf).ThenInclude(s => s.Floor)
                .OrderBy(r => r.Shelf.Floor.Name).ThenBy(r => r.Shelf.Name).ThenBy(r => r.Name)
                .ToListAsync(cancellationToken);

            if (rows.Count == 0)
            {
                var floor = await db.Floors.FirstOrDefaultAsync(f => f.Name == DefaultFloorName, cancellationToken)
                    ?? db.Floors.Add(new Floor { Id = Guid.NewGuid(), Name = DefaultFloorName }).Entity;

                foreach (var seed in Genres)
                {
                    var shelf = await db.Shelves.FirstOrDefaultAsync(s => s.FloorId == floor.Id && s.Name == seed.Name, cancellationToken)
                        ?? db.Shelves.Add(new Shelf { Id = Guid.NewGuid(), Name = seed.Name, Floor = floor, FloorId = floor.Id }).Entity;

                    for (var number = 1; number <= DefaultRowsPerShelf; number++)
                    {
                        var row = new Row { Id = Guid.NewGuid(), Name = $"Row {number}", Shelf = shelf, ShelfId = shelf.Id };
                        db.Rows.Add(row);
                        rows.Add(row);
                    }
                }
            }

            var rowsByShelf = rows.GroupBy(r => r.ShelfId).Select(g => g.ToList()).ToList();

            return Genres
                .Select((seed, index) => (seed.Name, Rows: rowsByShelf[index % rowsByShelf.Count]))
                .ToDictionary(x => x.Name, x => x.Rows);
        }

        private static List<Language> LanguagesFor(BookSeed seed, Dictionary<string, Language> languages)
        {
            var result = new List<Language> { languages[English] };
            if (seed.ExtraLanguage is not null)
            {
                result.Add(languages[seed.ExtraLanguage.Split(':')[0]]);
            }

            return result;
        }

        // Mostly on the shelf; a few are out of circulation. Borrowed is left to real loans.
        private static BookStatus StatusFor(int index) =>
            index > 0 && index % 53 == 0 ? BookStatus.Damaged : BookStatus.Available;

        // 978-0-XXXX-XXXX-C: a made-up ISBN-13 (17 characters with hyphens) whose last digit is the correct check digit.
        public static string IsbnFor(int index)
        {
            var body = $"9780{70000000 + index * 7919:D8}";
            var sum = body.Select((c, i) => (c - '0') * (i % 2 == 0 ? 1 : 3)).Sum();
            var check = (10 - sum % 10) % 10;
            var digits = body + check;

            return $"{digits[..3]}-{digits[3]}-{digits[4..8]}-{digits[8..12]}-{digits[12]}";
        }
    }
}
