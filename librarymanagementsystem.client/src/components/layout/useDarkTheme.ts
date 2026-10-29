import { useEffect, useState } from 'react';

/** Dark/light switch that starts from the system preference and applies itself to the whole page. */
export function useDarkTheme() {
    const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

    useEffect(() => {
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    }, [dark]);

    return [dark, setDark] as const;
}
