import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { useAuth } from '../auth/useAuth.ts';
import { FormBuilder } from '../components/form/FormBuilder.tsx';
import type { FormField } from '../components/form/FormBuilder.tsx';
import { AuthLayout } from '../components/layout/AuthLayout.tsx';
import { getErrorMessage } from '../lib/api.ts';

// These mirror the server rules (RegisterRequestValidator + the Identity password options) for instant feedback.
const registerSchema = z
    .object({
        userName: z
            .string()
            .trim()
            .min(3, 'User name must be at least 3 characters')
            .max(50, 'User name must be at most 50 characters')
            .regex(/^[A-Za-z0-9._@+-]+$/, 'Use only letters, digits and . _ @ + -'),
        email: z.string().trim().max(256, 'Email must be at most 256 characters').pipe(z.email('Enter a valid email address')),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(128, 'Password must be at most 128 characters')
            .regex(/[a-z]/, 'Password needs a lowercase letter')
            .regex(/[A-Z]/, 'Password needs an uppercase letter')
            .regex(/[0-9]/, 'Password needs a digit')
            .regex(/[^A-Za-z0-9]/, 'Password needs a symbol'),
        confirmPassword: z.string().min(1, 'Confirm your password'),
    })
    .refine(values => values.password === values.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const fields: FormField<z.input<typeof registerSchema>>[] = [
    { name: 'userName', label: 'User name', type: 'text', autoComplete: 'username', span: 2 },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', span: 2 },
    {
        name: 'password',
        label: 'Password',
        type: 'password',
        autoComplete: 'new-password',
        description: 'At least 8 characters with upper and lower case, a digit and a symbol.',
        span: 2,
    },
    { name: 'confirmPassword', label: 'Confirm password', type: 'password', autoComplete: 'new-password', span: 2 },
];

export function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [formError, setFormError] = useState<string>();

    return (
        <AuthLayout
            title="Create an account"
            subtitle="Register to start managing the library."
            footer={
                <>
                    Already registered?{' '}
                    <Link to="/login" className="link link-primary">
                        Sign in
                    </Link>
                </>
            }
        >
            <FormBuilder
                schema={registerSchema}
                fields={fields}
                defaultValues={{ userName: '', email: '', password: '', confirmPassword: '' }}
                submitLabel="Create account"
                formError={formError}
                onSubmit={async values => {
                    setFormError(undefined);
                    try {
                        await register(values);
                        // Registering also signs the user in.
                        navigate('/', { replace: true });
                    } catch (error) {
                        setFormError(getErrorMessage(error));
                    }
                }}
            />
        </AuthLayout>
    );
}
