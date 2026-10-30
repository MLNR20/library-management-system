import { createContext } from 'react';
import type { AuthSession, AuthUser } from '../lib/authStorage.ts';

export interface LoginRequest {
    userName: string;
    password: string;
}

export interface RegisterRequest {
    userName: string;
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
    login: (request: LoginRequest) => Promise<void>;
    register: (request: RegisterRequest) => Promise<void>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
