import { Link, useLocation } from 'react-router';
import { useAuth } from '../../auth/useAuth.ts';
import { useDarkTheme } from './useDarkTheme.ts';

interface SiteNavbarProps {
    /** Show the dark theme switch. On by default; the landing page turns it off. */
    themeToggle?: boolean;
}

/** Public top bar shared by the landing, login and registration pages. */
export function SiteNavbar({ themeToggle = true }: SiteNavbarProps) {
    const { user, isStaff, logout } = useAuth();
    const [dark, setDark] = useDarkTheme();
    const { pathname } = useLocation();
    const home = isStaff ? '/' : '/student';

    return (
        <header className="navbar sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-2">
                <Link to="/welcome" className="flex-1 font-brand text-2xl font-bold tracking-wide whitespace-nowrap text-primary">
                    Alexandria
                </Link>
                {themeToggle && (
                    <label className="flex cursor-pointer items-center gap-2 pr-2 text-sm">
                        <span className="hidden sm:inline">Dark</span>
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={dark}
                            onChange={event => setDark(event.target.checked)}
                            aria-label="Dark theme"
                        />
                    </label>
                )}
                {user ? (
                    <>
                        <span className="hidden text-sm sm:inline">{user.userName}</span>
                        <button className="btn btn-ghost btn-sm" onClick={logout}>
                            Sign out
                        </button>
                        <Link to={home} className="btn btn-primary btn-sm">
                            Open library
                        </Link>
                    </>
                ) : (
                    <>
                        {pathname !== '/login' && (
                            <Link to="/login" className="btn btn-ghost btn-sm">
                                Sign in
                            </Link>
                        )}
                        {pathname !== '/register' && (
                            <Link to="/register" className="btn btn-primary btn-sm">
                                Create account
                            </Link>
                        )}
                    </>
                )}
            </div>
        </header>
    );
}
