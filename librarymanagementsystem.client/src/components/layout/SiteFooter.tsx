import { Link } from 'react-router';
import { useAuth } from '../../auth/useAuth.ts';

/** Public footer shared by the landing page and the legal pages: the primary colour, with the legal links always in reach. */
export function SiteFooter() {
    const { user, isStaff } = useAuth();
    const home = isStaff ? '/' : '/student';

    return (
        <footer className="bg-primary text-primary-content">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <p className="font-brand text-2xl font-bold tracking-wide">Alexandria</p>
                    <p className="mt-3 max-w-xs text-sm opacity-80">
                        Search the collection, borrow with confidence and find every book on the map.
                    </p>
                </div>

                <nav aria-label="Explore">
                    <h2 className="footer-title">Explore</h2>
                    <ul className="mt-2 flex flex-col gap-2 text-sm">
                        <li>
                            <a href="/welcome#features" className="link link-hover">
                                Features
                            </a>
                        </li>
                        <li>
                            <a href="/welcome#how-it-works" className="link link-hover">
                                How it works
                            </a>
                        </li>
                        <li>
                            <Link to="/welcome/news" className="link link-hover">
                                News
                            </Link>
                        </li>
                    </ul>
                </nav>

                <nav aria-label="Student access">
                    <h2 className="footer-title">Students</h2>
                    <ul className="mt-2 flex flex-col gap-2 text-sm">
                        {user ? (
                            <li>
                                <Link to={home} className="link link-hover">
                                    Open the library
                                </Link>
                            </li>
                        ) : (
                            <>
                                <li>
                                    <Link to="/login" className="link link-hover">
                                        Student sign in
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/register" className="link link-hover">
                                        Create an account
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </nav>

                <nav aria-label="Legal">
                    <h2 className="footer-title">Legal</h2>
                    <ul className="mt-2 flex flex-col gap-2 text-sm">
                        <li>
                            <Link to="/welcome/privacy" className="link link-hover">
                                Data privacy
                            </Link>
                        </li>
                        <li>
                            <Link to="/welcome/terms" className="link link-hover">
                                Terms and conditions
                            </Link>
                        </li>
                        <li>
                            <Link to="/welcome/legal" className="link link-hover">
                                Legal notice
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>

            <div className="border-t border-primary-content/20">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs sm:flex-row">
                    <p className="opacity-80">© {new Date().getFullYear()} Alexandria Library Management System. All rights reserved.</p>
                    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                        <li>
                            <Link to="/welcome/privacy" className="link link-hover">
                                Privacy
                            </Link>
                        </li>
                        <li>
                            <Link to="/welcome/terms" className="link link-hover">
                                Terms
                            </Link>
                        </li>
                        <li>
                            <Link to="/welcome/legal" className="link link-hover">
                                Legal
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}
