import { useState } from 'react';
import { StepWelcome } from './steps/step-welcome';
import { StepModeChoice } from './steps/step-mode-choice';
import { StepCloudConfig } from './steps/step-cloud-config';
import { StepOfflineDownload } from './steps/step-offline-download';
import { StepComplete } from './steps/step-complete';
import { SetupStep, SttMode, CloudSttProvider } from './initial-setup.types';

interface InitialSetupProps {
    onComplete: (
        mode: SttMode,
        cloudProvider?: CloudSttProvider,
        apiKey?: string,
        model?: string
    ) => void;
}

export const InitialSetup = ({ onComplete }: InitialSetupProps) => {
    const [step, setStep] = useState<SetupStep>('welcome');
    const [selectedMode, setSelectedMode] = useState<SttMode | null>(null);
    const [cloudProvider, setCloudProvider] = useState<CloudSttProvider | null>(null);
    const [cloudApiKey, setCloudApiKey] = useState<string | null>(null);
    const [cloudModel, setCloudModel] = useState<string | null>(null);

    const handleModeSelect = (mode: SttMode) => {
        setSelectedMode(mode);
        setStep(mode === 'cloud' ? 'cloud-config' : 'offline-download');
    };

    const handleCloudConfigComplete = (
        provider: CloudSttProvider,
        apiKey: string,
        model: string
    ) => {
        setCloudProvider(provider);
        setCloudApiKey(apiKey);
        setCloudModel(model);
        setStep('complete');
    };

    const handleOfflineComplete = () => {
        setStep('complete');
    };

    const handleSetupComplete = () => {
        if (selectedMode === 'cloud' && cloudProvider && cloudApiKey) {
            onComplete(selectedMode, cloudProvider, cloudApiKey, cloudModel || undefined);
        } else {
            onComplete(selectedMode || 'offline');
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full">
                {step === 'welcome' && (
                    <StepWelcome onNext={() => setStep('mode-choice')} />
                )}
                {step === 'mode-choice' && (
                    <StepModeChoice onSelect={handleModeSelect} />
                )}
                {step === 'cloud-config' && (
                    <StepCloudConfig
                        onComplete={handleCloudConfigComplete}
                        onBack={() => setStep('mode-choice')}
                    />
                )}
                {step === 'offline-download' && (
                    <StepOfflineDownload
                        onComplete={handleOfflineComplete}
                        onBack={() => setStep('mode-choice')}
                    />
                )}
                {step === 'complete' && (
                    <StepComplete onFinish={handleSetupComplete} />
                )}
            </div>
        </div>
    );
};
