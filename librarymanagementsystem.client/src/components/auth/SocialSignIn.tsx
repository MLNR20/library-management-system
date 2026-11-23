import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { homePathFor } from '../../auth/homePath.ts';
import { useAuth } from '../../auth/useAuth.ts';
import { getErrorMessage } from '../../lib/api.ts';
import { socialSignInConfigured } from '../../lib/firebase.ts';
import type { SocialProvider } from '../../lib/firebase.ts';

const providers: { id: SocialProvider; label: string; icon: ReactNode }[] = [
    {
        id: 'google',
        label: 'Google',
        icon: (
            <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
        ),
    },
];

interface SocialSignInProps {
    /** Called with a message when a sign-in fails, and with undefined when a new attempt starts. */
    onError: (message: string | undefined) => void;
    /** Where to go afterwards; defaults to the home page for the person's role. */
    redirectTo?: string;
}

/** The "Continue with Google" button, followed by a divider, for the top of the login and register forms. */
export function SocialSignIn({ onError, redirectTo }: SocialSignInProps) {
    const { loginWithProvider } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState<SocialProvider>();

    async function signIn(provider: SocialProvider) {
        onError(undefined);
        setBusy(provider);
        try {
            const session = await loginWithProvider(provider);
            // null: they closed the provider window, which is not an error.
            if (session) {
                navigate(redirectTo ?? homePathFor(session.roles), { replace: true });
            }
        } catch (error) {
            onError(getErrorMessage(error));
        } finally {
            setBusy(undefined);
        }
    }

    if (!socialSignInConfigured) return null;

    return (
        <div>
            <div className="flex flex-col gap-2">
                {providers.map(({ id, label, icon }) => (
                    <button key={id} type="button" className="btn btn-outline" disabled={busy !== undefined} onClick={() => signIn(id)}>
                        {busy === id ? <span className="loading loading-spinner loading-sm" /> : icon}
                        Continue with {label}
                    </button>
                ))}
            </div>
            <div className="divider my-2 text-xs opacity-70">or use your user name</div>
        </div>
    );
}
