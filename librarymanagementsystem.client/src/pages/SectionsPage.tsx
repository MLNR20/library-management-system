import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { floorHooks, sectionHooks, shelfHooks } from '../api/resources.ts';
import type { Section } from '../api/resources.ts';

const helper = createDataTableColumnHelper<Section>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('floorName', { header: 'Floor' }),
    helper.accessor('shelfName', { header: 'Shelf' }),
]);

const sectionSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    floorId: z.string().min(1, 'Select a floor'),
    shelfId: z.string().min(1, 'Select a shelf'),
});
type SectionFormInput = z.input<typeof sectionSchema>;

export function SectionsPage() {
    const floors = floorHooks.useList().data;
    const shelves = shelfHooks.useList().data;

    const fields = useMemo<FormField<SectionFormInput>[]>(
        () => [
            { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Reference', span: 2 },
            {
                name: 'floorId',
                label: 'Floor',
                type: 'select',
                placeholder: 'Select a floor',
                options: (floors ?? []).map(f => ({ value: f.id, label: f.name })),
            },
            {
                name: 'shelfId',
                label: 'Shelf',
                type: 'select',
                placeholder: 'Select a shelf',
                description: 'The shelf must be on the selected floor.',
                options: (shelves ?? []).map(s => ({ value: s.id, label: `${s.floorName} › ${s.name}` })),
            },
        ],
        [floors, shelves],
    );

    return (
        <CrudPage
            title="Sections"
            singular="section"
            description="Named areas of the library, each assigned to a floor and a shelf."
            hooks={sectionHooks}
            columns={columns}
            schema={sectionSchema}
            fields={fields}
            newDefaults={{ name: '', floorId: '', shelfId: '' }}
            toFormValues={section => ({ name: section.name, floorId: section.floorId, shelfId: section.shelfId })}
            toRequest={values => ({ name: values.name, floorId: values.floorId, shelfId: values.shelfId })}
            itemLabel={section => section.name}
        />
    );
}
