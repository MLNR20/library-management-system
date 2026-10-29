import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../auth/useAuth.ts';
import { useDarkTheme } from './useDarkTheme.ts';

const navLinkClass = ({ isActive }: { isActive: boolean }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`;

/** A lighter frame for readers: find a book and see where it is, without the staff menus. */
export function StudentLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dark, setDark] = useDarkTheme();

    return (
        <div className="flex min-h-screen flex-col">
            <header className="navbar sticky top-0 z-30 flex-wrap gap-2 border-b border-base-300 bg-base-100">
                <div className="flex-none px-2 text-xl font-bold">📚 Library</div>
                <nav className="flex flex-1 items-center gap-1" aria-label="Student">
                    <NavLink to="/student" end className={navLinkClass}>
                        Find a book
                    </NavLink>
                    <NavLink to="/student/map" className={navLinkClass}>
                        Library map
                    </NavLink>
                </nav>
                <label className="flex flex-none cursor-pointer items-center gap-2 pr-2 text-sm">
                    <span>Dark</span>
                    <input
                        type="checkbox"
                        className="toggle"
                        checked={dark}
                        onChange={event => setDark(event.target.checked)}
                        aria-label="Dark theme"
                    />
                </label>
                <div className="flex flex-none items-center gap-2">
                    <NavLink to="/" className="btn btn-ghost btn-sm">
                        Staff view
                    </NavLink>
                    <span className="hidden text-sm sm:inline">{user?.userName}</span>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                            logout();
                            navigate('/login', { replace: true });
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </header>

            <main className="flex flex-1 flex-col">
                <Outlet />
            </main>
        </div>
    );
}
