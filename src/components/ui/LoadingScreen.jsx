import { Loader2 } from 'lucide-react';

function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
