import { useEffect, useState, type PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AdminPanelSettingsOutlined as AdminPanelSettingsOutlinedIcon,
  AssignmentOutlined as AssignmentOutlinedIcon,
  BarChartOutlined as BarChartOutlinedIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CollectionsBookmarkOutlined as CollectionsBookmarkOutlinedIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpOutlineIcon,
  HomeOutlined as HomeOutlinedIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  LogoutOutlined as LogoutOutlinedIcon,
  Menu as MenuIcon,
  MenuBookOutlined as MenuBookOutlinedIcon,
  NotificationsNone as NotificationsNoneIcon,
  Search as SearchIcon,
  TaskAltOutlined as TaskAltOutlinedIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCurrentUser } from '../store/documentsSlice';
import { logoutUser } from '../store/authSlice';

const expandedDrawerWidth = 240;
const collapsedDrawerWidth = 72;

const primaryItems = [
  { label: 'Главная', icon: HomeOutlinedIcon, route: '/' },
  { label: 'Документы', icon: DescriptionOutlinedIcon, route: '/documents' },
  { label: 'Задачи', icon: TaskAltOutlinedIcon, badge: 12 },
  { label: 'Поручения', icon: AssignmentOutlinedIcon },
  { label: 'Коллекции', icon: CollectionsBookmarkOutlinedIcon },
  { label: 'Справочники', icon: MenuBookOutlinedIcon },
  { label: 'Отчеты', icon: BarChartOutlinedIcon },
  { label: 'Администрирование', icon: AdminPanelSettingsOutlinedIcon },
];

const documentMenuItems = [
  { label: 'Создать документ', route: '/documents/new' },
  { label: 'Реестр документов', route: '/documents' },
  { label: 'Недавние документы' },
];

export function AppLayout({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.documents.currentUser);
  const authUser = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const documentsSection = location.pathname.startsWith('/documents');
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(documentsSection);
  const sidebarCollapsed = desktop && collapsed;
  const drawerWidth = sidebarCollapsed ? collapsedDrawerWidth : expandedDrawerWidth;
  const displayUser = authUser ?? user;

  useEffect(() => {
    if (!user) void dispatch(fetchCurrentUser());
  }, [dispatch, user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (documentsSection) setDocumentsMenuOpen(true);
  }, [documentsSection]);

  const goTo = (route?: string) => {
    if (!route) return;
    navigate(route);
  };

  const toggleDocumentsMenu = () => {
    if (sidebarCollapsed) {
      setCollapsed(false);
      setDocumentsMenuOpen(true);
      return;
    }

    setDocumentsMenuOpen((current) => !current);
  };

  const toggleSidebar = () => {
    if (desktop) {
      setCollapsed((current) => !current);
    } else {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Stack sx={{ height: '100%', bgcolor: '#fff' }}>
      <Stack justifyContent="center" alignItems={sidebarCollapsed ? 'center' : 'flex-start'} sx={{ height: 70, flexShrink: 0, px: sidebarCollapsed ? 0 : 2.5 }}>
        <Box sx={{ width: sidebarCollapsed ? 34 : 142, overflow: 'hidden', transition: theme.transitions.create('width') }}>
          <Box component="img" src="/sber-npf-logo.png" alt="Сбер НПФ" sx={{ width: 142, maxWidth: 'none', height: 'auto', display: 'block' }} />
        </Box>
      </Stack>

      <List sx={{ px: 0, py: 1.25, flex: 1, overflowY: 'auto' }}>
        {primaryItems.map((item) => {
          if (item.route === '/documents/new' && location.pathname === '/documents/new') return null;

          const active = item.route === '/'
            ? location.pathname === '/'
            : item.route === '/documents'
              ? documentsSection && location.pathname !== '/documents/new'
              : location.pathname === item.route;
          const Icon = item.icon;

          return (
            <Box key={item.label}>
              <Tooltip title={sidebarCollapsed ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  selected={active}
                  onClick={() => (item.route === '/documents' ? toggleDocumentsMenu() : goTo(item.route))}
                  aria-expanded={item.route === '/documents' ? documentsMenuOpen : undefined}
                  sx={{
                    minHeight: 44,
                    mx: 0,
                    px: sidebarCollapsed ? 0 : 2.5,
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    '&::before': active ? {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: 'primary.main',
                      borderRadius: '0 3px 3px 0',
                    } : undefined,
                    '&.Mui-selected': { bgcolor: '#eef7f1', color: 'primary.main' },
                    '&.Mui-selected:hover': { bgcolor: '#e9f4ed' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 34, justifyContent: 'center', color: active ? 'primary.main' : '#697586' }}>
                    <Icon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  {!sidebarCollapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: 0 }} />}
                  {item.badge && (
                    <Box sx={{ minWidth: sidebarCollapsed ? 17 : 22, height: sidebarCollapsed ? 17 : 20, borderRadius: 10, px: sidebarCollapsed ? 0.35 : 0.65, bgcolor: 'primary.main', color: '#fff', fontSize: sidebarCollapsed ? 9 : 11, fontWeight: 700, display: 'grid', placeItems: 'center', position: sidebarCollapsed ? 'absolute' : 'static', top: sidebarCollapsed ? 4 : 'auto', right: sidebarCollapsed ? 7 : 'auto' }}>
                      {item.badge}
                    </Box>
                  )}
                  {!sidebarCollapsed && item.route === '/documents' && (
                    <ExpandMoreIcon sx={{ fontSize: 17, transform: documentsMenuOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: theme.transitions.create('transform') }} />
                  )}
                </ListItemButton>
              </Tooltip>

              {item.route === '/documents' && (
                <Collapse in={!sidebarCollapsed && documentsMenuOpen} timeout="auto" unmountOnExit>
                  <Stack sx={{ pb: 0.75 }}>
                    {documentMenuItems.map((child) => (
                      <ListItemButton
                        key={child.label}
                        selected={child.route === location.pathname}
                        onClick={() => goTo(child.route)}
                        sx={{ minHeight: 34, py: 0.25, pl: 7, pr: 2.5, color: child.route === location.pathname ? 'primary.main' : 'text.primary' }}
                      >
                        <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: 12.5, fontWeight: child.route === location.pathname ? 600 : 400 }} />
                      </ListItemButton>
                    ))}
                  </Stack>
                </Collapse>
              )}
            </Box>
          );
        })}
      </List>

      <Box sx={{ mt: 'auto', borderTop: 1, borderColor: 'divider', p: 1, flexShrink: 0 }}>
        <Tooltip title={sidebarCollapsed ? 'Развернуть сайдбар' : ''} placement="right">
          <ListItemButton
            onClick={toggleSidebar}
            aria-label={desktop ? (sidebarCollapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар') : 'Закрыть меню'}
            sx={{ minHeight: 42, px: sidebarCollapsed ? 0 : 1.5, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 34, justifyContent: 'center' }}>
              {sidebarCollapsed ? <ChevronRightIcon sx={{ fontSize: 20 }} /> : <ChevronLeftIcon sx={{ fontSize: 20 }} />}
            </ListItemIcon>
            {!sidebarCollapsed && <ListItemText primary={desktop ? 'Свернуть' : 'Закрыть'} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRightColor: 'divider',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
          },
        }}
      >
        {drawer}
      </Drawer>

      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` }, bgcolor: 'rgba(255,255,255,.98)', borderBottom: 1, borderColor: 'divider', zIndex: theme.zIndex.drawer - 1, transition: theme.transitions.create(['width', 'margin-left'], { duration: theme.transitions.duration.shorter }) }}
      >
        <Toolbar sx={{ minHeight: '70px !important', px: { xs: 1.5, md: 2.5 }, gap: 1.5 }}>
          {!desktop && <IconButton aria-label="Открыть меню" onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>}
          <TextField
            size="small"
            placeholder="Поиск по документам, задачам, коллекциям..."
            sx={{ width: { xs: '100%', sm: 540 }, maxWidth: '50vw' }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#647184' }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 0.7, py: 0.2, color: 'text.secondary', fontSize: 11 }}>Ctrl + K</Box></InputAdornment>,
            }}
          />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Уведомления">
            <IconButton aria-label="Уведомления" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <Badge badgeContent={5} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 16, height: 16 } }}><NotificationsNoneIcon sx={{ color: '#647184' }} /></Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Помощь"><IconButton aria-label="Помощь" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}><HelpOutlineIcon sx={{ color: '#647184' }} /></IconButton></Tooltip>
          <Tooltip title="Выйти">
            <IconButton aria-label="Выйти" onClick={() => { void dispatch(logoutUser()); }} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <LogoutOutlinedIcon sx={{ color: '#647184' }} />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ my: 1.5, mx: 0.5, display: { xs: 'none', sm: 'block' } }} />
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#edf0f3', color: '#6f7a88', fontSize: 13, fontWeight: 700 }}>
            {(displayUser?.fullName ?? 'Иванов И. И.').split(' ').slice(0, 2).map((part) => part[0]).join('')}
          </Avatar>
          <Box sx={{ minWidth: 132, display: { xs: 'none', lg: 'block' } }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{displayUser?.fullName ?? 'Иванов И. И.'}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{displayUser?.login ?? 'Пользователь'}</Typography>
          </Box>
          <KeyboardArrowDownIcon sx={{ fontSize: 19, display: { xs: 'none', lg: 'block' } }} />
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ ml: { md: `${drawerWidth}px` }, pt: '70px', minHeight: '100vh', transition: theme.transitions.create('margin-left', { duration: theme.transitions.duration.shorter }) }}>
        <Box sx={{ p: { xs: 2, md: 2.5 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
