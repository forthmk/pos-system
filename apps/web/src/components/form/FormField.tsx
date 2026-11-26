import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@pikoloo/darwin-ui';
import FieldError from './FieldError';
import { useShakeOnError } from '../../hooks/useShakeOnError';

interface FormFieldProps {
   name: string;
   label: string;
   type?: string;
   placeholder?: string;
   maxLength?: number;
   // Strips non-digit keystrokes live, so the field hard-caps at maxLength
   // digits as the user types instead of only failing on submit.
   numericOnly?: boolean;
   // Shows the red * after the label. (Whether it's actually required is
   // the zod schema's call — this is only the visual cue.)
   required?: boolean;
}

// Invalid on submit → red border + ⚠ message + a short shake; the red goes
// away as soon as the value becomes valid (react-hook-form re-validates on
// change after the first submit).
const FormField = ({ name, label, type = 'text', placeholder, maxLength, numericOnly, required }: FormFieldProps) => {
   const { register, formState: { errors } } = useFormContext();
   const error = errors[name]?.message as string | undefined;
   const shake = useShakeOnError(!!error);
   const errorId = `${name}-error`;
   const { onChange, ...registerRest } = register(name);
   // A password field gets the login page's eye button: show / hide what was typed.
   const isPassword = type === 'password';
   const [showPassword, setShowPassword] = useState(false);

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (numericOnly) {
         e.target.value = e.target.value.replace(/\D/g, '');
      }
      if (maxLength) {
         e.target.value = e.target.value.slice(0, maxLength);
      }
      onChange(e);
   };

   return (
      <div className={shake}>
         <label htmlFor={name} className="block mb-1 text-sm font-medium">
            {label}
            {required && <span className="text-red-500"> *</span>}
         </label>
         <div className={isPassword ? 'relative' : undefined}>
         <Input
            id={name}
            {...registerRest}
            onChange={handleChange}
            type={isPassword && showPassword ? 'text' : type}
            inputMode={numericOnly ? 'numeric' : undefined}
            // Native maxLength truncates raw characters before our
            // numericOnly stripping runs, so a paste with any non-digit
            // noise (dashes, spaces) can lose digits it shouldn't. Only
            // apply it natively when we're not also stripping.
            maxLength={numericOnly ? undefined : maxLength}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`form-field w-full ${isPassword ? 'pr-12' : ''}`}
         />
         {isPassword && (
            <button
               type="button"
               onClick={() => setShowPassword((v) => !v)}
               aria-label={showPassword ? 'Hide password' : 'Show password'}
               aria-pressed={showPassword}
               className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-slate-700"
            >
               {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
         )}
         </div>
         <FieldError id={errorId} message={error} />
      </div>
   );
};

export default FormField;
