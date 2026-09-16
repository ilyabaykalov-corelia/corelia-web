import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Link, Paper, Stack, Typography } from '@mui/material';
import { fetchDocuments, fetchDocumentTypes } from '../store/documentsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { DocumentStatusChip } from '../components/DocumentStatusChip';
import { displayAttribute } from '../features/documents/utils/documentValidation';

export function HomePage() {
  const dispatch = useAppDispatch();
  const { items, error, loading, documentTypes } = useAppSelector(state => state.documents);
  useEffect(() => { void dispatch(fetchDocuments({ limit: 10 })); void dispatch(fetchDocumentTypes()); }, [dispatch]);
  return <Stack spacing={2}>
    <Typography variant="h4">Рабочее место документов</Typography>
    <Stack direction="row" spacing={2}><Button component={RouterLink} to="/documents/new" variant="contained">Создать документ</Button><Button component={RouterLink} to="/documents">Реестр</Button><Button component={RouterLink} to="/tasks/my">Мои задачи</Button></Stack>
    {error && <Alert severity="error">{error}</Alert>}
    <Typography variant="h6">Последние документы</Typography>
    {loading && <Typography>Загрузка…</Typography>}
    {!loading && !items.length && <Typography>Документы не найдены</Typography>}
    {items.slice(0, 10).map(document => {
      const definition = documentTypes.find(type => type.id === document.documentTypeId);
      return <Paper variant="outlined" key={document.id} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}><Link component={RouterLink} to={`/documents/${encodeURIComponent(document.id)}`}>{document.documentType}</Link><DocumentStatusChip status={document.documentStatus} /></Stack>
        {(definition?.ui.columns ?? Object.keys(document.attributes)).map(name => <Typography variant="body2" key={name}>{definition?.schema.properties[name]?.title || name}: {displayAttribute(document.attributes[name], definition?.schema.properties[name])}</Typography>)}
      </Paper>;
    })}
  </Stack>;
}
