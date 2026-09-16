import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Link, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Typography } from '@mui/material';
import { SectionPanel } from '../components/common/SectionPanel';
import { DocumentStatusChip } from '../components/DocumentStatusChip';
import { fetchDocuments, fetchDocumentTypes, setFilters } from '../store/documentsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { displayAttribute } from '../features/documents/utils/documentValidation';
import type { DocumentSearchRequest } from '../types/document';

export function DocumentsListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, total, loading, error, documentTypes, filters } = useAppSelector(state => state.documents);
  const [draft, setDraft] = useState<DocumentSearchRequest>(filters);
  const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  useEffect(() => { void dispatch(fetchDocumentTypes()); }, [dispatch]);
  useEffect(() => { setDraft(filters); void dispatch(fetchDocuments({ ...filters, limit: filters.limit ?? 25 })); }, [dispatch, filters]);
  const definition = documentTypes.find(type => type.id === draft.documentTypeId);
  const displayedDefinition = documentTypes.find(type => type.id === filters.documentTypeId);
  const columns = displayedDefinition?.ui.columns ?? [];
  const statuses = Object.entries(definition?.statuses ?? Object.assign({}, ...documentTypes.map(type => type.statuses))) as [string, string][];
  const pageSize = [10, 25, 50, 100].includes(filters.limit ?? 25) ? (filters.limit ?? 25) : 25;
  const offset = filters.offset ?? 0;
  const displayed = useMemo(() => {
    if (!sort || !displayedDefinition?.ui.sortFields.includes(sort.field)) return items;
    return [...items].sort((a, b) => {
      const left = a.attributes[sort.field], right = b.attributes[sort.field];
      const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left ?? '').localeCompare(String(right ?? ''), 'ru', { numeric: true });
      return result * (sort.direction === 'asc' ? 1 : -1);
    });
  }, [items, sort, displayedDefinition]);
  const apply = () => { setSort(null); dispatch(setFilters({ ...draft, offset: 0, limit: 25 })); };
  return <Stack spacing={2}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}><Typography variant="h4">Реестр документов</Typography><Button variant="contained" onClick={() => navigate('/documents/new')}>Создать документ</Button></Stack>
    <SectionPanel title="Фильтры">
      <Box component="form" onSubmit={event => { event.preventDefault(); apply(); }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField select label="Вид документа" size="small" value={draft.documentTypeId ?? ''} sx={{ minWidth: 220 }} onChange={event => setDraft({ documentTypeId: event.target.value, query: draft.query })}>
          <MenuItem value="">Все виды</MenuItem>{documentTypes.map(type => <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Поиск по реквизитам" value={draft.query ?? ''} onChange={event => setDraft({ ...draft, query: event.target.value })}
          helperText={definition?.ui.searchFields.map(name => definition.schema.properties[name].title || name).join(', ')} />
        <TextField select label="Статус" size="small" sx={{ minWidth: 180 }} value={draft.status ?? ''} onChange={event => setDraft({ ...draft, status: event.target.value })}>
          <MenuItem value="">Все статусы</MenuItem>{statuses.map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>)}
        </TextField>
        {definition?.ui.dateField && <>
          <TextField size="small" type="date" label={`${definition.schema.properties[definition.ui.dateField].title || 'Дата'} с`} slotProps={{ inputLabel: { shrink: true } }} value={draft.dateFrom ?? ''} onChange={event => setDraft({ ...draft, dateFrom: event.target.value })} />
          <TextField size="small" type="date" label="По" slotProps={{ inputLabel: { shrink: true } }} value={draft.dateTo ?? ''} onChange={event => setDraft({ ...draft, dateTo: event.target.value })} />
        </>}
        <Button type="submit" variant="contained">Найти</Button><Button onClick={() => { setSort(null); dispatch(setFilters({ limit: 25 })); }}>Сбросить</Button>
      </Box>
    </SectionPanel>
    {error && <Alert severity="error">{error}</Alert>}
    <SectionPanel title={`Документы (${total})`} action={<Button disabled={loading} onClick={() => void dispatch(fetchDocuments({ ...filters, limit: pageSize }))}>Обновить</Button>}>
      {loading && <CircularProgress size={24} />}
      {sort && <Typography variant="caption">Сортировка текущей страницы</Typography>}
      <TableContainer><Table size="small"><TableHead><TableRow>
        <TableCell>Документ</TableCell>
        {columns.map(name => <TableCell key={name}>{displayedDefinition?.ui.sortFields.includes(name)
          ? <TableSortLabel active={sort?.field === name} direction={sort?.direction ?? 'asc'} onClick={() => setSort({ field: name, direction: sort?.field === name && sort.direction === 'asc' ? 'desc' : 'asc' })}>{displayedDefinition.schema.properties[name].title || name}</TableSortLabel>
          : displayedDefinition?.schema.properties[name].title || name}</TableCell>)}
        {!displayedDefinition && <TableCell>Реквизиты</TableCell>}<TableCell>Статус</TableCell>
      </TableRow></TableHead><TableBody>{displayed.map(document => {
        const type = documentTypes.find(item => item.id === document.documentTypeId);
        return <TableRow key={document.id} hover>
          <TableCell><Link component={RouterLink} to={`/documents/${encodeURIComponent(document.id)}`}>{document.documentType}</Link><Typography variant="caption" sx={{ display: 'block' }}>{document.id}</Typography></TableCell>
          {columns.map(name => <TableCell key={name}>{displayAttribute(document.attributes[name], type?.schema.properties[name])}</TableCell>)}
          {!displayedDefinition && <TableCell>{(type?.ui.columns ?? Object.keys(document.attributes)).map(name => <Typography variant="body2" key={name}>{type?.schema.properties[name]?.title || name}: {displayAttribute(document.attributes[name], type?.schema.properties[name])}</Typography>)}</TableCell>}
          <TableCell><DocumentStatusChip status={document.documentStatus} /></TableCell>
        </TableRow>;
      })}</TableBody></Table></TableContainer>
      {!loading && items.length === 0 && <Typography sx={{ p: 3 }}>Документы не найдены</Typography>}
      <TablePagination component="div" count={total} page={Math.floor(offset / pageSize)} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="На странице" labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
        onPageChange={(_, page) => dispatch(setFilters({ ...filters, offset: page * pageSize, limit: pageSize }))}
        onRowsPerPageChange={event => dispatch(setFilters({ ...filters, offset: 0, limit: Number(event.target.value) }))} />
    </SectionPanel>
  </Stack>;
}
