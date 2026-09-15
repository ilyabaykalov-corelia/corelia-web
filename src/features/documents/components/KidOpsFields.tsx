import { TextField } from '@mui/material';
import { FormField } from '../../../components/common/FormField';
import type { CreateDocumentRequest } from '../../../types/document';

export function KidOpsFields({ value, onChange, disabled = false }: {
  value: CreateDocumentRequest;
  onChange: (field: keyof CreateDocumentRequest, value: string) => void;
  disabled?: boolean;
}) {
  return <>
    <FormField label="Год подписания" required>
      <TextField fullWidth size="small" value={value.signingYear ?? ''} disabled={disabled}
        onChange={e => onChange('signingYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
        helperText="Цифровой, в формате: „ХХХХ“" slotProps={{ htmlInput: { maxLength: 4, inputMode: 'numeric', 'aria-label': 'Год подписания' } }} />
    </FormField>
    {([['lastName', 'Фамилия', 40], ['firstName', 'Имя', 255], ['middleName', 'Отчество', 256]] as const).map(([field, label, maxLength]) =>
      <FormField key={field} label={label} required={field !== 'middleName'}>
        <TextField fullWidth size="small" value={value[field] ?? ''} disabled={disabled}
          onChange={e => onChange(field, e.target.value)} slotProps={{ htmlInput: { maxLength, 'aria-label': label } }} />
      </FormField>)}
  </>;
}
