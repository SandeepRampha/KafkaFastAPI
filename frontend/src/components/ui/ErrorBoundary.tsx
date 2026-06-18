import { Component, type ErrorInfo, type ReactNode } from "react";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group("React Error Boundary Caught Error");
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.groupEnd();
    
    // In a production environment, you would send this to a monitoring service here.
  }

  private handleReset = () => {
    // Attempt a cleaner reset by first clearing the error state 
    // before triggering a reload. This can sometimes help if the app re-mounts.
    this.setState({ hasError: false, error: null }, () => {
      window.location.reload();
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-md p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full glass-panel p-8 rounded-3xl text-center space-y-6 shadow-2xl border border-destructive/20"
          >
            <div className="flex justify-center">
              <div className="bg-destructive/10 p-5 rounded-3xl">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A critical error occurred in the application UI. We've logged the details and are working on a fix.
              </p>
              {import.meta.env.DEV && (
                <div className="mt-4 p-3 bg-destructive/5 rounded-xl border border-destructive/10 text-left overflow-auto max-h-40">
                  <p className="text-[10px] font-mono text-destructive/70 whitespace-pre-wrap">
                    {this.state.error?.toString()}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-semibold rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
            </div>
            
            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-widest">
              Recovery Mode Active
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
