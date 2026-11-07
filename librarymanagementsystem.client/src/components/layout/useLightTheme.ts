import { useEffect } from 'react';

/** Keeps the page in the light theme while the calling component is mounted, then puts back whatever was there. */
export function useLightTheme() {
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.dataset.theme;
        root.dataset.theme = 'light';

        return () => {
            if (previous === undefined) {
                delete root.dataset.theme;
            } else {
                root.dataset.theme = previous;
            }
        };
    }, []);
}
