import React, { createContext, useContext } from 'react';
import { useSnackbar } from 'notistack';

// Create context
export const SnackbarContext = createContext({
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
  showWarning: () => {},
});

// Custom provider component
export const SnackbarProvider = ({ children }) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const showSuccess = (message) => {
    enqueueSnackbar(message, { 
      variant: 'success',
      autoHideDuration: 3000,
    });
  };

  const showError = (message) => {
    enqueueSnackbar(message, { 
      variant: 'error',
      autoHideDuration: 5000,
    });
  };

  const showInfo = (message) => {
    enqueueSnackbar(message, { 
      variant: 'info',
      autoHideDuration: 3000,
    });
  };

  const showWarning = (message) => {
    enqueueSnackbar(message, { 
      variant: 'warning',
      autoHideDuration: 4000,
    });
  };

  return (
    <SnackbarContext.Provider 
      value={{ 
        showSuccess, 
        showError, 
        showInfo, 
        showWarning, 
        closeSnackbar 
      }}
    >
      {children}
    </SnackbarContext.Provider>
  );
};

// Custom hook for using the snackbar
export const useSnackbarContext = () => useContext(SnackbarContext);