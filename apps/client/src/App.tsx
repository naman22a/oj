import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toast';

// Pages
import Home from './pages/Home';
import Register from './pages/Register';
import ConfirmEmail from './pages/ConfirmEmail';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ResetPassword from './pages/ResetPassword';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1
        }
    }
});

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            path="/confirm/:token"
                            element={<ConfirmEmail />}
                        />
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/reset-password/:token"
                            element={<ResetPassword />}
                        />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </ThemeProvider>
                <Toaster />
            </QueryClientProvider>
        </BrowserRouter>
    );
};

export default App;
