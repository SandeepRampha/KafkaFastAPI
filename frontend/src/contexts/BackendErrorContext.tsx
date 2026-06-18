import React, { createContext, useContext, useState, useCallback } from 'react';

interface BackendErrorContextType {
    backendError: boolean;
    isTransient: boolean;
    setBackendError: (error: boolean, details?: string, options?: { transient?: boolean }) => void;
    errorDetails: string | null;
    retryAction: (() => void) | null;
    setRetryAction: (action: (() => void) | null) => void;
    clearError: () => void;
}

const BackendErrorContext = createContext<BackendErrorContextType | undefined>(undefined);

export const BackendErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [backendError, setBackendErrorState] = useState(false);
    const [isTransient, setIsTransient] = useState(false);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [retryAction, setRetryAction] = useState<(() => void) | null>(null);

    // Set global reference for Axios interceptor
    React.useEffect(() => {
        setGlobalBackendErrorRef((error: boolean, details?: string, options?: { transient?: boolean }) => {
            setBackendErrorState(error);
            setIsTransient(options?.transient ?? false);
            if (details) setErrorDetails(details);
            else if (!error) setErrorDetails(null);
            
            // Sync global flag
            isBackendDownState = error && !(options?.transient);
        });
    }, []);

    const setBackendError = useCallback((error: boolean, details?: string, options?: { transient?: boolean }) => {
        setBackendErrorState(error);
        setIsTransient(options?.transient ?? false);
        if (details) setErrorDetails(details);
        
        // Sync global flag 
        isBackendDownState = error && !(options?.transient);
    }, []);

    const clearError = useCallback(() => {
        setBackendErrorState(false);
        setIsTransient(false);
        setErrorDetails(null);
        isBackendDownState = false; // Sync global flag
        if (retryAction) {
            retryAction();
        }
    }, [retryAction]);

    return (
        <BackendErrorContext.Provider
            value={{
                backendError,
                isTransient,
                setBackendError,
                errorDetails,
                retryAction,
                setRetryAction,
                clearError,
            }}
        >
            {children}
        </BackendErrorContext.Provider>
    );
};

export const useBackendError = () => {
    const context = useContext(BackendErrorContext);
    if (context === undefined) {
        throw new Error('useBackendError must be used within a BackendErrorProvider');
    }
    return context;
};

// Global reference for Axios interceptor
let setGlobalBackendError: (error: boolean, details?: string, options?: { transient?: boolean }) => void = () => { };

export const setGlobalBackendErrorRef = (fn: (error: boolean, details?: string, options?: { transient?: boolean }) => void) => {
    setGlobalBackendError = fn;
};

export const triggerGlobalBackendError = (error: boolean, details?: string, options?: { transient?: boolean }) => {
    setGlobalBackendError(error, details, options);
};

// State accessible outside React
let isBackendDownState = false;
export const isBackendDown = () => isBackendDownState;
