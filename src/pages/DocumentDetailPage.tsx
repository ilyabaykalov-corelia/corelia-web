import { useEffect, useState, type PropsWithChildren } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  DownloadOutlined as DownloadOutlinedIcon,
  EditOutlined as EditOutlinedIcon,
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  SaveOutlined as SaveOutlinedIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
  WarningAmberOutlined as WarningAmberOutlinedIcon,
} from '@mui/icons-material';
import { documentsApi } from '../api/documents';
import { DocumentFileIcon } from '../components/DocumentFileIcon';
import { FilePreviewDialog } from '../components/FilePreviewDialog';
import { DocumentStatusChip } from '../components/DocumentStatusChip';
import { clearCurrentDocument, completeDocumentApproval, fetchDocumentById, fetchDocumentTypes, updateDocument } from '../store/documentsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { ApprovalDecision, ApprovalStatus, Attachment, DocumentType, UpdateDocumentRequest } from '../types/document';
import { formatDate, formatFileSize } from '../utils/format';

type ProcessStepState = 'done' | 'active' | 'wait' | 'rejected';
type AttributeField = keyof UpdateDocumentRequest;

const fallbackDocumentType: DocumentType = { id: 'PDS_CONTRACT', name: 'Договор ПДС' };
const fieldProps = { fullWidth: true, size: 'small' as const };
const snilsPattern = /^\d{3}-\d{3}-\d{3} \d{2}$/;

const formatSnils = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 11),
  ].filter(Boolean);

  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]}-${parts[1]}`;
  if (parts.length === 3) return `${parts[0]}-${parts[1]}-${parts[2]}`;
  return `${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}`;
};

function SectionPanel({ title, count, action, children }: PropsWithChildren<{ title: string; count?: number; action?: string }>) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">{title}</Typography>
          {count !== undefined && <Chip label={count} variant="outlined" size="small" sx={{ height: 25, minWidth: 25, borderRadius: 12, fontSize: 11 }} />}
        </Stack>
        {action && <Typography color="secondary.main" sx={{ fontSize: 11.5, cursor: 'pointer' }}>{action}</Typography>}
      </Stack>
      {children}
    </Paper>
  );
}

function AttributeRow({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '190px minmax(0, 1fr)' }, gap: { xs: 0.35, sm: 1.5 }, minHeight: 34, alignItems: 'start', py: 0.25 }}>
      <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{label}</Typography>
      <Box sx={{ fontSize: 12.5, minWidth: 0, overflowWrap: 'anywhere' }}>{children || '—'}</Box>
    </Box>
  );
}

function FormField({ label, required, children }: PropsWithChildren<{ label: string; required?: boolean }>) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 500, mb: 0.55 }}>
        {label} {required && <Box component="span" sx={{ color: '#d63c3c' }}>*</Box>}
      </Typography>
      {children}
    </Box>
  );
}

const processCopy: Record<ApprovalStatus, Array<{ title: string; detail: string; state: ProcessStepState }>> = {
  CREATED: [
    { title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
    { title: 'Согласование', detail: 'Ожидает решения по договору', state: 'active' },
    { title: 'Завершение', detail: 'Итоговый статус еще не присвоен', state: 'wait' },
  ],
  APPROVED: [
    { title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
    { title: 'Согласование', detail: 'Решение принято', state: 'done' },
    { title: 'Завершение', detail: 'Договор согласован', state: 'done' },
  ],
  REJECTED: [
    { title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
    { title: 'Согласование', detail: 'Решение принято', state: 'done' },
    { title: 'Завершение', detail: 'Договор отклонен', state: 'rejected' },
  ],
};

const stepStyles: Record<ProcessStepState, { borderColor: string; backgroundColor: string; color: string }> = {
  done: { borderColor: '#b9dfc5', backgroundColor: '#eef8f1', color: '#17623c' },
  active: { borderColor: '#6da0dc', backgroundColor: '#f3f8fe', color: '#245c9f' },
  wait: { borderColor: '#d8dee6', backgroundColor: '#fff', color: '#7b8796' },
  rejected: { borderColor: '#efb4b4', backgroundColor: '#fff1f1', color: '#a93636' },
};

function StepIcon({ state }: { state: ProcessStepState }) {
  if (state === 'rejected') return <WarningAmberOutlinedIcon sx={{ color: '#a93636', fontSize: 18 }} />;
  if (state === 'wait') return <RadioButtonUncheckedIcon sx={{ color: '#b2bbc6', fontSize: 17 }} />;
  return <CheckCircleIcon sx={{ color: state === 'active' ? '#245c9f' : 'primary.main', fontSize: 18 }} />;
}

export function DocumentDetailPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { currentItem: document, loading, saving, error, documentTypes } = useAppSelector((state) => state.documents);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateDocumentRequest | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (id) void dispatch(fetchDocumentById(id));
    return () => { dispatch(clearCurrentDocument()); };
  }, [dispatch, id]);

  useEffect(() => {
    if (documentTypes.length === 0) void dispatch(fetchDocumentTypes());
  }, [dispatch, documentTypes.length]);

  if (loading && !document) return <Stack alignItems="center" sx={{ py: 12 }}><CircularProgress /></Stack>;
  if (error && !document) return <Alert severity="error">{error}</Alert>;
  if (!document) return null;

  const processSteps = processCopy[document.approvalStatus];
  const actionMenuOpen = Boolean(actionAnchorEl);
  const decisionDisabled = editing || saving || document.approvalStatus !== 'CREATED';
  const availableDocumentTypes = (() => {
    const baseTypes = documentTypes.length > 0 ? documentTypes : [fallbackDocumentType];
    if (baseTypes.some((item) => item.id === document.documentTypeId)) return baseTypes;
    return [{ id: document.documentTypeId, name: document.documentType }, ...baseTypes];
  })();

  const startEdit = () => {
    setForm({
      documentTypeId: document.documentTypeId,
      contractDate: document.contractDate,
      contractNumber: document.contractNumber,
      snils: document.snils,
    });
    setValidationError(null);
    setActionError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setValidationError(null);
    setActionError(null);
    setForm(null);
  };

  const updateField = (field: AttributeField, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
    setValidationError(null);
    setActionError(null);
  };

  const updateSnils = (value: string) => {
    updateField('snils', formatSnils(value));
  };

  const validateAttributes = (payload: UpdateDocumentRequest) => {
    if (!payload.documentTypeId) return 'Выберите вид документа';
    if (!payload.contractDate) return 'Укажите дату договора';
    if (!payload.contractNumber.trim()) return 'Заполните номер договора';
    if (!payload.snils.trim()) return 'Заполните СНИЛС';
    if (payload.contractNumber.trim().length > 64) return 'Номер договора не должен превышать 64 символа';
    if (!snilsPattern.test(payload.snils.trim())) return 'СНИЛС должен быть в формате 000-000-000 00';
    return null;
  };

  const saveAttributes = async () => {
    if (!form) return;

    const formError = validateAttributes(form);
    if (formError) {
      setValidationError(formError);
      return;
    }

    try {
      const updated = await dispatch(updateDocument({
        id: document.id,
        payload: {
          documentTypeId: form.documentTypeId,
          contractDate: form.contractDate,
          contractNumber: form.contractNumber.trim(),
          snils: form.snils.trim(),
        },
      })).unwrap();

      setForm({
        documentTypeId: updated.documentTypeId,
        contractDate: updated.contractDate,
        contractNumber: updated.contractNumber,
        snils: updated.snils,
      });
      setValidationError(null);
      setActionError(null);
      setEditing(false);
    } catch (submitError) {
      setValidationError(submitError instanceof Error ? submitError.message : String(submitError));
    }
  };

  const closeActionMenu = () => {
    setActionAnchorEl(null);
  };

  const completeApproval = async (approvalStatus: ApprovalDecision) => {
    closeActionMenu();
    setActionError(null);
    setValidationError(null);

    try {
      await dispatch(completeDocumentApproval({
        id: document.id,
        payload: { approvalStatus },
      })).unwrap();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : String(submitError));
    }
  };

  const openAttachmentPreview = async (attachment: Attachment) => {
    setPreviewError(null);
    setPreviewAttachmentId(attachment.id);

    try {
      const file = await documentsApi.downloadAttachment(attachment);
      setPreviewFile(file);
    } catch (previewLoadError) {
      setPreviewError(previewLoadError instanceof Error ? previewLoadError.message : String(previewLoadError));
    } finally {
      setPreviewAttachmentId(null);
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    setPreviewError(null);
    setDownloadingAttachmentId(attachment.id);

    try {
      const file = await documentsApi.downloadAttachment(attachment);
      const url = URL.createObjectURL(file);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (downloadError) {
      setPreviewError(downloadError instanceof Error ? downloadError.message : String(downloadError));
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator="›" sx={{ fontSize: 12.5 }}>
        <Link component={RouterLink} to="/" underline="hover" color="secondary.main">Документы</Link>
        <Typography color="text.primary" sx={{ fontSize: 12.5 }}>{ document.documentType } {document.contractNumber}</Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ lg: 'center' }} justifyContent="space-between" spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
          <Typography variant="h4">{ document.documentType } {document.contractNumber}</Typography>
          <DocumentStatusChip status={document.documentStatus} />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {editing ? (
            <>
              <Button variant="outlined" color="inherit" startIcon={<CloseIcon />} onClick={cancelEdit} disabled={saving}>Отмена</Button>
              <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => void saveAttributes()} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </>
          ) : (
            <Button variant="outlined" color="inherit" startIcon={<EditOutlinedIcon />} onClick={startEdit}>Редактировать</Button>
          )}
          <Button
            id="document-actions-button"
            variant="outlined"
            color="inherit"
            endIcon={<ExpandMoreIcon />}
            disabled={saving || editing}
            aria-controls={actionMenuOpen ? 'document-actions-menu' : undefined}
            aria-haspopup="menu"
            aria-expanded={actionMenuOpen ? 'true' : undefined}
            onClick={(event) => setActionAnchorEl(event.currentTarget)}
          >
            Действия
          </Button>
          <Menu
            id="document-actions-menu"
            anchorEl={actionAnchorEl}
            open={actionMenuOpen}
            onClose={closeActionMenu}
            MenuListProps={{ 'aria-labelledby': 'document-actions-button' }}
          >
            <MenuItem disabled={decisionDisabled} onClick={() => void completeApproval('APPROVED')}>
              <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
              <ListItemText primary="Согласовать" primaryTypographyProps={{ fontSize: 12.5 }} />
            </MenuItem>
            <MenuItem disabled={decisionDisabled} onClick={() => void completeApproval('REJECTED')}>
              <ListItemIcon><WarningAmberOutlinedIcon color="error" fontSize="small" /></ListItemIcon>
              <ListItemText primary="Отклонить" primaryTypographyProps={{ fontSize: 12.5 }} />
            </MenuItem>
          </Menu>
          <IconButton aria-label="Дополнительные действия" disabled={saving} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}><MoreVertIcon /></IconButton>
        </Stack>
      </Stack>

      <Tabs value={0} variant="scrollable" scrollButtons={false} sx={{ minHeight: 42, borderBottom: 1, borderColor: 'divider', mx: -2.5, px: 2.5, '& .MuiTab-root': { minHeight: 42, minWidth: 0, px: 1.25, mr: 2, fontSize: 12.5, color: 'text.primary' } }}>
        <Tab label="Общее" />
        <Tab label={`Вложения (${document.attachments.length})`} />
        <Tab label="Процесс" />
        <Tab label="Доступ" />
      </Tabs>

      {(error || actionError || previewError) && <Alert severity="error">{actionError || previewError || error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 2.4fr) minmax(320px, 1fr)' }, gap: 2 }}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <SectionPanel title="Атрибуты карточки">
            {editing && form ? (
              <Stack spacing={1.5}>
                {validationError && <Alert severity="error">{validationError}</Alert>}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                  <FormField label="Вид документа" required>
                    <TextField {...fieldProps} select value={form.documentTypeId} onChange={(event) => updateField('documentTypeId', event.target.value)} disabled={saving}>
                      {availableDocumentTypes.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                    </TextField>
                  </FormField>
                  <FormField label="Дата договора" required>
                    <TextField {...fieldProps} type="date" value={form.contractDate} onChange={(event) => updateField('contractDate', event.target.value)} disabled={saving} />
                  </FormField>
                  <FormField label="Номер договора" required>
                    <TextField {...fieldProps} value={form.contractNumber} onChange={(event) => updateField('contractNumber', event.target.value)} placeholder="Введите номер договора" disabled={saving} inputProps={{ maxLength: 64 }} />
                  </FormField>
                  <FormField label="СНИЛС" required>
                    <TextField {...fieldProps} value={form.snils} onChange={(event) => updateSnils(event.target.value)} placeholder="Введите СНИЛС" disabled={saving} inputProps={{ maxLength: 14, inputMode: 'numeric' }} />
                  </FormField>
                </Box>
              </Stack>
            ) : (
              <>
                <AttributeRow label="Вид документа">{document.documentType}</AttributeRow>
                <AttributeRow label="Дата договора">{formatDate(document.contractDate)}</AttributeRow>
                <AttributeRow label="Номер договора">{document.contractNumber}</AttributeRow>
                <AttributeRow label="СНИЛС">{document.snils}</AttributeRow>
              </>
            )}
          </SectionPanel>

          <SectionPanel title="Бизнес-процесс">
            <Box sx={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', pb: 0.5 }}>
              {processSteps.map((step, index) => {
                const sx = stepStyles[step.state];
                return (
                  <Box key={step.title} sx={{ display: 'flex', flex: index === processSteps.length - 1 ? '0 0 170px' : '1 0 190px', minWidth: 0 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Paper variant="outlined" sx={{ minHeight: 58, p: 1, display: 'flex', gap: 0.85, alignItems: 'center', bgcolor: sx.backgroundColor, borderColor: sx.borderColor }}>
                        <StepIcon state={step.state} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 11.5, color: sx.color, fontWeight: 600 }}>{step.title}</Typography>
                          <Typography color="text.secondary" sx={{ fontSize: 10.5 }}>{step.detail}</Typography>
                        </Box>
                      </Paper>
                    </Box>
                    {index < processSteps.length - 1 && <ArrowForwardIcon sx={{ fontSize: 22, color: step.state === 'wait' ? '#b9c2cc' : sx.color, mt: 2, mx: 0.4 }} />}
                  </Box>
                );
              })}
            </Box>
          </SectionPanel>
        </Stack>

        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <SectionPanel title="Вложения" count={document.attachments.length}>
            {document.attachments.length === 0 ? (
              <Typography color="text.secondary" sx={{ fontSize: 12 }}>Файлы отсутствуют</Typography>
            ) : (
              <Stack spacing={1.35}>
                {document.attachments.map((attachment) => (
                  <Stack key={attachment.id} direction="row" spacing={1} alignItems="center">
                    <DocumentFileIcon fileName={attachment.fileName} size={28} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12 }}>{attachment.fileName}</Typography>
                      <Typography noWrap color="text.secondary" sx={{ fontSize: 10.8 }}>{formatFileSize(attachment.size)} &nbsp;•&nbsp; {formatDate(attachment.uploadedAt)}</Typography>
                    </Box>
                    <Tooltip title="Просмотреть">
                      <IconButton
                        aria-label={`Просмотреть ${attachment.fileName}`}
                        size="small"
                        disabled={previewAttachmentId === attachment.id}
                        onClick={() => void openAttachmentPreview(attachment)}
                      >
                        {previewAttachmentId === attachment.id ? <CircularProgress size={17} /> : <VisibilityOutlinedIcon sx={{ fontSize: 19 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Скачать">
                      <IconButton
                        aria-label={`Скачать ${attachment.fileName}`}
                        size="small"
                        disabled={downloadingAttachmentId === attachment.id}
                        onClick={() => void downloadAttachment(attachment)}
                      >
                        {downloadingAttachmentId === attachment.id ? <CircularProgress size={17} /> : <DownloadOutlinedIcon sx={{ fontSize: 19 }} />}
                      </IconButton>
                    </Tooltip>
                    <IconButton aria-label="Действия с файлом" size="small"><MoreVertIcon sx={{ fontSize: 18 }} /></IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionPanel>

          {/* <SectionPanel title="Сводка"> */}
          {/*   <Stack spacing={1.2}> */}
          {/*     {[ */}
          {/*       ['Документ', document.documentType], */}
          {/*       ['Дата договора', formatDate(document.contractDate)], */}
          {/*       ['Номер договора', document.contractNumber], */}
          {/*       ['СНИЛС', document.snils], */}
          {/*     ].map(([label, value]) => ( */}
          {/*       <Stack key={label} direction="row" justifyContent="space-between" spacing={1.5} sx={{ borderTop: label === 'Документ' ? 0 : 1, borderColor: 'divider', pt: label === 'Документ' ? 0 : 1 }}> */}
          {/*         <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{label}</Typography> */}
          {/*         <Typography sx={{ fontSize: 11.8, textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</Typography> */}
          {/*       </Stack> */}
          {/*     ))} */}
          {/*   </Stack> */}
          {/* </SectionPanel> */}

          <SectionPanel title="Доступ" action="Изменить">
            {[['Просмотр', '15'], ['Редактирование', '5'], ['Администрирование', '2']].map(([role, count]) => (
              <Stack key={role} direction="row" justifyContent="space-between" sx={{ py: 0.45 }}>
                <Typography sx={{ fontSize: 11.8 }}>{role}</Typography>
                <Typography sx={{ fontSize: 11.8 }}>{count}</Typography>
              </Stack>
            ))}
          </SectionPanel>
        </Stack>
      </Box>
      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
    </Stack>
  );
}
