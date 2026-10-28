import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}

/** Native <dialog> modal. Children mount only while open, so forms start fresh each time. */
export function Modal({ open, title, onClose, children, className = 'max-w-2xl' }: ModalProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog ref={ref} className="modal" onClose={onClose}>
            <div className={`modal-box ${className}`}>
                <h3 className="mb-4 text-lg font-bold">{title}</h3>
                {open && children}
            </div>
            <form method="dialog" className="modal-backdrop">
                <button aria-label="Close dialog">close</button>
            </form>
        </dialog>
    );
}
