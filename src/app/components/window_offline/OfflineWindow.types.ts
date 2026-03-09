// OfflineWindow.types.ts

export type DownloadMethod = 'server' | 'browser';

export type DisplayMode =
    | 'table'
    | 'bigCard'
    | 'smallCard'
    | 'failedCard'
    | 'errorCard'
    | 'updateCard'
    | 'recentCard'
    | 'holdCard'
    | 'earlyAccessCard'
    | 'historyTable'
    | 'aiCard';

export type BatchStatus = "running" | "success" | "fail";

export type BatchResult = {
    batchNo: number;
    start: number;
    end: number;
    status: BatchStatus;
    msg?: string;
};

export type StatusFilter = 'pending' | 'non-pending' | 'both';

export interface CivitaiModelFile {
    name: string;
    downloadUrl: string;
}

export interface ModelVersionObject {
    id: number;
    modelId: number;
    name: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    publishedAt: string;
    trainedWords: string[];
    trainingStatus: any;
    trainingDetails: any;
    baseModel: string;
    baseModelType: any;
    earlyAccessEndsAt: any;
    availability?: 'EarlyAccess' | 'Public' | string;
    description: string;
    uploadType: string;
    air: string;
    stats: {
        downloadCount: number;
        ratingCount: number;
        rating: number;
        thumbsUpCount: number;
    };
    model: {
        name: string;
        type: string;
        nsfw: boolean;
        poi: boolean;
    };
    creator: {
        username: string;
        image: string;
    };
    files: {
        id: number;
        sizeKB: number;
        name: string;
        type: string;
        pickleScanResult: string;
        pickleScanMessage: string | null;
        virusScanResult: string;
        virusScanMessage: string | null;
        scannedAt: string;
        metadata: {
            format: string;
            size: any;
            fp: any;
        };
        hashes: {
            AutoV1: string;
            AutoV2: string;
            SHA256: string;
            CRC32: string;
            BLAKE3: string;
            AutoV3: string;
        };
        primary: boolean;
        downloadUrl: string;
    }[];
    images: {
        url: string;
        nsfwLevel: number;
        width: number;
        height: number;
        hash: string;
        type: string;
        metadata: {
            hash: string;
            size: number;
            width: number;
            height: number;
        };
        meta: any;
        availability: string;
        hasMeta: boolean;
        onSite: boolean;
    }[];
    downloadUrl: string;
}

export interface OfflineDownloadEntry {
    civitaiFileName: string;
    civitaiModelFileList: CivitaiModelFile[];
    modelVersionObject: ModelVersionObject;
    civitaiBaseModel: string;
    downloadFilePath: string;
    civitaiUrl: string;
    civitaiVersionID: string;
    civitaiModelID: string;
    imageUrlsArray: (string | { url: string; width?: number; height?: number; nsfw?: any })[];
    selectedCategory: string;
    civitaiTags: string[];
    hold?: boolean;
    isError?: boolean;
    downloadPriority?: number;
    earlyAccessEndsAt?: string | null;

    aiSuggestedArtworkTitle?: string | null;
    jikanNormalizedArtworkTitle?: string | null;

    aiSuggestedDownloadFilePath?: string[];
    jikanSuggestedDownloadFilePath?: string[];
    localSuggestedDownloadFilePath?: string[];
}

export interface ModelOfflineDownloadHistoryEntry {
    civitaiModelID: number;
    civitaiVersionID: number;
    imageUrl: string;
    createdAt: string;
    updatedAt: string;
}