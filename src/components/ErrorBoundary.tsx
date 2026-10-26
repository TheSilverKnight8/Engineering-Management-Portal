import { Component, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

// Shows a way out instead of a blank screen if a page crashes.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex flex-col items-center px-6 py-24 text-center">
        <h2 className="text-lg font-semibold">Something went wrong on this screen</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted">{this.state.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 font-medium hover:bg-raised"
        >
          <RotateCcw className="size-4" />
          Reload
        </button>
      </div>
    );
  }
}
