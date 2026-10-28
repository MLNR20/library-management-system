import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { floorHooks } from '../api/resources.ts';
import type { Floor } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Floor>();
const columns = helper.columns([helper.accessor('name', { header: 'Name' })]);

const floorSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
});

const fields: FormField<z.input<typeof floorSchema>>[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Ground floor', span: 2 },
];

export function FloorsPage() {
    return (
        <CrudPage
            title="Floors"
            singular="floor"
            description="The floors of the library. A floor with shelves or sections cannot be deleted."
            hooks={floorHooks}
            columns={columns}
            schema={floorSchema}
            fields={fields}
            newDefaults={{ name: '' }}
            toFormValues={floor => ({ name: floor.name })}
            toRequest={values => ({ name: values.name })}
            itemLabel={floor => floor.name}
        />
    );
}
