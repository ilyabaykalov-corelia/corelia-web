import { Chip } from '@mui/material';

export function DocumentStatusChip({ status }: { status: string }) {
  return <Chip label={status} size="small" sx={{ height: 24, borderRadius: '3px', fontSize: '0.75rem', fontWeight: 500 }} />;
}
