import { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { ApiError } from '../api/client';
import { workflowsApi } from '../api/workflows';
import { CoreliaBpmnModeler } from '../components/workflows/CoreliaBpmnModeler';
import type { WorkflowAuditEvent, WorkflowDefinition, WorkflowDraft, WorkflowValidationError } from '../types/workflow';

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
  const [editEnabled, setEditEnabled] = useState(true);
  const [audit, setAudit] = useState<WorkflowAuditEvent[]>([]);
  const [validationErrors, setValidationErrors] = useState<WorkflowValidationError[]>([]);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);

  const reloadDefinitions = () => workflowsApi.list().then((response) => {
    setItems(response.items); setEditEnabled(response.editEnabled);
  });
  useEffect(() => {
    void reloadDefinitions().catch((reason: unknown) => {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить процессы');
    }).finally(() => setLoading(false));
  }, []);

  const showError = (reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не удалось выполнить запрос');
  const createDraft = () => {
    setSaving(true); setError(null);
    void workflowsApi.create(newKey, newName).then((created) => {
      setDraft(created); setDraftXml(created.bpmnXml); setNewKey(''); setNewName('');
    }).catch(showError).finally(() => setSaving(false));
  };
  const loadAudit = () => {
    if (!draft) return;
    setSaving(true); setError(null);
    void workflowsApi.audit(draft.key).then((response) => setAudit(response.items)).catch(showError).finally(() => setSaving(false));
  };
  const saveDraft = () => {
    if (!draft) return;
    setSaving(true); setError(null);
    void workflowsApi.saveDraft(draft.key, draft.name, draftXml).then((saved) => {
      setDraft(saved); setDraftXml(saved.bpmnXml);
    }).catch(showError).finally(() => setSaving(false));
  };
  const openDraft = (key: string) => {
    setSaving(true); setError(null);
    void workflowsApi.draft(key).then((loaded) => { setDraft(loaded); setDraftXml(loaded.bpmnXml); setAudit([]); setValidationErrors([]); setValidationSuccess(null); }).catch(showError).finally(() => setSaving(false));
  };
  const validateDraft = () => {
    if (!draft) return;
    setSaving(true); setError(null); setValidationErrors([]); setValidationSuccess(null);
    void workflowsApi.saveDraft(draft.key, draft.name, draftXml).then((saved) => {
      setDraft(saved); return workflowsApi.validateDraft(saved.key);
    }).then((result) => {
      setValidationErrors(result.errors ?? []);
      if (result.valid) setValidationSuccess('BPMN-процесс успешно проверен и готов к публикации.');
    }).catch(showError).finally(() => setSaving(false));
  };
  const publishDraft = () => {
    if (!draft) return;
    setSaving(true); setError(null); setValidationErrors([]); setValidationSuccess(null);
    void workflowsApi.saveDraft(draft.key, draft.name, draftXml).then((saved) => {
      setDraft(saved); return workflowsApi.publishDraft(saved.key);
    }).then((result) => {
      setValidationErrors(result.errors ?? []);
      if (result.published) {
        setValidationSuccess(`Процесс опубликован: версия ${result.version}.`);
        return reloadDefinitions();
      }
      return undefined;
    }).catch(showError).finally(() => setSaving(false));
  };
  const exportDraft = () => {
    if (!draft) return;
    setSaving(true); setError(null);
    void workflowsApi.exportDraft(draft.key).then((exported) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([exported.bpmnXml], { type: 'application/xml' }));
      link.download = `${exported.key}.bpmn20.xml`; link.click(); URL.revokeObjectURL(link.href);
    }).catch(showError).finally(() => setSaving(false));
  };
  const importDraft = (file: File | undefined) => {
    if (!draft || !file) return;
    setSaving(true); setError(null);
    void file.text().then((bpmnXml) => workflowsApi.importDraft(draft.key, draft.name, bpmnXml)).then((saved) => {
      setDraft(saved); setDraftXml(saved.bpmnXml);
    }).catch(showError).finally(() => setSaving(false));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Процессы</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} onSubmit={(event) => { event.preventDefault(); createDraft(); }}>
        <TextField required disabled={!editEnabled} label="Ключ процесса" value={newKey} onChange={(event) => setNewKey(event.target.value)} slotProps={{ htmlInput: { pattern: '[A-Za-z][A-Za-z0-9_-]{0,127}' } }} />
        <TextField required disabled={!editEnabled} label="Название процесса" value={newName} onChange={(event) => setNewName(event.target.value)} sx={{ minWidth: 260 }} />
        <Button type="submit" variant="contained" disabled={saving || !editEnabled}>Создать процесс</Button>
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
              <TableCell>{workflow.draft ? <Button size="small" onClick={() => openDraft(workflow.key)}>{workflow.name}</Button> : workflow.name}</TableCell><TableCell>{workflow.key}</TableCell><TableCell>{workflow.publishedVersion}</TableCell>
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
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={saveDraft} disabled={saving || !editEnabled}>Сохранить черновик</Button>
            <Button onClick={validateDraft} disabled={saving || !editEnabled}>Проверить BPMN</Button>
            <Button onClick={publishDraft} disabled={saving || !editEnabled}>Опубликовать</Button>
            <Button onClick={exportDraft} disabled={saving}>Экспорт BPMN</Button>
            <Button component="label" disabled={saving || !editEnabled}>Импорт BPMN<input hidden type="file" accept=".bpmn,.xml,application/xml,text/xml" onChange={(event) => importDraft(event.target.files?.[0])} /></Button>
            <Button onClick={loadAudit} disabled={saving}>Журнал</Button>
          </Stack>
          {audit.length > 0 && <Paper variant="outlined" sx={{ p: 1 }}><Typography variant="subtitle2">Журнал процесса</Typography>{audit.map((event) => <Typography key={`${event.event}-${event.at}`} variant="body2">{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.at))}: {event.event} — {event.by}</Typography>)}</Paper>}
          {validationSuccess && <Alert severity="success">{validationSuccess}</Alert>}
          {validationErrors.length > 0 && <Alert severity="error">{validationErrors.map((item) => <Typography key={`${item.code}-${item.message}`} variant="body2">{item.message}</Typography>)}</Alert>}
          {!editEnabled && <Alert severity="info">Редактирование BPMN отключено конфигурацией.</Alert>}
          <CoreliaBpmnModeler bpmnXml={draftXml} onChange={setDraftXml} readOnly={!editEnabled} />
        </> : <Alert severity="info">Создайте процесс, чтобы открыть его BPMN-черновик.</Alert>}
      </Stack>
    </Stack>
  );
}
