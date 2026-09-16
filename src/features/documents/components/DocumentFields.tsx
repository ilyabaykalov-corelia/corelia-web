import { MenuItem, TextField } from '@mui/material';
import { FormField } from '../../../components/common/FormField';
import type { AttributeValue, DocumentAttributes, DocumentType } from '../../../types/document';

export function DocumentFields({ definition, value, onChange, disabled = false }: {
  definition: DocumentType; value: DocumentAttributes;
  onChange: (field: string, value: AttributeValue) => void; disabled?: boolean;
}) {
  return <>{definition.ui.fields.map(name => {
    const field = definition.schema.properties[name];
    const label = field.title || name;
    const options = field.enum ?? (field.type === 'boolean' ? [true, false] : undefined);
    const current = value[name];
    const numeric = field.type === 'integer' || field.type === 'number';
    return <FormField key={name} label={label} required={definition.schema.required?.includes(name)}>
      {options ? <TextField fullWidth size="small" select disabled={disabled} value={options.findIndex(option => option === current)}
        slotProps={{ htmlInput: { 'aria-label': label } }} onChange={event => onChange(name, options[Number(event.target.value)] ?? null)}>
        <MenuItem value={-1}>Не выбрано</MenuItem>
        {options.map((option, index) => <MenuItem key={index} value={index}>{typeof option === 'boolean' ? option ? 'Да' : 'Нет' : String(option)}</MenuItem>)}
      </TextField> : <TextField fullWidth size="small" disabled={disabled} value={current ?? ''}
        type={field.format === 'date' ? 'date' : numeric ? 'number' : 'text'} helperText={field.description}
        slotProps={{ htmlInput: { 'aria-label': label, min: field.minimum, max: field.maximum, step: field.type === 'integer' ? 1 : 'any' } }}
        onChange={event => onChange(name, numeric && event.target.value !== '' ? Number(event.target.value) : event.target.value)} />}
    </FormField>;
  })}</>;
}
