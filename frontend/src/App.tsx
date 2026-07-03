import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';

const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AnalysesList = React.lazy(() => import('./pages/AnalysesList').then(m => ({ default: m.AnalysesList })));
const AnalysisDetails = React.lazy(() => import('./pages/AnalysisDetails').then(m => ({ default: m.AnalysisDetails })));

const FallbackLoader = () => (
  <div className="flex items-center justify-center h-full w-full bg-transparent">
    <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <Router>
          <AppLayout>
            <Suspense fallback={<FallbackLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analyses" element={<AnalysesList />} />
                <Route path="/analyses/:id" element={<AnalysisDetails />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AppLayout>
        </Router>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}

export default App;
