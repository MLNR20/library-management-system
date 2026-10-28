import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { DataTableFilter } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { authorHooks, bookHooks, bookStatusLabels, genreHooks, languageHooks, rowHooks, rowLabel } from '../api/resources.ts';
import type { Book, BookStatus } from '../api/resources.ts';

const statusBadge: Record<string, string> = {
    Available: 'badge-success',
    Borrowed: 'badge-warning',
    Reserved: 'badge-info',
    Lost: 'badge-error',
    Damaged: 'badge-neutral',
};

const helper = createDataTableColumnHelper<Book>();
const columns = helper.columns([
    helper.accessor('title', { header: 'Title' }),
    helper.accessor(book => book.authors.map(a => a.name).join(', '), { id: 'authors', header: 'Authors' }),
    helper.accessor('genreName', { header: 'Genre', filterFn: 'equalsString' }),
    helper.accessor('isbn', { header: 'ISBN' }),
    helper.accessor(book => bookStatusLabels[book.status], {
        id: 'status',
        header: 'Status',
        filterFn: 'equalsString',
        cell: info => <span className={`badge ${statusBadge[info.getValue()]}`}>{info.getValue()}</span>,
    }),
    helper.accessor(book => book.rows.map(rowLabel).join('; '), {
        id: 'location',
        header: 'Location',
        cell: info => info.getValue() || <span className="opacity-40">—</span>,
    }),
    helper.accessor('pages', { header: 'Pages' }),
    helper.accessor('dateAcquired', { header: 'Acquired' }),
]);

const statusOptions = Object.entries(bookStatusLabels).map(([value, label]) => ({ value, label }));

const bookSchema = z.object({
    title: z.string().trim().min(1, 'Title is required').max(300, 'Title must be at most 300 characters'),
    isbn: z.string().trim().min(1, 'ISBN is required').max(17, 'ISBN must be at most 17 characters'),
    edition: z.string().trim().max(50, 'Edition must be at most 50 characters').optional(),
    pages: z.number({ error: 'Enter the number of pages' }).int('Pages must be a whole number').min(1, 'At least 1 page'),
    status: z.enum(['0', '1', '2', '3', '4']),
    dateAcquired: z.string().min(1, 'Pick the date acquired'),
    genreId: z.string().min(1, 'Select a genre'),
    authorIds: z.array(z.string()).min(1, 'Select at least one author'),
    languageIds: z.array(z.string()),
    rowIds: z.array(z.string()),
});
type BookFormInput = z.input<typeof bookSchema>;

export function BooksPage() {
    const genres = genreHooks.useList().data;
    const authors = authorHooks.useList().data;
    const languages = languageHooks.useList().data;
    const rows = rowHooks.useList().data;

    const fields = useMemo<FormField<BookFormInput>[]>(
        () => [
            { name: 'title', label: 'Title', type: 'text', span: 2 },
            { name: 'isbn', label: 'ISBN', type: 'text', placeholder: '978-3-16-148410-0' },
            { name: 'edition', label: 'Edition', type: 'text', placeholder: 'e.g. 2nd' },
            { name: 'pages', label: 'Pages', type: 'number', min: 1 },
            { name: 'dateAcquired', label: 'Date acquired', type: 'date' },
            { name: 'genreId', label: 'Genre', type: 'select', placeholder: 'Select a genre', options: (genres ?? []).map(g => ({ value: g.id, label: g.name })) },
            { name: 'status', label: 'Status', type: 'select', options: statusOptions },
            { name: 'authorIds', label: 'Authors', type: 'checkboxGroup', options: (authors ?? []).map(a => ({ value: a.id, label: a.name })) },
            { name: 'languageIds', label: 'Languages', type: 'checkboxGroup', options: (languages ?? []).map(l => ({ value: l.id, label: l.name })) },
            { name: 'rowIds', label: 'Shelved in', type: 'checkboxGroup', span: 2, description: 'Pick every row this book is placed in.', options: (rows ?? []).map(r => ({ value: r.id, label: rowLabel(r) })) },
        ],
        [genres, authors, languages, rows],
    );

    const filters = useMemo<DataTableFilter[]>(
        () => [
            { columnId: 'genreName', label: 'Genres', options: (genres ?? []).map(g => ({ value: g.name, label: g.name })) },
            { columnId: 'status', label: 'Statuses', options: statusOptions.map(s => ({ value: s.label, label: s.label })) },
        ],
        [genres],
    );

    return (
        <CrudPage
            title="Books"
            singular="book"
            description="Every title in the catalogue."
            hooks={bookHooks}
            columns={columns}
            filters={filters}
            searchPlaceholder="Search title, author, genre, ISBN..."
            schema={bookSchema}
            fields={fields}
            newDefaults={{ title: '', isbn: '', edition: '', status: '0', dateAcquired: '', genreId: '', authorIds: [], languageIds: [], rowIds: [] }}
            toFormValues={book => ({
                title: book.title,
                isbn: book.isbn,
                edition: book.edition ?? '',
                pages: book.pages,
                status: String(book.status) as BookFormInput['status'],
                dateAcquired: book.dateAcquired,
                genreId: book.genreId,
                authorIds: book.authors.map(a => a.id),
                languageIds: book.languages.map(l => l.id),
                rowIds: book.rows.map(r => r.id),
            })}
            toRequest={values => ({
                title: values.title,
                isbn: values.isbn,
                edition: values.edition || null,
                pages: values.pages,
                status: Number(values.status) as BookStatus,
                dateAcquired: values.dateAcquired,
                genreId: values.genreId,
                authorIds: values.authorIds,
                languageIds: values.languageIds,
                rowIds: values.rowIds,
            })}
            itemLabel={book => book.title}
        />
    );
}
