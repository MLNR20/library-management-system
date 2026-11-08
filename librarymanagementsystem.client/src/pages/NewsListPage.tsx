import { Link } from 'react-router';
import { useLatestNews } from '../api/publicNews.ts';
import { getErrorMessage } from '../lib/api.ts';
import { NewsGrid } from '../components/news/NewsGrid.tsx';
import { SiteNavbar } from '../components/layout/SiteNavbar.tsx';
import { NewsIcon } from '../components/ui/icons.tsx';

/** Public page with every news article, newest first. Reached from "View more" on the landing page. */
export function NewsListPage() {
    const news = useLatestNews();

    return (
        <div className="flex min-h-screen flex-col bg-base-100">
            <SiteNavbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <Link to="/welcome" className="link link-hover text-sm">
                    ← Back to the home page
                </Link>
                <h1 className="mt-4 flex items-center gap-2 text-3xl font-bold">
                    <NewsIcon className="h-7 w-7 text-primary" />
                    News
                </h1>

                <div className="mt-8">
                    {news.isLoading ? (
                        <div className="flex justify-center py-16">
                            <span className="loading loading-spinner loading-lg" aria-label="Loading news" />
                        </div>
                    ) : news.isError ? (
                        <div role="alert" className="alert alert-error alert-soft">
                            <span>Could not load the news: {getErrorMessage(news.error)}</span>
                            <button className="btn btn-sm" onClick={() => news.refetch()}>
                                Retry
                            </button>
                        </div>
                    ) : news.data && news.data.length > 0 ? (
                        <NewsGrid posts={news.data} />
                    ) : (
                        <p className="py-16 text-center opacity-70">There is no news yet.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
