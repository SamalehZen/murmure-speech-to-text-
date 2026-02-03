import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useInitialSetup } from './features/initial-setup/hooks/use-initial-setup';
import { InitialSetup } from './features/initial-setup/initial-setup';
import './tailwind.css';

const App = () => {
    const { isCompleted, isLoading, completeSetup } = useInitialSetup();

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-zinc-900 flex items-center justify-center">
                <div className="text-zinc-400">Loading...</div>
            </div>
        );
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
