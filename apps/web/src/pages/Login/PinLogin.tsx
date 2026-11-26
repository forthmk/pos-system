import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@pikoloo/darwin-ui';
import { MonitorSmartphone } from 'lucide-react';
import Form from '../../components/form/Form';
import FormField from '../../components/form/FormField';
import PinPad from '../../components/pos/PinPad';
import { useAuth } from '../../hooks/useAuth';
import { friendlyError } from '../../utils/friendlyError';

// Staff sign-in (design §2.2): username + PIN at a terminal. The terminal
// code is remembered per browser, so a register only types its name once.
// Admins use their password in the PIN box (the physical keyboard works).

const FORM_ID = 'pin-login';
const schema = z.object({
    username: z.string().trim().min(1, 'Type your username'),
    terminal_code: z.string().trim().min(1, 'Type this terminal’s code, e.g. POS-01').max(20),
});

const PinLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { pinLogin, terminalCode, status } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [shake, setShake] = useState(false);

    const goTo = (location.state as { from?: string } | null)?.from ?? '/home';

    // Already signed in (e.g. the Back button): straight to the app.
    useEffect(() => {
        if (status === 'signedIn') navigate(goTo, { replace: true });
    }, [status, goTo, navigate]);

    const wrong = (message: string) => {
        setError(message);
        setPin('');
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
    };

    const submit = async (values: z.infer<typeof schema>) => {
        if (pin.length < 4) return wrong('Enter your PIN (at least 4 digits).');
        setBusy(true);
        setError('');
        try {
            await pinLogin({ username: values.username, pin, terminal_code: values.terminal_code });
            navigate(goTo, { replace: true });
        } catch (e) {
            wrong(friendlyError(e, 'Could not sign in. Please try again.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex min-h-dvh items-center justify-center bg-[#FFF8F0] px-4 py-8">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl shadow-orange-900/5 ring-1 ring-orange-100 sm:p-8">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <span className="rounded-full bg-orange-500 px-5 py-2 text-sm font-extrabold tracking-[0.2em] text-white">QUICKBITE</span>
                    <h1 className="text-2xl font-extrabold text-slate-900">Staff sign in</h1>
                    <p className="text-sm text-slate-500">Register and kitchen staff: your username and PIN.</p>
                </div>

                <Form id={FORM_ID} schema={schema} onSubmit={submit} defaultValues={{ username: '', terminal_code: terminalCode }}>
                    <FormField name="username" label="Username" placeholder="e.g. cashier" required />
                    <PinPad
                        value={pin}
                        onChange={(v) => {
                            setPin(v);
                            if (error) setError('');
                        }}
                        onSubmit={() => (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit()}
                        maxLength={16}
                        disabled={busy}
                        shakeClassName={shake ? 'field-shake' : ''}
                    />
                    <p role="alert" className="min-h-5 text-center text-sm font-medium text-rose-600">
                        {error}
                    </p>
                    <FormField name="terminal_code" label="This terminal" placeholder="POS-01" maxLength={20} required />
                    <Button type="submit" className="h-12 w-full !bg-orange-500 text-base font-bold !text-white hover:!bg-orange-600" disabled={busy}>
                        {busy ? 'Signing in…' : 'Sign in'}
                    </Button>
                </Form>

                <Link
                    to="/pair"
                    className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-orange-600"
                >
                    <MonitorSmartphone className="h-4 w-4" />
                    Set up this screen as a kiosk or kitchen display
                </Link>
            </div>
        </div>
    );
};

export default PinLogin;
