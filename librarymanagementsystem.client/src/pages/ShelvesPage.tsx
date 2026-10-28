import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { floorHooks, shelfHooks } from '../api/resources.ts';
import type { Shelf } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Shelf>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('floorName', { header: 'Floor' }),
]);

const shelfSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    floorId: z.string().min(1, 'Select a floor'),
});
type ShelfFormInput = z.input<typeof shelfSchema>;

export function ShelvesPage() {
    const floors = floorHooks.useList().data;

    const fields = useMemo<FormField<ShelfFormInput>[]>(
        () => [
            { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Shelf A' },
            {
                name: 'floorId',
                label: 'Floor',
                type: 'select',
                placeholder: 'Select a floor',
                options: (floors ?? []).map(f => ({ value: f.id, label: f.name })),
            },
        ],
        [floors],
    );

    return (
        <CrudPage
            title="Shelves"
            singular="shelf"
            description="Shelves on each floor. A shelf with rows or sections cannot be deleted."
            hooks={shelfHooks}
            columns={columns}
            schema={shelfSchema}
            fields={fields}
            newDefaults={{ name: '', floorId: '' }}
            toFormValues={shelf => ({ name: shelf.name, floorId: shelf.floorId })}
            toRequest={values => ({ name: values.name, floorId: values.floorId })}
            itemLabel={shelf => `${shelf.floorName} › ${shelf.name}`}
        />
    );
}
