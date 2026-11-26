import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@pikoloo/darwin-ui';
import { ArrowLeft, MonitorSmartphone } from 'lucide-react';
import Form from '../../components/form/Form';
import FormField from '../../components/form/FormField';
import { useAuth } from '../../hooks/useAuth';
import { friendlyError } from '../../utils/friendlyError';

// Pairing a kiosk / kitchen display (design §2.2): an admin creates the
// device token (POST /api/terminals/:id/pair) and pastes it here once. The
// screen keeps it and signs itself in from then on — no password on a
// public kiosk.

const schema = z.object({
    device_token: z.string().trim().min(20, 'Paste the whole device code from the admin'),
});

const PairScreen = () => {
    const navigate = useNavigate();
    const { pairScreen } = useAuth();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async ({ device_token }: z.infer<typeof schema>) => {
        setBusy(true);
        setError('');
        try {
            await pairScreen(device_token);
            navigate('/home', { replace: true });
        } catch (e) {
            setError(friendlyError(e, 'Could not pair this screen. Please try again.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex min-h-dvh items-center justify-center bg-[#FFF8F0] px-4 py-8">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl shadow-orange-900/5 ring-1 ring-orange-100 sm:p-8">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                        <MonitorSmartphone className="h-7 w-7" />
                    </span>
                    <h1 className="text-2xl font-extrabold text-slate-900">Set up this screen</h1>
                    <p className="text-sm text-slate-500">
                        For a self-service kiosk or a kitchen display. Ask an admin for this screen’s device code and paste it below. It is
                        only needed once.
                    </p>
                </div>

                <Form schema={schema} onSubmit={submit} defaultValues={{ device_token: '' }}>
                    <FormField name="device_token" label="Device code" type="password" placeholder="qbd_…" required />
                    <p role="alert" className="min-h-5 text-center text-sm font-medium text-rose-600">
                        {error}
                    </p>
                    <Button type="submit" className="h-12 w-full !bg-orange-500 text-base font-bold !text-white hover:!bg-orange-600" disabled={busy}>
                        {busy ? 'Setting up…' : 'Set up screen'}
                    </Button>
                </Form>

                <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-orange-600">
                    <ArrowLeft className="h-4 w-4" />
                    Back to staff sign in
                </Link>
            </div>
        </div>
    );
};

export default PairScreen;
