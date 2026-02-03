import { useState } from 'react';
import { StepWelcome } from './steps/step-welcome';
import { StepModeChoice } from './steps/step-mode-choice';
import { StepCloudConfig } from './steps/step-cloud-config';
import { StepOfflineDownload } from './steps/step-offline-download';
import { StepComplete } from './steps/step-complete';
import { SetupStep } from './initial-setup.types';

interface InitialSetupProps {
    onComplete: () => void;
}

export const InitialSetup = ({ onComplete }: InitialSetupProps) => {
    const [step, setStep] = useState<SetupStep>('welcome');
    const handleModeSelect = (mode: 'cloud' | 'offline') => {
        setStep(mode === 'cloud' ? 'cloud-config' : 'offline-download');
    };

    const handleConfigComplete = () => {
        setStep('complete');
    };

    const handleSetupComplete = () => {
        onComplete();
    };

    return (
        <div className="fixed inset-0 bg-zinc-900 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full">
                {step === 'welcome' && <StepWelcome onNext={() => setStep('mode-choice')} />}
                {step === 'mode-choice' && <StepModeChoice onSelect={handleModeSelect} />}
                {step === 'cloud-config' && (
                    <StepCloudConfig
                        onComplete={handleConfigComplete}
                        onBack={() => setStep('mode-choice')}
                    />
                )}
                {step === 'offline-download' && (
                    <StepOfflineDownload
                        onComplete={handleConfigComplete}
                        onBack={() => setStep('mode-choice')}
                    />
                )}
                {step === 'complete' && <StepComplete onFinish={handleSetupComplete} />}
            </div>
        </div>
    );
};
