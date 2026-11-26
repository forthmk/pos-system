import React from 'react';

interface FormRadioProps {
   name: string;
   options: { value: string; label: string }[];
   selected?: string;
   onChange?: (value: string) => void;
}

const FormRadio: React.FC<FormRadioProps> = ({ name, options, selected, onChange }) => {
   return (
      <div className="flex items-center gap-4">
         {options.map((opt) => (
            <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
               <input
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => onChange?.(opt.value)}
                  className="form-radio"
               />
               <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{opt.label}</span>
            </label>
         ))}
      </div>
   );
};

export default FormRadio;
