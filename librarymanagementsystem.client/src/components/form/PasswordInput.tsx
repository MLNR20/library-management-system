import { useState } from 'react';
import type { ComponentProps } from 'react';
import { EyeIcon, EyeSlashIcon } from '../ui/icons.tsx';

/** A password box with a button that shows or hides what has been typed. */
export function PasswordInput({ className = '', ...props }: Omit<ComponentProps<'input'>, 'type'>) {
    const [visible, setVisible] = useState(false);
    const label = visible ? 'Hide password' : 'Show password';

    return (
        // The wrapper carries the input styling (border, error colour) so the button sits inside the box.
        <div className={`input w-full pr-1 ${className}`}>
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                // While shown it is a text box, which browsers would otherwise spell-check and capitalise.
                spellCheck={false}
                autoCapitalize="none"
                className="grow"
            />
            <button
                type="button"
                className="btn btn-ghost btn-square btn-sm"
                aria-label={label}
                title={label}
                disabled={props.disabled}
                onClick={() => setVisible(shown => !shown)}
            >
                {visible ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
            </button>
        </div>
    );
}
