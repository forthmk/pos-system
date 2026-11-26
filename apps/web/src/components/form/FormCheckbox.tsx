import React from 'react';

interface FormCheckboxProps {
   name: string;
   label?: string;
   checked?: boolean;
   onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
   className?: string; // optional extra classes for the input
}

const FormCheckbox: React.FC<FormCheckboxProps> = ({ name, label, checked, onChange, className }) => {
   return (
      <label className="inline-flex items-center gap-2 cursor-pointer">
         <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            className={`form-checkbox w-4 h-4 accent-blue-600 rounded ${className ?? ''}`}
         />
         {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
         )}
      </label>
   );
};

export default FormCheckbox;