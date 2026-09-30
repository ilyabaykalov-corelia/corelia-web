import { useEffect, useState } from 'react';
import { Alert, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { ApiError } from '../api/client';
import { workflowsApi } from '../api/workflows';
import type { WorkflowDefinition } from '../types/workflow';

/** Показывает опубликованные процессы без раскрытия provider-specific данных. */
export function WorkflowAdminPage() {
  const [items, setItems] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void workflowsApi.list()
      .then((response) => { if (active) setItems(response.items); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить процессы');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Процессы</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <Stack sx={{ py: 5, alignItems: 'center' }}><CircularProgress /></Stack> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Опубликованные процессы">
            <TableHead><TableRow>
              <TableCell>Название</TableCell><TableCell>Ключ</TableCell><TableCell>Опубликованная версия</TableCell>
              <TableCell>Черновик</TableCell><TableCell>Статус</TableCell><TableCell>Последняя публикация</TableCell>
              <TableCell>Опубликовал</TableCell><TableCell align="right">Активные экземпляры</TableCell>
            </TableRow></TableHead>
            <TableBody>{items.map((workflow) => <TableRow key={workflow.key}>
              <TableCell>{workflow.name}</TableCell><TableCell>{workflow.key}</TableCell><TableCell>{workflow.publishedVersion}</TableCell>
              <TableCell>{workflow.draft ? 'Есть' : 'Нет'}</TableCell><TableCell>{workflow.status}</TableCell>
              <TableCell>{workflow.lastPublishedAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(workflow.lastPublishedAt)) : '—'}</TableCell>
              <TableCell>{workflow.publishedBy ?? '—'}</TableCell><TableCell align="right">{workflow.activeInstances}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
          {items.length === 0 && <Typography color="text.secondary" sx={{ p: 3 }}>Опубликованные процессы не найдены.</Typography>}
        </TableContainer>
      )}
    </Stack>
  );
}
