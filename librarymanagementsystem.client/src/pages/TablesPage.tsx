import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { SectionModel, sectionHooks } from '../api/resources.ts';
import { tableHooks } from '../api/tables.ts';
import type { StudyTable } from '../api/tables.ts';

const helper = createDataTableColumnHelper<StudyTable>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('seats', { header: 'Seats' }),
    helper.accessor(table => table.sectionName ?? '—', { id: 'section', header: 'Reading room' }),
    helper.accessor(table => (table.isActive ? 'In service' : 'Out of service'), { id: 'status', header: 'Status' }),
]);

const tableSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    seats: z.number({ error: 'Enter the number of seats' }).int('Seats must be a whole number').min(1, 'At least 1 seat').max(50, 'At most 50 seats'),
    sectionId: z.string(),
    isActive: z.boolean(),
});
type TableFormInput = z.input<typeof tableSchema>;

/** Staff manage the tables students can reserve. A table can only be placed in a reading room. */
export function TablesPage() {
    const sections = sectionHooks.useList().data;

    const fields = useMemo<FormField<TableFormInput>[]>(
        () => [
            { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Table 7' },
            { name: 'seats', label: 'Seats', type: 'number', min: 1, max: 50 },
            {
                name: 'sectionId',
                label: 'Reading room',
                type: 'select',
                placeholder: 'Not assigned',
                // Only reading rooms: the server rejects any other kind of section.
                options: (sections ?? [])
                    .filter(section => section.model === SectionModel.ReadingRoom)
                    .map(section => ({ value: section.id, label: `${section.floorName} › ${section.name}` })),
                description: 'Tables can only be assigned to a section that is a reading room.',
                span: 2,
            },
            { name: 'isActive', label: 'In service', type: 'toggle', description: 'Students can only reserve tables that are in service.' },
        ],
        [sections],
    );

    return (
        <CrudPage
            title="Tables"
            singular="table"
            description="The tables students can reserve. A table with reservations cannot be deleted; take it out of service instead."
            hooks={tableHooks}
            columns={columns}
            schema={tableSchema}
            fields={fields}
            newDefaults={{ name: '', seats: 4, sectionId: '', isActive: true }}
            toFormValues={table => ({ name: table.name, seats: table.seats, sectionId: table.sectionId ?? '', isActive: table.isActive })}
            toRequest={values => ({ name: values.name, seats: values.seats, sectionId: values.sectionId || null, isActive: values.isActive })}
            itemLabel={table => table.name}
        />
    );
}
