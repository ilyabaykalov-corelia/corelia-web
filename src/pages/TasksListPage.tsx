import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AssignmentTurnedInOutlined as AssignmentTurnedInOutlinedIcon,
  OpenInNew as OpenInNewIcon,
  PersonAddAltOutlined as PersonAddAltOutlinedIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { SectionPanel } from '../components/common/SectionPanel';
import { taskCountersChangedEvent, tasksApi } from '../api/tasks';
import type { PlatformTask, TaskQueue, TaskStatus } from '../types/task';
import { formatDate } from '../utils/format';

const filterDebounceMs = 350;

const statusLabels: Record<TaskStatus, string> = {
  NEW: 'Новая',
  ASSIGNED: 'Назначена',
  STARTED: 'В работе',
  COMPLETED: 'Завершена',
  ABORTED: 'Прервана',
};

const statusStyles: Record<TaskStatus, { color: string; backgroundColor: string }> = {
  NEW: { color: '#245c9f', backgroundColor: '#e8f1fb' },
  ASSIGNED: { color: '#245c9f', backgroundColor: '#e8f1fb' },
  STARTED: { color: '#17623c', backgroundColor: '#e6f5ed' },
  COMPLETED: { color: '#17623c', backgroundColor: '#e6f5ed' },
  ABORTED: { color: '#a93636', backgroundColor: '#fdebec' },
};

const statusOptions: Array<{ value: TaskStatus | ''; label: string }> = [
  { value: '', label: 'Все активные' },
  { value: 'NEW', label: 'Новые' },
  { value: 'ASSIGNED', label: 'Назначенные' },
  { value: 'STARTED', label: 'В работе' },
];

const queueConfig: Record<TaskQueue, { title: string; empty: string; icon: typeof AssignmentTurnedInOutlinedIcon }> = {
  MY: {
    title: 'Мои задачи',
    empty: 'Нет активных задач, назначенных на вас.',
    icon: AssignmentTurnedInOutlinedIcon,
  },
  AVAILABLE: {
    title: 'Доступные задачи',
    empty: 'Нет доступных неназначенных задач.',
    icon: PersonAddAltOutlinedIcon,
  },
};

const getAttributeValue = (task: PlatformTask, key: string) => {
  const value = task.attributes?.[key];
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.value === 'string' || typeof record.value === 'number') return String(record.value);
    if (typeof record.name === 'string') return record.name;
    if (typeof record.label === 'string') return record.label;
  }
  return '';
};

const taskDocumentId = (task: PlatformTask) => getAttributeValue(task, 'documentId');

const taskDate = (timestamp?: number | null) => {
  if (!timestamp) return 'Не указан';
  return formatDate(new Date(timestamp).toISOString().slice(0, 10));
};

export function TasksListPage({ queue }: { queue: TaskQueue }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<PlatformTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const config = queueConfig[queue];
  const Icon = config.icon;

  const loadTasks = async (nextQuery = query, nextStatus = status) => {
    setLoading(true);
    setError(null);
    try {
      const result = await tasksApi.search({
        queue,
        query: nextQuery.trim() || undefined,
        status: nextStatus || undefined,
      });
      setItems(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks('', '');
  }, [queue]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTasks();
    }, filterDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [query, queue, status]);

  const sortedItems = useMemo(() => [...items].sort((left, right) => (right.created ?? 0) - (left.created ?? 0)), [items]);

  const applyFilters = () => {
    void loadTasks();
  };

  const resetFilters = () => {
    setQuery('');
    setStatus('');
    void loadTasks('', '');
  };

  const startTask = async (task: PlatformTask) => {
    setStartingTaskId(task.id);
    setError(null);

    try {
      await tasksApi.start(task.id);
      setItems((current) => {
        if (queue === 'AVAILABLE') return current.filter((item) => item.id !== task.id);
        return current.map((item) => item.id === task.id ? { ...item, status: 'STARTED' } : item);
      });
      if (queue === 'AVAILABLE') {
        window.dispatchEvent(new CustomEvent(taskCountersChangedEvent, {
          detail: { my: 1, available: -1 },
        }));
      }
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Не удалось взять задачу в работу');
    } finally {
      setStartingTaskId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography variant="h4">{config.title}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
            Активные задачи по согласованию документов.
          </Typography>
        </Box>
      </Stack>

      <SectionPanel title="Фильтры">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) minmax(160px, 240px) auto auto' }, gap: 1.2, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Поиск"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyFilters();
            }}
          />
          <TextField select size="small" label="Статус" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | '')}>
            {statusOptions.map((option) => <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={applyFilters}>Найти</Button>
          <Button variant="text" onClick={resetFilters}>Сбросить</Button>
        </Box>
      </SectionPanel>

      {error && <Alert severity="error">{error}</Alert>}

      <SectionPanel title={`${config.title}: ${sortedItems.length}`}>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>
        ) : sortedItems.length === 0 ? (
          <Stack alignItems="center" spacing={1.2} sx={{ py: 6, color: 'text.secondary' }}>
            <Icon sx={{ fontSize: 34 }} />
            <Typography sx={{ fontSize: 14 }}>{config.empty}</Typography>
          </Stack>
        ) : (
          <Stack spacing={1}>
            {sortedItems.map((task) => {
              const documentId = taskDocumentId(task);

              return (
                <Box
                  key={task.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(220px, 1fr) 130px 150px 170px auto auto' },
                    gap: 1,
                    alignItems: 'center',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1.25,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title || task.type || 'Задача согласования'}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.description || getAttributeValue(task, 'contractNumber') || task.id}
                    </Typography>
                  </Box>
                  <Box>
                    {task.status ? (
                      <Chip
                        label={statusLabels[task.status]}
                        size="small"
                        sx={{
                          ...statusStyles[task.status],
                          height: 24,
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: 13 }}>Не указан</Typography>
                    )}
                  </Box>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>Создана: {taskDate(task.created)}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>Срок: {taskDate(task.dueDate)}</Typography>
                  {queue === 'AVAILABLE' && (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={startingTaskId === task.id}
                      onClick={() => void startTask(task)}
                      sx={{ justifySelf: { xs: 'stretch', lg: 'end' }, whiteSpace: 'nowrap' }}
                    >
                      {startingTaskId === task.id ? 'Берем...' : 'Взять в работу'}
                    </Button>
                  )}
                  <Tooltip title="Открыть документ">
                    <span>
                      <IconButton
                        size="small"
                        disabled={!documentId}
                        aria-label="Открыть документ"
                        onClick={() => {
                          if (documentId) navigate(`/documents/${documentId}`);
                        }}
                        sx={{ justifySelf: { xs: 'stretch', lg: 'end' }, border: 1, borderColor: 'divider', borderRadius: 1 }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              );
            })}
          </Stack>
        )}
      </SectionPanel>
    </Stack>
  );
}
