import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { RoomCell } from '../components/tables/RoomCell.tsx';
import { floorHooks, SectionModel, sectionHooks, shelfHooks } from '../api/resources.ts';
import type { Section } from '../api/resources.ts';

// A reading room is a section whose model is ReadingRoom: this page manages just those, so the model is fixed.

const helper = createDataTableColumnHelper<Section>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('floorName', { header: 'Floor' }),
    helper.accessor('shelfName', { header: 'Shelf' }),
    helper.display({ id: 'furnishing', header: 'Tables and seats', cell: info => <RoomCell section={info.row.original} part="furnishing" /> }),
    helper.display({ id: 'bookings', header: 'Reservations', cell: info => <RoomCell section={info.row.original} part="bookings" /> }),
]);

const isReadingRoom = (section: Section) => section.model === SectionModel.ReadingRoom;

const roomSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    floorId: z.string().min(1, 'Select a floor'),
    shelfId: z.string().min(1, 'Select a shelf'),
});
type RoomFormInput = z.input<typeof roomSchema>;

/** Librarians and administrators add, rename, move and remove the reading rooms students can reserve. */
export function ReadingRoomsPage() {
    const floors = floorHooks.useList().data;
    const shelves = shelfHooks.useList().data;

    const fields = useMemo<FormField<RoomFormInput>[]>(
        () => [
            { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Quiet study room', span: 2 },
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
                description: 'The room takes the wing this shelf stands in on the 3D map. The shelf must be on the selected floor.',
                options: (shelves ?? []).map(s => ({ value: s.id, label: `${s.floorName} › ${s.name}` })),
            },
        ],
        [floors, shelves],
    );

    return (
        <CrudPage
            title="Reading rooms"
            singular="reading room"
            description="The rooms students can reserve as a whole, and whose tables they can book. Add tables to a room on the Tables page; decide requests under Room reservations."
            hooks={sectionHooks}
            columns={columns}
            schema={roomSchema}
            fields={fields}
            newDefaults={{ name: '', floorId: '', shelfId: '' }}
            toFormValues={room => ({ name: room.name, floorId: room.floorId, shelfId: room.shelfId })}
            toRequest={values => ({ name: values.name, floorId: values.floorId, shelfId: values.shelfId, model: SectionModel.ReadingRoom })}
            itemLabel={room => room.name}
            filterItems={isReadingRoom}
        />
    );
}
