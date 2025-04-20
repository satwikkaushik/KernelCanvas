import { createTheme } from '@mui/material/styles';

const dockerTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2459c9', // Updated Docker Hub toolbar blue
      light: '#4378e0',
      dark: '#1149ba',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2496ed', 
      light: '#4bb0ff',
      dark: '#1d7ac9',
      contrastText: '#ffffff',
    },
    background: {
      default: '#10151b', // Updated Docker Hub body background
      paper: '#1a1f27', // Slightly lighter than background
      input: '#0f3d9e', // Input background color

    },
    text: {
      primary: '#ffffff',
      secondary: '#adbac7', // Docker Hub secondary text
    },
    divider: 'rgba(110, 118, 129, 0.4)',
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2496ed',
    },
    success: {
      main: '#2fcb53',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#10151b', // Updated to match body background
          borderRight: '1px solid rgba(110, 118, 129, 0.4)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1a1f27', // Updated to match body background
          borderRadius: '8px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: '#1149ba',
          '&:hover': {
            backgroundColor: '#11499f',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#0f2439',
          borderRadius: '6px',
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(56, 139, 253, 0.1)',
          }
        }
      }
    },
  },
});

export default dockerTheme;
