import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import type { AuthUser } from '../lib/authStorage.ts';
import { createCrudHooks } from '../lib/crud.ts';

// Mirrors the Dtos in LibraryManagementSystem.Server (Roles, AuditLogs). Every endpoint here is administrator-only.

/** The built-in role: it grants access to this section and cannot be renamed or deleted. */
export const ADMIN_ROLE = 'Administrator';
export const LIBRARIAN_ROLE = 'Librarian';

export interface Role {
    id: string;
    name: string;
}
export interface RoleRequest {
    name: string;
}

export const roleHooks = createCrudHooks<Role, RoleRequest>('roles');

export interface UserWithRoles {
    user: AuthUser;
    roles: string[];
}

export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => (await api.get<UserWithRoles[]>('/users')).data,
    });
}

/** Replaces all of a user's roles; the server refuses to remove the last administrator. */
export function useSetUserRoles() {
    const queryClient = useQueryClient();
    return useMutation<UserWithRoles, Error, { userId: string; roleNames: string[] }>({
        mutationFn: async ({ userId, roleNames }) =>
            (await api.put<UserWithRoles>(`/users/${userId}/roles`, { roleNames })).data,
        // Role changes show up in the audit log too.
        onSuccess: () => queryClient.invalidateQueries(),
    });
}

export interface AuditLog {
    id: string;
    timestampUtc: string;
    /** "Area.Event", e.g. "Auth.Login" or "Book.Updated". */
    action: string;
    success: boolean;
    userId: string | null;
    userName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    target: string | null;
    details: string | null;
}

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface AuditLogFilters {
    search: string;
    action: string;
    success: '' | 'true' | 'false';
    /** yyyy-MM-dd in the viewer's time zone. */
    from: string;
    to: string;
    /** 1-based. */
    page: number;
    pageSize: number;
}

export const emptyAuditFilters: AuditLogFilters = {
    search: '',
    action: '',
    success: '',
    from: '',
    to: '',
    page: 1,
    pageSize: 20,
};

function toQuery(filters: AuditLogFilters) {
    return {
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search || undefined,
        action: filters.action || undefined,
        success: filters.success || undefined,
        // Whole days in the viewer's time zone, sent as UTC instants.
        from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
        to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
    };
}

export function useAuditLogs(filters: AuditLogFilters) {
    return useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: async () => (await api.get<PagedResult<AuditLog>>('/audit-logs', { params: toQuery(filters) })).data,
        // Keep showing the old page while the next one loads.
        placeholderData: keepPreviousData,
    });
}

export function useAuditActions() {
    return useQuery({
        queryKey: ['audit-logs', 'actions'],
        queryFn: async () => (await api.get<string[]>('/audit-logs/actions')).data,
    });
}
