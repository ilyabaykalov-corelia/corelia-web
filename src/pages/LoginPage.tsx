import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  LockOutlined as LockOutlinedIcon,
  LoginOutlined as LoginOutlinedIcon,
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
  const from = (location.state as LocationState | null)?.from;
  const returnTo = `${from?.pathname ?? '/'}${from?.search ?? ''}`;

  useEffect(() => {
    if (session) navigate(returnTo, { replace: true });
  }, [navigate, returnTo, session]);

  if (session) return <Navigate to={returnTo} replace />;

  const submit = async () => {
    try {
      await dispatch(loginUser(new URL(returnTo, window.location.origin).href)).unwrap();
    } catch {
      // Ошибка уже сохранена в auth slice и показана в Alert.
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 420, p: { xs: 2.2, sm: 3 }, borderRadius: 1 }}>
        <Stack spacing={2.2}>
          <Stack spacing={1.2} sx={{ textAlign: 'center', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 25, fontWeight: 700, color: 'primary.main' }}>Corelia</Typography>
            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#e6f5ed', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
              <LockOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontSize: 24 }}>Вход в систему</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 12.5 }}>Авторизация через корпоративный SSO</Typography>
            </Box>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginOutlinedIcon />}
              onClick={() => { void submit(); }}
              disabled={loading}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
