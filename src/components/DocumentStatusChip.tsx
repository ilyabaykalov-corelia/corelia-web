import { Chip } from '@mui/material';

const statusStyles: Record<string, { color: string; backgroundColor: string }> = {
  CREATED: { color: '#245c9f', backgroundColor: '#e8f1fb' },
  IN_WORK: { color: '#245c9f', backgroundColor: '#e8f1fb' },
  ON_APPROVAL: { color: '#8a5a00', backgroundColor: '#fff4d6' },
  NEEDS_REVISION: { color: '#8a5a00', backgroundColor: '#fff4d6' },
  APPROVED: { color: '#17623c', backgroundColor: '#e6f5ed' },
  STORED: { color: '#17623c', backgroundColor: '#e6f5ed' },
  REJECTED: { color: '#a93636', backgroundColor: '#fdebec' },
};

export function DocumentStatusChip({ status, label = status }: { status: string; label?: string }) {
  return <Chip label={label} size="small" sx={{ height: 24, borderRadius: '3px', fontSize: '0.75rem', fontWeight: 500, ...statusStyles[status] }} />;
}
