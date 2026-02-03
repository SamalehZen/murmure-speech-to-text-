import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useInitialSetup } from './features/initial-setup/hooks/use-initial-setup';
import { InitialSetup } from './features/initial-setup/initial-setup';
import './i18n';
import './tailwind.css';

const LoadingScreen = () => (
    <div className="fixed inset-0 bg-zinc-900 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
    </div>
);

const App = () => {
    const { isCompleted, isLoading, completeSetup } = useInitialSetup();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isCompleted === false) {
        return <InitialSetup onComplete={completeSetup} />;
    }

    return <RouterProvider router={router} />;
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
