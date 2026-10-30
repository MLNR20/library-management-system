import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { genreHooks } from '../api/resources.ts';
import type { Genre } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Genre>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor(genre => genre.deweyNumber ?? '', {
        id: 'deweyNumber',
        header: 'Dewey number',
        cell: info => info.getValue() || <span className="opacity-40">—</span>,
    }),
    helper.accessor(genre => genre.description ?? '', {
        id: 'description',
        header: 'Description',
        cell: info => info.getValue() || <span className="opacity-40">—</span>,
    }),
]);

const genreSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    deweyNumber: z
        .string()
        .trim()
        .regex(/^(\d{3}(\.\d+)?)?$/, 'Use a single number such as 510 or 516.3, not a range')
        .optional(),
    description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
});

const fields: FormField<z.input<typeof genreSchema>>[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Science fiction', span: 2 },
    {
        name: 'deweyNumber',
        label: 'Dewey number',
        type: 'text',
        placeholder: 'e.g. 510 or 516.3',
        description: 'Optional. One number, three digits with an optional decimal part - not a range.',
    },
    { name: 'description', label: 'Description', type: 'textarea', description: 'Optional, up to 500 characters.' },
];

export function GenresPage() {
    return (
        <CrudPage
            title="Genres"
            singular="genre"
            description="Categories used to organise books. A genre in use cannot be deleted."
            hooks={genreHooks}
            columns={columns}
            schema={genreSchema}
            fields={fields}
            newDefaults={{ name: '', deweyNumber: '', description: '' }}
            toFormValues={genre => ({
                name: genre.name,
                deweyNumber: genre.deweyNumber ?? '',
                description: genre.description ?? '',
            })}
            toRequest={values => ({
                name: values.name,
                deweyNumber: values.deweyNumber || null,
                description: values.description || null,
            })}
            itemLabel={genre => genre.name}
        />
    );
}
