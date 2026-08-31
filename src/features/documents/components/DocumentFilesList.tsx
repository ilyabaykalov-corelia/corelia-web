import { Box, CircularProgress, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Close as CloseIcon,
  DownloadOutlined as DownloadOutlinedIcon,
  MoreVert as MoreVertIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
} from '@mui/icons-material';
import { DocumentFileIcon, getSupportedFileKind } from '../../../components/DocumentFileIcon';
import type { Attachment } from '../../../types/document';
import { formatDate, formatFileSize } from '../../../utils/format';

const FileRow = styled(Stack)(({ theme }) => ({
  alignItems: 'center',
  borderColor: theme.palette.divider,
  paddingBottom: theme.spacing(1.2),
  paddingTop: theme.spacing(1.2),
}));

interface LocalDocumentFilesListProps {
  files: File[];
  onPreview: (file: File) => void;
  onRemove?: (index: number) => void;
}

interface AttachmentDocumentFilesListProps {
  attachments: Attachment[];
  loadingPreviewId?: string | null;
  loadingDownloadId?: string | null;
  onPreview: (attachment: Attachment) => void;
  onDownload: (attachment: Attachment) => void;
}

/**
 * Отрисовывает локальные файлы, выбранные пользователем до загрузки на сервер.
 *
 * @param props - Параметры списка локальных файлов.
 * @param props.files - Browser `File`-объекты, выбранные пользователем.
 * @param props.onPreview - Открывает диалог предварительного просмотра файла.
 * @param props.onRemove - Необязательный callback, включающий управление удалением файлов.
 */
export function LocalDocumentFilesList({ files, onPreview, onRemove }: LocalDocumentFilesListProps) {
  return (
    <Stack>
      {files.map((file, index) => {
        const kind = getSupportedFileKind(file.name);
        return (
          <FileRow key={`${file.name}-${file.lastModified}`} direction="row" spacing={1.2} sx={{ borderTop: index === 0 ? 0 : 1 }}>
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
              <IconButton size="small" aria-label={`Просмотреть ${file.name}`} onClick={() => onPreview(file)}>
                <VisibilityOutlinedIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
            {onRemove && (
              <Tooltip title="Удалить файл">
                <IconButton size="small" aria-label={`Удалить ${file.name}`} onClick={() => onRemove(index)}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </FileRow>
        );
      })}
    </Stack>
  );
}

/**
 * Отрисовывает вложения документа, уже сохраненные на сервере.
 *
 * @param props - Параметры списка вложений.
 * @param props.attachments - Сохраненные вложения документа.
 * @param props.loadingPreviewId - Идентификатор вложения, которое сейчас загружается для просмотра.
 * @param props.loadingDownloadId - Идентификатор вложения, которое сейчас скачивается.
 * @param props.onPreview - Запрашивает загрузку вложения для предварительного просмотра.
 * @param props.onDownload - Запрашивает скачивание вложения.
 */
export function AttachmentDocumentFilesList({
  attachments,
  loadingPreviewId,
  loadingDownloadId,
  onPreview,
  onDownload,
}: AttachmentDocumentFilesListProps) {
  return (
    <Stack spacing={1.35}>
      {attachments.map((attachment) => (
        <Stack key={attachment.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <DocumentFileIcon fileName={attachment.fileName} size={28} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 12 }}>{attachment.fileName}</Typography>
            <Typography noWrap color="text.secondary" sx={{ fontSize: 10.8 }}>
              {formatFileSize(attachment.size)} &nbsp;•&nbsp; {formatDate(attachment.uploadedAt)}
            </Typography>
          </Box>
          <Tooltip title="Просмотреть">
            <IconButton
              aria-label={`Просмотреть ${attachment.fileName}`}
              size="small"
              disabled={loadingPreviewId === attachment.id}
              onClick={() => onPreview(attachment)}
            >
              {loadingPreviewId === attachment.id ? <CircularProgress size={17} /> : <VisibilityOutlinedIcon sx={{ fontSize: 19 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Скачать">
            <IconButton
              aria-label={`Скачать ${attachment.fileName}`}
              size="small"
              disabled={loadingDownloadId === attachment.id}
              onClick={() => onDownload(attachment)}
            >
              {loadingDownloadId === attachment.id ? <CircularProgress size={17} /> : <DownloadOutlinedIcon sx={{ fontSize: 19 }} />}
            </IconButton>
          </Tooltip>
          <IconButton aria-label="Действия с файлом" size="small"><MoreVertIcon sx={{ fontSize: 18 }} /></IconButton>
        </Stack>
      ))}
    </Stack>
  );
}
