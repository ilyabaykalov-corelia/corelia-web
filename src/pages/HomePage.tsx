import { useEffect, useMemo, useState, type ComponentType, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  type PaperProps,
  type SvgIconProps,
} from '@mui/material';
import {
  AccountTreeOutlined as AccountTreeOutlinedIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  FactCheckOutlined as FactCheckOutlinedIcon,
  NoteAddOutlined as NoteAddOutlinedIcon,
  Search as SearchIcon,
  TaskAltOutlined as TaskAltOutlinedIcon,
  WarningAmberOutlined as WarningAmberOutlinedIcon,
} from '@mui/icons-material';
import { DocumentStatusChip } from '../components/DocumentStatusChip';
import { fetchDocuments, setFilters } from '../store/documentsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { ApprovalStatus, DocumentSearchRequest } from '../types/document';
import { formatDate } from '../utils/format';

type IconComponent = ComponentType<SvgIconProps>;

const statusOptions: Array<{ value: ApprovalStatus | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'CREATED', label: 'Создан' },
  { value: 'IN_WORK', label: 'В работе' },
  { value: 'ON_APPROVAL', label: 'На согласовании' },
  { value: 'NEEDS_REVISION', label: 'На доработке' },
  { value: 'APPROVED', label: 'Согласован' },
  { value: 'REJECTED', label: 'Отклонен' },
];

const taskRows = [
  ['Проверить договор ПДС №ПДС-2405-001', 'Согласование договора ПДС', '24.05.2024', 'В работе'],
  ['Сверить СНИЛС по договору №ПДС-2405-014', 'Контроль атрибутов', '25.05.2024', 'Новая'],
  ['Принять решение по договору №ПДС-2405-018', 'Согласование договора ПДС', '26.05.2024', 'В работе'],
  ['Проверить вложения по договору №ПДС-2405-021', 'Проверка вложений', '27.05.2024', 'Новая'],
];

function Panel({ title, action, onAction, children, sx }: PropsWithChildren<{ title: string; action?: string; onAction?: () => void; sx?: PaperProps['sx'] }>) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0, ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.35 }}>
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
  const [query, setQuery] = useState(filters.query ?? '');
  const [status, setStatus] = useState<ApprovalStatus | ''>((filters.status as ApprovalStatus | '') ?? '');
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(filters.dateTo ?? '');

  useEffect(() => {
    if (items.length === 0) void dispatch(fetchDocuments(filters));
  }, [dispatch, filters, items.length]);

  const counters = useMemo(() => ({
    created: items.filter((document) => document.approvalStatus === 'CREATED').length,
    active: items.filter((document) => ['IN_WORK', 'ON_APPROVAL', 'NEEDS_REVISION'].includes(document.approvalStatus)).length,
    approved: items.filter((document) => document.approvalStatus === 'APPROVED').length,
    rejected: items.filter((document) => document.approvalStatus === 'REJECTED').length,
  }), [items]);

  const applyFilters = () => {
    const nextFilters: DocumentSearchRequest = {
      query: query.trim() || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    dispatch(setFilters(nextFilters));
    void dispatch(fetchDocuments(nextFilters));
  };

  const resetFilters = () => {
    setQuery('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    dispatch(setFilters({}));
    void dispatch(fetchDocuments({}));
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
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

      {/* <Panel title="Поиск договоров"> */}
      {/*   <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1.3fr) repeat(3, minmax(150px, .7fr)) auto' }, gap: 1.2, alignItems: 'center' }}> */}
      {/*     <TextField */}
      {/*       size="small" */}
      {/*       label="Номер, СНИЛС или Id" */}
      {/*       value={query} */}
      {/*       onChange={(event) => setQuery(event.target.value)} */}
      {/*       onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }} */}
      {/*     /> */}
      {/*     <TextField select size="small" label="Статус" value={status} onChange={(event) => setStatus(event.target.value as ApprovalStatus | '')}> */}
      {/*       {statusOptions.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)} */}
      {/*     </TextField> */}
      {/*     <TextField size="small" label="Дата с" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} InputLabelProps={{ shrink: true }} /> */}
      {/*     <TextField size="small" label="Дата по" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} InputLabelProps={{ shrink: true }} /> */}
      {/*     <Stack direction="row" spacing={1}> */}
      {/*       <Button variant="contained" startIcon={<SearchIcon />} onClick={applyFilters}>Найти</Button> */}
      {/*       <Button variant="outlined" color="inherit" onClick={resetFilters}>Сбросить</Button> */}
      {/*     </Stack> */}
      {/*   </Box> */}
      {/* </Panel> */}

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 2fr) minmax(330px, 1fr)' }, gap: 2 }}>
        <Panel title="Последние документы" action="Обновить" onAction={() => { void dispatch(fetchDocuments(filters)); }} sx={{ minHeight: 312 }}>
          {loading && items.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 7 }}><CircularProgress size={28} /></Stack>
          ) : items.length === 0 ? (
            <Stack alignItems="center" spacing={1.4} sx={{ py: 7, textAlign: 'center' }}>
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
                  <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
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

      {/* <Panel title="Маршрут договора ПДС"> */}
      {/*   <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}> */}
      {/*     {[ */}
      {/*       { title: 'Создание карточки', count: counters.created + counters.approved + counters.rejected, color: '#2875c7', bg: '#e8f1fb', icon: NoteAddOutlinedIcon }, */}
      {/*       { title: 'Согласование', count: counters.created, color: '#17623c', bg: '#e6f5ed', icon: AccountTreeOutlinedIcon }, */}
      {/*       { title: 'Завершение', count: counters.approved + counters.rejected, color: '#8b5b12', bg: '#fff2d6', icon: FactCheckOutlinedIcon }, */}
      {/*     ].map((process) => { */}
      {/*       const Icon = process.icon; */}
      {/*       return ( */}
      {/*         <Box key={process.title} sx={{ minHeight: 82, bgcolor: process.bg, border: 1, borderColor: '#eef1f3', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1.35, p: 1.5 }}> */}
      {/*           <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: '#fff', color: process.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}> */}
      {/*             <Icon sx={{ fontSize: 23 }} /> */}
      {/*           </Box> */}
      {/*           <Box sx={{ minWidth: 0 }}> */}
      {/*             <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>{process.title}</Typography> */}
      {/*             <Stack direction="row" alignItems="baseline" spacing={0.6}> */}
      {/*               <Typography sx={{ fontSize: 22, lineHeight: 1.35 }}>{process.count}</Typography> */}
      {/*               <Typography color="text.secondary" sx={{ fontSize: 10.5 }}>договоров</Typography> */}
      {/*             </Stack> */}
      {/*           </Box> */}
      {/*         </Box> */}
      {/*       ); */}
      {/*     })} */}
      {/*   </Box> */}
      {/* </Panel> */}
    </Stack>
  );
}
