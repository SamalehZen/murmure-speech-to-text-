interface ThinkingIndicatorProps {
    size?: number;
}

export const ThinkingIndicator = ({ size = 12 }: ThinkingIndicatorProps) => {
    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center gap-[2px]">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="rounded-full bg-gradient-to-t from-violet-500 to-fuchsia-400"
                        style={{
                            width: size / 3,
                            height: size / 3,
                            animation: `pulse-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
                        }}
                    />
                ))}
            </div>
            <style>{`
                @keyframes pulse-dot {
                    0%, 80%, 100% {
                        opacity: 0.3;
                        transform: scale(0.8);
                    }
                    40% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                }
            `}</style>
        </div>
    );
};
