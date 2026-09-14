import { useEffect, useRef, useState, type ChangeEvent, type PropsWithChildren } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
	Alert,
	Box,
	Breadcrumbs,
	Button,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
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
	Add as AddIcon,
	CheckCircle as CheckCircleIcon,
	Close as CloseIcon,
	EditOutlined as EditOutlinedIcon,
	ExpandMore as ExpandMoreIcon,
	MoreVert as MoreVertIcon,
	RadioButtonUnchecked as RadioButtonUncheckedIcon,
	SaveOutlined as SaveOutlinedIcon,
	WarningAmberOutlined as WarningAmberOutlinedIcon,
} from '@mui/icons-material';
import { FormField } from '../components/common/FormField';
import { SectionPanel } from '../components/common/SectionPanel';
import { FilePreviewDialog } from '../components/FilePreviewDialog';
import { DocumentStatusChip } from '../components/DocumentStatusChip';
import { AttachmentDocumentFilesList } from '../features/documents/components/DocumentFilesList';
import { formatSnils, validateDocumentAttributes } from '../features/documents/utils/documentValidation';
import { documentsApi } from '../api/documents';
import { clearCurrentDocument, completeDocumentApproval, deleteDocumentAttachment, downloadDocumentAttachment, fetchDocumentById, fetchDocumentTypes, replaceDocumentAttachment, updateDocument, uploadDocumentAttachments } from '../store/documentsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { ApprovalStatus, Attachment, DocumentRecord, DocumentVersion, DocumentType, DocumentWorkflowAction, UpdateDocumentRequest } from '../types/document';
import { fileToAttachmentUpload } from '../utils/file';
import { formatDate, formatDateTime } from '../utils/format';

type ProcessStepState = 'done' | 'active' | 'wait' | 'rejected';
type AttributeField = keyof UpdateDocumentRequest;
type ProcessStep = { title: string; detail: string; state: ProcessStepState; returnFromPrevious?: boolean };

const fallbackDocumentType: DocumentType = { id: 'PDS_CONTRACT', name: 'Договор ПДС' };
const fieldProps = { fullWidth: true, size: 'small' as const };

function AttributeRow({ label, children }: PropsWithChildren<{ label: string }>) {
	return (
		<Box sx={ { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '190px minmax(0, 1fr)' }, gap: { xs: 0.35, sm: 1.5 }, minHeight: 34, alignItems: 'start', py: 0.25 } }>
			<Typography color="text.secondary" sx={ { fontSize: 11.5 } }>{ label }</Typography>
			<Box sx={ { fontSize: 12.5, minWidth: 0, overflowWrap: 'anywhere' } }>{ children || '—' }</Box>
		</Box>
	);
}

const processCopy: Record<ApprovalStatus, ProcessStep[]> = {
	CREATED: [
		{ title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
		{ title: 'Оператор', detail: 'Ожидает взятия в работу', state: 'active' },
		{ title: 'Согласование', detail: 'Еще не направлен согласующему', state: 'wait' },
		{ title: 'Завершение', detail: 'Итоговый статус еще не присвоен', state: 'wait' },
	],
	IN_WORK: [
		{ title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
		{ title: 'Оператор', detail: 'Проверка и редактирование документа', state: 'active' },
		{ title: 'Согласование', detail: 'Еще не направлен согласующему', state: 'wait' },
		{ title: 'Завершение', detail: 'Итоговый статус еще не присвоен', state: 'wait' },
	],
	ON_APPROVAL: [
		{ title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
		{ title: 'Оператор', detail: 'Документ подготовлен', state: 'done' },
		{ title: 'Согласование', detail: 'Ожидает решения согласующего', state: 'active' },
		{ title: 'Завершение', detail: 'Итоговый статус еще не присвоен', state: 'wait' },
	],
	NEEDS_REVISION: [
		{ title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
		{ title: 'Оператор', detail: 'Документ был направлен на согласование', state: 'done' },
		{ title: 'Согласование', detail: 'Согласующий вернул документ', state: 'rejected' },
		{ title: 'Доработка', detail: 'Оператор исправляет замечания', state: 'active', returnFromPrevious: true },
		{ title: 'Завершение', detail: 'Итоговый статус еще не присвоен', state: 'wait' },
	],
	APPROVED: [
		{ title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
		{ title: 'Оператор', detail: 'Документ подготовлен', state: 'done' },
		{ title: 'Согласование', detail: 'Решение принято', state: 'done' },
		{ title: 'Завершение', detail: 'Договор согласован', state: 'done' },
	],
	REJECTED: [
		{ title: 'Карточка создана', detail: 'Договор зарегистрирован в системе', state: 'done' },
		{ title: 'Оператор / согласующий', detail: 'Документ отклонен на маршруте', state: 'done' },
		{ title: 'Согласование', detail: 'Дальнейшие действия не требуются', state: 'rejected' },
		{ title: 'Завершение', detail: 'Договор отклонен', state: 'rejected' },
	],
};

const stepStyles: Record<ProcessStepState, { borderColor: string; backgroundColor: string; color: string }> = {
	done: { borderColor: '#b9dfc5', backgroundColor: '#eef8f1', color: '#17623c' },
	active: { borderColor: '#6da0dc', backgroundColor: '#f3f8fe', color: '#245c9f' },
	wait: { borderColor: '#d8dee6', backgroundColor: '#fff', color: '#7b8796' },
	rejected: { borderColor: '#efb4b4', backgroundColor: '#fff1f1', color: '#a93636' },
};

const executorTaskStatusLabels = {
	NEW: 'Доступна',
	ASSIGNED: 'Назначена',
	STARTED: 'В работе',
	COMPLETED: 'Завершена',
	ABORTED: 'Отменена',
} as const;

function StepIcon({ state }: { state: ProcessStepState }) {
	if (state === 'rejected') return <WarningAmberOutlinedIcon sx={ { color: '#a93636', fontSize: 18 } }/>;
	if (state === 'wait') return <RadioButtonUncheckedIcon sx={ { color: '#b2bbc6', fontSize: 17 } }/>;
	return <CheckCircleIcon sx={ { color: state === 'active' ? '#245c9f' : 'primary.main', fontSize: 18 } }/>;
}

export function DocumentDetailPage() {
	const { id } = useParams();
	const dispatch = useAppDispatch();
	const { currentItem: currentDocument, currentUser, loading, saving, error, documentTypes } = useAppSelector((state) => state.documents);
	const [ historicalDocument, setHistoricalDocument ] = useState<DocumentRecord | null>(null);
	const [ documentVersions, setDocumentVersions ] = useState<DocumentVersion[]>([]);
	const [ selectedVersion, setSelectedVersion ] = useState<number | null>(null);
	const [ versionLoading, setVersionLoading ] = useState(false);
	const document = historicalDocument ?? currentDocument;
	const historical = selectedVersion !== null;
	const [ editing, setEditing ] = useState(false);
	const [ form, setForm ] = useState<UpdateDocumentRequest | null>(null);
	const [ validationError, setValidationError ] = useState<string | null>(null);
	const [ actionError, setActionError ] = useState<string | null>(null);
	const [ actionAnchorEl, setActionAnchorEl ] = useState<null | HTMLElement>(null);
	const [ previewFile, setPreviewFile ] = useState<File | null>(null);
	const [ previewAttachmentId, setPreviewAttachmentId ] = useState<string | null>(null);
	const [ downloadingAttachmentId, setDownloadingAttachmentId ] = useState<string | null>(null);
	const [ previewError, setPreviewError ] = useState<string | null>(null);
	const [ replacingAttachment, setReplacingAttachment ] = useState<Attachment | null>(null);
	const [ versionsAttachment, setVersionsAttachment ] = useState<Attachment | null>(null);
	const [ previousVersions, setPreviousVersions ] = useState<Attachment[]>([]);
	const [ versionsLoading, setVersionsLoading ] = useState(false);
	const addAttachmentInputRef = useRef<HTMLInputElement | null>(null);
	const replaceAttachmentInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (id) void dispatch(fetchDocumentById(id));
		return () => {
			dispatch(clearCurrentDocument());
		};
	}, [ dispatch, id ]);

	useEffect(() => {
		if (documentTypes.length === 0) void dispatch(fetchDocumentTypes());
	}, [ dispatch, documentTypes.length ]);

	useEffect(() => {
		setSelectedVersion(null); setHistoricalDocument(null); setDocumentVersions([]);
		setEditing(false); setPreviewFile(null); setVersionsAttachment(null);
	}, [id]);

	useEffect(() => {
		if (!id || currentDocument?.id !== id) return;
		let active = true;
		void documentsApi.getVersions(id).then(result => {
			if (active) setDocumentVersions(result.items);
		}).catch(error => { if (active) setActionError(String(error)); });
		return () => { active = false; };
	}, [id, currentDocument?.id, currentDocument?.version, currentDocument?.changeToken]);

	useEffect(() => {
		if (!id || selectedVersion === null) { setHistoricalDocument(null); setVersionLoading(false); return; }
		let active = true;
		setVersionLoading(true); setPreviewFile(null); setVersionsAttachment(null); setActionError(null);
		void documentsApi.getVersion(id, selectedVersion).then(result => {
			if (active) setHistoricalDocument(result);
		}).catch(error => {
			if (active) { setActionError(String(error)); setSelectedVersion(null); }
		}).finally(() => { if (active) setVersionLoading(false); });
		return () => { active = false; };
	}, [id, selectedVersion]);

	if (selectedVersion !== null && historicalDocument?.version !== selectedVersion) return <Stack sx={{ py: 12, alignItems: 'center' }}><CircularProgress/><Typography>Загрузка версии {selectedVersion}…</Typography></Stack>;
	if (loading && !document) return <Stack sx={ { py: 12, alignItems: 'center' } }><CircularProgress/></Stack>;
	if (error && !document) return <Alert severity="error">{ error }</Alert>;
	if (!document) return null;

	const processSteps = processCopy[document.approvalStatus];
	const actionMenuOpen = Boolean(actionAnchorEl);
	const availableActions = document.workflow?.availableActions ?? [];
	const documentOperatorCanEdit = !historical && !versionLoading && document.approvalStatus === 'IN_WORK'
		&& document.workflow?.executor?.login === currentUser?.login
		&& document.workflow?.executor?.role === 'document_operator';
	const decisionDisabled = historical || versionLoading || editing || saving || availableActions.length === 0;
	const availableDocumentTypes = (() => {
		const baseTypes = documentTypes.length > 0 ? documentTypes : [ fallbackDocumentType ];
		if (baseTypes.some((item) => item.id === document.documentTypeId)) return baseTypes;
		return [ { id: document.documentTypeId, name: document.documentType }, ...baseTypes ];
	})();

	const startEdit = () => {
		setForm({
			expectedVersion: document.version,
			changeToken: document.changeToken,
			requestId: crypto.randomUUID(),
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

	const saveAttributes = async () => {
		if (!form) return;

		const formError = validateDocumentAttributes(form);
		if (formError) {
			setValidationError(formError);
			return;
		}

		try {
			const updated = await dispatch(updateDocument({
				id: document.id,
				payload: {
					expectedVersion: form.expectedVersion,
					changeToken: form.changeToken,
					requestId: form.requestId,
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

	const completeApproval = async (action: DocumentWorkflowAction) => {
		closeActionMenu();
		setActionError(null);
		setValidationError(null);

		try {
			await dispatch(completeDocumentApproval({
				id: document.id,
				payload: action.result
					? { actionCode: action.code, parameters: action.result }
					: action.status ? { approvalStatus: action.status } : { actionCode: action.code },
			})).unwrap();
		} catch (submitError) {
			setActionError(submitError instanceof Error ? submitError.message : String(submitError));
		}
	};

	const openAttachmentPreview = async (attachment: Attachment) => {
		setPreviewError(null);
		setPreviewAttachmentId(attachment.id);

		try {
			const file = await dispatch(downloadDocumentAttachment(attachment)).unwrap();
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
			const file = await dispatch(downloadDocumentAttachment(attachment)).unwrap();
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

	const uploadAttachments = async (event: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = '';
		if (files.length === 0) return;

		setActionError(null);
		try {
			const attachments = await Promise.all(files.map(fileToAttachmentUpload));
			await dispatch(uploadDocumentAttachments({ documentId: document.id, attachments })).unwrap();
		} catch (uploadError) {
			setActionError(uploadError instanceof Error ? uploadError.message : String(uploadError));
		}
	};

	const replaceAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		const attachment = replacingAttachment;
		setReplacingAttachment(null);
		if (!file || !attachment) return;

		setActionError(null);
		try {
			await dispatch(replaceDocumentAttachment({
				documentId: document.id,
				attachmentId: attachment.id,
				attachment: await fileToAttachmentUpload(file),
			})).unwrap();
		} catch (replaceError) {
			setActionError(replaceError instanceof Error ? replaceError.message : String(replaceError));
		}
	};

	const deleteAttachment = async (attachment: Attachment) => {
		if (!window.confirm(`Удалить вложение "${attachment.fileName}"?`)) return;

		setActionError(null);
		try {
			await dispatch(deleteDocumentAttachment({ documentId: document.id, attachmentId: attachment.id })).unwrap();
		} catch (deleteError) {
			setActionError(deleteError instanceof Error ? deleteError.message : String(deleteError));
		}
	};

	const openPreviousVersions = async (attachment: Attachment) => {
		setVersionsAttachment(attachment);
		setPreviousVersions([]);
		setVersionsLoading(true);
		setActionError(null);

		try {
			setPreviousVersions(await documentsApi.getAttachmentVersions(attachment.id));
		} catch (versionsError) {
			setActionError(versionsError instanceof Error ? versionsError.message : String(versionsError));
			setVersionsAttachment(null);
		} finally {
			setVersionsLoading(false);
		}
	};

	const closePreviousVersions = () => {
		setVersionsAttachment(null);
		setPreviousVersions([]);
		setVersionsLoading(false);
	};

	return (
		<Stack spacing={ 2 }>
			{historical && <Alert severity="info">Просмотр версии {selectedVersion}. Изменения недоступны. Статус и маршрут показывают текущее состояние общего процесса.</Alert>}
			{versionLoading && <Alert severity="info">Загрузка версии…</Alert>}
			<Breadcrumbs separator="›" sx={ { fontSize: 12.5 } }>
				<Link component={ RouterLink } to="/" underline="hover" color="secondary.main">Документы</Link>
				<Typography color="text.primary" sx={ { fontSize: 12.5 } }>{ document.documentType } { document.contractNumber }</Typography>
			</Breadcrumbs>

			<Stack direction={ { xs: 'column', lg: 'row' } } spacing={ 1.5 } sx={ { alignItems: { lg: 'center' }, justifyContent: 'space-between' } }>
				<Stack direction={ { xs: 'column', sm: 'row' } } spacing={ 1.5 } sx={ { alignItems: { xs: 'flex-start', sm: 'center' } } }>
					<Typography variant="h4">{ document.documentType } { document.contractNumber }</Typography>
					<DocumentStatusChip status={ document.documentStatus }/>
					<TextField select size="small" label="Версия документа" value={ selectedVersion ?? 'current' }
						disabled={ editing || saving || versionLoading } sx={{ minWidth: 220 }}
						onChange={event => { setHistoricalDocument(null); setSelectedVersion(event.target.value === 'current' ? null : Number(event.target.value)); if (event.target.value === 'current' && id) void dispatch(fetchDocumentById(id)); }}>
						<MenuItem value="current">Версия {currentDocument?.version ?? 1} · текущая</MenuItem>
						{documentVersions.filter(v => !v.current).map(v => <MenuItem key={v.version} value={v.version}>
							Версия {v.version} · {v.createdBy} · {new Date(v.createdAt + (/[Z+]/.test(v.createdAt) ? '' : 'Z')).toLocaleString('ru-RU')}
						</MenuItem>)}
					</TextField>
				</Stack>
				<Stack direction="row" spacing={ 1 } useFlexGap sx={ { flexWrap: 'wrap' } }>
					{ editing ? (
						<>
							<Button variant="outlined" color="inherit" startIcon={ <CloseIcon/> } onClick={ cancelEdit } disabled={ saving }>Отмена</Button>
							<Button variant="contained" startIcon={ <SaveOutlinedIcon/> } onClick={ () => void saveAttributes() } disabled={ saving }>
								{ saving ? 'Сохранение...' : 'Сохранить' }
							</Button>
						</>
					) : (
						<Button variant="outlined" color="inherit" startIcon={ <EditOutlinedIcon/> } onClick={ startEdit } disabled={ !documentOperatorCanEdit || saving }>Редактировать</Button>
					) }
					<Button
						id="document-actions-button"
						variant="outlined"
						color="inherit"
						endIcon={ <ExpandMoreIcon/> }
						disabled={ historical || versionLoading || saving || editing }
						aria-controls={ actionMenuOpen ? 'document-actions-menu' : undefined }
						aria-haspopup="menu"
						aria-expanded={ actionMenuOpen ? 'true' : undefined }
						onClick={ (event) => setActionAnchorEl(event.currentTarget) }
					>
						Действия
					</Button>
					<Menu
						id="document-actions-menu"
						anchorEl={ actionAnchorEl }
						open={ actionMenuOpen }
						onClose={ closeActionMenu }
						slotProps={ { list: { 'aria-labelledby': 'document-actions-button' } } }
					>
						{ availableActions.length === 0 ? (
							<MenuItem disabled>
								<ListItemText primary="Процесс завершен" slotProps={ { primary: { sx: { fontSize: 12.5 } } } }/>
							</MenuItem>
						) : availableActions.map((action) => {
							return (
								<MenuItem key={ action.code } disabled={ decisionDisabled } onClick={ () => void completeApproval(action) }>
									<ListItemIcon>
										{ action.tone === 'error' ? (
											<WarningAmberOutlinedIcon color="error" fontSize="small"/>
										) : (
											<CheckCircleIcon color={ action.tone === 'warning' ? 'warning' : 'success' } fontSize="small"/>
										) }
									</ListItemIcon>
									<ListItemText primary={ action.label } slotProps={ { primary: { sx: { fontSize: 12.5 } } } }/>
								</MenuItem>
							);
						}) }
					</Menu>
					<IconButton aria-label="Дополнительные действия" disabled={ saving } sx={ { border: 1, borderColor: 'divider', borderRadius: 1 } }><MoreVertIcon/></IconButton>
				</Stack>
			</Stack>

			<Tabs value={ 0 } variant="scrollable" scrollButtons={ false } sx={ {
				minHeight: 42, borderBottom: 1, borderColor: 'divider', mx: -2.5, px: 2.5, '& .MuiTab-root': { minHeight: 42, minWidth: 0, px: 1.25, mr: 2, fontSize: 12.5, color: 'text.primary' },
			} }>
				<Tab label="Общее"/>
				<Tab label={ `Вложения (${ document.attachments.length })` }/>
				<Tab label="История документа"/>
				{/* <Tab label="Доступ" /> */ }
			</Tabs>

			{ (error || actionError || previewError) && <Alert severity="error">{ actionError || previewError || error }</Alert> }

			<Box sx={ { display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 2.4fr) minmax(320px, 1fr)' }, gap: 2 } }>
				<Stack spacing={ 2 } sx={ { minWidth: 0 } }>
					<SectionPanel title="Атрибуты карточки">
						{ editing && form ? (
							<Stack spacing={ 1.5 }>
								{ validationError && <Alert severity="error">{ validationError }</Alert> }
								<Box sx={ { display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 } }>
									<FormField label="Вид документа" required>
										<TextField { ...fieldProps } select value={ form.documentTypeId } onChange={ (event) => updateField('documentTypeId', event.target.value) } disabled={ saving }>
											{ availableDocumentTypes.map((item) => <MenuItem key={ item.id } value={ item.id }>{ item.name }</MenuItem>) }
										</TextField>
									</FormField>
									<FormField label="Дата договора" required>
										<TextField { ...fieldProps } type="date" value={ form.contractDate } onChange={ (event) => updateField('contractDate', event.target.value) }
										           disabled={ saving }/>
									</FormField>
									<FormField label="Номер договора" required>
										<TextField { ...fieldProps } value={ form.contractNumber } onChange={ (event) => updateField('contractNumber', event.target.value) }
										           placeholder="Введите номер договора" disabled={ saving } slotProps={ { htmlInput: { maxLength: 64 } } }/>
									</FormField>
									<FormField label="СНИЛС" required>
										<TextField { ...fieldProps } value={ form.snils } onChange={ (event) => updateSnils(event.target.value) } placeholder="Введите СНИЛС" disabled={ saving }
										           slotProps={ { htmlInput: { maxLength: 14, inputMode: 'numeric' } } }/>
									</FormField>
								</Box>
							</Stack>
						) : (
							<>
								<AttributeRow label="Вид документа">{ document.documentType }</AttributeRow>
								<AttributeRow label="Дата договора">{ formatDate(document.contractDate) }</AttributeRow>
								<AttributeRow label="Номер договора">{ document.contractNumber }</AttributeRow>
								<AttributeRow label="СНИЛС">{ document.snils }</AttributeRow>
								<AttributeRow label="Дата создания">{ document.createdAt ? formatDateTime(document.createdAt) : undefined }</AttributeRow>
								<AttributeRow label="Кто создал">{ document.createdBy }</AttributeRow>
							</>
						) }
					</SectionPanel>

					<SectionPanel title="Бизнес-процесс">
						<Box sx={ { display: 'flex', alignItems: 'flex-start', overflowX: 'auto', pb: 0.5 } }>
							{ processSteps.map((step, index) => {
								const sx = stepStyles[step.state];
								return (
									<Box key={ step.title } sx={ { display: 'flex', flex: index === processSteps.length - 1 ? '0 0 170px' : '1 0 190px', minWidth: 0 } }>
										<Box sx={ { flex: 1, minWidth: 0 } }>
											<Paper variant="outlined"
											       sx={ { minHeight: 58, p: 1, display: 'flex', gap: 0.85, alignItems: 'center', bgcolor: sx.backgroundColor, borderColor: sx.borderColor } }>
												<StepIcon state={ step.state }/>
												<Box sx={ { minWidth: 0 } }>
													<Typography sx={ { fontSize: 11.5, color: sx.color, fontWeight: 600 } }>{ step.title }</Typography>
													<Typography color="text.secondary" sx={ { fontSize: 10.5 } }>{ step.detail }</Typography>
												</Box>
											</Paper>
										</Box>
										{ index < processSteps.length - 1 && (
											<ArrowForwardIcon
												sx={ {
													fontSize: 22,
													color: processSteps[index + 1].returnFromPrevious ? '#a93636' : step.state === 'wait' ? '#b9c2cc' : sx.color,
													mt: 2,
													mx: 0.4,
													transform: processSteps[index + 1].returnFromPrevious ? 'rotate(180deg)' : undefined,
												} }
											/>
										) }
									</Box>
								);
							}) }
						</Box>
					</SectionPanel>
				</Stack>

				<Stack spacing={ 2 } sx={ { minWidth: 0 } }>
					{ document.workflow?.executor ? (
						<SectionPanel title="Исполнитель">
							<>
								<AttributeRow label="Исполнитель">{ document.workflow.executor.login || 'Не назначен' }</AttributeRow>
								<AttributeRow label="Роль">{ document.workflow.executor.roleLabel || document.workflow.executor.role }</AttributeRow>
								<AttributeRow label="Задача">{ document.workflow.executor.taskTitle }</AttributeRow>
								<AttributeRow label="Статус задачи">
									{ document.workflow.executor.taskStatus ? executorTaskStatusLabels[document.workflow.executor.taskStatus] : undefined }
								</AttributeRow>
							</>
						</SectionPanel>
					) : <></> }

					<SectionPanel
						title="Вложения"
						count={ document.attachments.length }
						inlineAction={ documentOperatorCanEdit ? (
							<Tooltip title="Добавить вложение">
								<span>
									<IconButton
										aria-label="Добавить вложение"
										size="small"
										disabled={ saving }
										onClick={ () => addAttachmentInputRef.current?.click() }
										sx={ {
											width: 25,
											height: 25,
											border: 1,
											borderColor: 'divider',
											borderRadius: '50%',
											color: 'primary.main',
										} }
									>
										<AddIcon sx={ { fontSize: 17 } }/>
									</IconButton>
								</span>
							</Tooltip>
						) : undefined }
					>
						<input ref={ addAttachmentInputRef } type="file" multiple hidden onChange={ (event) => void uploadAttachments(event) }/>
						<input ref={ replaceAttachmentInputRef } type="file" hidden onChange={ (event) => void replaceAttachment(event) }/>
						{ document.attachments.length === 0 ? (
							<Typography color="text.secondary" sx={ { fontSize: 12 } }>Файлы отсутствуют</Typography>
						) : (
							<AttachmentDocumentFilesList
								attachments={ document.attachments }
								loadingPreviewId={ previewAttachmentId }
								loadingDownloadId={ downloadingAttachmentId }
								canManage={ documentOperatorCanEdit && !saving }
								onPreview={ (attachment) => void openAttachmentPreview(attachment) }
								onDownload={ (attachment) => void downloadAttachment(attachment) }
								onReplace={ (attachment) => {
									setReplacingAttachment(attachment);
									replaceAttachmentInputRef.current?.click();
								} }
								onDelete={ (attachment) => void deleteAttachment(attachment) }
								onShowVersions={ (attachment) => void openPreviousVersions(attachment) }
							/>
						) }
					</SectionPanel>

					{/* <SectionPanel title="Доступ" action={<Typography color="secondary.main" sx={{ fontSize: 11.5, cursor: 'pointer' }}>Изменить</Typography>}>
            {[['Просмотр', '15'], ['Редактирование', '5'], ['Администрирование', '2']].map(([role, count]) => (
              <Stack key={role} direction="row" sx={{ py: 0.45, justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 11.8 }}>{role}</Typography>
                <Typography sx={{ fontSize: 11.8 }}>{count}</Typography>
              </Stack>
            ))}
          </SectionPanel> */ }
				</Stack>
			</Box>
			<Dialog open={ Boolean(versionsAttachment) } onClose={ closePreviousVersions } fullWidth maxWidth="sm">
				<DialogTitle sx={ { fontSize: 16, fontWeight: 600, pr: 6 } }>
					Прошлые версии{ versionsAttachment ? `: ${ versionsAttachment.fileName }` : '' }
					<IconButton
						aria-label="Закрыть"
						onClick={ closePreviousVersions }
						sx={ { position: 'absolute', right: 12, top: 10 } }
					>
						<CloseIcon/>
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					{ versionsLoading ? (
						<Stack sx={ { py: 4, alignItems: 'center' } }><CircularProgress size={ 24 }/></Stack>
					) : previousVersions.length === 0 ? (
						<Typography color="text.secondary" sx={ { py: 2, fontSize: 12.5 } }>Прошлые версии отсутствуют</Typography>
					) : (
						<AttachmentDocumentFilesList
							attachments={ previousVersions }
							loadingPreviewId={ previewAttachmentId }
							loadingDownloadId={ downloadingAttachmentId }
							onPreview={ (attachment) => void openAttachmentPreview(attachment) }
							onDownload={ (attachment) => void downloadAttachment(attachment) }
						/>
					) }
				</DialogContent>
			</Dialog>
			<FilePreviewDialog file={ previewFile } onClose={ () => setPreviewFile(null) }/>
		</Stack>
	);
}
