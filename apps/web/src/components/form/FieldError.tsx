import { AlertCircle } from 'lucide-react';

// The one way a form field shows its validation message: ⚠ + red text.
// Pair the field with aria-invalid (red border, see tailwind.css) and
// aria-describedby={id} so screen readers read the message too.
const FieldError = ({ id, message }: { id?: string; message?: string }) =>
    message ? (
        <p id={id} role="alert" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {message}
        </p>
    ) : null;

export default FieldError;
