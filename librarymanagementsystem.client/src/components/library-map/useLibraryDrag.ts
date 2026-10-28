import { useContext } from 'react';
import { LibraryDragContext } from './dragContext.ts';

export function useLibraryDrag() {
    const context = useContext(LibraryDragContext);
    if (!context) throw new Error('useLibraryDrag must be used inside <LibraryDragProvider>');
    return context;
}
