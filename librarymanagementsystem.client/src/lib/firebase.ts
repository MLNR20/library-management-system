export type SocialProvider = 'google';

// Public by design: these identify the Firebase project and are shipped to every browser. They grant nothing on their own;
// which sites may use them is set under Authentication > Settings > Authorized domains in the Firebase console.
const firebaseConfig = {
    apiKey: 'AIzaSyC3MXo0_MEw6wbZV3GD5dY_QP-bu92MjL8',
    authDomain: 'alexandria-e8280.firebaseapp.com',
    projectId: 'alexandria-e8280',
    appId: '1:571781952105:web:5c80610f0f76622dfb28f8',
};

type AuthModule = typeof import('@firebase/auth');

// Only Google for now; adding another provider means a case here, a button in SocialSignIn and an entry in the server's
// FirebaseTokenValidator allow-list.
function providerFor(auth: AuthModule, provider: SocialProvider) {
    switch (provider) {
        case 'google': {
            const google = new auth.GoogleAuthProvider();
            google.setCustomParameters({ prompt: 'select_account' });
            return google;
        }
    }
}

function errorCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : undefined;
}

function messageFor(error: unknown): string {
    switch (errorCode(error)) {
        case 'auth/popup-blocked':
            return 'The sign-in window was blocked. Allow pop-ups for this site and try again.';
        case 'auth/account-exists-with-different-credential':
            return 'An account with this email already exists with another sign-in method. Use that method instead.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not turned on yet.';
        case 'auth/unauthorized-domain':
            return 'This address is not authorised for social sign-in yet.';
        case 'auth/network-request-failed':
            return 'Could not reach the sign-in service. Check your connection and try again.';
        default:
            return 'Sign-in failed. Try again.';
    }
}

/**
 * Opens the provider's sign-in window and resolves with a Firebase ID token for the server to verify, or null when the
 * person closed the window. Firebase is loaded on demand so it stays out of the main bundle.
 */
export async function getFirebaseIdToken(provider: SocialProvider): Promise<string | null> {
    const [{ getApps, initializeApp }, auth] = await Promise.all([import('@firebase/app'), import('@firebase/auth')]);
    const firebaseAuth = auth.getAuth(getApps()[0] ?? initializeApp(firebaseConfig));

    try {
        const result = await auth.signInWithPopup(firebaseAuth, providerFor(auth, provider));
        return await result.user.getIdToken();
    } catch (error) {
        const code = errorCode(error);
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
            return null;
        }
        throw new Error(messageFor(error));
    } finally {
        // Firebase was only needed as proof of who they are; this app keeps its own session.
        await firebaseAuth.signOut().catch(() => {});
    }
}
