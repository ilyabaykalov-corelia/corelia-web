import { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { ApiError } from '../api/client';
import { workflowsApi } from '../api/workflows';
import { CoreliaBpmnModeler } from '../components/workflows/CoreliaBpmnModeler';
import type { WorkflowDefinition, WorkflowDraft } from '../types/workflow';

/** Показывает опубликованные процессы без раскрытия provider-specific данных. */
export function WorkflowAdminPage() {
  const [items, setItems] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkflowDraft | null>(null);
  const [draftXml, setDraftXml] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void workflowsApi.list()
      .then((response) => { if (active) setItems(response.items); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить процессы');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const showError = (reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не удалось выполнить запрос');
  const createDraft = () => {
    setSaving(true); setError(null);
    void workflowsApi.create(newKey, newName).then((created) => {
      setDraft(created); setDraftXml(created.bpmnXml); setNewKey(''); setNewName('');
    }).catch(showError).finally(() => setSaving(false));
  };
  const saveDraft = () => {
    if (!draft) return;
    setSaving(true); setError(null);
    void workflowsApi.saveDraft(draft.key, draft.name, draftXml).then((saved) => {
      setDraft(saved); setDraftXml(saved.bpmnXml);
    }).catch(showError).finally(() => setSaving(false));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Процессы</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} onSubmit={(event) => { event.preventDefault(); createDraft(); }}>
        <TextField required label="Ключ процесса" value={newKey} onChange={(event) => setNewKey(event.target.value)} slotProps={{ htmlInput: { pattern: '[A-Za-z][A-Za-z0-9_-]{0,127}' } }} />
        <TextField required label="Название процесса" value={newName} onChange={(event) => setNewName(event.target.value)} sx={{ minWidth: 260 }} />
        <Button type="submit" variant="contained" disabled={saving}>Создать процесс</Button>
      </Stack>
      {loading ? <Stack sx={{ py: 5, alignItems: 'center' }}><CircularProgress /></Stack> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Опубликованные процессы">
            <TableHead><TableRow>
              <TableCell>Название</TableCell><TableCell>Ключ</TableCell><TableCell>Опубликованная версия</TableCell>
              <TableCell>Черновик</TableCell><TableCell>Статус</TableCell><TableCell>Последняя публикация</TableCell>
              <TableCell>Опубликовал</TableCell><TableCell align="right">Активные экземпляры</TableCell>
            </TableRow></TableHead>
            <TableBody>{items.map((workflow) => <TableRow key={workflow.key}>
              <TableCell>{workflow.name}</TableCell><TableCell>{workflow.key}</TableCell><TableCell>{workflow.publishedVersion}</TableCell>
              <TableCell>{workflow.draft ? 'Есть' : 'Нет'}</TableCell><TableCell>{workflow.status}</TableCell>
              <TableCell>{workflow.lastPublishedAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(workflow.lastPublishedAt)) : '—'}</TableCell>
              <TableCell>{workflow.publishedBy ?? '—'}</TableCell><TableCell align="right">{workflow.activeInstances}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
          {items.length === 0 && <Typography color="text.secondary" sx={{ p: 3 }}>Опубликованные процессы не найдены.</Typography>}
        </TableContainer>
      )}
      <Stack spacing={1}>
        <Typography variant="h5">Редактор BPMN</Typography>
        {draft ? <>
          <Typography color="text.secondary">Черновик: {draft.name} ({draft.key})</Typography>
          <Stack direction="row"><Button variant="contained" onClick={saveDraft} disabled={saving}>Сохранить черновик</Button></Stack>
          <CoreliaBpmnModeler bpmnXml={draftXml} onChange={setDraftXml} />
        </> : <Alert severity="info">Создайте процесс, чтобы открыть его BPMN-черновик.</Alert>}
      </Stack>
    </Stack>
  );
}
