import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function LoadingScreen({ message }) {
  const { t } = useTranslation();
  const displayMessage = message || t('common.loading');

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted">{displayMessage}</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
