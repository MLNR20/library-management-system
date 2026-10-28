import { createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAdmin, RequireAuth } from './auth/RouteGuards.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { Page } from './components/layout/Page.tsx';
import { AuditLogPage } from './pages/AuditLogPage.tsx';
import { AuthorsPage } from './pages/AuthorsPage.tsx';
import { BooksPage } from './pages/BooksPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { FloorsPage } from './pages/FloorsPage.tsx';
import { GenresPage } from './pages/GenresPage.tsx';
import { LanguagesPage } from './pages/LanguagesPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { RolesPage } from './pages/RolesPage.tsx';
import { RowsPage } from './pages/RowsPage.tsx';
import { SectionsPage } from './pages/SectionsPage.tsx';
import { ShelvesPage } from './pages/ShelvesPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';

export const router = createBrowserRouter([
    {
        // Everything inside needs a signed-in user.
        element: <RequireAuth />,
        children: [
            {
                path: '/',
                element: <AppLayout />,
                children: [
                    { index: true, element: <DashboardPage /> },
                    { path: 'books', element: <BooksPage /> },
                    { path: 'authors', element: <AuthorsPage /> },
                    { path: 'genres', element: <GenresPage /> },
                    { path: 'languages', element: <LanguagesPage /> },
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
