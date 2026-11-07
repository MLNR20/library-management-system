import { useState } from 'react';
import { Page } from '../components/layout/Page.tsx';
import { describeDevice, useRevokeOtherSessions, useRevokeSession, useSessions } from '../api/sessions.ts';
import { getErrorMessage } from '../lib/api.ts';

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Where the signed-in user is signed in, with a way to end any of those sign-ins. */
export function SessionsPage() {
    const sessions = useSessions();
    const revoke = useRevokeSession();
    const revokeOthers = useRevokeOtherSessions();
    const [message, setMessage] = useState<string>();
    const [error, setError] = useState<string>();

    const list = sessions.data ?? [];
    const others = list.filter(session => !session.isCurrent).length;

    return (
        <Page
            title="Your sessions"
            description="Every device you are signed in on. If you do not recognise one, sign it out. It stops working within a few minutes."
            actions={
                <button
                    className="btn btn-outline btn-error btn-sm"
                    disabled={others === 0 || revokeOthers.isPending}
                    onClick={() => {
                        setError(undefined);
                        revokeOthers.mutate(undefined, {
                            onSuccess: count => setMessage(`Signed out of ${count} other ${count === 1 ? 'device' : 'devices'}.`),
                            onError: err => setError(getErrorMessage(err)),
                        });
                    }}
                >
                    Sign out all other devices
                </button>
            }
        >
            {message && (
                <div role="status" className="alert alert-success alert-soft mb-4">
                    {message}
                </div>
            )}
            {error && (
                <div role="alert" className="alert alert-error alert-soft mb-4">
                    {error}
                </div>
            )}

            {sessions.isLoading ? (
                <span className="loading loading-spinner" />
            ) : sessions.isError ? (
                <div role="alert" className="alert alert-error alert-soft">
                    {getErrorMessage(sessions.error)}
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {list.map(session => (
                        <li key={session.id} className="card card-border bg-base-100 shadow-sm">
                            <div className="card-body flex-row flex-wrap items-center justify-between gap-3 p-4">
                                <div>
                                    <h2 className="flex items-center gap-2 font-bold">
                                        {describeDevice(session.userAgent)}
                                        {session.isCurrent && <span className="badge badge-success badge-sm">This device</span>}
                                    </h2>
                                    <p className="text-sm opacity-70">
                                        {session.ipAddress ?? 'Unknown address'} · Last active {formatter.format(new Date(session.lastSeenAtUtc))}
                                    </p>
                                    <p className="text-xs opacity-60">Signed in {formatter.format(new Date(session.createdAtUtc))}</p>
                                </div>
                                {!session.isCurrent && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        disabled={revoke.isPending}
                                        onClick={() => {
                                            setMessage(undefined);
                                            setError(undefined);
                                            revoke.mutate(session.id, { onError: err => setError(getErrorMessage(err)) });
                                        }}
                                    >
                                        Sign out
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Page>
    );
}
