import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { authorHooks } from '../api/resources.ts';
import type { Author } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Author>();
const columns = helper.columns([helper.accessor('name', { header: 'Name' })]);

const authorSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
});

const fields: FormField<z.input<typeof authorSchema>>[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Ursula K. Le Guin', span: 2 },
];

export function AuthorsPage() {
    return (
        <CrudPage
            title="Authors"
            singular="author"
            description="People who wrote the books in the catalogue."
            hooks={authorHooks}
            columns={columns}
            schema={authorSchema}
            fields={fields}
            newDefaults={{ name: '' }}
            toFormValues={author => ({ name: author.name })}
            toRequest={values => ({ name: values.name })}
            itemLabel={author => author.name}
        />
    );
}
