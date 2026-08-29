import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  FactCheckOutlined as FactCheckOutlinedIcon,
  NoteAddOutlined as NoteAddOutlinedIcon,
  Search as SearchIcon,
  TaskAltOutlined as TaskAltOutlinedIcon,
  WarningAmberOutlined as WarningAmberOutlinedIcon,
} from '@mui/icons-material';
import { MetricCard } from '../components/common/MetricCard';
import { SectionPanel } from '../components/common/SectionPanel';
import { DocumentStatusChip } from '../components/DocumentStatusChip';
import { fetchDocuments, fetchDocumentTypes, setFilters } from '../store/documentsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { ApprovalStatus, DocumentRecord, DocumentSearchRequest } from '../types/document';
import { formatDate } from '../utils/format';

type SortField = 'documentType' | 'contractDate' | 'contractNumber' | 'snils' | 'documentStatus';
type SortDirection = 'asc' | 'desc';

const statusOptions: Array<{ value: ApprovalStatus | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'CREATED', label: 'Создан' },
  { value: 'IN_WORK', label: 'В работе' },
  { value: 'ON_APPROVAL', label: 'На согласовании' },
  { value: 'NEEDS_REVISION', label: 'На доработке' },
  { value: 'APPROVED', label: 'Согласован' },
  { value: 'REJECTED', label: 'Отклонен' },
];

const sortColumns: Array<{ field: SortField; label: string }> = [
  { field: 'documentType', label: 'Вид документа' },
  { field: 'contractNumber', label: 'Номер' },
  { field: 'contractDate', label: 'Дата' },
  { field: 'snils', label: 'СНИЛС' },
  { field: 'documentStatus', label: 'Статус' },
];
const registryLimit = 1000;
const filterDebounceMs = 350;
const fallbackDocumentType = { id: 'PDS_CONTRACT', name: 'Договор ПДС' };
const tableGridTemplate = 'minmax(160px, .8fr) minmax(180px, 1fr) 130px minmax(150px, .8fr) 118px';

const comparableDate = (value: string) => {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (isoMatch) return isoMatch[1];

  const ruMatch = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(trimmed);
  if (ruMatch) return `${ruMatch[3]}-${ruMatch[2]}-${ruMatch[1]}`;

  return trimmed;
};

function SortHeader({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField | null;
  sortDirection: SortDirection | null;
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onSort(field)}
      aria-label={`Сортировать по колонке ${label}`}
      sx={{
        alignItems: 'center',
        bgcolor: 'transparent',
        border: 0,
        color: active ? 'text.primary' : 'text.secondary',
        cursor: 'pointer',
        display: 'flex',
        font: 'inherit',
        fontWeight: active ? 600 : 500,
        gap: 0.45,
        minWidth: 0,
        p: 0,
        textAlign: 'left',
        '&:hover': { color: 'text.primary' },
      }}
    >
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Box>
      <Box component="span" sx={{ display: 'grid', placeItems: 'center', width: 16, opacity: active ? 1 : 0 }}>
        {sortDirection === 'asc' ? <ArrowDownwardIcon sx={{ fontSize: 13 }} /> : <ArrowUpwardIcon sx={{ fontSize: 13 }} />}
      </Box>
    </Box>
  );
}

export function DocumentsListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, total, loading, error, currentUser, documentTypes, filters } = useAppSelector((state) => state.documents);
  const [documentTypeId, setDocumentTypeId] = useState(filters.documentTypeId ?? '');
  const [query, setQuery] = useState(filters.query ?? '');
  const [status, setStatus] = useState<ApprovalStatus | ''>((filters.status as ApprovalStatus | '') ?? '');
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(filters.dateTo ?? '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    setDocumentTypeId(filters.documentTypeId ?? '');
    setQuery(filters.query ?? '');
    setStatus((filters.status as ApprovalStatus | '') ?? '');
    setDateFrom(filters.dateFrom ?? '');
    setDateTo(filters.dateTo ?? '');
  }, [filters]);

  useEffect(() => {
    void dispatch(fetchDocuments({ ...filters, limit: registryLimit }));
  }, [dispatch]);

  useEffect(() => {
    if (documentTypes.length === 0) void dispatch(fetchDocumentTypes());
  }, [dispatch, documentTypes.length]);

  const availableDocumentTypes = documentTypes.length > 0 ? documentTypes : [fallbackDocumentType];

  const counters = useMemo(() => ({
    created: items.filter((document) => document.approvalStatus === 'CREATED').length,
    active: items.filter((document) => ['IN_WORK', 'ON_APPROVAL', 'NEEDS_REVISION'].includes(document.approvalStatus)).length,
    approved: items.filter((document) => document.approvalStatus === 'APPROVED').length,
    rejected: items.filter((document) => document.approvalStatus === 'REJECTED').length,
  }), [items]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');

    return items.filter((document) => {
      const contractDate = comparableDate(document.contractDate);
      if (documentTypeId && document.documentTypeId !== documentTypeId) return false;
      if (status && document.approvalStatus !== status) return false;
      if (dateFrom && contractDate < comparableDate(dateFrom)) return false;
      if (dateTo && contractDate > comparableDate(dateTo)) return false;
      if (!normalizedQuery) return true;

      return [
        document.documentType,
        document.contractNumber,
        document.contractDate,
        document.snils,
        document.documentStatus,
        document.id,
      ].some((field) => field.toLocaleLowerCase('ru-RU').includes(normalizedQuery));
    });
  }, [dateFrom, dateTo, documentTypeId, items, query, status]);

  const sortedItems = useMemo(() => {
    if (!sortField || !sortDirection) return visibleItems;

    const fieldValue = (document: DocumentRecord) => {
      if (sortField === 'documentType') return document.documentType;
      if (sortField === 'contractNumber') return document.contractNumber;
      if (sortField === 'snils') return document.snils;
      if (sortField === 'documentStatus') return document.documentStatus;
      return document.contractDate;
    };
    const direction = sortDirection === 'asc' ? 1 : -1;

    return [...visibleItems].sort((left, right) => {
      const result = fieldValue(left).localeCompare(fieldValue(right), 'ru-RU', { numeric: true });
      if (result !== 0) return result * direction;
      return left.contractNumber.localeCompare(right.contractNumber, 'ru-RU', { numeric: true });
    });
  }, [sortDirection, sortField, visibleItems]);

  const handleSort = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
      return;
    }

    if (sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }

    setSortField(null);
    setSortDirection(null);
  };

  const buildFilters = useCallback((): DocumentSearchRequest => ({
      documentTypeId: documentTypeId || undefined,
      query: query.trim() || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      offset: 0,
      limit: registryLimit,
  }), [dateFrom, dateTo, documentTypeId, query, status]);

  const applyFilters = () => {
    const nextFilters = buildFilters();
    dispatch(setFilters(nextFilters));
    void dispatch(fetchDocuments(nextFilters));
  };

  useEffect(() => {
    const nextFilters = buildFilters();
    const currentFilters = filtersRef.current;

    const filtersUnchanged =
      (currentFilters.documentTypeId ?? '') === (nextFilters.documentTypeId ?? '') &&
      (currentFilters.query ?? '') === (nextFilters.query ?? '') &&
      (currentFilters.status ?? '') === (nextFilters.status ?? '') &&
      (currentFilters.dateFrom ?? '') === (nextFilters.dateFrom ?? '') &&
      (currentFilters.dateTo ?? '') === (nextFilters.dateTo ?? '');

    if (filtersUnchanged) return undefined;

    const timeoutId = window.setTimeout(() => {
      dispatch(setFilters(nextFilters));
      void dispatch(fetchDocuments(nextFilters));
    }, filterDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [buildFilters, dispatch]);

  const resetFilters = () => {
    setDocumentTypeId('');
    setQuery('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    dispatch(setFilters({ offset: 0, limit: registryLimit }));
    void dispatch(fetchDocuments({ offset: 0, limit: registryLimit }));
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography variant="h4">Реестр документов</Typography>
        </Box>
        <Button variant="contained" startIcon={<NoteAddOutlinedIcon />} onClick={() => navigate('/documents/new')} sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}>
          Создать документ
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
        <MetricCard title="Всего в реестре" value={total || items.length} icon={DescriptionOutlinedIcon} color="#2875c7" background="#e8f1fb" />
        <MetricCard title="В процессе" value={counters.active + counters.created} icon={TaskAltOutlinedIcon} color="#8b5b12" background="#fff2d6" />
        <MetricCard title="Согласованы" value={counters.approved} icon={FactCheckOutlinedIcon} color="#17623c" background="#e6f5ed" />
        <MetricCard title="Отклонены" value={counters.rejected} icon={WarningAmberOutlinedIcon} color="#a93636" background="#fdebec" />
      </Box>

      <SectionPanel title="Фильтры">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'minmax(170px, .8fr) minmax(220px, 1.1fr) repeat(3, minmax(145px, .7fr)) auto' }, gap: 1.2, alignItems: 'center' }}>
          <TextField select size="small" label="Вид документа" value={documentTypeId} onChange={(event) => setDocumentTypeId(event.target.value)}>
            <MenuItem value="">Все виды</MenuItem>
            {availableDocumentTypes.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            label="Номер или СНИЛС"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }}
          />
          <TextField select size="small" label="Статус" value={status} onChange={(event) => setStatus(event.target.value as ApprovalStatus | '')}>
            {statusOptions.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Дата с" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="Дата по" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} InputLabelProps={{ shrink: true }} />
          <Stack direction="row" spacing={1} sx={{ gridColumn: { xs: 'auto', md: '1 / -1', xl: 'auto' } }}>
            <Button variant="contained" startIcon={<SearchIcon />} onClick={applyFilters}>Найти</Button>
            <Button variant="outlined" color="inherit" onClick={resetFilters}>Сбросить</Button>
          </Stack>
        </Box>
      </SectionPanel>

      {error && <Alert severity="error">{error}</Alert>}

      <SectionPanel
        title="Документы"
        action={<Button color="secondary" size="small" onClick={() => { void dispatch(fetchDocuments({ ...filters, limit: registryLimit })); }} sx={{ fontSize: 11.5, minWidth: 0, px: 0.5 }}>Обновить</Button>}
        sx={{ minHeight: 312 }}
      >
        {loading && sortedItems.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 7 }}><CircularProgress size={28} /></Stack>
        ) : sortedItems.length === 0 ? (
          <Stack alignItems="center" spacing={1.4} sx={{ py: 7, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Документы не найдены</Typography>
            <Button variant="contained" startIcon={<NoteAddOutlinedIcon />} onClick={() => navigate('/documents/new')}>Создать документ</Button>
          </Stack>
        ) : (
          <Stack>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: tableGridTemplate, px: 0.25, pb: 0.8, color: 'text.secondary', fontSize: 11.5 }}>
              {sortColumns.map((column) => (
                <SortHeader
                  key={column.field}
                  field={column.field}
                  label={column.label}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ))}
            </Box>
            {sortedItems.map((document) => (
              <Box
                key={document.id}
                onClick={() => navigate(`/documents/${document.id}`)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: tableGridTemplate },
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
                    <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600 }}>{document.documentType}</Typography>
                  </Box>
                </Stack>
                <Typography noWrap sx={{ fontSize: 12.5, gridColumn: { xs: 1, md: 'auto' } }}>{document.contractNumber}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 12, gridColumn: { xs: 1, md: 'auto' } }}>{formatDate(document.contractDate)}</Typography>
                <Typography noWrap sx={{ fontSize: 12.5, gridColumn: { xs: 1, md: 'auto' } }}>{document.snils}</Typography>
                <Box sx={{ justifySelf: { xs: 'end', md: 'start' }, gridColumn: { xs: 2, md: 'auto' }, gridRow: { xs: '1 / span 2', md: 'auto' } }}>
                  <DocumentStatusChip status={document.documentStatus} />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </SectionPanel>
    </Stack>
  );
}
