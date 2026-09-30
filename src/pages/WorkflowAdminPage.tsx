import { Alert, Stack, Typography } from '@mui/material';

/** Точка входа административного раздела процессов. */
export function WorkflowAdminPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Процессы</Typography>
      <Alert severity="info">
        Управление черновиками и публикацией BPMN будет доступно после подключения workflow API.
      </Alert>
    </Stack>
  );
}
