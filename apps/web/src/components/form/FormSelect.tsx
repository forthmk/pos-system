import React from 'react';
import Select from './Select';
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
   name: string;
   label: string;
   options: { value: string; label: string }[];
   required?: boolean;
   placeholder?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({
   name,
   label,
   options,
   required,
   placeholder,
   ...rest
}) => {
   return (
      <div className="form-container">
         <label htmlFor={name} className="form-label">
            {label}
            {required && <span className="text-red-500"> *</span>}
         </label>
         <Select id={name} name={name} className="form-field" {...rest}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
               <option key={opt.value} value={opt.value}>
                  {opt.label}
               </option>
            ))}
         </Select>
      </div>
   );
};

export default FormSelect;
