import { useMemo, useState } from 'react';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import { DataTable } from '../data-table/DataTable.tsx';
import { createDataTableColumnHelper } from '../data-table/tableConfig.ts';
import type { DataTableColumn, DataTableFilter } from '../data-table/tableConfig.ts';
import { FormBuilder } from '../form/FormBuilder.tsx';
import type { FormField } from '../form/FormBuilder.tsx';
import { Page } from '../layout/Page.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import { Modal } from '../ui/Modal.tsx';
import { getErrorMessage } from '../../lib/api.ts';
import type { CrudHooks } from '../../lib/crud.ts';

interface CrudPageProps<TDto extends { id: string }, TRequest, TSchema extends z.ZodType<FieldValues, FieldValues>> {
    title: string;
    /** Singular noun used in buttons and dialogs, e.g. "book". */
    singular: string;
    description?: string;
    hooks: CrudHooks<TDto, TRequest>;
    /** Data columns. Must be stable (module scope or useMemo). The actions column is added for you. */
    columns: DataTableColumn<TDto>[];
    filters?: DataTableFilter[];
    searchPlaceholder?: string;
    schema: TSchema;
    fields: FormField<z.input<TSchema>>[];
    newDefaults?: DefaultValues<z.input<TSchema>>;
    toFormValues: (item: TDto) => DefaultValues<z.input<TSchema>>;
    toRequest: (values: z.output<TSchema>) => TRequest;
    /** Short name of an item, shown in the delete confirmation. */
    itemLabel: (item: TDto) => string;
}

type Editing<TDto> = { mode: 'create' } | { mode: 'edit'; item: TDto };

export function CrudPage<
    TDto extends { id: string },
    TRequest,
    TSchema extends z.ZodType<FieldValues, FieldValues>,
>({
    title,
    singular,
    description,
    hooks,
    columns,
    filters,
    searchPlaceholder,
    schema,
    fields,
    newDefaults,
    toFormValues,
    toRequest,
    itemLabel,
}: CrudPageProps<TDto, TRequest, TSchema>) {
    const list = hooks.useList();
    const create = hooks.useCreate();
    const update = hooks.useUpdate();
    const remove = hooks.useRemove();

    const [editing, setEditing] = useState<Editing<TDto> | null>(null);
    const [deleting, setDeleting] = useState<TDto | null>(null);
    const [formError, setFormError] = useState<string>();

    const tableColumns = useMemo(() => {
        const helper = createDataTableColumnHelper<TDto>();
        const actions = helper.display({
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                            setFormError(undefined);
                            setEditing({ mode: 'edit', item: row.original });
                        }}
                    >
                        Edit
                    </button>
                    <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => {
                            remove.reset();
                            setDeleting(row.original);
                        }}
                    >
                        Delete
                    </button>
                </div>
            ),
        });
        return [...columns, actions] as DataTableColumn<TDto>[];
        // `remove.reset` is stable; the other setters are too.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columns]);

    const closeForm = () => setEditing(null);

    async function handleSubmit(values: z.output<TSchema>) {
        setFormError(undefined);
        try {
            const body = toRequest(values);
            if (editing?.mode === 'edit') {
                await update.mutateAsync({ id: editing.item.id, body });
            } else {
                await create.mutateAsync(body);
            }
            closeForm();
        } catch (error) {
            setFormError(getErrorMessage(error));
        }
    }

    async function handleDelete() {
        if (!deleting) return;
        try {
            await remove.mutateAsync(deleting.id);
            setDeleting(null);
        } catch {
            // The error is shown in the dialog through remove.error.
        }
    }

    const isEdit = editing?.mode === 'edit';

    return (
        <Page
            title={title}
            description={description}
            actions={
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setFormError(undefined);
                        setEditing({ mode: 'create' });
                    }}
                >
                    Add {singular}
                </button>
            }
        >
            {list.isError ? (
                <div role="alert" className="alert alert-error alert-soft">
                    <span>Could not load {title.toLowerCase()}: {getErrorMessage(list.error)}</span>
                    <button className="btn btn-sm" onClick={() => list.refetch()}>
                        Retry
                    </button>
                </div>
            ) : (
                <DataTable
                    data={list.data}
                    columns={tableColumns}
                    filters={filters}
                    searchPlaceholder={searchPlaceholder ?? `Search ${title.toLowerCase()}...`}
                    isLoading={list.isLoading}
                    emptyMessage={`No ${title.toLowerCase()} yet.`}
                />
            )}

            <Modal open={editing !== null} title={isEdit ? `Edit ${singular}` : `Add ${singular}`} onClose={closeForm}>
                <FormBuilder
                    schema={schema}
                    fields={fields}
                    defaultValues={editing?.mode === 'edit' ? toFormValues(editing.item) : newDefaults}
                    submitLabel={isEdit ? 'Save changes' : `Add ${singular}`}
                    onCancel={closeForm}
                    onSubmit={handleSubmit}
                    formError={formError}
                />
            </Modal>

            <ConfirmDialog
                open={deleting !== null}
                title={`Delete ${singular}`}
                message={`Delete "${deleting ? itemLabel(deleting) : ''}"? This cannot be undone.`}
                isPending={remove.isPending}
                error={remove.error ? getErrorMessage(remove.error) : undefined}
                onConfirm={handleDelete}
                onCancel={() => setDeleting(null)}
            />
        </Page>
    );
}
