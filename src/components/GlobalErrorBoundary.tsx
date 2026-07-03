import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global Error Boundary caught an error:", error, errorInfo);

    // Auto-refresh for ChunkLoadError (caused by Vite deployments where the old chunk hash is requested)
    if (
      error.name === "ChunkLoadError" ||
      (error.message && error.message.toLowerCase().includes("failed to fetch dynamically imported module"))
    ) {
      // Prevent infinite reload loop by setting a session storage flag
      if (!sessionStorage.getItem("has_reloaded_chunk_error")) {
        sessionStorage.setItem("has_reloaded_chunk_error", "true");
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-500 flex items-center justify-center rounded-2xl border border-red-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">Une erreur inattendue est survenue</h1>
              <p className="text-sm text-slate-400">
                L'application a rencontré un problème (mise à jour en arrière-plan ou erreur de rendu).
              </p>

              <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-left overflow-auto max-h-32">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error?.name}: {this.state.error?.message}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-1 break-all whitespace-pre-wrap">
                  {this.state.error?.stack?.split("\\n").slice(0, 3).join("\\n")}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sessionStorage.removeItem("has_reloaded_chunk_error");
                window.location.reload();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl w-full transition-colors shadow-lg"
            >
              Rafraîchir l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
