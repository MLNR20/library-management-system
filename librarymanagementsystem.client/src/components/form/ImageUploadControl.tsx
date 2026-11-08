import { useRef, useState } from 'react';
import { getErrorMessage } from '../../lib/api.ts';

interface ImageUploadControlProps {
    id: string;
    /** The stored image's name, or an empty string when there is none. */
    value: string;
    onChange: (value: string) => void;
    /** Sends the file to the server and resolves with the name to store as the value. */
    upload: (file: File) => Promise<string>;
    urlFor: (value: string) => string;
    disabled?: boolean;
    describedBy?: string;
}

/** Picks an image, uploads it straight away and shows what was stored. The form only keeps the returned name. */
export function ImageUploadControl({ id, value, onChange, upload, urlFor, disabled, describedBy }: ImageUploadControlProps) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setError(undefined);
        setBusy(true);
        try {
            onChange(await upload(file));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setBusy(false);
            // Lets the same file be picked again after a failure.
            if (input.current) input.current.value = '';
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {value && (
                <img
                    src={urlFor(value)}
                    alt="Cover preview"
                    className="aspect-video w-full max-w-sm rounded-box border border-base-300 object-cover"
                />
            )}
            <div className="flex flex-wrap items-center gap-2">
                <input
                    ref={input}
                    id={id}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="file-input file-input-sm w-full max-w-xs"
                    disabled={disabled || busy}
                    aria-describedby={describedBy}
                    onChange={e => void handleFile(e.target.files?.[0])}
                />
                {busy && <span className="loading loading-spinner loading-sm" aria-label="Uploading" />}
                {value && !busy && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange('')}>
                        Remove image
                    </button>
                )}
            </div>
            {error && (
                <p role="alert" className="text-sm text-error">
                    {error}
                </p>
            )}
        </div>
    );
}
