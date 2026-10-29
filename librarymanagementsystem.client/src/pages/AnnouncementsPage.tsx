import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { RichText, richTextToPlain } from '../components/ui/RichText.tsx';
import { announcementHooks, floorHooks } from '../api/resources.ts';
import type { Announcement } from '../api/resources.ts';

const ENTIRE_LIBRARY = 'Entire library';

const helper = createDataTableColumnHelper<Announcement>();
const columns = helper.columns([
    helper.accessor('title', { header: 'Title' }),
    helper.accessor(announcement => announcement.floorName ?? ENTIRE_LIBRARY, {
        id: 'floor',
        header: 'Floor',
        cell: info => (
            <span className={`badge ${info.row.original.floorId ? 'badge-outline' : 'badge-primary badge-soft'}`}>
                {info.getValue()}
            </span>
        ),
    }),
    // Searches and sorts on the plain text, but shows the message with its formatting.
    helper.accessor(announcement => richTextToPlain(announcement.body), {
        id: 'body',
        header: 'Message',
        cell: info => <RichText html={info.row.original.body} className="line-clamp-3 max-w-md text-sm" />,
    }),
    helper.accessor(announcement => announcement.createdAt, {
        id: 'createdAt',
        header: 'Posted',
        cell: info => new Date(info.getValue()).toLocaleString(),
    }),
]);

const announcementSchema = z.object({
    title: z.string().trim().min(1, 'Title is required').max(150, 'Title must be at most 150 characters'),
    // Empty means the announcement is for the entire library.
    floorId: z.string(),
    body: z
        .string()
        .max(20000, 'The message is too long')
        .refine(body => richTextToPlain(body).length > 0, 'Write a message'),
});
type AnnouncementFormInput = z.input<typeof announcementSchema>;

export function AnnouncementsPage() {
    const floors = floorHooks.useList().data;

    const fields = useMemo<FormField<AnnouncementFormInput>[]>(
        () => [
            { name: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Quiet study hours' },
            {
                name: 'floorId',
                label: 'Floor',
                type: 'select',
                // The empty choice: no floor, so the notice is for everyone in the library.
                placeholder: ENTIRE_LIBRARY,
                options: (floors ?? []).map(f => ({ value: f.id, label: f.name })),
            },
            {
                name: 'body',
                label: 'Message',
                type: 'richText',
                description: 'Use the toolbar for bold, lists and links.',
            },
        ],
        [floors],
    );

    return (
        <CrudPage
            title="Announcements"
            singular="announcement"
            description="Notices for readers. Pick a floor, or leave it on Entire library."
            hooks={announcementHooks}
            columns={columns}
            schema={announcementSchema}
            fields={fields}
            newDefaults={{ title: '', floorId: '', body: '' }}
            toFormValues={announcement => ({
                title: announcement.title,
                floorId: announcement.floorId ?? '',
                body: announcement.body,
            })}
            toRequest={values => ({ title: values.title, body: values.body, floorId: values.floorId || null })}
            itemLabel={announcement => announcement.title}
        />
    );
}
