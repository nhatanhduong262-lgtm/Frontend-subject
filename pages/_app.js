import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import '../app/globals.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8b5cf6',
    },
    secondary: {
      main: '#3dd9ff',
    },
    background: {
      default: '#050816',
      paper: '#0b1120',
    },
    text: {
      primary: '#edf4ff',
      secondary: '#9eb3d9',
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), Arial, sans-serif',
  },
});

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
