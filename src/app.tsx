import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useInitialSetup } from './features/initial-setup/hooks/use-initial-setup';
import { InitialSetup } from './features/initial-setup/initial-setup';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => (
    <div className="fixed inset-0 bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
    </div>
);

export const App = () => {
    const { isCompleted, isLoading, completeSetup } = useInitialSetup();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isCompleted === false) {
        return (
            <InitialSetup
                onComplete={(mode, cloudProvider, apiKey, model) =>
                    completeSetup(mode, cloudProvider, apiKey, model)
                }
            />
        );
    }

    return <RouterProvider router={router} />;
};
