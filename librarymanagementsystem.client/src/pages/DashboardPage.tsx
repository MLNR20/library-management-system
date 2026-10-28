import { Page } from '../components/layout/Page.tsx';
import { StatCard } from '../components/ui/Card.tsx';
import { AuthorIcon, BookIcon, GenreIcon, LoanIcon } from '../components/ui/icons.tsx';
import { authorHooks, BookStatus, bookHooks, genreHooks } from '../api/resources.ts';

export function DashboardPage() {
    const books = bookHooks.useList().data;
    const authors = authorHooks.useList().data;
    const genres = genreHooks.useList().data;

    const count = (items: unknown[] | undefined) => items?.length ?? '—';
    const borrowed = books?.filter(b => b.status === BookStatus.Borrowed).length;

    return (
        <Page title="Dashboard" description="A quick look at the catalogue.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Books" value={count(books)} hint="Titles in the catalogue" icon={<BookIcon />} />
                <StatCard label="Borrowed" value={borrowed ?? '—'} hint="Currently on loan" icon={<LoanIcon />} />
                <StatCard label="Authors" value={count(authors)} icon={<AuthorIcon />} />
                <StatCard label="Genres" value={count(genres)} icon={<GenreIcon />} />
            </div>
        </Page>
    );
}
