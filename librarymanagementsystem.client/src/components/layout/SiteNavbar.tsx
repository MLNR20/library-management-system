import { Link, useLocation } from 'react-router';
import { useAuth } from '../../auth/useAuth.ts';
import { useLightTheme } from './useLightTheme.ts';

/** Public top bar shared by the landing, login and registration pages. These pages are always in the light theme. */
export function SiteNavbar() {
    const { user, isStaff, logout } = useAuth();
    const { pathname } = useLocation();
    const home = isStaff ? '/' : '/student';
    useLightTheme();

    return (
        <header className="navbar sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-2">
                <Link to="/welcome" className="flex-1 font-brand text-2xl font-bold tracking-wide whitespace-nowrap text-primary">
                    Alexandria
                </Link>
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
