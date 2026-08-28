import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DocxDocumentPreview } from './DocxDocumentPreview';
import { DocumentFileIcon, getSupportedFileKind } from './DocumentFileIcon';
import { ExcelWorkbookPreview } from './ExcelWorkbookPreview';
import { formatFileSize } from '../utils/format';

export function FilePreviewDialog({ file, onClose }: { file: File | null; onClose: () => void }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const kind = file ? getSupportedFileKind(file.name) : null;

  useEffect(() => {
    if (!file || kind !== 'pdf') {
      setPdfUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, kind]);

  return (
    <Dialog open={Boolean(file)} onClose={onClose} fullWidth maxWidth="xl" PaperProps={{ sx: { height: { xs: '94vh', md: '90vh' }, maxWidth: 1380 } }}>
      {file && (
        <>
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', py: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <DocumentFileIcon fileName={file.name} size={32} />
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }}>{file.name}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{kind?.toUpperCase()} · {formatFileSize(file.size)}</Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 1, md: 1.5 }, bgcolor: '#e8ebef', display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            {kind === 'pdf' && pdfUrl && <Box component="iframe" title={`Предпросмотр ${file.name}`} src={pdfUrl} sx={{ width: '100%', height: '100%', border: 0, bgcolor: '#fff' }} />}
            {kind === 'docx' && <DocxDocumentPreview file={file} />}
            {kind === 'xlsx' && <ExcelWorkbookPreview file={file} />}
          </DialogContent>
          <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: 2, py: 1.25 }}><Button onClick={onClose} color="inherit">Закрыть</Button></DialogActions>
        </>
      )}
    </Dialog>
  );
}
