import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { useCloudSync } from './hooks/use-cloud-sync';
import { SettingsUI } from '@/components/settings-ui';
import { toast } from 'react-toastify';
import {
    Cloud,
    CloudOff,
    LogIn,
    LogOut,
    RefreshCw,
    User,
    Shield,
    CheckCircle,
    AlertCircle,
    Loader2,
    BookOpen,
} from 'lucide-react';

const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export const CloudSync = () => {
    const { t } = useTranslation();
    const {
        authState,
        syncStatus,
        cachedConfig,
        isLoading,
        error,
        login,
        logout,
        syncConfig,
        applyDictionary,
    } = useCloudSync();

    const [backendUrl, setBackendUrl] = useState(
        authState.backend_url || DEFAULT_BACKEND_URL
    );
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error(t('Please enter email and password'));
            return;
        }

        setIsSubmitting(true);
        try {
            await login(backendUrl, email, password);
            toast.success(t('Login successful'));
            setPassword('');
            await syncConfig();
        } catch (err) {
            toast.error(t('Login failed') + ': ' + String(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success(t('Logged out'));
        } catch (_err) {
            toast.error(t('Logout failed'));
        }
    };

    const handleSync = async () => {
        try {
            await syncConfig();
            toast.success(t('Config synced'));
        } catch (err) {
            toast.error(t('Sync failed') + ': ' + String(err));
        }
    };

    if (isLoading && !authState.is_authenticated) {
        return (
            <main>
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
            </main>
        );
    }

    return (
        <main>
            <div className="space-y-6">
                <SettingsUI.Container>
                    <SettingsUI.Header
                        title={t('Cloud Sync')}
                        description={t('Sync configuration with your organization')}
                        icon={authState.is_authenticated ? Cloud : CloudOff}
                    />

                    <SettingsUI.Separator />

                    {!authState.is_authenticated ? (
                        <div className="p-4 space-y-4">
                            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                                <Shield className="h-4 w-4" />
                                <span>{t('Connect to your Murmure admin server')}</span>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                                        {t('Backend URL')}
                                    </label>
                                    <input
                                        type="url"
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        placeholder="https://admin.example.com"
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                                        {t('Email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                                        {t('Password')}
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-sm text-red-400">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-md transition-colors"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <LogIn className="h-4 w-4" />
                                    )}
                                    <span>{t('Login')}</span>
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                                        <User className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">
                                            {authState.user?.name || authState.user?.email}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {authState.user?.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                                        {authState.user?.plan}
                                    </span>
                                </div>
                            </div>

                            <SettingsUI.Separator />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-zinc-300">{t('Sync Status')}</span>
                                        {syncStatus.is_syncing ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                                        ) : syncStatus.error ? (
                                            <AlertCircle className="h-4 w-4 text-red-400" />
                                        ) : syncStatus.last_sync ? (
                                            <CheckCircle className="h-4 w-4 text-green-400" />
                                        ) : null}
                                    </div>
                                    <button
                                        onClick={handleSync}
                                        disabled={syncStatus.is_syncing}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/50 rounded-md transition-colors"
                                    >
                                        <RefreshCw
                                            className={`h-4 w-4 ${syncStatus.is_syncing ? 'animate-spin' : ''}`}
                                        />
                                        <span>{t('Sync Now')}</span>
                                    </button>
                                </div>

                                {syncStatus.last_sync && (
                                    <p className="text-xs text-zinc-500">
                                        {t('Last synced')}: {new Date(syncStatus.last_sync).toLocaleString()}
                                    </p>
                                )}

                                {syncStatus.error && (
                                    <p className="text-xs text-red-400">{syncStatus.error}</p>
                                )}
                            </div>

                            {cachedConfig && (
                                <>
                                    <SettingsUI.Separator />
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-zinc-300">
                                                {t('Synced Configuration')}
                                            </p>
                                            {cachedConfig.dictionary.length > 0 && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await applyDictionary();
                                                            toast.success(t('Dictionary applied'));
                                                        } catch (_err) {
                                                            toast.error(t('Failed to apply dictionary'));
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-md transition-colors"
                                                >
                                                    <BookOpen className="h-4 w-4" />
                                                    <span>{t('Apply Dictionary')}</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 bg-zinc-800/50 rounded">
                                                <span className="text-zinc-500">{t('Shortcuts')}</span>
                                                <p className="text-zinc-300 font-medium">
                                                    {cachedConfig.shortcuts.length}
                                                </p>
                                            </div>
                                            <div className="p-2 bg-zinc-800/50 rounded">
                                                <span className="text-zinc-500">{t('Dictionary')}</span>
                                                <p className="text-zinc-300 font-medium">
                                                    {cachedConfig.dictionary.length}
                                                </p>
                                            </div>
                                            <div className="p-2 bg-zinc-800/50 rounded">
                                                <span className="text-zinc-500">{t('App Prompts')}</span>
                                                <p className="text-zinc-300 font-medium">
                                                    {cachedConfig.app_prompts.length}
                                                </p>
                                            </div>
                                            <div className="p-2 bg-zinc-800/50 rounded">
                                                <span className="text-zinc-500">{t('Formatting')}</span>
                                                <p className="text-zinc-300 font-medium">
                                                    {cachedConfig.formatting_rules.length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <SettingsUI.Separator />

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>{t('Logout')}</span>
                            </button>
                        </div>
                    )}
                </SettingsUI.Container>
            </div>
        </main>
    );
};
