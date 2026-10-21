import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CompareProvider } from './context/CompareContext';
import ScrollManager from './routes/ScrollManager';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CompareProvider>
            <ScrollManager />
            <AppRoutes />
          </CompareProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
