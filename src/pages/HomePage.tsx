import { useEffect, useMemo, type ComponentType, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  type PaperProps,
  type SvgIconProps,
} from '@mui/material';
import {
  ArrowForwardIos as ArrowForwardIosIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  FactCheckOutlined as FactCheckOutlinedIcon,
  NoteAddOutlined as NoteAddOutlinedIcon,
  TaskAltOutlined as TaskAltOutlinedIcon,
  WarningAmberOutlined as WarningAmberOutlinedIcon,
} from '@mui/icons-material';
import { DocumentStatusChip } from '../components/DocumentStatusChip';
import { fetchDocuments } from '../store/documentsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { formatDate } from '../utils/format';

type IconComponent = ComponentType<SvgIconProps>;

const taskRows = [
  ['Проверить договор ПДС №ПДС-2405-001', 'Согласование договора ПДС', '24.05.2024', 'В работе'],
  ['Сверить СНИЛС по договору №ПДС-2405-014', 'Контроль атрибутов', '25.05.2024', 'Новая'],
  ['Принять решение по договору №ПДС-2405-018', 'Согласование договора ПДС', '26.05.2024', 'В работе'],
  ['Проверить вложения по договору №ПДС-2405-021', 'Проверка вложений', '27.05.2024', 'Новая'],
];

function Panel({ title, action, onAction, children, sx }: PropsWithChildren<{ title: string; action?: string; onAction?: () => void; sx?: PaperProps['sx'] }>) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0, ...sx }}>
      <Stack direction="row" sx={{ mb: 1.35, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">{title}</Typography>
        {action && (
          <Button color="secondary" size="small" endIcon={<ArrowForwardIosIcon sx={{ fontSize: 11 }} />} onClick={onAction} sx={{ fontSize: 11.5, minWidth: 0, px: 0.5 }}>
            {action}
          </Button>
        )}
      </Stack>
      {children}
    </Paper>
  );
}

function Metric({ title, value, caption, icon: Icon, color, background }: { title: string; value: number | string; caption?: string; icon: IconComponent; color: string; background: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.6, display: 'flex', alignItems: 'center', gap: 1.4 }}>
      <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: background, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 25 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{title}</Typography>
        <Typography sx={{ fontSize: 25, lineHeight: 1.25, fontWeight: 600 }}>{value}</Typography>
        <Typography color="text.secondary" sx={{ fontSize: 11.2 }}>{caption}</Typography>
      </Box>
    </Paper>
  );
}

function statusSx(status: string) {
  if (status === 'В работе') return { color: '#9b6811', bgcolor: '#fff0cd' };
  if (status === 'Не согласована') return { color: '#bd4242', bgcolor: '#fde5e5' };
  return { color: '#355d82', bgcolor: '#e7f0f8' };
}

export function HomePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, total, loading, error, currentUser, filters } = useAppSelector((state) => state.documents);
  useEffect(() => {
    if (items.length === 0) void dispatch(fetchDocuments(filters));
  }, [dispatch, filters, items.length]);

  const counters = useMemo(() => ({
    created: items.filter((document) => document.approvalStatus === 'CREATED').length,
    active: items.filter((document) => ['IN_WORK', 'ON_APPROVAL', 'NEEDS_REVISION'].includes(document.approvalStatus)).length,
    approved: items.filter((document) => document.approvalStatus === 'APPROVED').length,
    rejected: items.filter((document) => document.approvalStatus === 'REJECTED').length,
  }), [items]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4">Главная страница</Typography>
        </Box>
        <Button variant="contained" startIcon={<NoteAddOutlinedIcon />} onClick={() => navigate('/documents/new')} sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}>
          Создать документ
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
        <Metric title="Всего в реестре" value={total || items.length} icon={DescriptionOutlinedIcon} color="#2875c7" background="#e8f1fb" />
        <Metric title="В процессе" value={counters.active + counters.created} icon={TaskAltOutlinedIcon} color="#8b5b12" background="#fff2d6" />
        <Metric title="Согласованы" value={counters.approved} icon={FactCheckOutlinedIcon} color="#17623c" background="#e6f5ed" />
        <Metric title="Отклонены" value={counters.rejected} icon={WarningAmberOutlinedIcon} color="#a93636" background="#fdebec" />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 2fr) minmax(330px, 1fr)' }, gap: 2 }}>
        <Panel title="Последние документы" action="Обновить" onAction={() => { void dispatch(fetchDocuments(filters)); }} sx={{ minHeight: 312 }}>
          {loading && items.length === 0 ? (
            <Stack sx={{ py: 7, alignItems: 'center' }}><CircularProgress size={28} /></Stack>
          ) : items.length === 0 ? (
            <Stack spacing={1.4} sx={{ py: 7, textAlign: 'center', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Документы не найдены</Typography>
              <Button variant="contained" startIcon={<NoteAddOutlinedIcon />} onClick={() => navigate('/documents/new')}>Создать документ</Button>
            </Stack>
          ) : (
            <Stack>
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'minmax(210px, 1.2fr) 130px minmax(150px, .8fr) 118px', px: 0.25, pb: 0.8, color: 'text.secondary', fontSize: 11.5 }}>
                <Box>Договор</Box><Box>Дата</Box><Box>СНИЛС</Box><Box>Статус</Box>
              </Box>
              {items.slice(0, 10).map((document) => (
                <Box
                  key={document.id}
                  onClick={() => navigate(`/documents/${document.id}`)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(210px, 1.2fr) 130px minmax(150px, .8fr) 118px' },
                    gap: { xs: 0.6, md: 0 },
                    alignItems: 'center',
                    minHeight: { xs: 66, md: 42 },
                    px: 0.25,
                    borderTop: 1,
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8fafb' },
                  }}
                >
                  <Stack direction="row" spacing={1.1} sx={{ minWidth: 0, alignItems: 'center' }}>
                    <DescriptionOutlinedIcon sx={{ color: '#2875c7', fontSize: 24, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600 }}>{document.documentType} {document.contractNumber}</Typography>
                    </Box>
                  </Stack>
                  <Typography color="text.secondary" sx={{ fontSize: 12, gridColumn: { xs: 1, md: 'auto' } }}>{formatDate(document.contractDate)}</Typography>
                  <Typography noWrap sx={{ fontSize: 12.5, gridColumn: { xs: 1, md: 'auto' } }}>{document.snils}</Typography>
                  <Box sx={{ justifySelf: { xs: 'end', md: 'start' }, gridColumn: { xs: 2, md: 'auto' }, gridRow: { xs: '1 / span 2', md: 'auto' } }}>
                    <DocumentStatusChip status={document.documentStatus} />
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Panel>

        <Panel title="Мои задачи" action="Все задачи" sx={{ minHeight: 312 }}>
          <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'minmax(180px, 1.35fr) minmax(140px, .9fr) 92px 96px', px: 0.25, pb: 0.8, color: 'text.secondary', fontSize: 11.5 }}>
            <Box>Задача</Box><Box>Процесс</Box><Box>Срок</Box><Box>Статус</Box>
          </Box>
          {taskRows.map(([task, process, due, taskStatus]) => (
            <Box key={task} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(180px, 1.35fr) minmax(140px, .9fr) 92px 96px' }, alignItems: 'center', minHeight: { xs: 58, md: 38 }, columnGap: { xs: 1, md: 0 }, px: 0.25, borderTop: 1, borderColor: 'divider', fontSize: 12.5 }}>
              <Box sx={{ pr: 1, gridColumn: { xs: 1, md: 'auto' }, gridRow: { xs: 1, md: 'auto' } }}>{task}</Box>
              <Box sx={{ pr: 1, color: { xs: 'text.secondary', md: 'text.primary' }, fontSize: { xs: 11.5, md: 12.5 }, gridColumn: { xs: 1, md: 'auto' }, gridRow: { xs: 2, md: 'auto' } }}>{process}</Box>
              <Box sx={{ color: { xs: 'text.secondary', md: 'text.primary' }, fontSize: { xs: 10.5, md: 12.5 }, gridColumn: { xs: 2, md: 'auto' }, gridRow: { xs: 1, md: 'auto' } }}>{due}</Box>
              <Chip label={taskStatus} size="small" sx={{ ...statusSx(taskStatus), height: 21, width: 'fit-content', borderRadius: 1, fontSize: 10.5, justifySelf: { xs: 'end', md: 'start' }, gridColumn: { xs: 2, md: 'auto' }, gridRow: { xs: 2, md: 'auto' } }} />
            </Box>
          ))}
        </Panel>
      </Box>

    </Stack>
  );
}
