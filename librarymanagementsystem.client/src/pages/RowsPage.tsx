import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { rowHooks, shelfHooks } from '../api/resources.ts';
import type { Row } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Row>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('shelfName', { header: 'Shelf' }),
    helper.accessor('floorName', { header: 'Floor' }),
]);

const rowSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    shelfId: z.string().min(1, 'Select a shelf'),
});
type RowFormInput = z.input<typeof rowSchema>;

export function RowsPage() {
    const shelves = shelfHooks.useList().data;

    const fields = useMemo<FormField<RowFormInput>[]>(
        () => [
            { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Row 1' },
            {
                name: 'shelfId',
                label: 'Shelf',
                type: 'select',
                placeholder: 'Select a shelf',
                options: (shelves ?? []).map(s => ({ value: s.id, label: `${s.floorName} › ${s.name}` })),
            },
        ],
        [shelves],
    );

    return (
        <CrudPage
            title="Rows"
            singular="row"
            description="Rows on a shelf, where books are placed. A row with books cannot be deleted."
            hooks={rowHooks}
            columns={columns}
            schema={rowSchema}
            fields={fields}
            newDefaults={{ name: '', shelfId: '' }}
            toFormValues={row => ({ name: row.name, shelfId: row.shelfId })}
            toRequest={values => ({ name: values.name, shelfId: values.shelfId })}
            itemLabel={row => `${row.floorName} › ${row.shelfName} › ${row.name}`}
        />
    );
}
