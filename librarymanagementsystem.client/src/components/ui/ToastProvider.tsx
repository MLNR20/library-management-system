import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toastContext.ts';
import type { ToastApi, ToastKind } from './toastContext.ts';

interface ToastItem {
    id: number;
    kind: ToastKind;
    message: string;
}

const LIFETIME_MS = 4000;
const MAX_VISIBLE = 4;

const alertClass: Record<ToastKind, string> = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
};

/** Wraps the app and shows toasts in the bottom-right corner. Read it with `useToast()`. */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(0);
    const timers = useRef(new Map<number, number>());

    const dismiss = useCallback((id: number) => {
        window.clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        setToasts(current => current.filter(toast => toast.id !== id));
    }, []);

    const show = useCallback(
        (message: string, kind: ToastKind = 'success') => {
            const id = nextId.current++;
            setToasts(current => [...current.slice(-(MAX_VISIBLE - 1)), { id, kind, message }]);
            timers.current.set(id, window.setTimeout(() => dismiss(id), LIFETIME_MS));
        },
        [dismiss],
    );

    // Stop the clocks when the app goes away.
    useEffect(() => {
        const running = timers.current;
        return () => running.forEach(timer => window.clearTimeout(timer));
    }, []);

    const api = useMemo<ToastApi>(
        () => ({ show, success: message => show(message, 'success'), error: message => show(message, 'error') }),
        [show],
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast toast-end toast-bottom z-50 max-w-[calc(100vw-2rem)]" role="status" aria-live="polite">
                {toasts.map(toast => (
                    <div key={toast.id} className={`alert ${alertClass[toast.kind]} shadow-lg`}>
                        <span>{toast.message}</span>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
