// PreviewCard.tsx

import React from 'react';
import { Card, Carousel } from 'react-bootstrap';
import { OfflineDownloadEntry } from '../OfflineWindow.types';
import TitleNameToggle from '../TitleNameToggle';
import FileNameToggle from '../FileNameToggle';
import TagList from '../TagList';

interface PreviewCardProps {
    entry: OfflineDownloadEntry;
    isDarkMode: boolean;

    isEntryEarlyAccess: (entry: OfflineDownloadEntry) => boolean;
    getEarlyAccessEndsAt: (entry: OfflineDownloadEntry) => Date | null;
    formatLocalDateTime: (isoOrDate: string | Date) => string;

    normalizeImg: (img: string | { url: string; width?: number; height?: number }) => {
        url: string;
        width?: number;
        height?: number;
    };
    withWidth: (url: string, w: number) => string;
    buildSrcSet: (url: string, widths: number[]) => string;
}

const PreviewCard: React.FC<PreviewCardProps> = ({
    entry,
    isDarkMode,
    isEntryEarlyAccess,
    getEarlyAccessEndsAt,
    formatLocalDateTime,
    normalizeImg,
    withWidth,
    buildSrcSet,
}) => {
    const showEA = isEntryEarlyAccess(entry);
    const [activeIdx, setActiveIdx] = React.useState(0);

    return (
        <Card
            style={{
                width: '100%',
                maxWidth: 520,
                margin: '0 auto',
                border: isDarkMode ? '1px solid #666' : '1px solid #ccc',
                borderRadius: 10,
                backgroundColor: isDarkMode ? '#333' : '#fff',
                color: isDarkMode ? '#fff' : '#000',
                boxShadow: isDarkMode
                    ? '2px 2px 12px rgba(255,255,255,0.08)'
                    : '2px 2px 12px rgba(0,0,0,0.1)',
                position: 'relative',
                padding: 12
            }}
        >
            {showEA && (
                <div
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: isDarkMode ? '#444' : '#fff',
                        color: 'red',
                        fontWeight: 700,
                        fontSize: '.8rem',
                        border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
                        padding: '2px 6px',
                        borderRadius: 6
                    }}
                >
                    {(() => {
                        const ends = getEarlyAccessEndsAt(entry);
                        return ends ? formatLocalDateTime(ends) : 'Early Access Only';
                    })()}
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: 10,
                    marginBottom: 6,
                    borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                    paddingBottom: 6
                }}
            >
                {entry.modelVersionObject?.baseModel && (
                    <span
                        style={{
                            fontSize: '.75rem',
                            fontWeight: 700,
                            background: '#007bff',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: 6,
                            marginRight: 8
                        }}
                    >
                        {entry.modelVersionObject.baseModel}
                    </span>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                    <TitleNameToggle
                        titleName={entry?.modelVersionObject?.model?.name ?? 'N/A'}
                        truncateAfter={40}
                    />
                </div>
            </div>

            {entry.imageUrlsArray?.length ? (
                <div style={{ height: 400, overflow: 'hidden' }}>
                    <Carousel
                        variant={isDarkMode ? 'dark' : 'light'}
                        indicators={entry.imageUrlsArray.length > 1}
                        controls={entry.imageUrlsArray.length > 1}
                        interval={null}
                        style={{ height: '100%', marginBottom: 0, overflow: 'hidden' }}
                        activeIndex={activeIdx}
                        onSelect={(next) => setActiveIdx(next as number)}
                    >
                        {entry.imageUrlsArray.map((img, idx) => {
                            const { url } = normalizeImg(img as any);
                            const len = entry.imageUrlsArray.length;

                            const isActive = idx === activeIdx;
                            const isNear =
                                idx === (activeIdx + 1) % len ||
                                idx === (activeIdx - 1 + len) % len;

                            const widths = isActive
                                ? [520, 720, 960]
                                : isNear
                                    ? [400, 520]
                                    : [200, 320];

                            return (
                                <Carousel.Item key={idx} style={{ height: '400px' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: isDarkMode ? '#2b2b2b' : '#f5f5f5',
                                            borderRadius: 6,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <img
                                            className="d-block"
                                            src={withWidth(url, widths[0])}
                                            srcSet={buildSrcSet(url, widths)}
                                            sizes="(max-width: 560px) 100vw, 520px"
                                            loading={isActive ? 'eager' : 'lazy'}
                                            decoding="async"
                                            alt={`Preview ${idx + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                display: 'block',
                                            }}
                                        />
                                    </div>
                                </Carousel.Item>
                            );
                        })}
                    </Carousel>
                </div>
            ) : (
                <div
                    style={{
                        height: 400,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isDarkMode ? '#555' : '#f0f0f0',
                        borderRadius: 6,
                    }}
                >
                    No Images Available
                </div>
            )}

            <div style={{ marginTop: 8, fontSize: '.9rem', lineHeight: 1.35 }}>
                <div title={entry.modelVersionObject?.name ?? 'N/A'}>
                    <strong>Version:</strong> {entry.modelVersionObject?.name ?? 'N/A'}
                </div>

                <div data-no-select="true">
                    <FileNameToggle
                        fileName={entry.civitaiFileName ?? 'N/A'}
                        truncateAfter={56}
                    />
                </div>

                {Array.isArray(entry.civitaiTags) && entry.civitaiTags.length > 0 && (
                    <div data-no-select="true">
                        <TagList
                            tags={(() => {
                                const base = Array.isArray(entry.civitaiTags) ? entry.civitaiTags : [];

                                const tokenize = (s?: string) =>
                                    (s || '')
                                        .replace(/\.[^/.]+$/, '')
                                        .split(/[^\p{L}\p{N}]+/gu)
                                        .map(x => x.trim())
                                        .filter(Boolean);

                                const fileTags = tokenize(entry.civitaiFileName);
                                const nameTags = tokenize(entry?.modelVersionObject?.model?.name);

                                const isValid = (t: string) => {
                                    const clean = (t || '').trim();
                                    if (clean.length < 2) return false;
                                    if (/^\d+$/u.test(clean)) return false;
                                    if (/^[A-Z]{2}$/u.test(clean)) return false;

                                    const letterCount = (clean.match(/\p{L}/gu) || []).length;
                                    if (letterCount < 2) return false;
                                    return true;
                                };

                                const seen = new Set<string>();
                                const merged: string[] = [];

                                for (const t of [...base, ...fileTags, ...nameTags]) {
                                    const clean = (t || '').trim();
                                    if (!isValid(clean)) continue;

                                    const key = clean.toLowerCase();
                                    if (seen.has(key)) continue;

                                    seen.add(key);
                                    merged.push(clean);
                                }

                                return merged;
                            })()}
                            isDarkMode={isDarkMode}
                        />
                    </div>
                )}

                <div style={{ marginTop: 4, whiteSpace: 'normal', wordWrap: 'break-word' }}>
                    <strong>Download Path:</strong> {entry.downloadFilePath ?? 'N/A'}
                </div>
                <div><strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}</div>
                <div><strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}</div>
                <div><strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}</div>
                <div>
                    <strong>URL:</strong>{' '}
                    {entry.civitaiUrl ? (
                        <a
                            href={entry.civitaiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: isDarkMode ? '#60A5FA' : '#0d6efd' }}
                        >
                            Visit Model
                        </a>
                    ) : 'N/A'}
                </div>
                <div><strong>Creator:</strong> {entry.modelVersionObject?.creator?.username ?? 'N/A'}</div>
                <div>
                    <strong>File Size:</strong>{' '}
                    {(() => {
                        const f = entry.modelVersionObject?.files?.find(file =>
                            file.name.endsWith('.safetensors')
                        );
                        return f ? `${(f.sizeKB / 1024).toFixed(2)} MB` : 'N/A';
                    })()}
                </div>
            </div>
        </Card>
    );
};

export default PreviewCard;