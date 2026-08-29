import { Chip } from '@mui/material';
import type { DocumentStatus } from '../types/document';

const statusStyles: Record<DocumentStatus, { color: string; backgroundColor: string }> = {
  Создан: { color: '#245c9f', backgroundColor: '#e8f1fb' },
  'В работе': { color: '#8b5b12', backgroundColor: '#fff2d6' },
  'На согласовании': { color: '#5a4a9f', backgroundColor: '#efecfb' },
  'На доработке': { color: '#9b6811', backgroundColor: '#fff0cd' },
  Согласован: { color: '#17623c', backgroundColor: '#e6f5ed' },
  Отклонен: { color: '#a93636', backgroundColor: '#fdebec' },
};

export function DocumentStatusChip({ status }: { status: DocumentStatus }) {
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        ...statusStyles[status],
        height: 24,
        borderRadius: '3px',
        fontSize: '0.75rem',
        fontWeight: 500,
      }}
    />
  );
}
