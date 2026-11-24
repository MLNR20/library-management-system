using System.Text.RegularExpressions;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Settings;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Data
{
    // Sample catalogue for development: 150 well-known books, shelved one genre to a row, plus two reading rooms with
    // tables. Opt in with Seed:SampleCatalogue = true.
    // Idempotent: genres, authors and languages are matched by name and books by ISBN, so a book that already exists is
    // left as it is, including where it is shelved. The one exception: a library with fewer rows than genres is given
    // the rows it lacks, and in that same run its sample books are moved so that each genre has a row of its own. The
    // ISBNs are generated placeholders with valid check digits, not the books' real ones.
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

        // A second, bigger stock for the shelves added by EnsureExpansionAsync: 12 books for every genre. They are kept apart
        // from the 150 above so those keep their ISBNs; these follow on, from index 150.
        private static readonly BookSeed[] ExpansionBooks =
        [
            // Classic Literature
            new("Middlemarch", "George Eliot", "Classic Literature", 880),
            new("The Picture of Dorian Gray", "Oscar Wilde", "Classic Literature", 254),
            new("Little Women", "Louisa May Alcott", "Classic Literature", 759),
            new("Tess of the d'Urbervilles", "Thomas Hardy", "Classic Literature", 518),
            new("The Adventures of Huckleberry Finn", "Mark Twain", "Classic Literature", 366),
            new("Oliver Twist", "Charles Dickens", "Classic Literature", 608),
            new("David Copperfield", "Charles Dickens", "Classic Literature", 882),
            new("The Brothers Karamazov", "Fyodor Dostoevsky", "Classic Literature", 824),
            new("The Count of Monte Cristo", "Alexandre Dumas", "Classic Literature", 1276, "French:fr"),
            new("Madame Bovary", "Gustave Flaubert", "Classic Literature", 384, "French:fr"),
            new("The Scarlet Letter", "Nathaniel Hawthorne", "Classic Literature", 238),
            new("Vanity Fair", "William Makepeace Thackeray", "Classic Literature", 912),

            // Science Fiction
            new("Snow Crash", "Neal Stephenson", "Science Fiction", 480),
            new("The Dispossessed", "Ursula K. Le Guin", "Science Fiction", 387),
            new("Do Androids Dream of Electric Sheep?", "Philip K. Dick", "Science Fiction", 210),
            new("Childhood's End", "Arthur C. Clarke", "Science Fiction", 224),
            new("2001: A Space Odyssey", "Arthur C. Clarke", "Science Fiction", 297),
            new("The Time Machine", "H. G. Wells", "Science Fiction", 118),
            new("Solaris", "Stanisław Lem", "Science Fiction", 204),
            new("Starship Troopers", "Robert A. Heinlein", "Science Fiction", 263),
            new("Stranger in a Strange Land", "Robert A. Heinlein", "Science Fiction", 408),
            new("The Three-Body Problem", "Liu Cixin", "Science Fiction", 400),
            new("Ringworld", "Larry Niven", "Science Fiction", 342),
            new("A Canticle for Leibowitz", "Walter M. Miller Jr.", "Science Fiction", 334),

            // Fantasy
            new("The Two Towers", "J. R. R. Tolkien", "Fantasy", 352),
            new("The Return of the King", "J. R. R. Tolkien", "Fantasy", 416),
            new("Harry Potter and the Chamber of Secrets", "J. K. Rowling", "Fantasy", 251),
            new("The Silmarillion", "J. R. R. Tolkien", "Fantasy", 365),
            new("Good Omens", "Terry Pratchett; Neil Gaiman", "Fantasy", 400),
            new("The Colour of Magic", "Terry Pratchett", "Fantasy", 288),
            new("Assassin's Apprentice", "Robin Hobb", "Fantasy", 435),
            new("The Eye of the World", "Robert Jordan", "Fantasy", 782),
            new("Prince Caspian", "C. S. Lewis", "Fantasy", 224),
            new("Stardust", "Neil Gaiman", "Fantasy", 248),
            new("Gardens of the Moon", "Steven Erikson", "Fantasy", 666),
            new("Jonathan Strange & Mr Norrell", "Susanna Clarke", "Fantasy", 782),

            // Mystery & Crime
            new("The Murder of Roger Ackroyd", "Agatha Christie", "Mystery & Crime", 312),
            new("The Adventures of Sherlock Holmes", "Arthur Conan Doyle", "Mystery & Crime", 307),
            new("The Sign of the Four", "Arthur Conan Doyle", "Mystery & Crime", 158),
            new("Death on the Nile", "Agatha Christie", "Mystery & Crime", 352),
            new("The ABC Murders", "Agatha Christie", "Mystery & Crime", 256),
            new("The Postman Always Rings Twice", "James M. Cain", "Mystery & Crime", 128),
            new("The Talented Mr. Ripley", "Patricia Highsmith", "Mystery & Crime", 290),
            new("Rebecca", "Daphne du Maurier", "Mystery & Crime", 449),
            new("The Girl on the Train", "Paula Hawkins", "Mystery & Crime", 336),
            new("Big Little Lies", "Liane Moriarty", "Mystery & Crime", 460),
            new("The Cuckoo's Calling", "Robert Galbraith", "Mystery & Crime", 464),
            new("Tinker Tailor Soldier Spy", "John le Carré", "Mystery & Crime", 355),

            // Romance
            new("Mansfield Park", "Jane Austen", "Romance", 464),
            new("Northanger Abbey", "Jane Austen", "Romance", 256),
            new("Bridget Jones's Diary", "Helen Fielding", "Romance", 310),
            new("The Fault in Our Stars", "John Green", "Romance", 313),
            new("Gone with the Wind", "Margaret Mitchell", "Romance", 1037),
            new("Doctor Zhivago", "Boris Pasternak", "Romance", 592),
            new("The Bridges of Madison County", "Robert James Waller", "Romance", 171),
            new("Atonement", "Ian McEwan", "Romance", 351),
            new("One Day", "David Nicholls", "Romance", 435),
            new("The Hating Game", "Sally Thorne", "Romance", 384),
            new("Beach Read", "Emily Henry", "Romance", 384),
            new("Call Me by Your Name", "André Aciman", "Romance", 248),

            // Horror
            new("'Salem's Lot", "Stephen King", "Horror", 439),
            new("Misery", "Stephen King", "Horror", 310),
            new("The Stand", "Stephen King", "Horror", 1153),
            new("Cujo", "Stephen King", "Horror", 319),
            new("Bird Box", "Josh Malerman", "Horror", 262),
            new("Rosemary's Baby", "Ira Levin", "Horror", 308),
            new("Something Wicked This Way Comes", "Ray Bradbury", "Horror", 293),
            new("The Turn of the Screw", "Henry James", "Horror", 128),
            new("Strange Case of Dr Jekyll and Mr Hyde", "Robert Louis Stevenson", "Horror", 96),
            new("World War Z", "Max Brooks", "Horror", 342),
            new("House of Leaves", "Mark Z. Danielewski", "Horror", 709),
            new("The Call of Cthulhu and Other Weird Stories", "H. P. Lovecraft", "Horror", 416),

            // History
            new("Band of Brothers", "Stephen E. Ambrose", "History", 333),
            new("A History of the World in 100 Objects", "Neil MacGregor", "History", 740),
            new("The Making of the Atomic Bomb", "Richard Rhodes", "History", 886),
            new("Rubicon", "Tom Holland", "History", 448),
            new("The Cold War", "John Lewis Gaddis", "History", 333),
            new("Collapse", "Jared Diamond", "History", 575),
            new("Empire of the Summer Moon", "S. C. Gwynne", "History", 371),
            new("The Splendid and the Vile", "Erik Larson", "History", 608),
            new("The Warmth of Other Suns", "Isabel Wilkerson", "History", 622),
            new("Genghis Khan and the Making of the Modern World", "Jack Weatherford", "History", 312),
            new("The Wars of the Roses", "Dan Jones", "History", 396),
            new("The Pity of War", "Niall Ferguson", "History", 563),

            // Biography
            new("Titan: The Life of John D. Rockefeller, Sr.", "Ron Chernow", "Biography", 774),
            new("Benjamin Franklin: An American Life", "Walter Isaacson", "Biography", 590),
            new("Open", "Andre Agassi", "Biography", 386),
            new("Born a Crime", "Trevor Noah", "Biography", 304),
            new("I Know Why the Caged Bird Sings", "Maya Angelou", "Biography", 289),
            new("Just Kids", "Patti Smith", "Biography", 304),
            new("The Glass Castle", "Jeannette Walls", "Biography", 288),
            new("Elon Musk", "Walter Isaacson", "Biography", 688),
            new("Madame Curie", "Ève Curie", "Biography", 412),
            new("Shoe Dog", "Phil Knight", "Biography", 400),
            new("Unbroken", "Laura Hillenbrand", "Biography", 473),
            new("Bossypants", "Tina Fey", "Biography", 275),

            // Science
            new("Surely You're Joking, Mr. Feynman!", "Richard P. Feynman", "Science", 350),
            new("The Double Helix", "James D. Watson", "Science", 226),
            new("The Emperor of All Maladies", "Siddhartha Mukherjee", "Science", 592),
            new("Pale Blue Dot", "Carl Sagan", "Science", 429),
            new("The Hidden Life of Trees", "Peter Wohlleben", "Science", 288),
            new("Entangled Life", "Merlin Sheldrake", "Science", 352),
            new("Why We Sleep", "Matthew Walker", "Science", 368),
            new("The Sixth Extinction", "Elizabeth Kolbert", "Science", 319),
            new("Gödel, Escher, Bach", "Douglas R. Hofstadter", "Science", 777),
            new("Seven Brief Lessons on Physics", "Carlo Rovelli", "Science", 96),
            new("The Demon-Haunted World", "Carl Sagan", "Science", 457),
            new("Chaos", "James Gleick", "Science", 352),

            // Technology & Computing
            new("Clean Architecture", "Robert C. Martin", "Technology & Computing", 432),
            new("Working Effectively with Legacy Code", "Michael Feathers", "Technology & Computing", 456),
            new("Head First Design Patterns", "Eric Freeman; Elisabeth Robson", "Technology & Computing", 694),
            new("You Don't Know JS", "Kyle Simpson", "Technology & Computing", 278),
            new("Eloquent JavaScript", "Marijn Haverbeke", "Technology & Computing", 472),
            new("Python Crash Course", "Eric Matthes", "Technology & Computing", 544),
            new("The Phoenix Project", "Gene Kim; Kevin Behr; George Spafford", "Technology & Computing", 432),
            new("Site Reliability Engineering", "Betsy Beyer; Chris Jones; Jennifer Petoff; Niall Richard Murphy", "Technology & Computing", 552),
            new("Domain-Driven Design", "Eric Evans", "Technology & Computing", 560),
            new("Operating System Concepts", "Abraham Silberschatz; Peter Baer Galvin; Greg Gagne", "Technology & Computing", 1278),
            new("Compilers: Principles, Techniques, and Tools", "Alfred V. Aho; Monica S. Lam; Ravi Sethi; Jeffrey D. Ullman", "Technology & Computing", 1009),
            new("The Art of Computer Programming, Volume 1", "Donald E. Knuth", "Technology & Computing", 672),

            // Philosophy
            new("Apology", "Plato", "Philosophy", 96),
            new("The Prince", "Niccolò Machiavelli", "Philosophy", 140),
            new("Discourse on Method", "René Descartes", "Philosophy", 96),
            new("Meditations on First Philosophy", "René Descartes", "Philosophy", 120),
            new("Ethics", "Baruch Spinoza", "Philosophy", 320),
            new("Tractatus Logico-Philosophicus", "Ludwig Wittgenstein", "Philosophy", 118),
            new("The Social Contract", "Jean-Jacques Rousseau", "Philosophy", 168),
            new("Utilitarianism", "John Stuart Mill", "Philosophy", 144),
            new("On Liberty", "John Stuart Mill", "Philosophy", 160),
            new("Existentialism Is a Humanism", "Jean-Paul Sartre", "Philosophy", 110),
            new("The Second Sex", "Simone de Beauvoir", "Philosophy", 832),
            new("Sophie's World", "Jostein Gaarder", "Philosophy", 403),

            // Self-Help
            new("Daring Greatly", "Brené Brown", "Self-Help", 320),
            new("The Subtle Art of Not Giving a F*ck", "Mark Manson", "Self-Help", 224),
            new("Ikigai", "Héctor García; Francesc Miralles", "Self-Help", 208),
            new("Essentialism", "Greg McKeown", "Self-Help", 260),
            new("The Four Agreements", "Don Miguel Ruiz", "Self-Help", 160),
            new("Drive", "Daniel H. Pink", "Self-Help", 288),
            new("Quiet", "Susan Cain", "Self-Help", 333),
            new("Getting Things Done", "David Allen", "Self-Help", 352),
            new("The Gifts of Imperfection", "Brené Brown", "Self-Help", 160),
            new("Make Your Bed", "William H. McRaven", "Self-Help", 144),
            new("Can't Hurt Me", "David Goggins", "Self-Help", 364),
            new("The Mountain Is You", "Brianna Wiest", "Self-Help", 238),

            // Children & Young Adult
            new("Where the Wild Things Are", "Maurice Sendak", "Children & Young Adult", 48),
            new("The Very Hungry Caterpillar", "Eric Carle", "Children & Young Adult", 26),
            new("Alice's Adventures in Wonderland", "Lewis Carroll", "Children & Young Adult", 96),
            new("Peter Pan", "J. M. Barrie", "Children & Young Adult", 256),
            new("The Wind in the Willows", "Kenneth Grahame", "Children & Young Adult", 259),
            new("Winnie-the-Pooh", "A. A. Milne", "Children & Young Adult", 176),
            new("The Secret Garden", "Frances Hodgson Burnett", "Children & Young Adult", 331),
            new("Percy Jackson and the Lightning Thief", "Rick Riordan", "Children & Young Adult", 377),
            new("Bridge to Terabithia", "Katherine Paterson", "Children & Young Adult", 163),
            new("The Outsiders", "S. E. Hinton", "Children & Young Adult", 192),
            new("Divergent", "Veronica Roth", "Children & Young Adult", 487),
            new("Coraline", "Neil Gaiman", "Children & Young Adult", 162),

            // Poetry
            new("Howl and Other Poems", "Allen Ginsberg", "Poetry", 56),
            new("The Raven and Other Poems", "Edgar Allan Poe", "Poetry", 96),
            new("Sonnets", "William Shakespeare", "Poetry", 154),
            new("The Canterbury Tales", "Geoffrey Chaucer", "Poetry", 504),
            new("Beowulf", "Anonymous", "Poetry", 144),
            new("The Iliad", "Homer", "Poetry", 683, "Greek:el"),
            new("Songs of Innocence and of Experience", "William Blake", "Poetry", 64),
            new("Lyrical Ballads", "William Wordsworth; Samuel Taylor Coleridge", "Poetry", 232),
            new("The Collected Poems of W. B. Yeats", "W. B. Yeats", "Poetry", 544),
            new("Twenty Love Poems and a Song of Despair", "Pablo Neruda", "Poetry", 64, "Spanish:es"),
            new("The Prophet", "Kahlil Gibran", "Poetry", 96),
            new("The Sun and Her Flowers", "Rupi Kaur", "Poetry", 256),

            // Business & Economics
            new("Thinking in Bets", "Annie Duke", "Business & Economics", 288),
            new("The Black Swan", "Nassim Nicholas Taleb", "Business & Economics", 480),
            new("Principles", "Ray Dalio", "Business & Economics", 592),
            new("Start with Why", "Simon Sinek", "Business & Economics", 256),
            new("The Innovator's Dilemma", "Clayton M. Christensen", "Business & Economics", 286),
            new("Blue Ocean Strategy", "W. Chan Kim; Renée Mauborgne", "Business & Economics", 256),
            new("Influence: The Psychology of Persuasion", "Robert B. Cialdini", "Business & Economics", 336),
            new("Hooked", "Nir Eyal", "Business & Economics", 256),
            new("The Hard Thing About Hard Things", "Ben Horowitz", "Business & Economics", 304),
            new("Poor Economics", "Abhijit V. Banerjee; Esther Duflo", "Business & Economics", 320),
            new("The Millionaire Next Door", "Thomas J. Stanley; William D. Danko", "Business & Economics", 258),
            new("Nudge", "Richard H. Thaler; Cass R. Sunstein", "Business & Economics", 312)
        ];

        // For tests: what the seeder would create.
        public static IReadOnlyList<string> GenreNames => Genres.Select(g => g.Name).ToList();

        public static IReadOnlyList<(string Title, IReadOnlyList<string> Authors, string Genre, int Pages)> ExpansionCatalogue =>
            ExpansionBooks.Select(b => (b.Title, (IReadOnlyList<string>)b.Authors.Split(';', StringSplitOptions.TrimEntries), b.Genre, b.Pages)).ToList();

        public static IReadOnlyList<(string Title, IReadOnlyList<string> Authors, string Genre, int Pages)> Catalogue =>
            Books.Select(b => (b.Title, (IReadOnlyList<string>)b.Authors.Split(';', StringSplitOptions.TrimEntries), b.Genre, b.Pages)).ToList();

        // Every genre is shelved on a row of its own. A library with too few rows for that is given more, three rows to a
        // shelf, and three floors if it has none.
        private static readonly string[] DefaultFloorNames = ["Ground Floor", "First Floor", "Second Floor"];
        private const int RowsPerShelf = 3;

        private static readonly string[] ReadingRoomNames = ["Reading Room I", "Reading Room II"];
        private const string SecondFloorReadingRoomName = "Reading Room III";
        private const int MinShelvesOnSecondFloor = 3;

        // For tests.
        public static IReadOnlyList<string> ReadingRoomSeedNames => ReadingRoomNames;

        // The bigger library: the ground, first and second floors each get this many shelves of three rows, the first and
        // second floors more reading rooms, and every room more tables.
        public const int ShelvesPerFloor = 8;

        // ShelfIndex is the room's shelf by name order on its floor. The 3D map deals a floor's shelves out to its four wings
        // in the order 0, 3, 1, 2, 0, 3, ... so shelves 0 to 3 are in four different wings and every room gets a wing of its own.
        private sealed record RoomSeed(string Name, int FloorRank, int ShelfIndex, SectionModel Model, int[] Seats);

        private static readonly RoomSeed[] ExpansionRooms =
        [
            new("Reading Room IV", 1, 0, SectionModel.ReadingRoom, [4, 6, 8]),
            new("Reading Room V", 1, 1, SectionModel.ReadingRoom, [4, 4, 6]),
            new("Reading Room VI", 1, 2, SectionModel.ReadingRoom, [6, 6, 8]),
            new("Reading Room VII", 2, 1, SectionModel.StudyRoom, [6, 8, 10]),
            new("Reading Room VIII", 2, 2, SectionModel.StudyRoom, [4, 6, 8]),
            new("Reading Room IX", 2, 3, SectionModel.ReadingRoom, [4, 4, 6, 8])
        ];

        // Rooms that were already there get tables up to this many, with these seats (the first ones are the tables they have).
        private static readonly Dictionary<string, int[]> ExtraTables = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Reading Room I"] = [4, 4, 6, 8, 6, 4],
            ["Reading Room II"] = [4, 6, 6, 8, 10, 6],
            [SecondFloorReadingRoomName] = [6, 8, 4, 10]
        };

        // For tests.
        public static IReadOnlyList<string> ExpansionRoomNames => ExpansionRooms.Select(r => r.Name).ToList();
        public static IReadOnlyList<string> ExpansionRoomNamesOnSecondFloor => ExpansionRooms.Where(r => r.FloorRank == 2).Select(r => r.Name).ToList();

        public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
        {
            using var scope = services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(CatalogueSeeder));

            var genres = await EnsureGenresAsync(db, cancellationToken);
            var authors = await EnsureAuthorsAsync(db, cancellationToken);
            var languages = await EnsureLanguagesAsync(db, cancellationToken);
            var (rowByGenre, extended) = await EnsureShelvingAsync(db, cancellationToken);

            var existingIsbns = (await db.Books.Select(b => b.Isbn).ToListAsync(cancellationToken)).ToHashSet();
            var added = 0;

            for (var index = 0; index < Books.Length; index++)
            {
                var seed = Books[index];
                if (existingIsbns.Contains(IsbnFor(index)))
                {
                    continue;
                }

                var book = BuildBook(seed, index, genres, authors, languages);
                book.Rows.Add(rowByGenre[seed.Genre]);

                db.Books.Add(book);
                added++;
            }

            var moved = extended ? await ReshelveByGenreAsync(db, genres, rowByGenre, cancellationToken) : 0;

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

            await AddSampleAnnouncementsAsync(db, cancellationToken);

            // The shelves must exist in the database before a reading room can be attached to one.
            await db.SaveChangesAsync(cancellationToken);

            var readingRooms = await EnsureReadingRoomsAsync(db, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
            await EnsureSecondFloorAsync(db, cancellationToken);

            // Some tables for students to reserve, only when the library has none, shared out between the reading rooms.
            var tables = await db.StudyTables.OrderBy(t => t.Name).ToListAsync(cancellationToken);
            if (tables.Count == 0)
            {
                int[] seats = [4, 4, 4, 6, 6, 8];
                db.StudyTables.AddRange(seats.Select((count, i) => new StudyTable
                {
                    Id = Guid.NewGuid(),
                    Name = $"Table {i + 1}",
                    Seats = count,
                    SectionId = readingRooms.Count == 0 ? null : readingRooms[i % readingRooms.Count].Id
                }));
            }
            // Tables that were there before the reading rooms are shared out between them too, but only while no table is
            // in a room yet, so a librarian's own arrangement is never undone.
            else if (readingRooms.Count > 0 && tables.All(t => t.SectionId is null))
            {
                for (var i = 0; i < tables.Count; i++)
                {
                    tables[i].SectionId = readingRooms[i % readingRooms.Count].Id;
                }
            }

            await db.SaveChangesAsync(cancellationToken);

            var reservations = await EnsureReservationsAsync(db, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);

            var more = await EnsureExpansionAsync(db, genres, authors, languages, cancellationToken);

            logger.LogInformation(
                "Sample catalogue: {Added} books added, {Skipped} already there, {Moved} moved to their genre's row, {Reservations} table and room reservations added; "
                + "bigger library: {Shelves} shelves, {Rooms} rooms, {Tables} tables, {MoreBooks} books added",
                added, Books.Length - added, moved, reservations, more.Shelves, more.Rooms, more.Tables, more.Books);
        }

        private static Book BuildBook(
            BookSeed seed, int index, Dictionary<string, Genre> genres, Dictionary<string, Author> authors, Dictionary<string, Language> languages)
        {
            var book = new Book
            {
                Id = Guid.NewGuid(),
                Title = seed.Title,
                Isbn = IsbnFor(index),
                Edition = index % 4 == 0 ? "Revised edition" : "First edition",
                Pages = seed.Pages,
                DateAcquired = new DateOnly(2019, 1, 1).AddDays(index * 17 % 2800),
                GenreId = genres[seed.Genre].Id,
                Authors = seed.Authors.Split(';', StringSplitOptions.TrimEntries).Select(name => authors[name]).ToList(),
                Languages = LanguagesFor(seed, languages)
            };

            book.ChangeCondition(StatusFor(index));
            return book;
        }

        // The bigger library, on the ground, first and second floors: shelves up to ShelvesPerFloor (three rows each), the
        // rooms in ExpansionRooms, tables for every room, and the expansion books spread over the rows that are still empty.
        // Everything is topped up, never replaced, so running it again adds nothing.
        private static async Task<(int Shelves, int Rooms, int Tables, int Books)> EnsureExpansionAsync(
            ApplicationDbContext db, Dictionary<string, Genre> genres, Dictionary<string, Author> authors,
            Dictionary<string, Language> languages, CancellationToken cancellationToken)
        {
            var floors = (await db.Floors.ToListAsync(cancellationToken)).OrderBy(f => f.Name).ToList();
            Floor? FloorAt(int rank) => floors.FirstOrDefault(f => FloorRank(f.Name) == rank);

            // Shelves. New ones are named after every shelf there is, so they sort after the old ones on their floor and the
            // old shelves keep their wings.
            var shelfNames = await db.Shelves.Select(s => s.Name).ToListAsync(cancellationToken);
            var shelvesAdded = 0;
            foreach (var rank in new[] { 0, 1, 2 })
            {
                var floor = FloorAt(rank);
                if (floor is null)
                {
                    continue;
                }

                var count = await db.Shelves.CountAsync(s => s.FloorId == floor.Id, cancellationToken);
                for (; count < ShelvesPerFloor; count++)
                {
                    var shelf = new Shelf { Id = Guid.NewGuid(), Name = NextShelfName(shelfNames), FloorId = floor.Id };
                    db.Shelves.Add(shelf);
                    shelfNames.Add(shelf.Name);
                    var rowNames = new List<string>();
                    for (var number = 0; number < RowsPerShelf; number++)
                    {
                        var name = NextRowName(shelf.Name, rowNames);
                        rowNames.Add(name);
                        db.Rows.Add(new Row { Id = Guid.NewGuid(), Name = name, ShelfId = shelf.Id });
                    }

                    shelvesAdded++;
                }
            }

            await db.SaveChangesAsync(cancellationToken);

            // Rooms: each on a free shelf of its floor, the one at its place in name order or else the next one in the same wing.
            var roomsAdded = 0;
            var takenShelves = (await db.Sections.Select(s => s.ShelfId).ToListAsync(cancellationToken)).ToHashSet();
            var roomNames = (await db.Sections.Select(s => s.Name).ToListAsync(cancellationToken)).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var seed in ExpansionRooms.Where(r => !roomNames.Contains(r.Name)))
            {
                var floor = FloorAt(seed.FloorRank);
                if (floor is null)
                {
                    continue;
                }

                var shelves = (await db.Shelves.Where(s => s.FloorId == floor.Id).ToListAsync(cancellationToken))
                    .OrderBy(s => s.Name, StringComparer.OrdinalIgnoreCase).ToList();
                var home = new[] { seed.ShelfIndex, seed.ShelfIndex + 4 }
                    .Where(i => i < shelves.Count).Select(i => shelves[i]).FirstOrDefault(s => !takenShelves.Contains(s.Id));
                if (home is null)
                {
                    continue;
                }

                takenShelves.Add(home.Id);
                db.Sections.Add(new Section { Id = Guid.NewGuid(), Name = seed.Name, FloorId = floor.Id, ShelfId = home.Id, Model = seed.Model });
                roomsAdded++;
            }

            await db.SaveChangesAsync(cancellationToken);

            // Tables: every room is topped up to the number of seats listed for it.
            var wanted = ExpansionRooms.ToDictionary(r => r.Name, r => r.Seats, StringComparer.OrdinalIgnoreCase);
            foreach (var (name, seats) in ExtraTables)
            {
                wanted[name] = seats;
            }

            var tablesAdded = 0;
            var rooms = await db.Sections.Where(s => s.Model == SectionModel.ReadingRoom || s.Model == SectionModel.StudyRoom).ToListAsync(cancellationToken);
            foreach (var room in rooms.Where(r => wanted.ContainsKey(r.Name)))
            {
                var have = await db.StudyTables.CountAsync(t => t.SectionId == room.Id, cancellationToken);
                var seats = wanted[room.Name];
                for (var number = have; number < seats.Length; number++)
                {
                    db.StudyTables.Add(new StudyTable
                    {
                        Id = Guid.NewGuid(), Name = $"{room.Name} Table {number + 1}", Seats = seats[number], SectionId = room.Id
                    });
                    tablesAdded++;
                }
            }

            await db.SaveChangesAsync(cancellationToken);

            // Books: the ones not in the library yet go onto the empty rows, in order, so each genre's books stand together and
            // every new shelf gets some. With no empty row they are added without a shelf.
            var existingIsbns = (await db.Books.Select(b => b.Isbn).ToListAsync(cancellationToken)).ToHashSet();
            var newBooks = ExpansionBooks
                .Select((seed, i) => (Seed: seed, Index: Books.Length + i))
                .Where(x => !existingIsbns.Contains(IsbnFor(x.Index)))
                .ToList();

            var emptyRows = (await db.Rows.Where(r => !r.Books.Any()).Include(r => r.Shelf).ThenInclude(s => s.Floor).ToListAsync(cancellationToken))
                .OrderBy(r => FloorRank(r.Shelf.Floor.Name)).ThenBy(r => r.Shelf.Floor.Name)
                .ThenBy(r => r.Shelf.Name, StringComparer.OrdinalIgnoreCase).ThenBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            for (var k = 0; k < newBooks.Count; k++)
            {
                var (seed, index) = newBooks[k];
                var book = BuildBook(seed, index, genres, authors, languages);
                if (emptyRows.Count > 0)
                {
                    book.Rows.Add(emptyRows[k * emptyRows.Count / newBooks.Count]);
                }

                db.Books.Add(book);
            }

            await db.SaveChangesAsync(cancellationToken);
            return (shelvesAdded, roomsAdded, tablesAdded, newBooks.Count);
        }

        // Three sample announcements, each added only if none with its title exists: two for the whole library and one for
        // the second floor (for the whole library too when there is no second floor).
        private static async Task AddSampleAnnouncementsAsync(ApplicationDbContext db, CancellationToken cancellationToken)
        {
            var secondFloorId = (await db.Floors.ToListAsync(cancellationToken))
                .Where(f => FloorRank(f.Name) == 2).OrderBy(f => f.Name).Select(f => (Guid?)f.Id).FirstOrDefault();
            var titles = (await db.Announcements.Select(a => a.Title).ToListAsync(cancellationToken)).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var now = DateTime.UtcNow;

            (string Title, string Body, Guid? FloorId, int DaysAgo)[] samples =
            [
                ("Extended opening hours for exams",
                    "<p>From next week the library stays open <strong>until 10 pm</strong> on weekdays so you have more time to revise. Reading-room tables are in demand, so reserve yours early.</p>",
                    null, 4),
                ("Quiet hours reminder",
                    "<p>Please keep conversations low and phones on silent in the reading rooms. Group work is welcome in the room you have reserved.</p>",
                    null, 2),
                ("New reading room on the second floor",
                    "<p><strong>Reading Room III</strong> is now open on the second floor, with two tables for six and eight readers. You can reserve a table or the whole room from your student page.</p>",
                    secondFloorId, 1)
            ];

            foreach (var sample in samples.Where(s => !titles.Contains(s.Title)))
            {
                db.Announcements.Add(new Announcement
                {
                    Id = Guid.NewGuid(),
                    Title = sample.Title,
                    Body = sample.Body,
                    FloorId = sample.FloorId,
                    CreatedAt = now.AddDays(-sample.DaysAgo)
                });
            }
        }

        // Sample table and reading-room reservations for the first student or visitor, only while the library has none at
        // all, so a librarian's own data is never mixed with them. Some are over (approved, rejected, cancelled), some are
        // still to come (approved, pending). The approved ones never overlap, so every one could really have been approved.
        // Dates are relative to today, so the history always looks recent. Returns how many were added.
        private static async Task<int> EnsureReservationsAsync(ApplicationDbContext db, CancellationToken cancellationToken)
        {
            if (await db.TableReservations.AnyAsync(cancellationToken) || await db.RoomReservations.AnyAsync(cancellationToken))
            {
                return 0;
            }

            var student = await (
                from user in db.Users
                join userRole in db.UserRoles on user.Id equals userRole.UserId
                join role in db.Roles on userRole.RoleId equals role.Id
                where user.IsActive && AppRoles.Borrowers.Contains(role.Name!)
                orderby user.UserName
                select user).FirstOrDefaultAsync(cancellationToken);
            if (student is null)
            {
                return 0;
            }

            var today = DateTime.UtcNow.Date;
            var tables = await db.StudyTables.Where(t => t.IsActive).OrderBy(t => t.Name).ToListAsync(cancellationToken);
            var rooms = await db.Sections.Where(s => s.Model == SectionModel.ReadingRoom || s.Model == SectionModel.StudyRoom).OrderBy(s => s.Name).ToListAsync(cancellationToken);
            const string decider = "demo";
            var added = 0;

            T Fill<T>(T reservation, int day, int startHour, int endHour, string note, ReservationStatus status, string? decision = null)
                where T : ReservationBase
            {
                reservation.Id = Guid.NewGuid();
                reservation.UserId = student.Id;
                reservation.StartUtc = today.AddDays(day).AddHours(startHour);
                reservation.EndUtc = today.AddDays(day).AddHours(endHour);
                reservation.Note = note;
                reservation.Status = status;
                reservation.RequestedAtUtc = reservation.StartUtc.AddDays(-2);
                if (status is ReservationStatus.Approved or ReservationStatus.Rejected)
                {
                    reservation.DecidedAtUtc = reservation.RequestedAtUtc.AddHours(3);
                    reservation.DecidedByName = decider;
                    reservation.DecisionNote = decision;
                }

                return reservation;
            }

            if (tables.Count > 0)
            {
                StudyTable TableAt(int index) => tables[index % tables.Count];
                (int Table, int Day, int From, int To, string Note, ReservationStatus Status, string? Decision)[] seeds =
                [
                    (0, -5, 10, 12, "Group study for statistics", ReservationStatus.Approved, null),
                    (1, -3, 14, 16, "Writing up my thesis", ReservationStatus.Approved, null),
                    (2, -2, 9, 11, "Study session", ReservationStatus.Rejected, "The table was needed for a library event."),
                    (3, -1, 13, 15, "Revision with friends", ReservationStatus.Cancelled, null),
                    (0, 1, 10, 12, "Exam revision", ReservationStatus.Approved, null),
                    (4, 2, 15, 17, "Group project meeting", ReservationStatus.Pending, null),
                    (1, 4, 9, 11, "Reading for my literature essay", ReservationStatus.Pending, null)
                ];

                foreach (var seed in seeds)
                {
                    var table = TableAt(seed.Table);
                    db.TableReservations.Add(Fill(
                        new TableReservation { TableId = table.Id }, seed.Day, seed.From, seed.To, seed.Note, seed.Status, seed.Decision));
                    added++;
                }
            }

            if (rooms.Count > 0)
            {
                Section RoomAt(int index) => rooms[index % rooms.Count];
                (int Room, int Day, int From, int To, string Note, ReservationStatus Status, string? Decision)[] seeds =
                [
                    (0, -4, 13, 17, "Study group", ReservationStatus.Approved, null),
                    (1, -1, 10, 12, "Quiet room for an interview prep", ReservationStatus.Rejected, "The room was closed for maintenance."),
                    (2, 3, 14, 16, "Presentation rehearsal", ReservationStatus.Approved, null),
                    (0, 5, 10, 13, "Group workshop", ReservationStatus.Pending, null)
                ];

                foreach (var seed in seeds)
                {
                    var room = RoomAt(seed.Room);
                    db.RoomReservations.Add(Fill(
                        new RoomReservation { SectionId = room.Id }, seed.Day, seed.From, seed.To, seed.Note, seed.Status, seed.Decision));
                    added++;
                }
            }

            return added;
        }

        // Two reading rooms for students, unless the library already has them. Each is a section on its own shelf; the 3D
        // map gives the wings of a floor their shelves in turn, so two shelves of one floor end up in different wings.
        private static async Task<List<Section>> EnsureReadingRoomsAsync(ApplicationDbContext db, CancellationToken cancellationToken)
        {
            var rooms = await db.Sections.Where(s => s.Model == SectionModel.ReadingRoom).OrderBy(s => s.Name).ToListAsync(cancellationToken);
            var missing = ReadingRoomNames.Where(name => rooms.All(r => !string.Equals(r.Name, name, StringComparison.OrdinalIgnoreCase))).ToList();
            if (rooms.Count >= ReadingRoomNames.Length || missing.Count == 0)
            {
                return rooms;
            }

            // The floor with the most shelves (then by name), so each room can have a shelf, and so a wing, of its own.
            var shelves = await db.Shelves.OrderBy(s => s.Name).ToListAsync(cancellationToken);
            var floorId = shelves.GroupBy(s => s.FloorId).OrderByDescending(g => g.Count()).Select(g => (Guid?)g.Key).FirstOrDefault()
                ?? (await db.Floors.OrderBy(f => f.Name).Select(f => (Guid?)f.Id).FirstOrDefaultAsync(cancellationToken));
            if (floorId is null)
            {
                return rooms;
            }

            var taken = rooms.Select(r => r.ShelfId).ToHashSet();
            var free = new Queue<Shelf>(shelves.Where(s => s.FloorId == floorId && !taken.Contains(s.Id)));

            for (var i = 0; i < missing.Count && rooms.Count < ReadingRoomNames.Length; i++)
            {
                // A floor with too few shelves gets an empty one for the room.
                var shelf = free.Count > 0
                    ? free.Dequeue()
                    : db.Shelves.Add(new Shelf { Id = Guid.NewGuid(), Name = missing[i], FloorId = floorId.Value }).Entity;
                var room = new Section
                {
                    Id = Guid.NewGuid(), Name = missing[i], FloorId = shelf.FloorId, ShelfId = shelf.Id, Model = SectionModel.ReadingRoom
                };
                db.Sections.Add(room);
                rooms.Add(room);
            }

            return rooms;
        }

        // The second floor gets at least three shelves (the new ones empty, with three rows each) and a reading room of its
        // own with two tables, unless it has one already. The new shelves are named after the existing ones, so they come
        // last on the topmost floor and never shift where a genre is shelved. A library with no second floor is left as it is.
        private static async Task EnsureSecondFloorAsync(ApplicationDbContext db, CancellationToken cancellationToken)
        {
            var floor = (await db.Floors.ToListAsync(cancellationToken)).Where(f => FloorRank(f.Name) == 2).OrderBy(f => f.Name).FirstOrDefault();
            if (floor is null)
            {
                return;
            }

            var shelfNames = await db.Shelves.Select(s => s.Name).ToListAsync(cancellationToken);
            var shelves = await db.Shelves.Where(s => s.FloorId == floor.Id).ToListAsync(cancellationToken);

            while (shelves.Count < MinShelvesOnSecondFloor)
            {
                var shelf = new Shelf { Id = Guid.NewGuid(), Name = NextShelfName(shelfNames), FloorId = floor.Id };
                db.Shelves.Add(shelf);
                shelves.Add(shelf);
                shelfNames.Add(shelf.Name);

                var rowNames = new List<string>();
                for (var number = 0; number < RowsPerShelf; number++)
                {
                    var name = NextRowName(shelf.Name, rowNames);
                    rowNames.Add(name);
                    db.Rows.Add(new Row { Id = Guid.NewGuid(), Name = name, ShelfId = shelf.Id });
                }
            }

            if (await db.Sections.AnyAsync(s => s.FloorId == floor.Id && (s.Model == SectionModel.ReadingRoom || s.Model == SectionModel.StudyRoom), cancellationToken))
            {
                return;
            }

            var taken = (await db.Sections.Select(s => s.ShelfId).ToListAsync(cancellationToken)).ToHashSet();
            var home = shelves.OrderBy(s => s.Name, StringComparer.OrdinalIgnoreCase).First(s => !taken.Contains(s.Id));
            var room = new Section
            {
                Id = Guid.NewGuid(), Name = SecondFloorReadingRoomName, FloorId = floor.Id, ShelfId = home.Id, Model = SectionModel.StudyRoom
            };
            db.Sections.Add(room);

            int[] seats = [6, 8];
            db.StudyTables.AddRange(seats.Select((count, i) => new StudyTable
            {
                Id = Guid.NewGuid(), Name = $"{SecondFloorReadingRoomName} Table {i + 1}", Seats = count, SectionId = room.Id
            }));
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
            var names = Books.Concat(ExpansionBooks).SelectMany(b => b.Authors.Split(';', StringSplitOptions.TrimEntries)).Distinct();

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
            wanted.AddRange(Books.Concat(ExpansionBooks).Where(b => b.ExtraLanguage is not null).Select(b => b.ExtraLanguage!.Split(':')).Select(p => (p[0], p[1])));

            foreach (var (name, code) in wanted.Distinct().Where(l => !languages.ContainsKey(l.Name)))
            {
                var language = new Language { Id = Guid.NewGuid(), Name = name, Code = code };
                db.Languages.Add(language);
                languages[name] = language;
            }

            return languages;
        }

        // Where each genre is shelved: every genre has a row of its own, the rows taken in order from the bottom floor up
        // (so the genres at the top of the list are downstairs). A library with fewer rows than genres is extended first:
        // shelves with fewer than three rows are topped up, then shelves of three rows are added, each on the floor with
        // the fewest shelves, and a library with no floors gets three. Says whether it had to extend the library.
        private static async Task<(Dictionary<string, Row> RowByGenre, bool Extended)> EnsureShelvingAsync(
            ApplicationDbContext db, CancellationToken cancellationToken)
        {
            var floors = (await db.Floors.ToListAsync(cancellationToken)).OrderBy(f => FloorRank(f.Name)).ThenBy(f => f.Name).ToList();
            var shelves = await db.Shelves.OrderBy(s => s.Name).ToListAsync(cancellationToken);
            var rowsByShelf = (await db.Rows.OrderBy(r => r.Name).ToListAsync(cancellationToken))
                .GroupBy(r => r.ShelfId)
                .ToDictionary(g => g.Key, g => g.ToList());

            List<Row> RowsOf(Shelf shelf) => rowsByShelf.TryGetValue(shelf.Id, out var rows) ? rows : rowsByShelf[shelf.Id] = [];
            int RowCount() => rowsByShelf.Values.Sum(rows => rows.Count);

            void AddRow(Shelf shelf)
            {
                var rows = RowsOf(shelf);
                var row = new Row
                {
                    Id = Guid.NewGuid(), Name = NextRowName(shelf.Name, rows.Select(r => r.Name).ToList()), Shelf = shelf, ShelfId = shelf.Id
                };
                db.Rows.Add(row);
                rows.Add(row);
            }

            var extended = RowCount() < Genres.Length;
            if (extended)
            {
                if (floors.Count == 0)
                {
                    floors.AddRange(DefaultFloorNames.Select(name => db.Floors.Add(new Floor { Id = Guid.NewGuid(), Name = name }).Entity));
                }

                foreach (var shelf in shelves)
                {
                    while (RowsOf(shelf).Count < RowsPerShelf && RowCount() < Genres.Length)
                    {
                        AddRow(shelf);
                    }
                }

                while (RowCount() < Genres.Length)
                {
                    // The floor with the fewest shelves; of several, the lowest.
                    var floor = floors.MinBy(f => shelves.Count(s => s.FloorId == f.Id))!;
                    var shelf = new Shelf
                    {
                        Id = Guid.NewGuid(), Name = NextShelfName(shelves.Select(s => s.Name).ToList()), Floor = floor, FloorId = floor.Id
                    };
                    db.Shelves.Add(shelf);
                    shelves.Add(shelf);

                    for (var number = 0; number < RowsPerShelf; number++)
                    {
                        AddRow(shelf);
                    }
                }
            }

            var floorOrder = floors.Select((floor, index) => (floor.Id, index)).ToDictionary(x => x.Id, x => x.index);
            var rowsInOrder = shelves
                .OrderBy(s => floorOrder[s.FloorId]).ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
                .SelectMany(RowsOf)
                .ToList();

            return (Genres.Select((seed, index) => (seed.Name, Row: rowsInOrder[index])).ToDictionary(x => x.Name, x => x.Row), extended);
        }

        // Moves the sample books that are already in the library onto their genre's row. Only called in the run that gave
        // the library the rows for it, so a book a librarian moves afterwards stays where they put it.
        private static async Task<int> ReshelveByGenreAsync(
            ApplicationDbContext db, Dictionary<string, Genre> genres, Dictionary<string, Row> rowByGenre, CancellationToken cancellationToken)
        {
            var rowByGenreId = rowByGenre.ToDictionary(pair => genres[pair.Key].Id, pair => pair.Value);
            var sampleIsbns = Enumerable.Range(0, Books.Length).Select(IsbnFor).ToList();
            var books = await db.Books.Include(b => b.Rows).Where(b => sampleIsbns.Contains(b.Isbn)).ToListAsync(cancellationToken);
            var moved = 0;

            foreach (var book in books)
            {
                // A book whose genre a librarian changed to one of their own is left alone, and so is one already in place.
                if (!rowByGenreId.TryGetValue(book.GenreId, out var row) || (book.Rows.Count == 1 && book.Rows.First().Id == row.Id))
                {
                    continue;
                }

                book.Rows.Clear();
                book.Rows.Add(row);
                moved++;
            }

            return moved;
        }

        // Where a floor sits in the building, guessed from its name the way the 3D map does (floorRank in the client's
        // libraryLayout.ts): basement, ground, first, second, "Level 3"... A name that says nothing sorts last.
        public static int FloorRank(string name)
        {
            var text = name.ToLowerInvariant();
            if (text.Contains("basement") || text.Contains("cellar") || text.Contains("lower"))
            {
                return -1;
            }

            if (text.Contains("ground") || text.Contains("lobby") || text.Contains("entrance"))
            {
                return 0;
            }

            string[] ordinals = ["first", "second", "third", "fourth", "fifth", "sixth"];
            var ordinal = Array.FindIndex(ordinals, text.Contains);
            if (ordinal >= 0)
            {
                return ordinal + 1;
            }

            var digits = Regex.Match(text, @"\d+");
            return digits.Success && int.TryParse(digits.Value, out var level) ? level : 100;
        }

        // The next free name in the run "Shelf A", "Shelf B", ... and after "Shelf Z", "Shelf 27", "Shelf 28", ...
        public static string NextShelfName(IReadOnlyCollection<string> taken)
        {
            bool IsFree(string name) => !taken.Contains(name, StringComparer.OrdinalIgnoreCase);

            for (var letter = 'A'; letter <= 'Z'; letter++)
            {
                if (IsFree($"Shelf {letter}"))
                {
                    return $"Shelf {letter}";
                }
            }

            var number = 27;
            while (!IsFree($"Shelf {number}"))
            {
                number++;
            }

            return $"Shelf {number}";
        }

        // The next free row name on a shelf. A shelf named "Shelf B" numbers its rows "Row B1", "Row B2", ... (and
        // "Shelf 27": "Row 27.1", ...); a shelf named anything else: "Row 1", "Row 2", ...
        public static string NextRowName(string shelfName, IReadOnlyCollection<string> taken)
        {
            var match = Regex.Match(shelfName.Trim(), @"^Shelf\s+(\w+)$", RegexOptions.IgnoreCase);
            var prefix = match.Success ? match.Groups[1].Value : string.Empty;
            if (prefix.Length > 0 && char.IsDigit(prefix[^1]))
            {
                prefix += ".";
            }

            var number = 1;
            while (taken.Contains($"Row {prefix}{number}", StringComparer.OrdinalIgnoreCase))
            {
                number++;
            }

            return $"Row {prefix}{number}";
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
