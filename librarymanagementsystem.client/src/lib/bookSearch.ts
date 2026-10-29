import type { Book } from '../api/resources.ts';

/** True when the text appears in the book's title, ISBN or any author's name. An empty search matches everything. */
export function bookMatchesSearch(book: Book, search: string): boolean {
    const term = search.trim().toLowerCase();
    return (
        !term ||
        book.title.toLowerCase().includes(term) ||
        book.isbn.toLowerCase().includes(term) ||
        book.authors.some(author => author.name.toLowerCase().includes(term))
    );
}
