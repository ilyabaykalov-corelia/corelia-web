import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  LockOutlined as LockOutlinedIcon,
  LoginOutlined as LoginOutlinedIcon,
  VisibilityOffOutlined as VisibilityOffOutlinedIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
} from '@mui/icons-material';
import { loginUser } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

interface LocationState {
  from?: {
    pathname?: string;
    search?: string;
  };
}

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, error } = useAppSelector((state) => state.auth);
  const [username, setUsername] = useState('tester');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as LocationState | null)?.from;
  const returnTo = `${from?.pathname ?? '/'}${from?.search ?? ''}`;

  useEffect(() => {
    if (session) navigate(returnTo, { replace: true });
  }, [navigate, returnTo, session]);

  if (session) return <Navigate to={returnTo} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await dispatch(loginUser({ username: username.trim(), password })).unwrap();
      navigate(returnTo, { replace: true });
    } catch {
      // Ошибка уже сохранена в auth slice и показана в Alert.
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 420, p: { xs: 2.2, sm: 3 }, borderRadius: 1 }}>
        <Stack spacing={2.2}>
          <Stack spacing={1.2} sx={{ textAlign: 'center', alignItems: 'center' }}>
            <Box component="img" src="/sber-npf-logo.png" alt="Сбер НПФ" sx={{ width: 156, height: 'auto' }} />
            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#e6f5ed', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
              <LockOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontSize: 24 }}>Вход в систему</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 12.5 }}>Авторизация через Platform V Keycloak</Typography>
            </Box>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack component="form" spacing={1.5} onSubmit={(event) => { void submit(event); }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Логин"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        onClick={() => setShowPassword((current) => !current)}
                        size="small"
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon sx={{ fontSize: 19 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 19 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<LoginOutlinedIcon />}
              disabled={loading || !username.trim() || !password}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
