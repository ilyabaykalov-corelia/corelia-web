import { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { ApiError } from '../api/client';
import { workflowsApi } from '../api/workflows';
import { FormField } from '../components/common/FormField';
import { CoreliaBpmnModeler } from '../components/workflows/CoreliaBpmnModeler';
import type { WorkflowActiveDocument, WorkflowAuditEvent, WorkflowDefinition, WorkflowDraft, WorkflowRuntime, WorkflowValidationError, WorkflowView } from '../types/workflow';

/** Показывает опубликованные процессы без раскрытия provider-specific данных. */
export function WorkflowAdminPage() {
  const [items, setItems] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkflowDraft | WorkflowView | null>(null);
  const [draftXml, setDraftXml] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editEnabled, setEditEnabled] = useState(true);
  const [audit, setAudit] = useState<WorkflowAuditEvent[]>([]);
  const [validationErrors, setValidationErrors] = useState<WorkflowValidationError[]>([]);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [editingPublished, setEditingPublished] = useState(false);
  const [runtime, setRuntime] = useState<WorkflowRuntime | null>(null);
  const [activeDocuments, setActiveDocuments] = useState<WorkflowActiveDocument[] | null>(null);
  const [activeDocumentsTitle, setActiveDocumentsTitle] = useState('Активные экземпляры');

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
      setReadOnly(false); setEditingPublished(false); setRuntime(null);
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
  const openWorkflow = (key: string) => {
    setSaving(true); setError(null); setRuntime(null); setEditingPublished(false);
    void workflowsApi.view(key).then((loaded: WorkflowView) => {
      setDraft(loaded); setDraftXml(loaded.bpmnXml); setReadOnly(loaded.readOnly); setAudit([]); setValidationErrors([]); setValidationSuccess(null);
      return loaded.readOnly ? workflowsApi.runtime(loaded.key).then(setRuntime) : undefined;
    }).catch(showError).finally(() => setSaving(false));
  };
  const showActiveDocuments = (key: string, activityId?: string) => {
    setSaving(true); setError(null);
    void workflowsApi.activeDocuments(key, activityId).then((response) => {
      setActiveDocuments(response.items);
      setActiveDocumentsTitle(activityId ? `Активные документы: ${activityId}` : 'Активные экземпляры');
    }).catch(showError).finally(() => setSaving(false));
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
    const publishing = editingPublished
      ? workflowsApi.publishDraft(draft.key, { name: draft.name, bpmnXml: draftXml, expectedPublishedVersion: (draft as WorkflowView).publishedVersion })
      : workflowsApi.saveDraft(draft.key, draft.name, draftXml).then((saved) => {
          setDraft(saved); return workflowsApi.publishDraft(saved.key);
        });
    void publishing.then((result) => {
      setValidationErrors(result.errors ?? []);
      if (result.published) {
        setValidationSuccess(`Процесс опубликован: версия ${result.version}.`);
        return Promise.all([reloadDefinitions(), workflowsApi.view(draft.key)]).then(([, current]) => {
          setDraft(current); setDraftXml(current.bpmnXml); setReadOnly(current.readOnly); setEditingPublished(false);
        });
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
        <FormField label="Ключ процесса" required>
          <TextField required size="small" disabled={!editEnabled} value={newKey} onChange={(event) => setNewKey(event.target.value)} slotProps={{ htmlInput: { pattern: '[A-Za-z][A-Za-z0-9_-]{0,127}' } }} />
        </FormField>
        <FormField label="Название процесса" required>
          <TextField required size="small" disabled={!editEnabled} value={newName} onChange={(event) => setNewName(event.target.value)} sx={{ minWidth: 260 }} />
        </FormField>
        <Button type="submit" variant="contained" disabled={saving || !editEnabled} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}>Создать процесс</Button>
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
              <TableCell><Button size="small" onClick={() => openWorkflow(workflow.key)}>{workflow.name}</Button></TableCell><TableCell>{workflow.key}</TableCell><TableCell>{workflow.publishedVersion}</TableCell>
              <TableCell>{workflow.draft ? 'Есть' : 'Нет'}</TableCell><TableCell>{workflow.status}</TableCell>
              <TableCell>{workflow.lastPublishedAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(workflow.lastPublishedAt)) : '—'}</TableCell>
              <TableCell>{workflow.publishedBy ?? '—'}</TableCell><TableCell align="right"><Button size="small" onClick={() => showActiveDocuments(workflow.key)} disabled={workflow.activeInstances === 0}>{workflow.activeInstances}</Button></TableCell>
            </TableRow>)}</TableBody>
          </Table>
          {items.length === 0 && <Typography color="text.secondary" sx={{ p: 3 }}>Опубликованные процессы не найдены.</Typography>}
        </TableContainer>
      )}
      <Stack spacing={1}>
        <Typography variant="h5">Редактор BPMN</Typography>
        {draft ? <>
          <Typography color="text.secondary">{readOnly ? 'Просмотр BPMN' : editingPublished ? `Редактирование версии ${(draft as WorkflowView).publishedVersion}` : 'Черновик'}: {draft.name} ({draft.key})</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {readOnly && <Button variant="contained" onClick={() => { setReadOnly(false); setEditingPublished(true); }} disabled={saving || !editEnabled}>Редактировать</Button>}
            {!readOnly && !editingPublished && <><Button variant="contained" onClick={saveDraft} disabled={saving || !editEnabled}>Сохранить черновик</Button>
            <Button onClick={validateDraft} disabled={saving || !editEnabled}>Проверить BPMN</Button>
            </>}
            {!readOnly && <Button onClick={publishDraft} disabled={saving || !editEnabled}>Опубликовать</Button>}
            <Button onClick={exportDraft} disabled={saving}>Экспорт BPMN</Button>
            {!readOnly && !editingPublished && <Button component="label" disabled={saving || !editEnabled}>Импорт BPMN<input hidden type="file" accept=".bpmn,.xml,application/xml,text/xml" onChange={(event) => importDraft(event.target.files?.[0])} /></Button>}
            <Button onClick={loadAudit} disabled={saving}>Журнал</Button>
          </Stack>
          {audit.length > 0 && <Paper variant="outlined" sx={{ p: 1 }}><Typography variant="subtitle2">Журнал процесса</Typography>{audit.map((event) => <Typography key={`${event.event}-${event.at}`} variant="body2">{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.at))}: {event.event} — {event.by}</Typography>)}</Paper>}
          {validationSuccess && <Alert severity="success">{validationSuccess}</Alert>}
          {validationErrors.length > 0 && <Alert severity="error">{validationErrors.map((item) => <Typography key={`${item.code}-${item.message}`} variant="body2">{item.message}</Typography>)}</Alert>}
          {readOnly ? <Alert severity="info">Процесс развёрнут из configuration release или опубликован без черновика.</Alert> : !editEnabled && <Alert severity="info">Редактирование BPMN отключено конфигурацией.</Alert>}
          <CoreliaBpmnModeler bpmnXml={draftXml} onChange={readOnly ? undefined : setDraftXml} readOnly={readOnly || !editEnabled}
            activityStats={runtime?.activities} onActivityClick={(activityId) => showActiveDocuments(draft.key, activityId)} />
        </> : <Alert severity="info">Создайте процесс, чтобы открыть его BPMN-черновик.</Alert>}
      </Stack>
      <Dialog open={activeDocuments !== null} onClose={() => setActiveDocuments(null)} fullWidth maxWidth="sm">
        <DialogTitle>{activeDocumentsTitle}</DialogTitle>
        <DialogContent dividers>
          {activeDocuments?.length === 0 ? <Typography color="text.secondary">Доступные документы не найдены.</Typography> : <List disablePadding>{activeDocuments?.map((document) => <ListItemButton key={document.id} onClick={() => window.open(`/documents/${document.id}`, '_blank', 'noopener,noreferrer')}>
            <ListItemText primary={document.typeName} secondary={`${document.statusLabel} · ${document.id}`} />
          </ListItemButton>)}</List>}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
