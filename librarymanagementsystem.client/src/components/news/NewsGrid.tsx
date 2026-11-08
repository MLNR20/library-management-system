import { useState } from 'react';
import type { NewsPost } from '../../api/resources.ts';
import { Modal } from '../ui/Modal.tsx';
import { RichText, richTextToPlain } from '../ui/RichText.tsx';
import { NewsIcon } from '../ui/icons.tsx';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });

/** Three columns on wide screens (so nine articles make a 3x3 grid), two on tablets and one on phones. Click a card to read it. */
export function NewsGrid({ posts }: { posts: NewsPost[] }) {
    const [open, setOpen] = useState<NewsPost | null>(null);

    return (
        <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map(post => (
                    <li key={post.id} className="flex">
                        <article className="card card-border w-full bg-base-100 shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
                            <figure className="aspect-video bg-base-200">
                                {post.imageUrl ? (
                                    <img src={post.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                                ) : (
                                    <NewsIcon className="h-12 w-12 text-primary/40" />
                                )}
                            </figure>
                            <div className="card-body gap-2">
                                <time className="text-xs opacity-70" dateTime={post.createdAt}>
                                    {formatDate(post.createdAt)}
                                </time>
                                <h3 className="card-title">{post.title}</h3>
                                <p className="line-clamp-3 text-sm opacity-80">{richTextToPlain(post.body)}</p>
                                <div className="card-actions mt-auto justify-end pt-2">
                                    <button type="button" className="btn btn-link btn-sm px-0" onClick={() => setOpen(post)}>
                                        Read more<span className="sr-only">: {post.title}</span>
                                    </button>
                                </div>
                            </div>
                        </article>
                    </li>
                ))}
            </ul>

            <Modal open={open !== null} title={open?.title ?? ''} onClose={() => setOpen(null)} className="max-w-3xl">
                {open && (
                    <article className="flex flex-col gap-4">
                        {open.imageUrl && (
                            <img src={open.imageUrl} alt="" className="max-h-80 w-full rounded-box object-cover" />
                        )}
                        <time className="text-xs opacity-70" dateTime={open.createdAt}>
                            {formatDate(open.createdAt)}
                        </time>
                        <RichText html={open.body} />
                        <div className="modal-action mt-0">
                            <button type="button" className="btn" onClick={() => setOpen(null)}>
                                Close
                            </button>
                        </div>
                    </article>
                )}
            </Modal>
        </>
    );
}
