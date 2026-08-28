import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const Row = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'grid',
  gap: theme.spacing(0.35),
  padding: theme.spacing(0.75, 0),
  [theme.breakpoints.up('sm')]: {
    gap: theme.spacing(1.5),
    gridTemplateColumns: '210px minmax(0, 1fr)',
  },
}));

const Value = styled(Typography)({
  fontSize: 12.5,
  overflowWrap: 'anywhere',
});

interface SummaryRowProps {
  label: string;
  value?: string;
}

/**
 * Отображает read-only пару "подпись/значение" для компактных сводок.
 *
 * @param props - Данные строки.
 * @param props.label - Название атрибута в сводке.
 * @param props.value - Значение атрибута; при пустом значении отображается дефис.
 */
export function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <Row>
      <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{label}</Typography>
      <Value>{value || '-'}</Value>
    </Row>
  );
}
