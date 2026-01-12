export const formatDuration = (seconds: number | string): string => {
    const totalSeconds = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
    if (isNaN(totalSeconds)) return '00:00';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
};
