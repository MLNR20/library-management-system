import { useMemo } from 'react';
import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { RoomCell } from '../components/tables/RoomCell.tsx';
import { floorHooks, isReadingRoomModel, SectionModel, sectionHooks, shelfHooks } from '../api/resources.ts';
import type { Section } from '../api/resources.ts';

// A reading room is a section whose model is ReadingRoom or StudyRoom (the glass-walled room): this page manages just those.

const helper = createDataTableColumnHelper<Section>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('floorName', { header: 'Floor' }),
    helper.accessor('shelfName', { header: 'Shelf' }),
    helper.display({ id: 'furnishing', header: 'Tables and seats', cell: info => <RoomCell section={info.row.original} part="furnishing" /> }),
    helper.display({ id: 'bookings', header: 'Reservations', cell: info => <RoomCell section={info.row.original} part="bookings" /> }),
]);

const isReadingRoom = (section: Section) => isReadingRoomModel(section.model);

const roomSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    floorId: z.string().min(1, 'Select a floor'),
    shelfId: z.string().min(1, 'Select a shelf'),
    model: z.enum([String(SectionModel.ReadingRoom), String(SectionModel.StudyRoom)]),
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
            {
                name: 'model',
                label: 'Kind of room',
                type: 'select',
                description: 'A study room is built on the 3D map as a glass-walled room with a TV and a table; a reading room has open tables.',
                options: [
                    { value: String(SectionModel.ReadingRoom), label: 'Reading room (open tables)' },
                    { value: String(SectionModel.StudyRoom), label: 'Study room (glass walls, TV, table)' },
                ],
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
            newDefaults={{ name: '', floorId: '', shelfId: '', model: String(SectionModel.ReadingRoom) }}
            toFormValues={room => ({ name: room.name, floorId: room.floorId, shelfId: room.shelfId, model: String(room.model) as RoomFormInput['model'] })}
            toRequest={values => ({ name: values.name, floorId: values.floorId, shelfId: values.shelfId, model: Number(values.model) as SectionModel })}
            itemLabel={room => room.name}
            filterItems={isReadingRoom}
        />
    );
}
