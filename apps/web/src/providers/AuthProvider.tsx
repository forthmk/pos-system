import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { authApi } from '@shared/api';
import type { AuthDevice, AuthSession, AuthStaff, LoginBody } from '@shared/model';
import { validateToken } from '../utils/auth';

// Who is using this screen (design §2.2):
//  - staff (cashier, chef, manager, admin) sign in with username + PIN at a
//    terminal (POS-01, EXPO-01); their token lasts a working day;
//  - a kiosk / kitchen screen is paired once with a device token from an
//    admin and signs itself back in with it — nobody types a password there.
//
// Kept in localStorage: `token` (the JWT the shared axios client sends),
// `deviceToken` (paired screens only) and `terminalCode` (the register this
// browser was last signed in at, prefilled on the sign-in page).

const TOKEN = 'token';
const DEVICE_TOKEN = 'deviceToken';
const TERMINAL_CODE = 'terminalCode';

export type Principal = AuthStaff | AuthDevice;
type Status = 'loading' | 'signedIn' | 'signedOut';

export interface AuthContextValue {
    status: Status;
    principal: Principal | null;
    isAuthenticated: boolean;
    /** The register this browser signs in at (remembered). */
    terminalCode: string;
    pinLogin: (body: LoginBody) => Promise<Principal>;
    pairScreen: (deviceToken: string) => Promise<Principal>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const read = (key: string) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};
const write = (key: string, value: string | null) => {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {
        /* private mode: the session just won't survive a reload */
    }
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [status, setStatus] = useState<Status>('loading');
    const [principal, setPrincipal] = useState<Principal | null>(null);
    const [terminalCode, setTerminalCode] = useState(read(TERMINAL_CODE) ?? 'POS-01');

    const accept = useCallback((session: AuthSession) => {
        write(TOKEN, session.token);
        setPrincipal(session.principal);
        setStatus('signedIn');
        return session.principal;
    }, []);

    const signOut = useCallback(() => {
        write(TOKEN, null);
        setPrincipal(null);
        setStatus('signedOut');
    }, []);

    // Opening the app: a saved, unexpired token is renewed (/auth/me — the
    // user as they are now); otherwise a paired screen signs in with its
    // device token; otherwise the sign-in page.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const token = read(TOKEN);
            if (token && validateToken(token)) {
                try {
                    const { data } = await authApi.me();
                    if (!cancelled) accept(data);
                    return;
                } catch {
                    write(TOKEN, null);
                }
            }
            const deviceToken = read(DEVICE_TOKEN);
            if (deviceToken) {
                try {
                    const { data } = await authApi.device({ device_token: deviceToken });
                    if (!cancelled) accept(data);
                    return;
                } catch {
                    /* unpaired since — needs pairing again */
                }
            }
            if (!cancelled) signOut();
        })();
        return () => {
            cancelled = true;
        };
    }, [accept, signOut]);

    const pinLogin = useCallback(
        async (body: LoginBody) => {
            const { data } = await authApi.pinLogin(body);
            if (body.terminal_code) {
                write(TERMINAL_CODE, body.terminal_code);
                setTerminalCode(body.terminal_code);
            }
            return accept(data);
        },
        [accept],
    );

    const pairScreen = useCallback(
        async (deviceToken: string) => {
            const { data } = await authApi.device({ device_token: deviceToken.trim() });
            write(DEVICE_TOKEN, deviceToken.trim());
            return accept(data);
        },
        [accept],
    );

    const value = useMemo<AuthContextValue>(
        () => ({ status, principal, isAuthenticated: status === 'signedIn', terminalCode, pinLogin, pairScreen, logout: signOut }),
        [status, principal, terminalCode, pinLogin, pairScreen, signOut],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
