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
  FolderOutlined as FolderOutlinedIcon,
  HelpOutlined as HelpOutlineIcon,
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
import { fetchCurrentUser, fetchDocuments, fetchDocumentTypes, setFilters } from '../store/documentsSlice';
import { logoutUser } from '../store/authSlice';
import type { DocumentSearchRequest } from '../types/document';
import { taskCountersChangedEvent, tasksApi } from '../api/tasks';
import type { TaskCountersDelta } from '../types/task';

const expandedDrawerWidth = 240;
const collapsedDrawerWidth = 72;
const registryLimit = 1000;

const primaryItems = [
  { label: 'Главная', icon: HomeOutlinedIcon, route: '/' },
  { label: 'Реестр документов', icon: DescriptionOutlinedIcon, route: '/documents' },
  { label: 'Задачи', icon: TaskAltOutlinedIcon, route: '/tasks' },
  { label: 'Поручения', icon: AssignmentOutlinedIcon },
  { label: 'Коллекции', icon: CollectionsBookmarkOutlinedIcon },
  { label: 'Справочники', icon: MenuBookOutlinedIcon },
  { label: 'Отчеты', icon: BarChartOutlinedIcon },
  { label: 'Администрирование', icon: AdminPanelSettingsOutlinedIcon },
];

/**
 * Формирует фильтр реестра, ограниченный границами выбранного календарного года.
 *
 * @param year - Год, выбранный в боковом меню.
 * @returns Фильтр с датами начала и конца года.
 */
const createYearFilter = (year: number, documentTypeId?: string): DocumentSearchRequest => ({
  documentTypeId,
  dateFrom: `${year}-01-01`,
  dateTo: `${year}-12-31`,
  offset: 0,
  limit: registryLimit,
});

export function AppLayout({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.documents.currentUser);
  const documents = useAppSelector((state) => state.documents.items);
  const registryYears = useAppSelector((state) => state.documents.registryYears);
  const registryYearsByDocumentType = useAppSelector((state) => state.documents.registryYearsByDocumentType);
  const documentTypes = useAppSelector((state) => state.documents.documentTypes);
  const filters = useAppSelector((state) => state.documents.filters);
  const authUser = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedDocumentTypeId, setExpandedDocumentTypeId] = useState<string | null>(null);
  const documentsSection = location.pathname.startsWith('/documents');
  const tasksSection = location.pathname.startsWith('/tasks');
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(documentsSection);
  const [tasksMenuOpen, setTasksMenuOpen] = useState(tasksSection);
  const [taskCounters, setTaskCounters] = useState({ my: 0, available: 0 });
  const sidebarCollapsed = desktop && collapsed;
  const drawerWidth = sidebarCollapsed ? collapsedDrawerWidth : expandedDrawerWidth;
  const displayUser = authUser ?? user;
  const hasRegistryDocuments = registryYears.length > 0;
  const activeRegistryYear = registryYears.find((year) => filters.dateFrom === `${year}-01-01` && filters.dateTo === `${year}-12-31`);
  const allDocumentsActive = location.pathname === '/documents' && !filters.documentTypeId && activeRegistryYear === undefined;

  useEffect(() => {
    if (!user) void dispatch(fetchCurrentUser());
  }, [dispatch, user]);

  useEffect(() => {
    if (documents.length === 0) void dispatch(fetchDocuments({ offset: 0, limit: registryLimit }));
  }, [dispatch, documents.length]);

  useEffect(() => {
    if (documentTypes.length === 0) void dispatch(fetchDocumentTypes());
  }, [dispatch, documentTypes.length]);

  useEffect(() => {
    let mounted = true;

    tasksApi.summary()
      .then((summary) => {
        if (mounted) setTaskCounters(summary);
      })
      .catch(() => {
        if (mounted) setTaskCounters({ my: 0, available: 0 });
      });

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    const updateTaskCounters = (event: Event) => {
      const delta = (event as CustomEvent<TaskCountersDelta>).detail;
      if (!delta) return;

      setTaskCounters((current) => ({
        my: Math.max(0, current.my + (delta.my ?? 0)),
        available: Math.max(0, current.available + (delta.available ?? 0)),
      }));
    };

    window.addEventListener(taskCountersChangedEvent, updateTaskCounters);
    return () => window.removeEventListener(taskCountersChangedEvent, updateTaskCounters);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (documentsSection) setDocumentsMenuOpen(true);
  }, [documentsSection]);

  useEffect(() => {
    if (tasksSection) setTasksMenuOpen(true);
  }, [tasksSection]);

  const goTo = (route?: string) => {
    if (!route) return;
    navigate(route);
  };

  const openRegistry = () => {
    const nextFilters: DocumentSearchRequest = { offset: 0, limit: registryLimit };
    setExpandedDocumentTypeId(null);
    dispatch(setFilters(nextFilters));
    void dispatch(fetchDocuments(nextFilters));
    if (location.pathname !== '/documents') navigate('/documents');
  };

  const applyRegistryYear = (year: number, documentTypeId?: string) => {
    const nextFilters = createYearFilter(year, documentTypeId);
    dispatch(setFilters(nextFilters));
    void dispatch(fetchDocuments(nextFilters));
    if (location.pathname !== '/documents') navigate('/documents');
  };

  const applyDocumentType = (documentTypeId: string) => {
    const nextFilters: DocumentSearchRequest = { documentTypeId, offset: 0, limit: registryLimit };
    dispatch(setFilters(nextFilters));
    void dispatch(fetchDocuments(nextFilters));
    if (location.pathname !== '/documents') navigate('/documents');
  };

  const toggleDocumentType = (documentTypeId: string) => {
    if (expandedDocumentTypeId === documentTypeId) {
      setExpandedDocumentTypeId(null);
      return;
    }

    setExpandedDocumentTypeId(documentTypeId);
    applyDocumentType(documentTypeId);
  };

  const toggleDocumentsMenu = () => {
    if (sidebarCollapsed) {
      setCollapsed(false);
      setDocumentsMenuOpen(hasRegistryDocuments);
      return;
    }

    setDocumentsMenuOpen((current) => hasRegistryDocuments && !current);
  };

  const toggleTasksMenu = () => {
    if (sidebarCollapsed) {
      setCollapsed(false);
      setTasksMenuOpen(true);
      return;
    }

    setTasksMenuOpen((current) => !current);
  };

  const taskCounterBadge = (count: number) => {
    if (count <= 0) return null;

    return (
      <Box sx={{ minWidth: 22, height: 20, borderRadius: 10, px: 0.65, bgcolor: 'primary.main', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
        {count}
      </Box>
    );
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
      <Stack sx={{ height: 70, flexShrink: 0, px: sidebarCollapsed ? 0 : 2.5, justifyContent: 'center', alignItems: sidebarCollapsed ? 'center' : 'flex-start' }}>
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
              : item.route === '/tasks'
                ? tasksSection
              : location.pathname === item.route;
          const Icon = item.icon;
          const expandable = item.route === '/documents' || item.route === '/tasks';

          return (
            <Box key={item.label}>
              <Tooltip title={sidebarCollapsed ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  selected={active}
                  onClick={() => (item.route === '/documents' ? toggleDocumentsMenu() : item.route === '/tasks' ? toggleTasksMenu() : goTo(item.route))}
                  aria-expanded={expandable ? (item.route === '/documents' ? documentsMenuOpen : tasksMenuOpen) : undefined}
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
                  {!sidebarCollapsed && <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: 0 } } }} />}
                  {!sidebarCollapsed && expandable && (item.route !== '/documents' || hasRegistryDocuments) && (
                    <ExpandMoreIcon sx={{ fontSize: 17, transform: (item.route === '/documents' ? documentsMenuOpen : tasksMenuOpen) ? 'rotate(0deg)' : 'rotate(-90deg)', transition: theme.transitions.create('transform') }} />
                  )}
                </ListItemButton>
              </Tooltip>

              {item.route === '/documents' && (
                <Collapse in={!sidebarCollapsed && documentsMenuOpen && hasRegistryDocuments} timeout="auto" unmountOnExit>
                  <Stack sx={{ pb: 0.75 }}>
                    <ListItemButton
                      selected={allDocumentsActive}
                      onClick={openRegistry}
                      sx={{ minHeight: 34, py: 0.25, pl: 7, pr: 2.5, color: allDocumentsActive ? 'primary.main' : 'text.primary' }}
                    >
                      <ListItemText primary="Все документы" slotProps={{ primary: { sx: { fontSize: 12.5, fontWeight: allDocumentsActive ? 600 : 400 } } }} />
                    </ListItemButton>
                    {documentTypes.map((documentType) => {
                      const typeYears = registryYearsByDocumentType[documentType.id] ?? [];
                      const typeExpanded = expandedDocumentTypeId === documentType.id;
                      const typeActive = filters.documentTypeId === documentType.id && activeRegistryYear === undefined;

                      return (
                        <Box key={documentType.id}>
                          <ListItemButton
                            selected={typeActive}
                            onClick={() => toggleDocumentType(documentType.id)}
                            aria-expanded={typeExpanded}
                            sx={{ minHeight: 34, py: 0.25, pl: 7, pr: 2.5, color: typeActive ? 'primary.main' : 'text.primary' }}
                          >
                            <ListItemIcon sx={{ minWidth: 24, color: typeActive ? 'primary.main' : '#697586' }}>
                              <FolderOutlinedIcon sx={{ fontSize: 16 }} />
                            </ListItemIcon>
                            <ListItemText primary={documentType.name} slotProps={{ primary: { sx: { fontSize: 12.5, fontWeight: typeActive ? 600 : 400 } } }} />
                            <ExpandMoreIcon sx={{ fontSize: 16, transform: typeExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: theme.transitions.create('transform') }} />
                          </ListItemButton>
                          <Collapse in={typeExpanded} timeout="auto" unmountOnExit>
                            <Stack>
                              {typeYears.map((year) => {
                                const yearActive = filters.documentTypeId === documentType.id && activeRegistryYear === year;

                                return (
                                  <ListItemButton
                                    key={`${documentType.id}-${year}`}
                                    selected={yearActive}
                                    onClick={() => applyRegistryYear(year, documentType.id)}
                                    sx={{ minHeight: 30, py: 0.2, pl: 11, pr: 2.5, color: yearActive ? 'primary.main' : 'text.primary' }}
                                  >
                                    <ListItemText primary={year} slotProps={{ primary: { sx: { fontSize: 12.2, fontWeight: yearActive ? 600 : 400 } } }} />
                                  </ListItemButton>
                                );
                              })}
                            </Stack>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </Stack>
                </Collapse>
              )}

              {item.route === '/tasks' && (
                <Collapse in={!sidebarCollapsed && tasksMenuOpen} timeout="auto" unmountOnExit>
                  <Stack sx={{ pb: 0.75 }}>
                    <ListItemButton
                      selected={location.pathname === '/tasks/my'}
                      onClick={() => navigate('/tasks/my')}
                      sx={{ minHeight: 34, py: 0.25, pl: 7, pr: 2.5, color: location.pathname === '/tasks/my' ? 'primary.main' : 'text.primary' }}
                    >
                      <ListItemText primary="Мои задачи" slotProps={{ primary: { sx: { fontSize: 12.5, fontWeight: location.pathname === '/tasks/my' ? 600 : 400 } } }} />
                      {taskCounterBadge(taskCounters.my)}
                    </ListItemButton>
                    <ListItemButton
                      selected={location.pathname === '/tasks/available'}
                      onClick={() => navigate('/tasks/available')}
                      sx={{ minHeight: 34, py: 0.25, pl: 7, pr: 2.5, color: location.pathname === '/tasks/available' ? 'primary.main' : 'text.primary' }}
                    >
                      <ListItemText primary="Доступные задачи" slotProps={{ primary: { sx: { fontSize: 12.5, fontWeight: location.pathname === '/tasks/available' ? 600 : 400 } } }} />
                      {taskCounterBadge(taskCounters.available)}
                    </ListItemButton>
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
            {!sidebarCollapsed && <ListItemText primary={desktop ? 'Свернуть' : 'Закрыть'} slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 500 } } }} />}
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
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#647184' }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 0.7, py: 0.2, color: 'text.secondary', fontSize: 11 }}>Ctrl + K</Box></InputAdornment>,
              },
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
