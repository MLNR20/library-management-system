import { z } from 'zod';
import { CrudPage } from '../components/crud/CrudPage.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { ADMIN_ROLE, roleHooks } from '../api/admin.ts';
import type { Role } from '../api/admin.ts';

const helper = createDataTableColumnHelper<Role>();
const columns = helper.columns([
    helper.accessor('name', {
        header: 'Name',
        cell: info => (
            <span className="flex items-center gap-2">
                {info.getValue()}
                {info.getValue() === ADMIN_ROLE && <span className="badge badge-soft badge-primary badge-sm">Built in</span>}
            </span>
        ),
    }),
]);

const roleSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(256, 'Name must be at most 256 characters'),
});

const fields: FormField<z.input<typeof roleSchema>>[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Librarian', span: 2 },
];

export function RolesPage() {
    return (
        <CrudPage
            title="Roles"
            singular="role"
            description="Roles you can give to users. The Administrator role is built in and cannot be renamed or deleted; a role that users still hold cannot be deleted."
            hooks={roleHooks}
            columns={columns}
            schema={roleSchema}
            fields={fields}
            newDefaults={{ name: '' }}
            toFormValues={role => ({ name: role.name })}
            toRequest={values => ({ name: values.name })}
            itemLabel={role => role.name}
        />
    );
}
