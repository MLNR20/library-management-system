import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../auth/useAuth.ts';
import {
    AnnouncementIcon,
    AuditIcon,
    AuthorIcon,
    BookIcon,
    DashboardIcon,
    FloorIcon,
    GenreIcon,
    LanguageIcon,
    MapIcon,
    RowIcon,
    SectionIcon,
    ShelfIcon,
    ShieldIcon,
    UsersIcon,
} from '../ui/icons.tsx';

interface NavItem {
    to: string;
    label: string;
    icon: ReactNode;
    end?: boolean;
}

interface NavGroup {
    /** Heading shown above the group; the first group has none. */
    title?: string;
    items: NavItem[];
}

const iconClass = 'h-5 w-5';

const navGroups: NavGroup[] = [
    {
        items: [{ to: '/', label: 'Dashboard', icon: <DashboardIcon className={iconClass} />, end: true }],
    },
    {
        title: 'Catalogue',
        items: [
            { to: '/books', label: 'Books', icon: <BookIcon className={iconClass} /> },
            { to: '/authors', label: 'Authors', icon: <AuthorIcon className={iconClass} /> },
            { to: '/genres', label: 'Genres', icon: <GenreIcon className={iconClass} /> },
            { to: '/languages', label: 'Languages', icon: <LanguageIcon className={iconClass} /> },
            { to: '/announcements', label: 'Announcements', icon: <AnnouncementIcon className={iconClass} /> },
        ],
    },
    {
        title: 'Library layout',
        items: [
            { to: '/map', label: 'Library map', icon: <MapIcon className={iconClass} /> },
            { to: '/floors', label: 'Floors', icon: <FloorIcon className={iconClass} /> },
            { to: '/shelves', label: 'Shelves', icon: <ShelfIcon className={iconClass} /> },
            { to: '/rows', label: 'Rows', icon: <RowIcon className={iconClass} /> },
            { to: '/sections', label: 'Sections', icon: <SectionIcon className={iconClass} /> },
        ],
    },
];

// Only shown to administrators.
const adminGroup: NavGroup = {
    title: 'Administration',
    items: [
        { to: '/users', label: 'Users', icon: <UsersIcon className={iconClass} /> },
        { to: '/roles', label: 'Roles', icon: <ShieldIcon className={iconClass} /> },
        { to: '/audit-log', label: 'Audit log', icon: <AuditIcon className={iconClass} /> },
    ],
};

export function AppLayout() {
    const { user, isAdmin, logout } = useAuth();
    const visibleGroups = isAdmin ? [...navGroups, adminGroup] : navGroups;
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const drawerToggle = useRef<HTMLInputElement>(null);
    // Desktop: the sidebar can be collapsed away. Mobile always starts closed and slides over the page.
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        try {
            return localStorage.getItem('lms.sidebarOpen') !== 'false';
        } catch {
            return true;
        }
    });

    const toggleSidebar = () => {
        if (window.matchMedia('(min-width: 1024px)').matches) {
            setSidebarOpen(open => {
                try {
                    localStorage.setItem('lms.sidebarOpen', String(!open));
                } catch {
                    // Preference just won't persist.
                }
                return !open;
            });
        } else if (drawerToggle.current) {
            drawerToggle.current.checked = !drawerToggle.current.checked;
        }
    };
    const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

    useEffect(() => {
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    }, [dark]);

    const closeDrawer = () => {
        if (drawerToggle.current) drawerToggle.current.checked = false;
    };

    return (
        <div className={`drawer ${sidebarOpen ? 'lg:drawer-open' : ''}`}>
            <input id="app-drawer" ref={drawerToggle} type="checkbox" className="drawer-toggle" />

            <div className="drawer-content flex min-h-screen flex-col">
                <header className="navbar sticky top-0 z-30 border-b border-base-300 bg-base-100">
                    <div className="flex-none">
                        <button
                            type="button"
                            className="btn btn-square btn-ghost"
                            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                            aria-expanded={sidebarOpen}
                            aria-controls="app-sidebar"
                            onClick={toggleSidebar}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 px-2 font-semibold">Library Management System</div>
                    <label className="flex flex-none cursor-pointer items-center gap-2 pr-2 text-sm">
                        <span>Dark</span>
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={dark}
                            onChange={e => setDark(e.target.checked)}
                            aria-label="Dark theme"
                        />
                    </label>
                    <div className="flex flex-none items-center gap-2 pl-2">
                        <span className="hidden text-sm sm:inline">{user?.userName}</span>
                        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                            Sign out
                        </button>
                    </div>
                </header>

                <main className="flex flex-1 flex-col">
                    <Outlet />
                </main>
            </div>

            <div className="drawer-side z-40">
                <label htmlFor="app-drawer" aria-label="Close menu" className="drawer-overlay" />
                <aside id="app-sidebar" className="flex min-h-full w-64 flex-col bg-base-200">
                    <div className="px-6 py-5 text-xl font-bold">📚 Library</div>
                    <nav aria-label="Main">
                        {visibleGroups.map((group, index) => (
                            <div key={group.title ?? 'main'}>
                                {index > 0 && <div className="divider my-1 px-6" role="separator" />}
                                <ul className="menu w-full gap-1 px-3" aria-label={group.title}>
                                    {group.title && <li className="menu-title">{group.title}</li>}
                                    {group.items.map(item => (
                                        <li key={item.to}>
                                            <NavLink
                                                to={item.to}
                                                end={item.end}
                                                onClick={closeDrawer}
                                                className={({ isActive }) => (isActive ? 'menu-active' : '')}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </aside>
            </div>
        </div>
    );
}
