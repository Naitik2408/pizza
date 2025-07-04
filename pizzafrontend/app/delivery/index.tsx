import React, { lazy, Suspense } from 'react';
import LoadingScreen from '@/src/components/common/LoadingScreen';
import ErrorBoundary from '@/src/components/common/ErrorBoundary';

// Lazy load the heavy QR scanner component
const QRScannerComponent = lazy(() => import('./qrscanner'));

const LazyQRScanner: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message="Loading QR Scanner..." />}>
        <QRScannerComponent />
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyQRScanner;
