import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './useAuth.ts';

/** Renders the nested routes only for a signed-in user; everyone else is sent to the login page. */
export function RequireAuth() {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    return <Outlet />;
}

/** Login and register pages: a signed-in user has no business here. */
export function GuestOnly() {
    const { user } = useAuth();

    if (user) return <Navigate to="/" replace />;
    return <Outlet />;
}
