import type { Faq } from '../../api/resources.ts';
import { RichText } from '../ui/RichText.tsx';

/** Questions that open to show their answer. Each is a native <details>, so it works from the keyboard. */
export function FaqList({ faqs }: { faqs: Faq[] }) {
    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {faqs.map(faq => (
                <details key={faq.id} className="collapse collapse-arrow border border-base-300 bg-base-100">
                    <summary className="collapse-title font-semibold">{faq.question}</summary>
                    <div className="collapse-content">
                        <RichText html={faq.answer} className="text-sm opacity-80" />
                    </div>
                </details>
            ))}
        </div>
    );
}
