import { ADMIN_ROLE, LIBRARIAN_ROLE } from '../api/admin.ts';

/** Where a user lands after signing in: staff get the management app, everyone else the readers' view. */
export function homePathFor(roles: readonly string[]): string {
    const isStaff = roles.some(role => role === ADMIN_ROLE || role === LIBRARIAN_ROLE);
    return isStaff ? '/' : '/student';
}
