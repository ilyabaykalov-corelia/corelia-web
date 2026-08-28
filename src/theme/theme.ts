import { alpha, createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#149447', dark: '#087d36', light: '#e9f7ee' },
    secondary: { main: '#1466c3' },
    background: { default: '#f8fafb', paper: '#ffffff' },
    text: { primary: '#171b24', secondary: '#687486' },
    divider: '#e0e5eb',
  },
  shape: { borderRadius: 7 },
  typography: {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 13,
    h4: { fontSize: '1.55rem', fontWeight: 600, lineHeight: 1.25, letterSpacing: 0 },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: 0 },
    h6: { fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: 0 },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { letterSpacing: 0 } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 38, borderRadius: 5, paddingLeft: 16, paddingRight: 16 } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell: {
      styleOverrides: {
        head: { background: '#fafbfc', color: '#697586', fontSize: '0.73rem', fontWeight: 500, lineHeight: 1.3, paddingTop: 10, paddingBottom: 10 },
        body: { borderColor: '#e9edf1', fontSize: '0.78rem', paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          fontSize: 13,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9ba6b3' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { boxShadow: `0 0 0 3px ${alpha('#149447', 0.1)}` },
        },
        notchedOutline: { borderColor: '#d9dfe6' },
        input: { paddingTop: 10.5, paddingBottom: 10.5 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 13 } } },
    MuiBreadcrumbs: { styleOverrides: { root: { color: '#667386' }, separator: { color: '#8a95a3' } } },
  },
});
