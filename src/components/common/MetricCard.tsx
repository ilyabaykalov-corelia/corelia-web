import type { ComponentType } from 'react';
import { Box, Paper, Typography, type SvgIconProps } from '@mui/material';
import { styled } from '@mui/material/styles';

type IconComponent = ComponentType<SvgIconProps>;

const Card = styled(Paper)(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing(1.4),
  padding: theme.spacing(1.6),
}));

const IconBox = styled(Box)({
  borderRadius: '50%',
  display: 'grid',
  flexShrink: 0,
  height: 46,
  placeItems: 'center',
  width: 46,
});

interface MetricCardProps {
  title: string;
  value: number | string;
  caption?: string;
  icon: IconComponent;
  color: string;
  background: string;
}

/**
 * Показывает метрику реестра с иконкой, основным значением и необязательной подписью.
 *
 * @param props - Параметры отображения метрики.
 * @param props.title - Короткое название метрики.
 * @param props.value - Основное значение метрики.
 * @param props.caption - Необязательный дополнительный текст под значением.
 * @param props.icon - MUI-компонент иконки внутри цветного круга.
 * @param props.color - Цвет иконки.
 * @param props.background - Цвет фона круга с иконкой.
 */
export function MetricCard({ title, value, caption, icon: Icon, color, background }: MetricCardProps) {
  return (
    <Card variant="outlined">
      <IconBox sx={{ bgcolor: background, color }}>
        <Icon sx={{ fontSize: 25 }} />
      </IconBox>
      <Box sx={{ minWidth: 0 }}>
        <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{title}</Typography>
        <Typography sx={{ fontSize: 25, lineHeight: 1.25, fontWeight: 600 }}>{value}</Typography>
        {caption && <Typography color="text.secondary" sx={{ fontSize: 11.2 }}>{caption}</Typography>}
      </Box>
    </Card>
  );
}
