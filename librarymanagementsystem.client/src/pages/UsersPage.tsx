import { useState } from 'react';
import { z } from 'zod';
import { DataTable } from '../components/data-table/DataTable.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import { FormBuilder } from '../components/form/FormBuilder.tsx';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { Page } from '../components/layout/Page.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ADMIN_ROLE, roleHooks, useSetUserRoles, useUsers } from '../api/admin.ts';
import type { UserWithRoles } from '../api/admin.ts';
import { useAuth } from '../auth/useAuth.ts';
import { getErrorMessage } from '../lib/api.ts';

const rolesSchema = z.object({ roleNames: z.array(z.string()) });

export function UsersPage() {
    const { user: me } = useAuth();
    const users = useUsers();
    const roles = roleHooks.useList();
    const setRoles = useSetUserRoles();

    const [editing, setEditing] = useState<UserWithRoles | null>(null);
    const [formError, setFormError] = useState<string>();

    // The column set closes over the editing setter only, which is stable.
    const [columns] = useState(() => {
        const helper = createDataTableColumnHelper<UserWithRoles>();
        return helper.columns([
            helper.accessor(row => row.user.userName, { id: 'userName', header: 'User name' }),
            helper.accessor(row => row.user.email, { id: 'email', header: 'Email' }),
            helper.accessor(row => row.roles.join(', '), {
                id: 'roles',
                header: 'Roles',
                cell: info => {
                    const names = info.row.original.roles;
                    if (names.length === 0) return <span className="opacity-40">No roles</span>;
                    return (
                        <div className="flex flex-wrap gap-1">
                            {names.map(name => (
                                <span
                                    key={name}
                                    className={`badge badge-soft badge-sm ${name === ADMIN_ROLE ? 'badge-primary' : ''}`}
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    );
                },
            }),
            helper.display({
                id: 'actions',
                header: () => <span className="sr-only">Actions</span>,
                cell: ({ row }) => (
                    <div className="flex justify-end">
                        <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                                setFormError(undefined);
                                setEditing(row.original);
                            }}
                        >
                            Manage roles
                        </button>
                    </div>
                ),
            }),
        ]);
    });

    const roleField: FormField<z.input<typeof rolesSchema>>[] = [
        {
            name: 'roleNames',
            label: 'Roles',
            type: 'checkboxGroup',
            span: 2,
            options: (roles.data ?? []).map(role => ({ label: role.name, value: role.name })),
        },
    ];

    async function handleSubmit(values: z.output<typeof rolesSchema>) {
        if (!editing) return;
        setFormError(undefined);
        try {
            await setRoles.mutateAsync({ userId: editing.user.id, roleNames: values.roleNames });
            setEditing(null);
        } catch (error) {
            setFormError(getErrorMessage(error));
        }
    }

    return (
        <Page
            title="Users"
            description="Everyone who can sign in, and the roles they hold. Role changes take effect the next time that person signs in."
        >
            {users.isError ? (
                <div role="alert" className="alert alert-error alert-soft">
                    <span>Could not load users: {getErrorMessage(users.error)}</span>
                    <button className="btn btn-sm" onClick={() => users.refetch()}>
                        Retry
                    </button>
                </div>
            ) : (
                <DataTable
                    data={users.data}
                    columns={columns}
                    searchPlaceholder="Search users..."
                    isLoading={users.isLoading}
                    emptyMessage="No users yet."
                />
            )}

            <Modal open={editing !== null} title={`Roles for ${editing?.user.userName ?? ''}`} onClose={() => setEditing(null)}>
                {editing && (
                    <div className="flex flex-col gap-4">
                        {editing.user.id === me?.id && (
                            <div role="note" className="alert alert-warning alert-soft">
                                This is your own account.
                            </div>
                        )}
                        <FormBuilder
                            schema={rolesSchema}
                            fields={roleField}
                            defaultValues={{ roleNames: editing.roles }}
                            submitLabel="Save roles"
                            onCancel={() => setEditing(null)}
                            onSubmit={handleSubmit}
                            formError={formError}
                        />
                    </div>
                )}
            </Modal>
        </Page>
    );
}
