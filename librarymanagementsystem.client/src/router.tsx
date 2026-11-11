import { createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAdmin, RequireAuth, RequireStaff } from './auth/RouteGuards.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { StudentLayout } from './components/layout/StudentLayout.tsx';
import { Page } from './components/layout/Page.tsx';
import { AuditLogPage } from './pages/AuditLogPage.tsx';
import { AuthorsPage } from './pages/AuthorsPage.tsx';
import { BooksPage } from './pages/BooksPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { FloorsPage } from './pages/FloorsPage.tsx';
import { GenresPage } from './pages/GenresPage.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { LegalPage } from './pages/LegalPage.tsx';
import { LanguagesPage } from './pages/LanguagesPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { RolesPage } from './pages/RolesPage.tsx';
import { RowsPage } from './pages/RowsPage.tsx';
import { SectionsPage } from './pages/SectionsPage.tsx';
import { ShelvesPage } from './pages/ShelvesPage.tsx';
import { TimeCardsPage } from './pages/TimeCardsPage.tsx';
import { StudentDashboardPage } from './pages/StudentDashboardPage.tsx';
import { StudentBooksPage } from './pages/StudentBooksPage.tsx';
import { StudentTablesPage } from './pages/StudentTablesPage.tsx';
import { StudentRoomsPage } from './pages/StudentRoomsPage.tsx';
import { SessionsPage } from './pages/SessionsPage.tsx';
import { ReservationsPage } from './pages/ReservationsPage.tsx';
import { RoomReservationsPage } from './pages/RoomReservationsPage.tsx';
import { TablesPage } from './pages/TablesPage.tsx';
import { AnnouncementsPage } from './pages/AnnouncementsPage.tsx';
import { NewsListPage } from './pages/NewsListPage.tsx';
import { NewsPage } from './pages/NewsPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';

export const router = createBrowserRouter([
    // Public front door, open to guests and signed-in users alike.
    { path: '/welcome', element: <LandingPage /> },
    { path: '/welcome/news', element: <NewsListPage /> },
    { path: '/welcome/privacy', element: <LegalPage document="privacy" /> },
    { path: '/welcome/terms', element: <LegalPage document="terms" /> },
    { path: '/welcome/legal', element: <LegalPage document="legal" /> },
    {
        // Everything inside needs a signed-in user.
        element: <RequireAuth />,
        children: [
            {
                // The readers' view: browse what is available and find it on the map.
                path: '/student',
                element: <StudentLayout />,
                children: [
                    { index: true, element: <StudentDashboardPage /> },
                    { path: 'books', element: <StudentBooksPage /> },
                    { path: 'tables', element: <StudentTablesPage /> },
                    { path: 'rooms', element: <StudentRoomsPage /> },
                    { path: 'sessions', element: <SessionsPage /> },
                    {
                        path: 'map',
                        lazy: async () => ({ Component: (await import('./pages/StudentMapPage.tsx')).StudentMapPage }),
                    },
                ],
            },
            {
                path: '/',
                element: <AppLayout />,
                children: [
                    { index: true, element: <DashboardPage /> },
                    { path: 'sessions', element: <SessionsPage /> },
                    { path: 'books', element: <BooksPage /> },
                    { path: 'authors', element: <AuthorsPage /> },
                    { path: 'genres', element: <GenresPage /> },
                    { path: 'languages', element: <LanguagesPage /> },
                    { path: 'announcements', element: <AnnouncementsPage /> },
                    {
                        element: <RequireStaff />,
                        children: [
                            { path: 'time-cards', element: <TimeCardsPage /> },
                            { path: 'reservations', element: <ReservationsPage /> },
                            { path: 'room-reservations', element: <RoomReservationsPage /> },
                            { path: 'tables', element: <TablesPage /> },
                            { path: 'news', element: <NewsPage /> },
                        ],
                    },
                    {
                        // Loaded on demand so the 3D library only ships to people who open the map.
                        path: 'map',
                        lazy: async () => ({ Component: (await import('./pages/LibraryMapPage.tsx')).LibraryMapPage }),
                    },
                    { path: 'floors', element: <FloorsPage /> },
                    { path: 'shelves', element: <ShelvesPage /> },
                    { path: 'rows', element: <RowsPage /> },
                    { path: 'sections', element: <SectionsPage /> },
                    {
                        element: <RequireAdmin />,
                        children: [
                            { path: 'users', element: <UsersPage /> },
                            { path: 'roles', element: <RolesPage /> },
                            { path: 'audit-log', element: <AuditLogPage /> },
                        ],
                    },
                    { path: '*', element: <Page title="Page not found">That page does not exist.</Page> },
                ],
            },
        ],
    },
    {
        element: <GuestOnly />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/register', element: <RegisterPage /> },
        ],
    },
]);
