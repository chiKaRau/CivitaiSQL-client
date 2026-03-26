import { AppTheme } from "../components/window_offline/OfflineWindow.theme";

export type PrefixItem = {
    id?: number;
    prefixName?: string;
    downloadFilePath: string;
    downloadPriority?: number;
};

export type PrefixTone = {
    text: string;
    bg: string;
    border: string;
};

const normalizePath = (value: string) =>
    (value || '').trim().replace(/[\\/]+/g, '/').replace(/\/$/, '').toLowerCase();

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

export const findBestPrefixMatch = (
    fullPath: string,
    prefixes: PrefixItem[]
): PrefixItem | undefined => {
    const normalizedFullPath = normalizePath(fullPath);

    return [...prefixes]
        .filter((item) => {
            const prefix = normalizePath(item.downloadFilePath);
            return normalizedFullPath.startsWith(prefix);
        })
        .sort((a, b) => b.downloadFilePath.length - a.downloadFilePath.length)[0];
};

export const getPrefixTone = (
    prefix: string,
    theme: AppTheme,
    isDarkMode: boolean
): PrefixTone => {
    const normalized = normalizePath(prefix);
    const hue = hashString(normalized) % 360;

    if (isDarkMode) {
        return {
            text: `hsl(${hue} 72% 70%)`,
            bg: `hsla(${hue}, 72%, 60%, 0.16)`,
            border: `hsla(${hue}, 72%, 68%, 0.40)`,
        };
    }

    return {
        text: `hsl(${hue} 68% 36%)`,
        bg: `hsla(${hue}, 68%, 42%, 0.10)`,
        border: `hsla(${hue}, 68%, 36%, 0.28)`,
    };
};

export const buildPrefixToneMap = (
    prefixes: PrefixItem[],
    theme: AppTheme,
    isDarkMode: boolean
): Record<string, PrefixTone> => {
    const map: Record<string, PrefixTone> = {};

    prefixes.forEach((item) => {
        map[item.downloadFilePath] = getPrefixTone(item.downloadFilePath, theme, isDarkMode);
    });

    return map;
};