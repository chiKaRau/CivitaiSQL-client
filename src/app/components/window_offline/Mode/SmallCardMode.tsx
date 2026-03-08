// SmallCardMode.tsx

import React from 'react';
import { Card } from 'react-bootstrap';
import { TfiCheckBox } from 'react-icons/tfi';
import { LuPanelLeftOpen } from 'react-icons/lu';
import { OfflineDownloadEntry } from '../OfflineWindow.types';

interface SmallCardModeProps {
    filteredDownloadList: OfflineDownloadEntry[];
    isDarkMode: boolean;
    isModifyMode: boolean;
    canChangeSelection: boolean;
    selectedIds: Set<string>;
    activePreviewId: string | null;
    toggleSelect: (id: string) => void;
    handleSelectAll: () => void;
    onToggleOverlay: (entry: OfflineDownloadEntry) => void;

    displayMode?: string;
    styles: any;
    isInteractiveClickTarget: (target: any) => boolean;
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

const SmallCardMode: React.FC<SmallCardModeProps> = ({
    filteredDownloadList,
    isDarkMode,
    isModifyMode,
    selectedIds,
    toggleSelect,
    activePreviewId,
    handleSelectAll,
    onToggleOverlay,
    canChangeSelection,
    displayMode,
    styles,
    isInteractiveClickTarget,
    isEntryEarlyAccess,
    getEarlyAccessEndsAt,
    formatLocalDateTime,
    normalizeImg,
    withWidth,
    buildSrcSet,
}) => {
    if (filteredDownloadList.length === 0) {
        return (
            <div style={{ color: isDarkMode ? '#fff' : '#000' }}>
                No downloads available.
            </div>
        );
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    justifyContent: 'center',
                }}
            >
                {filteredDownloadList.map((entry, cardIndex) => {
                    const selectionDisabled =
                        displayMode === 'recentCard' ||
                        displayMode === 'holdCard' ||
                        displayMode === 'earlyAccessCard' ||
                        displayMode === 'historyTable' ||
                        displayMode === 'errorCard';

                    const canSelect = !selectionDisabled && canChangeSelection;

                    const baseBg = isDarkMode ? '#333' : '#fff';
                    const selectedBg = isDarkMode ? '#1f2937' : '#eaf2ff';
                    const baseBorder = isDarkMode ? '#555' : '#ccc';
                    const selectedBorder = isDarkMode ? '#60A5FA' : '#2563eb';

                    const baseShadow = isDarkMode
                        ? '2px 2px 8px rgba(255,255,255,0.1)'
                        : '2px 2px 8px rgba(0,0,0,0.1)';

                    const selectedShadow = isDarkMode
                        ? '0 0 0 2px rgba(96,165,250,0.35), 2px 2px 10px rgba(255,255,255,0.12)'
                        : '0 0 0 2px rgba(37,99,235,0.25), 2px 2px 10px rgba(0,0,0,0.12)';

                    const isSelected = selectedIds.has(entry.civitaiVersionID);
                    const showEA = isEntryEarlyAccess(entry);
                    const firstImageUrl = entry.imageUrlsArray?.[0] ?? null;
                    const isFirstCard = cardIndex === 0;

                    return (
                        <Card
                            key={cardIndex}
                            style={{
                                width: '100%',
                                maxWidth: '180px',
                                border: '1px solid',
                                borderColor: isSelected ? selectedBorder : baseBorder,
                                borderRadius: '8px',
                                boxShadow: isSelected ? selectedShadow : baseShadow,
                                backgroundColor: isSelected ? selectedBg : baseBg,
                                color: isDarkMode ? '#fff' : '#000',
                                position: 'relative',
                                cursor: canSelect ? 'pointer' : 'default',
                                opacity: isModifyMode && canSelect && !isSelected ? 0.8 : 1,
                                transition:
                                    'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
                                overflow: 'hidden',
                                margin: '0 auto',
                                padding: '10px',
                            }}
                            onClick={(e) => {
                                if (!canSelect) return;
                                if (isInteractiveClickTarget(e.target)) return;
                                toggleSelect(entry.civitaiVersionID);
                            }}
                            onKeyDown={(e) => {
                                if (!canSelect) return;
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleSelect(entry.civitaiVersionID);
                                }
                            }}
                            role={canSelect ? 'button' : undefined}
                            tabIndex={canSelect ? 0 : -1}
                            aria-pressed={canSelect ? isSelected : undefined}
                        >
                            {isSelected && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 8,
                                        left: 8,
                                        background: isDarkMode ? 'rgba(37,99,235,0.9)' : '#2563eb',
                                        color: '#fff',
                                        borderRadius: 999,
                                        padding: '2px 8px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        pointerEvents: 'none',
                                        zIndex: 2,
                                    }}
                                >
                                    <TfiCheckBox /> Selected
                                </div>
                            )}

                            {showEA && (
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
                                    {(() => {
                                        const ends = getEarlyAccessEndsAt(entry);
                                        return ends ? formatLocalDateTime(ends) : 'Early Access Only';
                                    })()}
                                </div>
                            )}

                            <div
                                style={{
                                    marginTop: '40px',
                                    marginBottom: '4px',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                    paddingBottom: '4px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {entry.modelVersionObject?.baseModel && (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            fontSize: '0.65rem',
                                            fontWeight: 'bold',
                                            backgroundColor: '#007bff',
                                            color: '#fff',
                                            padding: '2px 5px',
                                            borderRadius: '4px',
                                            marginRight: '5px',
                                        }}
                                    >
                                        {entry.modelVersionObject.baseModel}
                                    </span>
                                )}

                                <span
                                    style={{
                                        fontSize: '0.85rem',
                                    }}
                                    title={entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                >
                                    {entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                </span>
                            </div>

                            {firstImageUrl ? (() => {
                                const { url, width, height } =
                                    typeof firstImageUrl === 'string'
                                        ? { url: firstImageUrl, width: undefined, height: undefined }
                                        : normalizeImg(firstImageUrl as any);

                                const thumbW = 180;

                                return (
                                    <img
                                        src={withWidth(url, thumbW)}
                                        srcSet={buildSrcSet(url, [160, 200, 320])}
                                        sizes="(max-width: 200px) 100vw, 180px"
                                        loading={isFirstCard ? 'eager' : 'lazy'}
                                        decoding="async"
                                        width={width ?? undefined}
                                        height={height ?? undefined}
                                        alt={`Thumbnail ${cardIndex + 1}`}
                                        style={{
                                            width: '100%',
                                            maxHeight: '100px',
                                            objectFit: 'contain',
                                            borderRadius: '4px',
                                            marginBottom: '2px',
                                        }}
                                    />
                                );
                            })() : (
                                <div
                                    style={{
                                        height: '100px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isDarkMode ? '#555' : '#f0f0f0',
                                        marginBottom: '2px',
                                        borderRadius: '4px',
                                    }}
                                >
                                    <span>No Image</span>
                                </div>
                            )}

                            <div
                                style={{
                                    fontSize: '0.7rem',
                                    lineHeight: 1.2,
                                    marginTop: '2px',
                                    marginBottom: '0px',
                                }}
                            >
                                <div
                                    style={{
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        marginBottom: '4px',
                                    }}
                                    title={entry.modelVersionObject?.name ?? 'N/A'}
                                >
                                    <strong>Ver:</strong> {entry.modelVersionObject?.name ?? 'N/A'}
                                </div>

                                <p
                                    style={{
                                        margin: '4px 0',
                                        whiteSpace: 'normal',
                                        wordWrap: 'break-word',
                                    }}
                                >
                                    <strong>Path:</strong> {entry.downloadFilePath ?? 'N/A'}
                                </p>

                                <p
                                    style={{
                                        margin: '4px 0',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    title={entry.selectedCategory ?? 'N/A'}
                                >
                                    <strong>Cat:</strong> {entry.selectedCategory ?? 'N/A'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleOverlay(entry);
                                }}
                                title="Preview in left panel"
                                aria-label="Preview in left panel"
                                style={
                                    activePreviewId === entry.civitaiVersionID
                                        ? styles.previewBtnActiveStyle
                                        : styles.previewBtnStyle
                                }
                            >
                                <LuPanelLeftOpen size={18} />
                            </button>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default SmallCardMode;