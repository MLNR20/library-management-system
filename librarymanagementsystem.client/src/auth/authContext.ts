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
    login: (request: LoginRequest) => Promise<void>;
    register: (request: RegisterRequest) => Promise<void>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
