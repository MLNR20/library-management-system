import { useMemo } from 'react';
import DOMPurify from 'dompurify';

// Links from a message open in a new tab without handing it a reference to this one.
DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
    }
});

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a'];

/** What a reader sees of a message: the editor's HTML, cleaned again here even though the server already did. */
export function RichText({ html, className = '' }: { html: string; className?: string }) {
    const clean = useMemo(() => DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: ['href'] }), [html]);
    return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}

/** The message without any formatting, for searching and sorting. */
export function richTextToPlain(html: string): string {
    return new DOMParser().parseFromString(html, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
