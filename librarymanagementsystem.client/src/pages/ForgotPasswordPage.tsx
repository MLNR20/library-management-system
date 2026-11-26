import { useState } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';
import { FormBuilder } from '../components/form/FormBuilder.tsx';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { AuthLayout } from '../components/layout/AuthLayout.tsx';
import { api, getErrorMessage } from '../lib/api.ts';

const forgotSchema = z.object({
    email: z.string().trim().max(256, 'Email must be at most 256 characters').pipe(z.email('Enter a valid email address')),
});

const fields: FormField<z.input<typeof forgotSchema>>[] = [
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', span: 2 },
];

export function ForgotPasswordPage() {
    const [sentTo, setSentTo] = useState<string>();
    const [formError, setFormError] = useState<string>();

    return (
        <AuthLayout
            title="Forgot password"
            subtitle="We will email you a link to choose a new one."
            footer={
                <Link to="/login" className="link link-primary">
                    Back to sign in
                </Link>
            }
        >
            {sentTo ? (
                <>
                    {/* The server never says whether the address has an account, so neither does this message. */}
                    <div role="status" className="alert alert-success alert-soft">
                        If an account uses {sentTo}, an email is on its way. Check your spam folder if it does not arrive.
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={() => setSentTo(undefined)}>
                        Use a different email
                    </button>
                </>
            ) : (
                <FormBuilder
                    schema={forgotSchema}
                    fields={fields}
                    defaultValues={{ email: '' }}
                    submitLabel="Send reset link"
                    formError={formError}
                    onSubmit={async values => {
                        setFormError(undefined);
                        try {
                            await api.post('/auth/forgot-password', values);
                            setSentTo(values.email);
                        } catch (error) {
                            setFormError(getErrorMessage(error));
                        }
                    }}
                />
            )}
        </AuthLayout>
    );
}
