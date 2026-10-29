import { useEffect } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RichTextEditorProps {
    id: string;
    /** HTML. An empty editor is reported as an empty string rather than an empty paragraph. */
    value: string;
    onChange: (html: string) => void;
    onBlur?: () => void;
    invalid?: boolean;
    disabled?: boolean;
    describedBy?: string;
}

/** A small formatting editor (bold, italic, headings, lists, quotes, links) for messages. */
export function RichTextEditor({ id, value, onChange, onBlur, invalid, disabled, describedBy }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: { openOnClick: false, autolink: true },
                code: false,
                codeBlock: false,
                horizontalRule: false,
            }),
        ],
        content: value,
        editable: !disabled,
        editorProps: {
            attributes: {
                id,
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-labelledby': `${id}-label`,
                ...(describedBy ? { 'aria-describedby': describedBy } : {}),
                ...(invalid ? { 'aria-invalid': 'true' } : {}),
                class: 'rich-text min-h-32 px-3 py-2 focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
        onBlur: () => onBlur?.(),
    });

    // Follow outside changes, such as the form being reset or filled with another item.
    useEffect(() => {
        if (!editor) return;
        const current = editor.isEmpty ? '' : editor.getHTML();
        if (value !== current) editor.commands.setContent(value, { emitUpdate: false });
    }, [editor, value]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [editor, disabled]);

    return (
        <div
            className={`overflow-hidden rounded-field border bg-base-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
                invalid ? 'border-error' : 'border-base-content/20'
            }`}
        >
            {editor && !disabled && <Toolbar editor={editor} />}
            <EditorContent editor={editor} />
        </div>
    );
}

function Toolbar({ editor }: { editor: Editor }) {
    const active = useEditorState({
        editor,
        selector: ({ editor }) => ({
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            strike: editor.isActive('strike'),
            h2: editor.isActive('heading', { level: 2 }),
            bulletList: editor.isActive('bulletList'),
            orderedList: editor.isActive('orderedList'),
            blockquote: editor.isActive('blockquote'),
            link: editor.isActive('link'),
        }),
    });

    function editLink() {
        const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
        const url = window.prompt('Link address (leave empty to remove the link)', previous);
        if (url === null) return;
        if (url.trim() === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
        else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    }

    const buttons = [
        { label: 'Bold', text: 'B', className: 'font-bold', on: active.bold, run: () => editor.chain().focus().toggleBold().run() },
        { label: 'Italic', text: 'I', className: 'italic', on: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
        { label: 'Underline', text: 'U', className: 'underline', on: active.underline, run: () => editor.chain().focus().toggleUnderline().run() },
        { label: 'Strikethrough', text: 'S', className: 'line-through', on: active.strike, run: () => editor.chain().focus().toggleStrike().run() },
        { label: 'Heading', text: 'H', className: 'font-bold', on: active.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: 'Bulleted list', text: '•', className: '', on: active.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
        { label: 'Numbered list', text: '1.', className: '', on: active.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
        { label: 'Quote', text: '“', className: 'font-serif', on: active.blockquote, run: () => editor.chain().focus().toggleBlockquote().run() },
        { label: 'Link', text: 'Link', className: 'text-xs', on: active.link, run: editLink },
    ];

    return (
        <div className="flex flex-wrap gap-1 border-b border-base-300 bg-base-200 p-1" role="toolbar" aria-label="Formatting">
            {buttons.map(button => (
                <button
                    key={button.label}
                    type="button"
                    className={`btn btn-xs min-w-8 ${button.on ? 'btn-primary' : 'btn-ghost'} ${button.className}`}
                    aria-label={button.label}
                    aria-pressed={button.on}
                    title={button.label}
                    // Keep the selection in the editor when a button is pressed.
                    onMouseDown={event => event.preventDefault()}
                    onClick={button.run}
                >
                    {button.text}
                </button>
            ))}
        </div>
    );
}
