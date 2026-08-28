import { useEffect, useState, type CSSProperties } from 'react';
import { Box, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import type { Border, Cell, Color, Fill, Worksheet } from 'exceljs';

type PreviewCell = {
  key: string;
  value: string;
  rowSpan?: number;
  colSpan?: number;
  style: CSSProperties;
};

type PreviewRow = {
  height: number;
  cells: Array<PreviewCell | null>;
};

type PreviewSheet = {
  name: string;
  columnWidths: number[];
  rows: PreviewRow[];
  showGridLines: boolean;
};

type MergeData = { rowSpan: number; colSpan: number; skip?: boolean };

const maxRows = 100;
const maxColumns = 40;

const columnNumber = (letters: string) => letters.toUpperCase().split('').reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);

const columnName = (column: number) => {
  let value = column;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  return result;
};

const parseAddress = (address: string) => {
  const match = address.replace(/\$/g, '').match(/^([A-Z]+)(\d+)$/i);
  return match ? { column: columnNumber(match[1]), row: Number(match[2]) } : null;
};

const cssColor = (color?: Partial<Color>) => {
  if (!color?.argb) return undefined;
  const argb = color.argb.replace('#', '');
  return `#${argb.length === 8 ? argb.slice(2) : argb}`;
};

const borderCss = (border?: Partial<Border>) => {
  if (!border?.style) return undefined;
  const width = border.style === 'thick' ? 3 : border.style.startsWith('medium') || border.style === 'double' ? 2 : 1;
  const style = border.style === 'double' ? 'double' : border.style.includes('dash') ? 'dashed' : border.style.includes('dot') ? 'dotted' : 'solid';
  return `${width}px ${style} ${cssColor(border.color) ?? '#7d8793'}`;
};

const fillCss = (fill?: Fill) => {
  if (!fill) return undefined;
  if (fill.type === 'pattern') return fill.pattern === 'none' ? undefined : cssColor(fill.fgColor) ?? cssColor(fill.bgColor);
  if (fill.type === 'gradient') {
    const stops = fill.stops.map((stop) => `${cssColor(stop.color) ?? '#fff'} ${Math.round(stop.position * 100)}%`).join(', ');
    return `linear-gradient(${fill.gradient === 'angle' ? `${fill.degree}deg` : '135deg'}, ${stops})`;
  }
  return undefined;
};

const cellStyle = (cell: Cell): CSSProperties => {
  const decoration = [cell.font?.underline ? 'underline' : '', cell.font?.strike ? 'line-through' : ''].filter(Boolean).join(' ');
  const horizontal = cell.alignment?.horizontal;
  const vertical = cell.alignment?.vertical;

  return {
    background: fillCss(cell.fill),
    color: cssColor(cell.font?.color),
    fontFamily: cell.font?.name,
    fontSize: cell.font?.size ? `${cell.font.size}pt` : undefined,
    fontWeight: cell.font?.bold ? 700 : 400,
    fontStyle: cell.font?.italic ? 'italic' : 'normal',
    textDecoration: decoration || undefined,
    textAlign: horizontal === 'center' || horizontal === 'centerContinuous' ? 'center' : horizontal === 'right' ? 'right' : horizontal === 'justify' ? 'justify' : 'left',
    verticalAlign: vertical === 'top' ? 'top' : vertical === 'bottom' ? 'bottom' : 'middle',
    whiteSpace: cell.alignment?.wrapText ? 'pre-wrap' : 'pre',
    overflow: 'hidden',
    borderTop: borderCss(cell.border?.top),
    borderRight: borderCss(cell.border?.right),
    borderBottom: borderCss(cell.border?.bottom),
    borderLeft: borderCss(cell.border?.left),
    paddingLeft: cell.alignment?.indent ? `${6 + cell.alignment.indent * 9}px` : 6,
  };
};

const mergeMap = (worksheet: Worksheet, rowLimit: number, columnLimit: number) => {
  const result = new Map<string, MergeData>();
  for (const merge of worksheet.model.merges ?? []) {
    const [startText, endText] = String(merge).split(':');
    const start = parseAddress(startText);
    const end = parseAddress(endText ?? startText);
    if (!start || !end || start.row > rowLimit || start.column > columnLimit) continue;
    const bottom = Math.min(end.row, rowLimit);
    const right = Math.min(end.column, columnLimit);
    result.set(`${start.row}:${start.column}`, { rowSpan: bottom - start.row + 1, colSpan: right - start.column + 1 });
    for (let row = start.row; row <= bottom; row += 1) {
      for (let column = start.column; column <= right; column += 1) {
        if (row !== start.row || column !== start.column) result.set(`${row}:${column}`, { rowSpan: 1, colSpan: 1, skip: true });
      }
    }
  }
  return result;
};

const serializeSheet = (worksheet: Worksheet): PreviewSheet => {
  const rowLimit = Math.min(Math.max(worksheet.rowCount, 1), maxRows);
  const columnLimit = Math.min(Math.max(worksheet.columnCount, 1), maxColumns);
  const merges = mergeMap(worksheet, rowLimit, columnLimit);
  const columnWidths = Array.from({ length: columnLimit }, (_, index) => Math.max(48, Math.min((worksheet.getColumn(index + 1).width ?? 12) * 7.5, 420)));
  const rows: PreviewRow[] = [];

  for (let rowIndex = 1; rowIndex <= rowLimit; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const cells: Array<PreviewCell | null> = [];
    for (let columnIndex = 1; columnIndex <= columnLimit; columnIndex += 1) {
      const merge = merges.get(`${rowIndex}:${columnIndex}`);
      if (merge?.skip) {
        cells.push(null);
        continue;
      }
      const cell = worksheet.getCell(rowIndex, columnIndex);
      cells.push({
        key: `${rowIndex}:${columnIndex}`,
        value: cell.text,
        rowSpan: merge?.rowSpan,
        colSpan: merge?.colSpan,
        style: cellStyle(cell),
      });
    }
    rows.push({ height: Math.max(22, Math.min((row.height ?? 15) * 1.35, 180)), cells });
  }

  return { name: worksheet.name, columnWidths, rows, showGridLines: worksheet.views[0]?.showGridLines !== false };
};

export function ExcelWorkbookPreview({ file }: { file: File }) {
  const [sheets, setSheets] = useState<PreviewSheet[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSheets([]);
    setActiveSheet(0);

    const loadWorkbook = async () => {
      try {
        const { Workbook } = await import('exceljs');
        const workbook = new Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const previews = workbook.worksheets.filter((sheet) => sheet.state === 'visible').map(serializeSheet);
        if (active) {
          setSheets(previews);
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
          setError('Не удалось отобразить содержимое XLSX.');
        }
      }
    };

    void loadWorkbook();
    return () => { active = false; };
  }, [file]);

  if (loading) return <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}><CircularProgress size={34} /></Stack>;
  if (error) return <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}><Typography color="error">{error}</Typography></Stack>;

  const sheet = sheets[activeSheet];
  if (!sheet) return <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}><Typography color="text.secondary">В книге нет доступных листов</Typography></Stack>;

  return (
    <Paper variant="outlined" sx={{ width: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#fff' }}>
        <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: '100%', width: 'max-content', fontFamily: 'Arial, sans-serif', fontSize: '11pt' }}>
          <colgroup><col style={{ width: 42 }} />{sheet.columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={{ position: 'sticky', top: 0, left: 0, zIndex: 4, bgcolor: '#eef1f4', borderRight: 1, borderBottom: 1, borderColor: '#cfd6dd', height: 25 }} />
              {sheet.columnWidths.map((_, index) => <Box component="th" key={index} sx={{ position: 'sticky', top: 0, zIndex: 3, bgcolor: '#eef1f4', color: '#596573', borderRight: 1, borderBottom: 1, borderColor: '#cfd6dd', fontWeight: 500, height: 25 }}>{columnName(index + 1)}</Box>)}
            </Box>
          </Box>
          <Box component="tbody">
            {sheet.rows.map((row, rowIndex) => (
              <Box component="tr" key={rowIndex} sx={{ height: row.height }}>
                <Box component="th" sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: '#eef1f4', color: '#596573', borderRight: 1, borderBottom: 1, borderColor: '#cfd6dd', fontWeight: 500, textAlign: 'center' }}>{rowIndex + 1}</Box>
                {row.cells.map((cell, cellIndex) => cell && (
                  <Box
                    component="td"
                    key={cell.key}
                    rowSpan={cell.rowSpan}
                    colSpan={cell.colSpan}
                    sx={{
                      height: row.height,
                      minWidth: sheet.columnWidths[cellIndex],
                      maxWidth: sheet.columnWidths.slice(cellIndex, cellIndex + (cell.colSpan ?? 1)).reduce((total, width) => total + width, 0),
                      borderRight: sheet.showGridLines && !cell.style.borderRight ? '1px solid #dde2e7' : cell.style.borderRight,
                      borderBottom: sheet.showGridLines && !cell.style.borderBottom ? '1px solid #dde2e7' : cell.style.borderBottom,
                      px: 0.75,
                      py: 0.35,
                      ...cell.style,
                    }}
                  >
                    {cell.value}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <Tabs value={activeSheet} onChange={(_, value: number) => setActiveSheet(value)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 38, bgcolor: '#f4f6f8', borderTop: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 38, py: 0.5, px: 2, fontSize: 11.5 } }}>
        {sheets.map((item) => <Tab key={item.name} label={item.name} />)}
      </Tabs>
    </Paper>
  );
}
