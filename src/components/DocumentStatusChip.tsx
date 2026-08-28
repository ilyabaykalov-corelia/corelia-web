import { Chip } from '@mui/material';
import type { DocumentStatus } from '../types/document';

const statusStyles: Record<DocumentStatus, { color: string; backgroundColor: string }> = {
  Создан: { color: '#245c9f', backgroundColor: '#e8f1fb' },
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
