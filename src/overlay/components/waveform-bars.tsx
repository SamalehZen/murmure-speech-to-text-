import { motion } from 'framer-motion';

interface WaveformBarsProps {
    level: number;
}

export const WaveformBars = ({ level }: WaveformBarsProps) => {
    const bars = 5;

    return (
        <div className="flex items-center gap-1 h-6">
            {Array.from({ length: bars }).map((_, i) => {
                const centerBias = 1 - Math.abs(i - 2) / 2;
                const height = 8 + level * 16 * centerBias;

                return (
                    <motion.div
                        key={i}
                        animate={{ height }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                        }}
                        className="w-[3px] rounded-full bg-white/80"
                    />
                );
            })}
        </div>
    );
};
