import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/Dashboard';
import { AnalysesList } from './pages/AnalysesList';
import { AnalysisDetails } from './pages/AnalysisDetails';

function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analyses" element={<AnalysesList />} />
              <Route path="/analyses/:id" element={<AnalysisDetails />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </Router>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}

export default App;
