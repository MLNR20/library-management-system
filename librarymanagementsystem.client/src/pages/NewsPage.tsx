import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { RichText, richTextToPlain } from '../components/ui/RichText.tsx';
import { faqHooks, newsHooks } from '../api/resources.ts';
import type { Faq, NewsPost } from '../api/resources.ts';
import { newsImageUrl, uploadNewsImage } from '../api/publicNews.ts';

const newsHelper = createDataTableColumnHelper<NewsPost>();
const newsColumns = newsHelper.columns([
    newsHelper.accessor(post => post.imageUrl ?? '', {
        id: 'image',
        header: 'Cover',
        enableSorting: false,
        cell: info =>
            info.row.original.imageUrl ? (
                <img src={info.row.original.imageUrl} alt="" className="h-12 w-20 rounded-field object-cover" />
            ) : (
                <span className="text-sm opacity-50">None</span>
            ),
    }),
    newsHelper.accessor('title', { header: 'Title' }),
    // Searches and sorts on the plain text, but shows the article with its formatting.
    newsHelper.accessor(post => richTextToPlain(post.body), {
        id: 'body',
        header: 'Article',
        cell: info => <RichText html={info.row.original.body} className="line-clamp-2 max-w-md text-sm" />,
    }),
    newsHelper.accessor(post => post.createdAt, {
        id: 'createdAt',
        header: 'Posted',
        cell: info => new Date(info.getValue()).toLocaleString(),
    }),
]);

const newsSchema = z.object({
    title: z.string().trim().min(1, 'Title is required').max(150, 'Title must be at most 150 characters'),
    // The name the upload returned; empty means no cover image.
    imageFileName: z.string(),
    body: z
        .string()
        .max(50000, 'The article is too long')
        .refine(body => richTextToPlain(body).length > 0, 'Write the article'),
});
type NewsFormInput = z.input<typeof newsSchema>;

const newsFields: FormField<NewsFormInput>[] = [
    { name: 'title', label: 'Title', type: 'text', placeholder: 'e.g. New study rooms open on floor 2', span: 2 },
    {
        name: 'imageFileName',
        label: 'Cover image',
        type: 'image',
        upload: uploadNewsImage,
        urlFor: newsImageUrl,
        description: 'Optional. JPG, PNG, GIF or WebP, up to 5 MB.',
    },
    { name: 'body', label: 'Article', type: 'richText', description: 'Use the toolbar for bold, lists and links.' },
];

const faqHelper = createDataTableColumnHelper<Faq>();
const faqColumns = faqHelper.columns([
    faqHelper.accessor('position', { header: 'Order' }),
    faqHelper.accessor('question', { header: 'Question' }),
    faqHelper.accessor(faq => richTextToPlain(faq.answer), {
        id: 'answer',
        header: 'Answer',
        cell: info => <RichText html={info.row.original.answer} className="line-clamp-2 max-w-md text-sm" />,
    }),
]);

const faqSchema = z.object({
    question: z.string().trim().min(1, 'Question is required').max(250, 'Question must be at most 250 characters'),
    position: z.number({ error: 'Enter a number' }).int('Use a whole number').min(0, 'Cannot be negative').max(10000, 'Too large'),
    answer: z
        .string()
        .max(20000, 'The answer is too long')
        .refine(answer => richTextToPlain(answer).length > 0, 'Write an answer'),
});
type FaqFormInput = z.input<typeof faqSchema>;

const faqFields: FormField<FaqFormInput>[] = [
    { name: 'question', label: 'Question', type: 'text', placeholder: 'e.g. How many books can I borrow?', span: 2 },
    {
        name: 'position',
        label: 'Order',
        type: 'number',
        min: 0,
        step: 1,
        description: 'Questions are listed lowest number first.',
    },
    { name: 'answer', label: 'Answer', type: 'richText', description: 'Use the toolbar for bold, lists and links.' },
];

/** Staff screen for the news articles shown on the landing page, with the FAQs that sit under them. */
export function NewsPage() {
    // The next free position, so a new question goes to the end of the list.
    const nextPosition = (faqHooks.useList().data ?? []).reduce((max, faq) => Math.max(max, faq.position + 1), 0);
    const faqDefaults = useMemo(() => ({ question: '', position: nextPosition, answer: '' }), [nextPosition]);

    return (
        <>
            <CrudPage
                title="News"
                singular="article"
                description="Articles for the landing page. The newest nine appear there; the rest are under View more."
                hooks={newsHooks}
                columns={newsColumns}
                schema={newsSchema}
                fields={newsFields}
                newDefaults={{ title: '', imageFileName: '', body: '' }}
                toFormValues={post => ({
                    title: post.title,
                    // The server stores just the file name, which is the last part of the image URL.
                    imageFileName: post.imageUrl?.split('/').pop() ?? '',
                    body: post.body,
                })}
                toRequest={values => ({ title: values.title, body: values.body, imageFileName: values.imageFileName || null })}
                itemLabel={post => post.title}
            />
            <CrudPage
                title="FAQs"
                singular="question"
                description="Frequently asked questions, shown below the news on the landing page."
                hooks={faqHooks}
                columns={faqColumns}
                schema={faqSchema}
                fields={faqFields}
                newDefaults={faqDefaults}
                toFormValues={faq => ({ question: faq.question, position: faq.position, answer: faq.answer })}
                toRequest={values => ({ question: values.question, position: values.position, answer: values.answer })}
                itemLabel={faq => faq.question}
            />
        </>
    );
}
