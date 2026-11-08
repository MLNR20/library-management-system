import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import type { Faq, NewsPost } from './resources.ts';

/** The newest news articles, or all of them when `take` is left out. Open to visitors who are not signed in. */
export function useLatestNews(take?: number) {
    return useQuery({
        queryKey: ['news', 'latest', take ?? 'all'],
        queryFn: async () => (await api.get<NewsPost[]>('/news', { params: { take } })).data,
    });
}

/** The frequently asked questions, in display order. Open to visitors who are not signed in. */
export function usePublicFaqs() {
    return useQuery({
        queryKey: ['faqs', 'public'],
        queryFn: async () => (await api.get<Faq[]>('/faqs')).data,
    });
}

/** Uploads a cover image and resolves with the file name to save on the article. */
export async function uploadNewsImage(file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    // The default JSON content type would hide the multipart boundary, so let the browser set it.
    const { data } = await api.post<{ fileName: string }>('/news/images', body, { headers: { 'Content-Type': undefined } });
    return data.fileName;
}

/** Where an uploaded cover image can be shown from. */
export const newsImageUrl = (fileName: string) => `/api/news/images/${fileName}`;
