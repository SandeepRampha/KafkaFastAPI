import { Component, type ErrorInfo, type ReactNode } from "react";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in Section [${this.props.name || 'Unknown'}]:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-destructive/20 rounded-3xl bg-destructive/5 text-center space-y-3 min-h-[100px]">
          <AlertTriangle className="w-6 h-6 text-destructive/50" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {this.props.name || 'Section'} failed to load
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
