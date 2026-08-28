import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import {
  DescriptionOutlined as DescriptionOutlinedIcon,
  PictureAsPdfOutlined as PictureAsPdfOutlinedIcon,
  TableChartOutlined as TableChartOutlinedIcon,
} from '@mui/icons-material';

export type SupportedFileKind = 'pdf' | 'docx' | 'xlsx';

export const getSupportedFileKind = (fileName: string): SupportedFileKind | null => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'pdf' || extension === 'docx' || extension === 'xlsx') return extension;
  return null;
};

const fileIconConfig = {
  pdf: { Icon: PictureAsPdfOutlinedIcon, color: '#df4045', label: 'PDF' },
  docx: { Icon: DescriptionOutlinedIcon, color: '#2875c7', label: 'DOCX' },
  xlsx: { Icon: TableChartOutlinedIcon, color: '#159c52', label: 'XLSX' },
};

export function DocumentFileIcon({ fileName, size = 30, sx }: { fileName: string; size?: number; sx?: SxProps<Theme> }) {
  const kind = getSupportedFileKind(fileName) ?? 'docx';
  const { Icon, color, label } = fileIconConfig[kind];

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0, ...sx }} title={label}>
      <Icon sx={{ color, fontSize: size }} />
      <Typography
        component="span"
        sx={{ position: 'absolute', left: 2, bottom: 4, color, bgcolor: '#fff', fontSize: Math.max(5.5, size * 0.19), fontWeight: 800, lineHeight: 1, px: 0.2 }}
      >
        {label}
      </Typography>
    </Box>
  );
}
