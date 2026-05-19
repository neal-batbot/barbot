import { ControllerRenderProps } from 'react-hook-form';

import { Input as InputComponent } from '@/shared/components/ui/input';
import { FormField } from '@/shared/types/blocks/form';

export function Input({
  field,
  formField,
  data,
}: {
  field: FormField;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
  data?: any;
}) {
  return (
    <InputComponent
      value={formField.value as string}
      onChange={formField.onChange}
      type={field.type || 'text'}
      placeholder={field.placeholder}
      className="rounded-xl bg-fd-background/85 placeholder:text-fd-muted-foreground/65"
      {...field.attributes}
    />
  );
}
