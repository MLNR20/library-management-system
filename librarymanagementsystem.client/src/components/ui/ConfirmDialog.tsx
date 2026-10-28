import type { ReactNode } from 'react';
import { Modal } from './Modal.tsx';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    isPending?: boolean;
    error?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Delete',
    isPending = false,
    error,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <Modal open={open} title={title} onClose={onCancel} className="max-w-md">
            <div className="flex flex-col gap-4">
                <p>{message}</p>
                {error && (
                    <div role="alert" className="alert alert-error alert-soft">
                        {error}
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <button className="btn btn-ghost" onClick={onCancel} disabled={isPending}>
                        Cancel
                    </button>
                    <button className="btn btn-error" onClick={onConfirm} disabled={isPending}>
                        {isPending && <span className="loading loading-spinner loading-sm" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
