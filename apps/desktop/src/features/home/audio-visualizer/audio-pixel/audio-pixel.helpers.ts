export const getPixelColor = (
    distanceFromCenter: number,
    isEdgeColumn: boolean,
    isCenterColumn: boolean,
    hasSound: boolean
) => {
    if (distanceFromCenter <= 2) {
        if ((isEdgeColumn && hasSound) || (isCenterColumn && !hasSound)) {
            return `hsl(199, 89%, 48%)`;
        }
        return `hsl(239, 84%, 67%)`;
    } else if (distanceFromCenter <= 4) {
        return `hsl(199, 89%, 48%)`;
    } else {
        return `hsl(180, 100%, 50%)`;
    }
};
