import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { floorHooks } from '../api/resources.ts';
import type { Floor } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Floor>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('wings', { header: 'Wings' }),
]);

const floorSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    wings: z.enum(['2', '4']),
});

type FloorFormInput = z.input<typeof floorSchema>;

const fields: FormField<FloorFormInput>[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Ground floor', span: 2 },
    {
        name: 'wings',
        label: 'Wings',
        type: 'select',
        options: [
            { value: '2', label: '2 wings' },
            { value: '4', label: '4 wings' },
        ],
        description: 'A floor always has 2 or 4 wings: cube-sized rooms beside the hall on the 3D map. They widen every floor of the building.',
        span: 2,
    },
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
            newDefaults={{ name: '', wings: '4' }}
            toFormValues={floor => ({ name: floor.name, wings: String(floor.wings) as FloorFormInput['wings'] })}
            toRequest={values => ({ name: values.name, wings: Number(values.wings) })}
            itemLabel={floor => floor.name}
        />
    );
}
