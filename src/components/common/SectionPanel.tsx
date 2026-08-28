import type { PropsWithChildren, ReactNode } from 'react';
import { Chip, Paper, Stack, Typography, type PaperProps } from '@mui/material';
import { styled } from '@mui/material/styles';

const Panel = styled(Paper)(({ theme }) => ({
  minWidth: 0,
  padding: theme.spacing(2),
}));

const Header = styled(Stack)(({ theme }) => ({
  marginBottom: theme.spacing(1.6),
}));

interface SectionPanelProps {
  title: string;
  count?: number;
  action?: ReactNode;
  sx?: PaperProps['sx'];
}

/**
 * Отрисовывает общую секцию с рамкой, заголовком, необязательным счетчиком и областью действия.
 *
 * Используется для визуально одинаковых панелей документа: атрибутов, вложений,
 * состояния процесса и настроек доступа.
 *
 * @param props - Конфигурация панели.
 * @param props.title - Заголовок секции.
 * @param props.count - Необязательный числовой бейдж рядом с заголовком.
 * @param props.action - Необязательный элемент действия в правой части заголовка.
 * @param props.sx - Дополнительные MUI-переопределения для точечных layout-задач.
 * @param props.children - Содержимое секции.
 */
export function SectionPanel({ title, count, action, sx, children }: PropsWithChildren<SectionPanelProps>) {
  return (
    <Panel variant="outlined" sx={sx}>
      <Header direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">{title}</Typography>
          {count !== undefined && (
            <Chip label={count} variant="outlined" size="small" sx={{ height: 25, minWidth: 25, borderRadius: 12, fontSize: 11 }} />
          )}
        </Stack>
        {action}
      </Header>
      {children}
    </Panel>
  );
}
