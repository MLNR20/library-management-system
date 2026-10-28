import { Controller, get, useForm } from 'react-hook-form';
import type {
    Control,
    DefaultValues,
    FieldErrors,
    FieldValues,
    Path,
    Resolver,
    UseFormRegister,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

export interface FieldOption {
    label: string;
    value: string;
}

interface BaseField<TValues extends FieldValues> {
    name: Path<TValues>;
    label: string;
    description?: string;
    placeholder?: string;
    /** HTML autocomplete token, e.g. "username" or "new-password". */
    autoComplete?: string;
    disabled?: boolean;
    /** Columns taken on wide screens (the grid has 2). Defaults to 2 for textarea/checkbox/toggle, else 1. */
    span?: 1 | 2;
}

export type FormField<TValues extends FieldValues> =
    | (BaseField<TValues> & {
          type: 'text' | 'email' | 'password' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local';
      })
    | (BaseField<TValues> & { type: 'number'; min?: number; max?: number; step?: number })
    | (BaseField<TValues> & { type: 'textarea'; rows?: number })
    | (BaseField<TValues> & { type: 'select' | 'radio'; options: FieldOption[] })
    /** Multiple checkboxes bound to a string[] value. */
    | (BaseField<TValues> & { type: 'checkboxGroup'; options: FieldOption[] })
    | (BaseField<TValues> & { type: 'checkbox' | 'toggle' });

interface FormBuilderProps<TSchema extends z.ZodType<FieldValues, FieldValues>> {
    schema: TSchema;
    fields: FormField<z.input<TSchema>>[];
    defaultValues?: DefaultValues<z.input<TSchema>>;
    onSubmit: (values: z.output<TSchema>) => void | Promise<void>;
    submitLabel?: string;
    onCancel?: () => void;
    cancelLabel?: string;
    /** Clear the form back to its default values after a successful submit. */
    resetOnSubmit?: boolean;
    /** Error from the server (or elsewhere) shown above the buttons. */
    formError?: string;
}

export function FormBuilder<TSchema extends z.ZodType<FieldValues, FieldValues>>({
    schema,
    fields,
    defaultValues,
    onSubmit,
    submitLabel = 'Submit',
    onCancel,
    cancelLabel = 'Cancel',
    resetOnSubmit = false,
    formError,
}: FormBuilderProps<TSchema>) {
    type TInput = z.input<TSchema>;
    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<TInput, unknown, z.output<TSchema>>({
        // zodResolver can't infer its generics from a generic schema, so state them here.
        resolver: zodResolver(schema) as unknown as Resolver<TInput, unknown, z.output<TSchema>>,
        defaultValues,
    });

    return (
        <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(async values => {
                await onSubmit(values);
                if (resetOnSubmit) reset();
            })}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fields.map(field => (
                    <FieldControl
                        key={field.name}
                        field={field}
                        register={register}
                        control={control}
                        errors={errors}
                    />
                ))}
            </div>
            {formError && (
                <div role="alert" className="alert alert-error alert-soft">
                    {formError}
                </div>
            )}
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <button type="button" className="btn btn-ghost" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <span className="loading loading-spinner loading-sm" />}
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}

interface FieldControlProps<TValues extends FieldValues> {
    field: FormField<TValues>;
    register: UseFormRegister<TValues>;
    // The submit-output type is irrelevant to a field, so leave it open.
    control: Control<TValues, unknown, any>;
    errors: FieldErrors<TValues>;
}

function FieldControl<TValues extends FieldValues>({
    field,
    register,
    control: formControl,
    errors,
}: FieldControlProps<TValues>) {
    const id = `field-${field.name}`;
    const error = (get(errors, field.name) as { message?: string } | undefined)?.message;
    const describedBy = error ? `${id}-error` : field.description ? `${id}-description` : undefined;
    const fullWidth = field.span === 2 || (field.span === undefined && ['textarea', 'checkbox', 'toggle'].includes(field.type));
    const errorClass = error ? 'input-error' : '';
    const common = {
        id,
        disabled: field.disabled,
        autoComplete: field.autoComplete,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
    } as const;

    let control;
    switch (field.type) {
        case 'textarea':
            control = (
                <textarea
                    {...common}
                    {...register(field.name)}
                    rows={field.rows ?? 3}
                    placeholder={field.placeholder}
                    className={`textarea w-full ${error ? 'textarea-error' : ''}`}
                />
            );
            break;
        case 'select':
            control = (
                <select {...common} {...register(field.name)} className={`select w-full ${error ? 'select-error' : ''}`}>
                    <option value="">{field.placeholder ?? 'Select...'}</option>
                    {field.options.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            );
            break;
        case 'radio':
            control = (
                <div className="flex flex-wrap gap-4" role="radiogroup" aria-labelledby={`${id}-label`}>
                    {field.options.map(option => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-2">
                            <input
                                type="radio"
                                value={option.value}
                                disabled={field.disabled}
                                {...register(field.name)}
                                className="radio radio-sm"
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            );
            break;
        case 'checkboxGroup':
            control = (
                <Controller
                    control={formControl}
                    name={field.name}
                    render={({ field: { value, onChange } }) => {
                        const selected: string[] = Array.isArray(value) ? value : [];
                        return (
                            <div
                                className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-field border border-base-300 p-3"
                                role="group"
                                aria-labelledby={`${id}-label`}
                            >
                                {field.options.length === 0 && <span className="opacity-60">Nothing to choose from yet.</span>}
                                {field.options.map(option => (
                                    <label key={option.value} className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            disabled={field.disabled}
                                            checked={selected.includes(option.value)}
                                            onChange={e =>
                                                onChange(
                                                    e.target.checked
                                                        ? [...selected, option.value]
                                                        : selected.filter(v => v !== option.value),
                                                )
                                            }
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        );
                    }}
                />
            );
            break;
        case 'checkbox':
        case 'toggle':
            control = (
                <label className="flex cursor-pointer items-center gap-3">
                    <input
                        {...common}
                        type="checkbox"
                        {...register(field.name)}
                        className={field.type === 'toggle' ? 'toggle' : 'checkbox'}
                    />
                    <span>{field.label}</span>
                </label>
            );
            break;
        case 'number':
            control = (
                <input
                    {...common}
                    {...register(field.name, { setValueAs: v => (v === '' || v == null ? undefined : Number(v)) })}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={field.placeholder}
                    className={`input w-full ${errorClass}`}
                />
            );
            break;
        default:
            control = (
                <input
                    {...common}
                    {...register(field.name)}
                    type={field.type}
                    placeholder={field.placeholder}
                    className={`input w-full ${errorClass}`}
                />
            );
    }

    const isSingleToggle = field.type === 'checkbox' || field.type === 'toggle';

    return (
        <fieldset className={`fieldset ${fullWidth ? 'md:col-span-2' : ''}`}>
            {!isSingleToggle && (
                <legend id={`${id}-label`} className="fieldset-legend">
                    <label htmlFor={field.type === 'radio' ? undefined : id}>{field.label}</label>
                </legend>
            )}
            {control}
            {error ? (
                <p id={`${id}-error`} role="alert" className="text-sm text-error">
                    {error}
                </p>
            ) : (
                field.description && (
                    <p id={`${id}-description`} className="label">
                        {field.description}
                    </p>
                )
            )}
        </fieldset>
    );
}
