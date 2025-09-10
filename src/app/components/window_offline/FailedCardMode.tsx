// FailedCardMode.tsx

import React from 'react';
import { Card, Form, Carousel } from 'react-bootstrap';

interface ModelVersionObject {
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
    earlyAccessConfig: any;
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

// TypeScript Interfaces
interface CivitaiModelFile {
    name: string;
    downloadUrl: string;
}

interface OfflineDownloadEntry {
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
}

interface FailedCardModeProps {
    failedEntries: OfflineDownloadEntry[];
    isDarkMode: boolean;
    selectedIds: Set<string>;
    toggleSelect: (id: string) => void;
    isModifyMode: boolean;
}

const FailedCardMode: React.FC<FailedCardModeProps> = ({
    failedEntries,
    isDarkMode,
    selectedIds,
    toggleSelect,
    isModifyMode
}) => {
    if (failedEntries.length === 0) {
        return (
            <div style={{ color: isDarkMode ? '#fff' : '#000' }}>
                No failed downloads.
            </div>
        );
    }

    const IMG_WIDTH_RE = /\/width=\d+\//;
    function withWidth(url: string, w: number) {
        return IMG_WIDTH_RE.test(url)
            ? url.replace(IMG_WIDTH_RE, `/width=${w}/`)
            : url.replace(/\/([^\/?#]+)([?#]|$)/, `/width=${w}/$1$2`);
    }

    function buildSrcSet(url: string, widths: number[]) {
        return widths.map(w => `${withWidth(url, w)} ${w}w`).join(', ');
    }

    function normalizeImg(img: string | { url: string; width?: number; height?: number }) {
        return typeof img === 'string'
            ? { url: img, width: undefined, height: undefined }
            : { url: img.url, width: img.width, height: img.height };
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '20px',
                    justifyContent: 'center'
                }}
            >
                {failedEntries.map((entry, cardIndex) => {
                    const isSelected = selectedIds.has(entry.civitaiVersionID);
                    const earlyEnds = entry.modelVersionObject?.earlyAccessEndsAt;
                    return (
                        <Card
                            key={cardIndex}
                            style={{
                                width: '100%',
                                maxWidth: '380px',
                                border: '1px solid',
                                borderColor: isDarkMode ? '#555' : '#ccc',
                                borderRadius: '8px',
                                boxShadow: isDarkMode
                                    ? '2px 2px 8px rgba(255,255,255,0.1)'
                                    : '2px 2px 8px rgba(0,0,0,0.1)',
                                backgroundColor: isDarkMode ? '#333' : '#fff',
                                color: isDarkMode ? '#fff' : '#000',
                                position: 'relative',
                                cursor: isModifyMode ? 'pointer' : 'default',
                                opacity: isModifyMode && !isSelected ? 0.8 : 1,
                                transition:
                                    'background-color 0.3s ease, color 0.3s ease, opacity 0.3s ease',
                                overflow: 'hidden',
                                margin: '0 auto',
                                padding: '10px'
                            }}
                            onClick={(e) => {
                                if (isModifyMode && e.ctrlKey) {
                                    toggleSelect(entry.civitaiVersionID);
                                }
                            }}
                        >
                            {/* Early Access badge at the top-right */}
                            {earlyEnds && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '5px',
                                        right: '5px',
                                        color: 'red',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem',
                                        backgroundColor: isDarkMode ? '#444' : '#fff',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
                                    }}
                                >
                                    Ends: {new Date(earlyEnds).toLocaleString()}
                                </div>
                            )}

                            {/* Selection Checkbox at the top-left */}
                            <Form.Check
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSelect(entry.civitaiVersionID);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    transform: 'scale(1.2)',
                                    cursor: isModifyMode ? 'pointer' : 'not-allowed',
                                    accentColor: isDarkMode ? '#fff' : '#000',
                                }}
                            />

                            {/* ---- 1) BaseModel badge + Title ---- */}
                            <div
                                style={{
                                    marginTop: '40px', // push down below the checkbox row
                                    marginBottom: '5px',
                                    textAlign: 'center',
                                    borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                    paddingBottom: '5px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {/* BaseModel as a badge, only if present */}
                                {entry.modelVersionObject?.baseModel && (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            backgroundColor: '#dc3545', // Red color for failed
                                            color: '#fff',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            marginRight: '6px',
                                        }}
                                    >
                                        Failed
                                    </span>
                                )}
                                {/* Model title */}
                                <span
                                    style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold',
                                    }}
                                    title={entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                >
                                    {entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                </span>
                            </div>

                            {/* Carousel for Images */}
                            {entry.imageUrlsArray && entry.imageUrlsArray.length > 0 ? (
                                <Carousel
                                    variant={isDarkMode ? 'dark' : 'light'}
                                    indicators={entry.imageUrlsArray.length > 1}
                                    controls={entry.imageUrlsArray.length > 1}
                                    interval={null}
                                    style={{ marginBottom: 0 }}
                                >
                                    {entry.imageUrlsArray.map((img, imgIndex) => {
                                        // IMPORTANT: don't annotate as string; it's a union.
                                        const { url, width, height } = normalizeImg(img);
                                        const cardW = 380; // pick a reasonable display width for failed cards

                                        return (
                                            <Carousel.Item key={imgIndex}>
                                                <img
                                                    className="d-block w-100"
                                                    src={withWidth(url, cardW)}                          // request thumbnail
                                                    srcSet={buildSrcSet(url, [320, 480, 640, 800])}      // responsive candidates
                                                    sizes="(max-width: 420px) 100vw, 380px"
                                                    loading={imgIndex === 0 && cardIndex === 0 ? 'eager' : 'lazy'}
                                                    decoding="async"
                                                    width={width ?? undefined}
                                                    height={height ?? undefined}
                                                    alt={`Slide ${imgIndex + 1}`}
                                                    style={{ maxHeight: '300px', objectFit: 'contain', margin: '0 auto' }}
                                                />
                                            </Carousel.Item>
                                        );
                                    })}
                                </Carousel>
                            ) : (
                                <div
                                    style={{
                                        height: '200px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isDarkMode ? '#555' : '#f0f0f0',
                                        marginBottom: 0,
                                        borderRadius: '4px',
                                    }}
                                >
                                    <span>No Images Available</span>
                                </div>
                            )}


                            {/* 3) Smaller text under the carousel */}
                            <div
                                style={{
                                    marginTop: '5px',
                                    fontSize: '0.8rem', // smaller text
                                    lineHeight: 1.3,
                                    padding: '0 5px',
                                }}
                            >
                                {/* Version Name */}
                                <div
                                    style={{
                                        textAlign: 'center',
                                        wordWrap: 'break-word',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    title={entry.modelVersionObject?.name ?? 'N/A'}
                                >
                                    <strong>Version:</strong> {entry.modelVersionObject?.name ?? 'N/A'}
                                </div>

                                {/* File Name */}
                                <p
                                    style={{
                                        margin: '4px 0',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    title={entry.civitaiFileName ?? 'N/A'}
                                >
                                    <strong>File Name:</strong> {entry.civitaiFileName ?? 'N/A'}
                                </p>

                                {/* 3) Show full download path with line wrapping */}
                                <p
                                    style={{
                                        margin: '4px 0',
                                        whiteSpace: 'normal',     // allow multi-line
                                        wordWrap: 'break-word',   // wrap long paths
                                    }}
                                >
                                    <strong>Download Path:</strong> {entry.downloadFilePath ?? 'N/A'}
                                </p>

                                {/* Category */}
                                <p style={{ margin: '4px 0' }}>
                                    <strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}
                                </p>

                                <p style={{ margin: '4px 0' }}>
                                    <strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}
                                </p>
                                <p style={{ margin: '4px 0' }}>
                                    <strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}
                                </p>
                                <p style={{ margin: '4px 0' }}>
                                    <strong>URL:</strong>{' '}
                                    {entry.civitaiUrl ? (
                                        <a
                                            href={entry.civitaiUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: isDarkMode ? '#1e90ff' : '#007bff' }}
                                        >
                                            Visit Model
                                        </a>
                                    ) : (
                                        'N/A'
                                    )}
                                </p>
                                <p style={{ margin: '4px 0' }}>
                                    <strong>File Size:</strong>{' '}
                                    {(() => {
                                        const safetensorFile =
                                            entry.modelVersionObject?.files?.find(file =>
                                                file.name.endsWith('.safetensors')
                                            );
                                        return safetensorFile
                                            ? `${(safetensorFile.sizeKB / 1024).toFixed(2)} MB`
                                            : 'N/A';
                                    })()}
                                </p>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default FailedCardMode;
