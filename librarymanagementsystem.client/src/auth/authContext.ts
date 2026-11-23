import { createContext } from 'react';
import type { AuthSession, AuthUser } from '../lib/authStorage.ts';
import type { SocialProvider } from '../lib/firebase.ts';

export interface LoginRequest {
    userName: string;
    password: string;
}

export interface RegisterRequest {
    userName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface AuthContextValue {
    session: AuthSession | null;
    user: AuthUser | null;
    /** Roles as of the last sign-in; the server re-checks them on every request. */
    roles: string[];
    isAdmin: boolean;
    /** Librarian or administrator: the people who clock in and out. */
    isStaff: boolean;
    /** Resolves with the new session so callers can route by its roles. */
    login: (request: LoginRequest) => Promise<AuthSession>;
    register: (request: RegisterRequest) => Promise<AuthSession>;
    /** Signs in with Google, or signs up when the person is new. Resolves null when they closed the window. */
    loginWithProvider: (provider: SocialProvider) => Promise<AuthSession | null>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
