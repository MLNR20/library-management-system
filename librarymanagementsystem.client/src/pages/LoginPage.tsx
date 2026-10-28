import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useAuth } from '../auth/useAuth.ts';
import { FormBuilder } from '../components/form/FormBuilder.tsx';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { AuthLayout } from '../components/layout/AuthLayout.tsx';
import { getErrorMessage } from '../lib/api.ts';

const loginSchema = z.object({
    userName: z.string().trim().min(1, 'User name is required'),
    password: z.string().min(1, 'Password is required'),
});

const fields: FormField<z.input<typeof loginSchema>>[] = [
    { name: 'userName', label: 'User name', type: 'text', autoComplete: 'username', span: 2 },
    { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password', span: 2 },
];

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [formError, setFormError] = useState<string>();

    // RequireAuth leaves the page the user was heading to in the location state.
    const from = (location.state as { from?: string } | null)?.from ?? '/';

    return (
        <AuthLayout
            title="Sign in"
            subtitle="Sign in to manage the library."
            footer={
                <>
                    No account yet?{' '}
                    <Link to="/register" className="link link-primary">
                        Create one
                    </Link>
                </>
            }
        >
            <FormBuilder
                schema={loginSchema}
                fields={fields}
                defaultValues={{ userName: '', password: '' }}
                submitLabel="Sign in"
                formError={formError}
                onSubmit={async values => {
                    setFormError(undefined);
                    try {
                        await login(values);
                        navigate(from, { replace: true });
                    } catch (error) {
                        setFormError(getErrorMessage(error));
                    }
                }}
            />
        </AuthLayout>
    );
}
