import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useAuth } from '../auth/useAuth.ts';
import { FormBuilder } from '../components/form/FormBuilder.tsx';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { AuthLayout } from '../components/layout/AuthLayout.tsx';
import { useToast } from '../components/ui/toastContext.ts';
import { api, getErrorMessage } from '../lib/api.ts';
import { newPasswordHint, newPasswordSchema } from '../lib/passwordSchema.ts';

const resetSchema = z
    .object({
        password: newPasswordSchema,
        confirmPassword: z.string().min(1, 'Confirm your password'),
    })
    .refine(values => values.password === values.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const fields: FormField<z.input<typeof resetSchema>>[] = [
    {
        name: 'password',
        label: 'New password',
        type: 'password',
        autoComplete: 'new-password',
        description: newPasswordHint,
        span: 2,
    },
    { name: 'confirmPassword', label: 'Confirm new password', type: 'password', autoComplete: 'new-password', span: 2 },
];

/** Where the emailed link lands. Open to everyone: the person may still be signed in on this browser. */
export function ResetPasswordPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const { hash } = useLocation();
    const [formError, setFormError] = useState<string>();

    // The link keeps both values after the # so they are never sent to a server on their own (see PasswordResetLinks).
    const link = new URLSearchParams(hash.slice(1));
    const userId = link.get('user');
    const token = link.get('token');

    return (
        <AuthLayout
            title="Choose a new password"
            subtitle="You will be signed out on every device."
            footer={
                <Link to="/login" className="link link-primary">
                    Back to sign in
                </Link>
            }
        >
            {userId && token ? (
                <>
                    <FormBuilder
                        // A different link is a fresh form.
                        key={token}
                        schema={resetSchema}
                        fields={fields}
                        defaultValues={{ password: '', confirmPassword: '' }}
                        submitLabel="Reset password"
                        formError={formError}
                        onSubmit={async values => {
                            setFormError(undefined);
                            try {
                                await api.post('/auth/reset-password', { userId, token, ...values });
                                // The server has ended this account's sessions, so drop the one saved here.
                                if (user?.id === userId) logout();
                                toast.success('Your password was reset. Sign in with the new one.');
                                navigate('/login', { replace: true });
                            } catch (error) {
                                setFormError(getErrorMessage(error));
                            }
                        }}
                    />
                    {formError && (
                        <Link to="/forgot-password" className="link link-primary text-center text-sm">
                            Ask for a new link
                        </Link>
                    )}
                </>
            ) : (
                <>
                    <div role="alert" className="alert alert-warning alert-soft">
                        This reset link is incomplete. Open the link from your email again, or ask for a new one.
                    </div>
                    <Link to="/forgot-password" className="btn btn-primary">
                        Ask for a new link
                    </Link>
                </>
            )}
        </AuthLayout>
    );
}
