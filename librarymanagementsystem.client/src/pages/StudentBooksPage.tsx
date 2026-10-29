import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Page } from '../components/layout/Page.tsx';
import { RichText } from '../components/ui/RichText.tsx';
import { announcementHooks, BookStatus, bookHooks, genreHooks, rowLabel } from '../api/resources.ts';
import type { Book } from '../api/resources.ts';
import { getErrorMessage } from '../lib/api.ts';
import { bookMatchesSearch } from '../lib/bookSearch.ts';

// What a reader needs to know, in plain words (a lost or damaged copy is simply not available).
const statusLabel: Record<BookStatus, string> = {
    [BookStatus.Available]: 'Available now',
    [BookStatus.Borrowed]: 'On loan',
    [BookStatus.Reserved]: 'Reserved',
    [BookStatus.Lost]: 'Unavailable',
    [BookStatus.Damaged]: 'Unavailable',
};

const statusBadge: Record<BookStatus, string> = {
    [BookStatus.Available]: 'badge-success',
    [BookStatus.Borrowed]: 'badge-warning',
    [BookStatus.Reserved]: 'badge-info',
    [BookStatus.Lost]: 'badge-neutral',
    [BookStatus.Damaged]: 'badge-neutral',
};

export function StudentBooksPage() {
    const books = bookHooks.useList();
    const genres = genreHooks.useList().data;
    const announcements = announcementHooks.useList().data;

    const [search, setSearch] = useState('');
    const [genreId, setGenreId] = useState('');
    const [availableOnly, setAvailableOnly] = useState(true);

    const visible = useMemo(
        () =>
            (books.data ?? []).filter(
                book =>
                    bookMatchesSearch(book, search) &&
                    (!genreId || book.genreId === genreId) &&
                    (!availableOnly || book.status === BookStatus.Available),
            ),
        [books.data, search, genreId, availableOnly],
    );
    const availableCount = (books.data ?? []).filter(book => book.status === BookStatus.Available).length;

    // Notices for the whole library are for every reader; the newest few are enough here.
    const notices = (announcements ?? []).filter(a => a.floorId === null).slice(0, 3);

    return (
        <Page
            title="Find a book"
            description={
                books.data
                    ? `${availableCount} of ${books.data.length} books are on the shelves and ready to borrow.`
                    : 'Search the catalogue and see what is available.'
            }
        >
            {notices.length > 0 && (
                <section aria-label="Announcements" className="flex flex-col gap-2">
                    {notices.map(notice => (
                        <div key={notice.id} className="alert alert-info alert-soft items-start">
                            <div>
                                <div className="font-semibold">{notice.title}</div>
                                <RichText html={notice.body} className="text-sm" />
                            </div>
                        </div>
                    ))}
                </section>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    className="input w-full sm:w-80"
                    placeholder="Search by title, author or ISBN..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    aria-label="Search books"
                />
                <select
                    className="select w-full sm:w-52"
                    value={genreId}
                    onChange={event => setGenreId(event.target.value)}
                    aria-label="Genre"
                >
                    <option value="">All genres</option>
                    {(genres ?? []).map(genre => (
                        <option key={genre.id} value={genre.id}>
                            {genre.name}
                        </option>
                    ))}
                </select>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        className="toggle toggle-sm toggle-success"
                        checked={availableOnly}
                        onChange={event => setAvailableOnly(event.target.checked)}
                    />
                    Only books I can borrow now
                </label>
            </div>

            {books.isError ? (
                <div role="alert" className="alert alert-error alert-soft">
                    Could not load the books: {getErrorMessage(books.error)}
                </div>
            ) : books.isLoading ? (
                <div className="flex justify-center p-10">
                    <span className="loading loading-spinner loading-lg" />
                </div>
            ) : visible.length === 0 ? (
                <p className="p-6 text-center opacity-70">
                    No books match.{availableOnly ? ' Turn off "Only books I can borrow now" to see every title.' : ''}
                </p>
            ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map(book => (
                        <li key={book.id}>
                            <BookCard book={book} />
                        </li>
                    ))}
                </ul>
            )}
        </Page>
    );
}

function BookCard({ book }: { book: Book }) {
    const authors = book.authors.map(author => author.name).join(', ');
    const shelved = book.rows.length > 0;

    return (
        <article className="card card-border h-full bg-base-100 shadow-sm">
            <div className="card-body gap-2">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="card-title text-base">{book.title}</h2>
                    <span className={`badge shrink-0 ${statusBadge[book.status]}`}>{statusLabel[book.status]}</span>
                </div>
                <p className="text-sm opacity-70">
                    {authors || 'Unknown author'} · {book.genreName}
                </p>

                <div className="mt-1 text-sm">
                    {book.status === BookStatus.Available && shelved ? (
                        <>
                            <div className="text-xs font-semibold uppercase opacity-60">Find it at</div>
                            <ul>
                                {book.rows.map(row => (
                                    <li key={row.id}>{rowLabel(row)}</li>
                                ))}
                            </ul>
                        </>
                    ) : book.status === BookStatus.Available ? (
                        <span className="opacity-70">Not on a shelf right now. Ask at the librarian's desk.</span>
                    ) : (
                        <span className="opacity-70">Not on the shelf at the moment.</span>
                    )}
                </div>

                {book.status === BookStatus.Available && shelved && (
                    <div className="card-actions mt-2 justify-end">
                        <Link
                            className="btn btn-primary btn-sm"
                            to={`/student/map?find=${encodeURIComponent(book.title)}`}
                        >
                            Show me the way
                        </Link>
                    </div>
                )}
            </div>
        </article>
    );
}
