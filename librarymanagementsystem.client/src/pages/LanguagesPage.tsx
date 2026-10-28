import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { languageHooks } from '../api/resources.ts';
import type { Language } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Language>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor(language => language.code ?? '', {
        id: 'code',
        header: 'Code',
        cell: info => info.getValue() || <span className="opacity-40">—</span>,
    }),
]);

const languageSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
    code: z.string().trim().max(5, 'Code must be at most 5 characters').optional(),
});

const fields: FormField<z.input<typeof languageSchema>>[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. English' },
    { name: 'code', label: 'Code', type: 'text', placeholder: 'e.g. en', description: 'Optional ISO 639-1 code.' },
];

export function LanguagesPage() {
    return (
        <CrudPage
            title="Languages"
            singular="language"
            description="Languages that books are available in."
            hooks={languageHooks}
            columns={columns}
            schema={languageSchema}
            fields={fields}
            newDefaults={{ name: '', code: '' }}
            toFormValues={language => ({ name: language.name, code: language.code ?? '' })}
            toRequest={values => ({ name: values.name, code: values.code || null })}
            itemLabel={language => language.name}
        />
    );
}
