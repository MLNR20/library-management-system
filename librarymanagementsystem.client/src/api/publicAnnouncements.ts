import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import type { Announcement } from './resources.ts';

/** The newest library-wide announcements. Open to visitors who are not signed in. */
export function useLatestAnnouncements() {
    return useQuery({
        queryKey: ['announcements', 'latest'],
        queryFn: async () => (await api.get<Announcement[]>('/announcements/latest')).data,
    });
}
