import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.ts';

// Mirrors Dtos/Notifications in LibraryManagementSystem.Server. Everyone only ever sees their own.

export interface AppNotification {
    id: string;
    borrowingId: string;
    kind: 'DueSoon' | 'Overdue';
    message: string;
    createdAtUtc: string;
    isRead: boolean;
}

const notificationsKey = ['notifications'] as const;

/** The reminder job writes once a day, so a slow poll is plenty. */
export function useNotifications() {
    return useQuery({
        queryKey: notificationsKey,
        queryFn: async () => (await api.get<AppNotification[]>('/notifications')).data,
        refetchInterval: 5 * 60 * 1000,
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: async id => {
            await api.post(`/notifications/${id}/read`);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, void>({
        mutationFn: async () => {
            await api.post('/notifications/read-all');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
    });
}
