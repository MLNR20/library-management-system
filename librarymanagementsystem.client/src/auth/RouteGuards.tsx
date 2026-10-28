import { Navigate, Outlet, useLocation } from 'react-router';
import { Page } from '../components/layout/Page.tsx';
import { useAuth } from './useAuth.ts';

/** Renders the nested routes only for a signed-in user; everyone else is sent to the login page. */
export function RequireAuth() {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    return <Outlet />;
}

/** Nested routes for administrators only. The API enforces this too; this just keeps everyone else off dead pages. */
export function RequireAdmin() {
    const { isAdmin } = useAuth();

    if (!isAdmin) {
        return (
            <Page title="Not allowed">
                <div role="alert" className="alert alert-warning alert-soft">
                    You need the Administrator role to see this page. If you were just given it, sign out and back in.
                </div>
            </Page>
        );
    }
    return <Outlet />;
}

/** Login and register pages: a signed-in user has no business here. */
export function GuestOnly() {
    const { user } = useAuth();

    if (user) return <Navigate to="/" replace />;
    return <Outlet />;
}
