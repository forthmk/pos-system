import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import FieldError from './FieldError';
import { useShakeOnError } from '../../hooks/useShakeOnError';

// For a required value kept OUTSIDE the zod schema (e.g. a multi-select held
// in component state): behaves like FormField does for schema fields — no
// error until the user presses Submit, then the red * label, ⚠ message and
// a shake, clearing as soon as it has a value. `children` receives `invalid`
// to set aria-invalid on the control (red border, see tailwind.css).
// The form's onSubmit must still refuse to save while `isEmpty`.
// Must be used inside <Form>.
interface RequiredFieldProps {
    id: string;
    label: ReactNode;
    isEmpty: boolean;
    message: string;
    children: (invalid: boolean) => ReactNode;
}

const RequiredField = ({ id, label, isEmpty, message, children }: RequiredFieldProps) => {
    const {
        formState: { submitCount },
    } = useFormContext();
    const error = submitCount > 0 && isEmpty ? message : undefined;
    const shake = useShakeOnError(!!error);

    return (
        <div className={shake}>
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label} <span className="text-red-500">*</span>
            </label>
            {children(!!error)}
            <FieldError id={id} message={error} />
        </div>
    );
};

export default RequiredField;
