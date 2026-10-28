import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { genreHooks } from '../api/resources.ts';
import type { Genre } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Genre>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor(genre => genre.description ?? '', {
        id: 'description',
        header: 'Description',
        cell: info => info.getValue() || <span className="opacity-40">—</span>,
    }),
]);

const genreSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
});

const fields: FormField<z.input<typeof genreSchema>>[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Science fiction', span: 2 },
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
            newDefaults={{ name: '', description: '' }}
            toFormValues={genre => ({ name: genre.name, description: genre.description ?? '' })}
            toRequest={values => ({ name: values.name, description: values.description || null })}
            itemLabel={genre => genre.name}
        />
    );
}
