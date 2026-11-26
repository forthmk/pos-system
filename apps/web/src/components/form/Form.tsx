import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

interface FormProps {
   schema: z.ZodObject<any>;
   onSubmit: (data: any) => void;
   defaultValues?: Record<string, any>;
   children: React.ReactNode;
   // Lets a submit button live outside this <form> element (e.g. up in a
   // dialog header) via the standard HTML `<button form="...">` attribute.
   id?: string;
}

const Form = ({ schema, onSubmit, defaultValues, children, id }: FormProps) => {
   const form = useForm({
      resolver: zodResolver(schema),
      defaultValues,
   });

   return (
      <FormProvider {...form}>
         <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {children}
         </form>
      </FormProvider>
   );
};

export default Form;
