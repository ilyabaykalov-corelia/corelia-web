import { useEffect, useRef, useState, type DragEvent, type PropsWithChildren } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  AttachFile as AttachFileIcon,
  Check as CheckIcon,
  CloudUploadOutlined as CloudUploadOutlinedIcon,
  Close as CloseIcon,
  InfoOutlined as InfoOutlinedIcon,
  PriorityHigh as PriorityHighIcon,
  SaveOutlined as SaveOutlinedIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
} from '@mui/icons-material';
import { DocumentFileIcon, getSupportedFileKind } from '../components/DocumentFileIcon';
import { FilePreviewDialog } from '../components/FilePreviewDialog';
import { createDocument, fetchDocumentTypes, uploadDocumentAttachments } from '../store/documentsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { CreateDocumentRequest, DocumentType } from '../types/document';
import { fileToAttachmentUpload } from '../utils/file';
import { formatDate, formatFileSize, todayIsoDate } from '../utils/format';

const maxFileSize = 100 * 1024 * 1024;
const supportedFormats = '.pdf,.docx,.xlsx';
const fallbackDocumentType: DocumentType = { id: 'PDS_CONTRACT', name: 'Договор ПДС' };

const initialForm: CreateDocumentRequest = {
  documentTypeId: fallbackDocumentType.id,
  contractDate: todayIsoDate(),
  contractNumber: '',
  snils: '',
};

const steps = ['Атрибуты договора', 'Вложения', 'Подтверждение'];
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

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '210px minmax(0, 1fr)' }, gap: { xs: 0.35, sm: 1.5 }, py: 0.75, borderBottom: 1, borderColor: '#edf0f2' }}>
      <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
    </Box>
  );
}

function FileRows({ files, onPreview, onRemove }: { files: File[]; onPreview: (file: File) => void; onRemove?: (index: number) => void }) {
  return (
    <Stack>
      {files.map((file, index) => {
        const kind = getSupportedFileKind(file.name);
        return (
          <Stack key={`${file.name}-${file.lastModified}`} direction="row" alignItems="center" spacing={1.2} sx={{ py: 1.2, borderTop: index === 0 ? 0 : 1, borderColor: 'divider' }}>
            <DocumentFileIcon fileName={file.name} size={30} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 500 }}>{file.name}</Typography>
              <Typography color="text.secondary" sx={{ fontSize: 10.8 }}>{kind?.toUpperCase()} · {formatFileSize(file.size)}</Typography>
            </Box>
            {onRemove && (
              <Box sx={{ width: { xs: 56, sm: 145 }, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.8 }}>
                <LinearProgress variant="determinate" value={100} sx={{ flex: 1, height: 7, borderRadius: 3, bgcolor: '#e6ece8' }} />
                <Typography color="text.secondary" sx={{ fontSize: 10.5 }}>100%</Typography>
              </Box>
            )}
            <Tooltip title="Просмотреть файл">
              <IconButton size="small" aria-label={`Просмотреть ${file.name}`} onClick={() => onPreview(file)}><VisibilityOutlinedIcon sx={{ fontSize: 19 }} /></IconButton>
            </Tooltip>
            {onRemove && (
              <Tooltip title="Удалить файл">
                <IconButton size="small" aria-label={`Удалить ${file.name}`} onClick={() => onRemove(index)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

export function DocumentCreatePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { documentTypes, saving, error } = useAppSelector((state) => state.documents);
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<CreateDocumentRequest>(initialForm);
  const [files, setFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const availableDocumentTypes = documentTypes.length > 0 ? documentTypes : [fallbackDocumentType];
  const selectedDocumentType = availableDocumentTypes.find((item) => item.id === form.documentTypeId) ?? fallbackDocumentType;

  useEffect(() => {
    if (documentTypes.length === 0) void dispatch(fetchDocumentTypes());
  }, [dispatch, documentTypes.length]);

  useEffect(() => {
    if (documentTypes.length === 0) return;
    if (documentTypes.some((item) => item.id === form.documentTypeId)) return;
    setForm((current) => ({ ...current, documentTypeId: documentTypes[0].id }));
  }, [documentTypes, form.documentTypeId]);

  const updateField = (field: keyof CreateDocumentRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  };

  const updateSnils = (value: string) => {
    updateField('snils', formatSnils(value));
  };

  const addFiles = (incoming: FileList | File[]) => {
    const incomingFiles = Array.from(incoming);
    const invalidFiles = incomingFiles.filter((file) => !getSupportedFileKind(file.name));
    const oversizedFiles = incomingFiles.filter((file) => file.size > maxFileSize);
    const acceptedFiles = incomingFiles.filter((file) => getSupportedFileKind(file.name) && file.size <= maxFileSize);

    setFiles((current) => {
      const keys = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      return [...current, ...acceptedFiles.filter((file) => !keys.has(`${file.name}:${file.size}:${file.lastModified}`))];
    });

    if (invalidFiles.length > 0) {
      setValidationError(`Не поддерживается формат: ${invalidFiles.map((file) => file.name).join(', ')}. Разрешены только PDF, DOCX и XLSX.`);
    } else if (oversizedFiles.length > 0) {
      setValidationError(`Размер файла не должен превышать 100 МБ: ${oversizedFiles.map((file) => file.name).join(', ')}`);
    } else {
      setValidationError(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  };

  const validateAttributes = () => {
    if (!form.documentTypeId) return 'Выберите вид документа';
    if (!form.contractDate) return 'Укажите дату договора';
    if (!form.contractNumber.trim()) return 'Заполните номер договора';
    if (!form.snils.trim()) return 'Заполните СНИЛС';
    if (form.contractNumber.trim().length > 64) return 'Номер договора не должен превышать 64 символа';
    if (!snilsPattern.test(form.snils.trim())) return 'СНИЛС должен быть в формате 000-000-000 00';
    return null;
  };

  const moveNext = () => {
    const stepError = activeStep === 0 ? validateAttributes() : null;
    if (stepError) {
      setValidationError(stepError);
      return;
    }
    setValidationError(null);
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSave = async () => {
    const formError = validateAttributes();
    if (formError) {
      setValidationError(formError);
      return;
    }

    try {
      const created = await dispatch(createDocument({
        documentTypeId: form.documentTypeId,
        contractDate: form.contractDate,
        contractNumber: form.contractNumber.trim(),
        snils: form.snils.trim(),
      })).unwrap();

      if (files.length > 0) {
        const attachments = await Promise.all(files.map(fileToAttachmentUpload));
        await dispatch(uploadDocumentAttachments({ documentId: created.id, attachments })).unwrap();
      }

      navigate(`/documents/${created.id}`);
    } catch (submitError) {
      setValidationError(submitError instanceof Error ? submitError.message : String(submitError));
    }
  };

  return (
    <Box sx={{ mx: { xs: 0, md: -0.5 }, mb: -2.5 }}>
      <Stack spacing={2}>
        <Breadcrumbs separator="›" sx={{ fontSize: 12.5 }}>
          <Link component={RouterLink} to="/" underline="hover" color="text.secondary">Документы</Link>
          <Typography color="text.primary" sx={{ fontSize: 12.5 }}>Создать документ</Typography>
        </Breadcrumbs>

        <Typography variant="h4">Создание документа</Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', overflowX: 'auto', pb: 0.7 }}>
          {steps.map((step, index) => {
            const completed = index < activeStep;
            const warning = completed && index === 0 && Boolean(validateAttributes());
            const statusLabel = index === activeStep ? 'текущий шаг' : warning ? 'требует внимания' : completed ? 'завершен' : 'не начат';

            return (
              <Box key={step} sx={{ display: 'flex', alignItems: 'center', flex: '0 0 auto', minWidth: 0 }}>
                <ButtonBase
                  onClick={() => { setActiveStep(index); setValidationError(null); }}
                  aria-current={activeStep === index ? 'step' : undefined}
                  aria-label={`${index + 1}. ${step}: ${statusLabel}`}
                  sx={{ borderRadius: 1, p: 0.45, flexShrink: 0, '&:focus-visible': { outline: '2px solid', outlineColor: warning ? '#d49a14' : 'primary.main' } }}
                >
                  <Box sx={{
                    width: 31,
                    height: 31,
                    borderRadius: '50%',
                    border: 1,
                    borderColor: warning ? '#d49a14' : index <= activeStep ? 'primary.main' : '#d5dce4',
                    bgcolor: warning ? '#fff1c7' : completed ? '#e5f5ea' : index === activeStep ? 'primary.main' : '#fff',
                    color: warning ? '#9a6700' : completed ? 'primary.main' : index === activeStep ? '#fff' : 'text.primary',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 13,
                    flexShrink: 0,
                  }}>
                    {warning ? <PriorityHighIcon sx={{ fontSize: 19 }} /> : completed ? <CheckIcon sx={{ fontSize: 18 }} /> : index + 1}
                  </Box>
                  <Typography sx={{ ml: 1.1, fontSize: 12, fontWeight: index === activeStep ? 600 : 400, whiteSpace: 'nowrap', color: index <= activeStep ? 'text.primary' : 'text.secondary' }}>{step}</Typography>
                </ButtonBase>
                {index < steps.length - 1 && <ArrowForwardIcon sx={{ color: warning ? '#d49a14' : completed ? 'primary.main' : '#b9c2cc', fontSize: 21, flex: '0 0 auto', mx: { xs: 0.75, md: 1.25 } }} />}
              </Box>
            );
          })}
        </Box>

        {(validationError || error) && <Alert severity="error">{validationError || error}</Alert>}

        {activeStep === 0 && (
          <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
            <Typography variant="h6" sx={{ mb: 1.6 }}>Атрибуты карточки</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <FormField label="Вид документа" required>
                <TextField {...fieldProps} select value={form.documentTypeId} onChange={(event) => updateField('documentTypeId', event.target.value)}>
                  {availableDocumentTypes.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                </TextField>
              </FormField>
              <FormField label="Дата договора" required>
                <TextField {...fieldProps} type="date" value={form.contractDate} onChange={(event) => updateField('contractDate', event.target.value)} />
              </FormField>
              <FormField label="Номер договора" required>
                <TextField {...fieldProps} value={form.contractNumber} onChange={(event) => updateField('contractNumber', event.target.value)} placeholder="Введите номер договора" inputProps={{ maxLength: 64 }} />
              </FormField>
              <FormField label="СНИЛС" required>
                <TextField {...fieldProps} value={form.snils} onChange={(event) => updateSnils(event.target.value)} placeholder="Введите СНИЛС" inputProps={{ maxLength: 14, inputMode: 'numeric' }} />
              </FormField>
            </Box>
          </Paper>
        )}

        {activeStep === 1 && (
          <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.6 }}>
              <Typography variant="h6">Вложения</Typography>
              <Chip label={files.length} size="small" sx={{ height: 23 }} />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: files.length > 0 ? 'minmax(0, 1.15fr) minmax(360px, .85fr)' : '1fr' }, gap: 2 }}>
              <Box>
                <Box
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }}
                  onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ minHeight: 300, border: '1px dashed', borderColor: dragActive ? 'primary.main' : '#aab7c7', bgcolor: dragActive ? '#f1f9f4' : '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', px: 2, textAlign: 'center', outline: 'none', '&:focus-visible': { boxShadow: '0 0 0 3px rgba(20,148,71,.14)' } }}
                >
                  <Stack alignItems="center" spacing={0.8}>
                    <CloudUploadOutlinedIcon sx={{ color: '#548bc9', fontSize: 56 }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Перетащите файлы сюда</Typography>
                    <Typography sx={{ fontSize: 13 }}>или нажмите для выбора файлов</Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 11, mt: '20px !important' }}>PDF, DOCX, XLSX до 100 МБ</Typography>
                  </Stack>
                  <input ref={fileInputRef} type="file" multiple hidden accept={supportedFormats} onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} />
                </Box>
                <Stack alignItems="center" sx={{ mt: 1.4 }}>
                  <Button variant="outlined" color="inherit" startIcon={<AttachFileIcon />} onClick={() => fileInputRef.current?.click()}>Выбрать файлы</Button>
                </Stack>
              </Box>

              {files.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.5, alignSelf: 'stretch' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>Файлы к загрузке</Typography>
                  <FileRows files={files} onPreview={setPreviewFile} onRemove={(index) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} />
                  <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info" sx={{ mt: 1.5, bgcolor: '#f2f7fd', color: '#4f6d95', border: 1, borderColor: '#e1ebf7', '& .MuiAlert-message': { fontSize: 11.5 } }}>
                    Нажмите на значок глаза, чтобы открыть содержимое файла
                  </Alert>
                </Paper>
              )}
            </Box>
          </Paper>
        )}

        {activeStep === 2 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(340px, .8fr)' }, gap: 2, alignItems: 'start' }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Карточка договора</Typography>
              <SummaryRow label="Вид документа" value={selectedDocumentType.name} />
              <SummaryRow label="Дата договора" value={formatDate(form.contractDate)} />
              <SummaryRow label="Номер договора" value={form.contractNumber} />
              <SummaryRow label="СНИЛС" value={form.snils} />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="h6">Вложения</Typography>
                <Chip label={files.length} size="small" sx={{ height: 23 }} />
              </Stack>
              {files.length > 0 ? <FileRows files={files} onPreview={setPreviewFile} /> : <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center', fontSize: 12.5 }}>Вложения не добавлены</Typography>}
            </Paper>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ position: 'sticky', bottom: 0, zIndex: 3, bgcolor: 'rgba(255,255,255,.98)', borderTop: 1, borderColor: 'divider', mx: { xs: -2, md: -2 }, px: { xs: 2, md: 2.5 }, py: 1.5 }}>
          <Button variant="outlined" color="inherit" onClick={() => navigate('/')} disabled={saving}>Отмена</Button>
          <Stack direction="row" spacing={1.25} justifyContent="flex-end">
            {activeStep > 0 && <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => { setActiveStep((current) => current - 1); setValidationError(null); }} disabled={saving}>Назад</Button>}
            {activeStep < steps.length - 1 ? (
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={moveNext}>Далее</Button>
            ) : (
              <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => void handleSave()} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
            )}
          </Stack>
        </Stack>
      </Stack>

      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
    </Box>
  );
}
