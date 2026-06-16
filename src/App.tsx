import { PlatformAppRoot } from "./app/PlatformAppRoot";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";

export default function App() {
  return (
    <GlobalErrorBoundary>
      <PlatformAppRoot />
    </GlobalErrorBoundary>
  );
}
