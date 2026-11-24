import { createContext, useContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastApi {
    /** Shows a short message in the corner of the screen; it goes away by itself after a few seconds. */
    show: (message: string, kind?: ToastKind) => void;
    success: (message: string) => void;
    error: (message: string) => void;
}

const noop = () => {};

// Outside a provider the toasts quietly do nothing, so a component using them still renders in isolation.
export const ToastContext = createContext<ToastApi>({ show: noop, success: noop, error: noop });

export const useToast = () => useContext(ToastContext);
