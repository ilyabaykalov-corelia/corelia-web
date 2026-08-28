import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

export function DocxDocumentPreview({ file }: { file: File }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let active = true;
    container.replaceChildren();
    setLoading(true);
    setError(null);

    const renderDocument = async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        await renderAsync(file, container, container, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderComments: true,
          useBase64URL: true,
        });
        if (active) setLoading(false);
      } catch {
        if (active) {
          setLoading(false);
          setError('Не удалось отобразить содержимое DOCX.');
        }
      }
    };

    void renderDocument();
    return () => { active = false; };
  }, [file]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', bgcolor: '#dfe3e8' }}>
      {loading && <Stack alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0, zIndex: 2 }}><CircularProgress size={34} /></Stack>}
      {error && <Stack alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0, zIndex: 2 }}><Typography color="error">{error}</Typography></Stack>}
      <Box
        ref={containerRef}
        sx={{
          minHeight: '100%',
          '& .docx-wrapper': { bgcolor: '#dfe3e8 !important', p: '24px !important', minHeight: '100%' },
          '& section.docx': { boxShadow: '0 3px 16px rgba(33,42,54,.18)', mb: '18px !important' },
        }}
      />
    </Box>
  );
}
