// BigCardMode.tsx

import React from 'react';
import { Card, Carousel, Form, Button, Dropdown, ButtonGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { BsPencilFill, BsCloudDownloadFill } from 'react-icons/bs';
import { MdRefresh } from 'react-icons/md';
import { TfiCheckBox } from 'react-icons/tfi';
import { FaTrashAlt, FaTimes } from 'react-icons/fa';
import { FaCheck } from 'react-icons/fa6';
import { FcDownload } from 'react-icons/fc';
import { LuPanelLeftOpen } from 'react-icons/lu';
import TitleNameToggle from '../TitleNameToggle';
import FileNameToggle from '../FileNameToggle';
import TagList from '../TagList';
import DownloadPathEditor from '../DownloadPathEditor';
import { OfflineDownloadEntry } from '../OfflineWindow.types';

type DownloadMethod = 'server' | 'browser';

interface BigCardModeProps {
    filteredDownloadList: OfflineDownloadEntry[];
    isDarkMode: boolean;
    isModifyMode: boolean;
    selectedIds: Set<string>;
    toggleSelect: (id: string) => void;
    handleSelectAll: () => void;
    showGalleries: boolean;
    onToggleOverlay: (entry: OfflineDownloadEntry) => void;
    onRefreshRecord?: (entry: OfflineDownloadEntry) => void;
    activePreviewId: string | null;
    canChangeSelection: boolean;
    displayMode?: string;
    onErrorCardDownload?: (entry: OfflineDownloadEntry, method: DownloadMethod) => void;
    onToggleIsError?: (entry: OfflineDownloadEntry) => void;

    isLoading: boolean;
    editingPathId: string | null;
    setEditingPathId: (id: string | null) => void;
    handleDownloadPathSave: (entry: OfflineDownloadEntry, nextPath: string) => void;
    handleHoldChange: (entry: OfflineDownloadEntry, nextHold: boolean) => void;
    handlePriorityChange: (entry: OfflineDownloadEntry, nextPriority: number) => void;
    handleRemoveOne: (entry: OfflineDownloadEntry) => void;
    handleCreateAddDummyFromError: (entry: OfflineDownloadEntry) => void;
    dummyCreateStatusByVid: Record<
        string,
        { phase: 'idle' | 'downloading' | 'inserting' | 'success' | 'fail'; text: string; msg?: string; running?: boolean }
    >;

    showAiSuggestionsPanel: boolean;
    selectedSuggestedPathByVid: Record<string, string>;
    setSelectedSuggestedPathByVid: React.Dispatch<React.SetStateAction<Record<string, string>>>;

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

    mergeSuggestedPathsForEntry: (entry: OfflineDownloadEntry) => string[];
    normalizePathKey: (p: string) => string;
}

const BigCardMode: React.FC<BigCardModeProps> = ({
    filteredDownloadList,
    isDarkMode,
    isModifyMode,
    selectedIds,
    toggleSelect,
    handleSelectAll,
    showGalleries,
    onToggleOverlay,
    onRefreshRecord,
    activePreviewId,
    displayMode,
    onErrorCardDownload,
    canChangeSelection,
    onToggleIsError,
    isLoading,
    editingPathId,
    setEditingPathId,
    handleDownloadPathSave,
    handleHoldChange,
    handlePriorityChange,
    handleRemoveOne,
    handleCreateAddDummyFromError,
    dummyCreateStatusByVid,
    showAiSuggestionsPanel,
    selectedSuggestedPathByVid,
    setSelectedSuggestedPathByVid,
    styles,
    isInteractiveClickTarget,
    isEntryEarlyAccess,
    getEarlyAccessEndsAt,
    formatLocalDateTime,
    normalizeImg,
    withWidth,
    buildSrcSet,
    mergeSuggestedPathsForEntry,
    normalizePathKey,
}) => {
    const [errorDownloadMethod, setErrorDownloadMethod] = React.useState<'server' | 'browser'>('browser');

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
                    gap: '20px',
                    justifyContent: 'center'
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

                    return (
                        <Card
                            key={cardIndex}
                            style={{
                                width: '100%',
                                maxWidth: '380px',
                                border: '1px solid',
                                borderColor: isSelected ? selectedBorder : baseBorder,
                                borderRadius: '8px',
                                boxShadow: isSelected ? selectedShadow : baseShadow,
                                backgroundColor: isSelected ? selectedBg : baseBg,
                                color: isDarkMode ? '#fff' : '#000',
                                position: 'relative',
                                cursor: canSelect ? 'pointer' : 'default',
                                opacity: isModifyMode && canSelect && !isSelected ? 0.8 : 1,
                                transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
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
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    right: 8,
                                    zIndex: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    pointerEvents: 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', pointerEvents: 'auto' }}>
                                    <div
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            background: isDarkMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.85)',
                                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'}`,
                                            backdropFilter: 'blur(2px)',
                                            fontSize: 12,
                                            fontWeight: 800,
                                            color: isDarkMode ? '#fff' : '#111',
                                            pointerEvents: 'auto',
                                        }}
                                    >
                                        <span style={{ minWidth: 18, textAlign: 'center' }}>
                                            {cardIndex + 1}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRefreshRecord?.(entry);
                                            }}
                                            disabled={isLoading}
                                            title="Refresh/update this record"
                                            aria-label="Refresh/update this record"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 22,
                                                height: 22,
                                                borderRadius: 8,
                                                border: isDarkMode
                                                    ? '1px solid rgba(255,255,255,0.18)'
                                                    : '1px solid rgba(0,0,0,0.18)',
                                                background: 'transparent',
                                                color: 'inherit',
                                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                                padding: 0,
                                                opacity: isLoading ? 0.6 : 1,
                                            }}
                                        >
                                            <MdRefresh size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        marginLeft: -100,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    {isSelected && (
                                        <div
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                background: isDarkMode ? 'rgba(37,99,235,0.9)' : '#2563eb',
                                                color: '#fff',
                                                borderRadius: 999,
                                                padding: '2px 8px',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            <TfiCheckBox /> Selected
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', pointerEvents: 'auto' }}>
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
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginTop: '40px',
                                    marginBottom: '5px',
                                    borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                    paddingBottom: '5px',
                                }}
                            >
                                {entry.modelVersionObject?.baseModel && (
                                    <span
                                        style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            backgroundColor: '#007bff',
                                            color: '#fff',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            marginRight: '6px',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {entry.modelVersionObject.baseModel}
                                    </span>
                                )}

                                <div style={{ flex: 1, minWidth: 0 }} data-no-select="true">
                                    <TitleNameToggle
                                        titleName={entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                        truncateAfter={30}
                                    />
                                </div>
                            </div>

                            {entry.imageUrlsArray && entry.imageUrlsArray.length > 0 ? (
                                showGalleries ? (
                                    <Carousel
                                        variant={isDarkMode ? 'dark' : 'light'}
                                        indicators={entry.imageUrlsArray.length > 1}
                                        controls={entry.imageUrlsArray.length > 1}
                                        interval={null}
                                        style={{ marginBottom: 0 }}
                                    >
                                        {entry.imageUrlsArray.map((img, imgIndex) => {
                                            const { url, width, height } = normalizeImg(img as any);
                                            const baseW = 380;
                                            return (
                                                <Carousel.Item key={imgIndex}>
                                                    <img
                                                        className="d-block w-100"
                                                        src={withWidth(url, baseW)}
                                                        srcSet={buildSrcSet(url, [320, 480, 640, 800])}
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
                                    (() => {
                                        const first = normalizeImg(entry.imageUrlsArray[0] as any);
                                        const baseW = 380;
                                        return (
                                            <img
                                                className="d-block w-100"
                                                src={withWidth(first.url, baseW)}
                                                srcSet={buildSrcSet(first.url, [320, 480, 640, 800])}
                                                sizes="(max-width: 420px) 100vw, 380px"
                                                loading={cardIndex === 0 ? 'eager' : 'lazy'}
                                                decoding="async"
                                                width={first.width ?? undefined}
                                                height={first.height ?? undefined}
                                                alt="Preview"
                                                style={{ maxHeight: '300px', objectFit: 'contain', margin: '0 auto' }}
                                            />
                                        );
                                    })()
                                )
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

                            <div
                                data-no-select="true"
                                style={{
                                    marginTop: '5px',
                                    fontSize: '0.8rem',
                                    lineHeight: 1.3,
                                    padding: '0 5px',
                                }}
                            >
                                <div
                                    data-no-select="true"
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

                                <FileNameToggle
                                    fileName={entry.civitaiFileName ?? 'N/A'}
                                    truncateAfter={40}
                                />

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

                                <div style={{ margin: '4px 0' }}>
                                    {editingPathId === entry.civitaiVersionID ? (
                                        <div>
                                            <strong>Download Path:</strong>
                                            <div style={{ marginTop: 6 }}>
                                                <DownloadPathEditor
                                                    initialValue={entry.downloadFilePath ?? ''}
                                                    isDarkMode={isDarkMode}
                                                    onSave={(nextPath: any) => handleDownloadPathSave(entry, nextPath)}
                                                    onCancel={() => setEditingPathId(null)}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 8,
                                            }}
                                        >
                                            <strong style={{ flexShrink: 0 }}>Download Path:</strong>

                                            <span
                                                data-no-select="true"
                                                style={{
                                                    flex: 1,
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'break-word',
                                                    lineHeight: 1.35,
                                                }}
                                                title={entry.downloadFilePath ?? 'N/A'}
                                            >
                                                {entry.downloadFilePath ?? 'N/A'}
                                            </span>

                                            <button
                                                type="button"
                                                data-no-select="true"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingPathId(entry.civitaiVersionID);
                                                }}
                                                title="Edit download path"
                                                aria-label="Edit download path"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 8,
                                                    border: isDarkMode
                                                        ? '1px solid rgba(255,255,255,0.18)'
                                                        : '1px solid rgba(0,0,0,0.18)',
                                                    background: 'transparent',
                                                    color: isDarkMode ? '#fff' : '#000',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <BsPencilFill size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!showAiSuggestionsPanel && (
                                    <>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}
                                        </p>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}
                                        </p>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}
                                        </p>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Civitai URL:</strong>{' '}
                                            {entry.civitaiUrl ? (
                                                <a
                                                    href={entry.civitaiUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: isDarkMode ? '#1e90ff' : '#007bff' }}
                                                >
                                                    Visit Model
                                                </a>
                                            ) : 'N/A'}
                                        </p>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Creator:</strong> {entry.modelVersionObject?.creator?.username ?? 'N/A'}
                                        </p>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>File Size:</strong>{' '}
                                            {(() => {
                                                const safetensorFile = entry.modelVersionObject?.files?.find(file =>
                                                    file.name.endsWith('.safetensors')
                                                );
                                                return safetensorFile
                                                    ? `${(safetensorFile.sizeKB / 1024).toFixed(2)} MB`
                                                    : 'N/A';
                                            })()}
                                        </p>
                                        <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <strong>isError:</strong>{' '}
                                            <button
                                                type="button"
                                                data-no-select="true"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const ok = window.confirm(
                                                        `Are you sure you want to set isError to ${entry.isError ? 'false' : 'true'} for this entry?`
                                                    );
                                                    if (!ok) return;
                                                    onToggleIsError?.(entry);
                                                }}
                                                title={`Click to set isError to ${entry.isError ? 'false' : 'true'}`}
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    color: entry.isError ? '#22c55e' : '#9ca3af',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {entry.isError ? <FaCheck size={16} /> : <FaTimes size={16} />}
                                            </button>
                                        </p>

                                        {displayMode === 'errorCard' && (
                                            <p style={{ margin: '4px 0' }}>
                                                <strong>Civitai Archive URL:</strong>{' '}
                                                {entry.civitaiModelID && entry.civitaiVersionID ? (
                                                    <a
                                                        href={`https://civitaiarchive.com/models/${entry.civitaiModelID}?modelVersionId=${entry.civitaiVersionID}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: isDarkMode ? '#1e90ff' : '#007bff' }}
                                                    >
                                                        Visit Archive
                                                    </a>
                                                ) : 'N/A'}
                                            </p>
                                        )}
                                    </>
                                )}

                                {showAiSuggestionsPanel && (
                                    <div style={{ marginTop: 8 }}>
                                        <strong>AI suggestion</strong>

                                        <p>
                                            <strong>Gemini Suggested Title:</strong>{' '}
                                            <span
                                                title={entry.aiSuggestedArtworkTitle || ''}
                                                style={{
                                                    flex: 1,
                                                    whiteSpace: 'normal',
                                                    overflowWrap: 'anywhere',
                                                    wordBreak: 'break-word',
                                                    opacity: entry.aiSuggestedArtworkTitle ? 1 : 0.7,
                                                }}
                                            >
                                                {entry.aiSuggestedArtworkTitle || '(none)'}
                                            </span>
                                        </p>

                                        <p>
                                            <strong>Jikan Normalized Title:</strong>{' '}
                                            <span
                                                title={entry.jikanNormalizedArtworkTitle || ''}
                                                style={{
                                                    flex: 1,
                                                    whiteSpace: 'normal',
                                                    overflowWrap: 'anywhere',
                                                    wordBreak: 'break-word',
                                                    opacity: entry.jikanNormalizedArtworkTitle ? 1 : 0.7,
                                                }}
                                            >
                                                {entry.jikanNormalizedArtworkTitle || '(none)'}
                                            </span>
                                        </p>

                                        {(() => {
                                            const suggestedPaths = mergeSuggestedPathsForEntry(entry);
                                            const vidKey = entry.civitaiVersionID;

                                            const hasUserPick = Object.prototype.hasOwnProperty.call(selectedSuggestedPathByVid, vidKey);
                                            const selectedPath = hasUserPick
                                                ? (selectedSuggestedPathByVid[vidKey] ?? '')
                                                : (suggestedPaths[0] ?? '');

                                            const selectedKey = normalizePathKey(selectedPath);

                                            const clearSelected = (e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                setSelectedSuggestedPathByVid((prev) => ({ ...prev, [vidKey]: '' }));
                                            };

                                            if (suggestedPaths.length === 0) {
                                                return (
                                                    <div style={{ marginTop: 6, opacity: 0.85 }}>
                                                        N/A
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div style={{ marginTop: 6 }}>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        <strong>Selected:</strong>
                                                        <span
                                                            title={selectedPath || ''}
                                                            style={{
                                                                flex: 1,
                                                                whiteSpace: 'normal',
                                                                overflowWrap: 'anywhere',
                                                                wordBreak: 'break-word',
                                                                opacity: selectedPath ? 1 : 0.7,
                                                                padding: '6px 10px',
                                                                borderRadius: 10,
                                                                border: `1px solid ${isDarkMode ? 'rgba(96,165,250,0.45)' : 'rgba(13,110,253,0.35)'}`,
                                                                background: isDarkMode ? 'rgba(96,165,250,0.12)' : 'rgba(13,110,253,0.08)',
                                                                boxShadow: isDarkMode ? '0 0 0 2px rgba(96,165,250,0.10)' : '0 0 0 2px rgba(13,110,253,0.06)',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {selectedPath || '(none)'}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={clearSelected}
                                                            disabled={!selectedPath}
                                                            style={{
                                                                borderRadius: 8,
                                                                padding: '4px 10px',
                                                                cursor: selectedPath ? 'pointer' : 'not-allowed',
                                                                border: isDarkMode ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(0,0,0,0.18)',
                                                                background: 'transparent',
                                                                color: isDarkMode ? '#fff' : '#000',
                                                                opacity: selectedPath ? 1 : 0.5,
                                                            }}
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>

                                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                                        Suggested paths ({suggestedPaths.length})
                                                    </div>

                                                    <div style={{ maxHeight: 132, overflowY: 'auto', paddingRight: 6 }}>
                                                        <ul
                                                            style={{
                                                                margin: 0,
                                                                padding: 0,
                                                                listStyle: 'none',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 8,
                                                            }}
                                                        >
                                                            {suggestedPaths.map((p) => {
                                                                const isSelectedSuggestion =
                                                                    selectedKey && normalizePathKey(p) === selectedKey;

                                                                return (
                                                                    <li key={p}>
                                                                        <button
                                                                            type="button"
                                                                            title={p}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedSuggestedPathByVid((prev) => ({ ...prev, [vidKey]: p }));
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                borderRadius: 10,
                                                                                padding: '8px 10px',
                                                                                cursor: 'pointer',
                                                                                textAlign: 'left',
                                                                                border: isSelectedSuggestion
                                                                                    ? (isDarkMode ? '1px solid rgba(96,165,250,0.9)' : '1px solid rgba(37,99,235,0.9)')
                                                                                    : (isDarkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.14)'),
                                                                                background: isSelectedSuggestion
                                                                                    ? (isDarkMode ? 'rgba(96,165,250,0.14)' : 'rgba(37,99,235,0.10)')
                                                                                    : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'),
                                                                                color: isDarkMode ? '#fff' : '#000',
                                                                            }}
                                                                        >
                                                                            <span
                                                                                style={{
                                                                                    display: 'block',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    whiteSpace: 'nowrap',
                                                                                }}
                                                                            >
                                                                                {p}
                                                                            </span>
                                                                        </button>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            <div style={styles.controlRowStyle}>
                                <Form.Check
                                    type="checkbox"
                                    id={`hold-${entry.civitaiModelID}-${entry.civitaiVersionID}`}
                                    label={<span style={{ fontWeight: 600 }}>Hold</span>}
                                    checked={Boolean(entry.hold)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleHoldChange(entry, e.target.checked);
                                    }}
                                    disabled={isLoading}
                                    style={{ cursor: 'pointer' }}
                                />

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '.85rem', opacity: .9 }}>Priority</span>
                                    <Form.Select
                                        size="sm"
                                        value={(entry.downloadPriority ?? 10)}
                                        onChange={(e) => {
                                            const next = parseInt(e.target.value, 10);
                                            handlePriorityChange(entry, next);
                                        }}
                                        disabled={isLoading}
                                        style={{
                                            width: 90,
                                            backgroundColor: isDarkMode ? '#444' : '#fff',
                                            color: isDarkMode ? '#fff' : '#000',
                                            border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`
                                        }}
                                        aria-label="Download priority (1–10)"
                                    >
                                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </Form.Select>
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveOne(entry); }}
                                        title="Remove from list"
                                        aria-label="Remove from list"
                                        style={styles.inlineDangerBtnStyle}
                                        disabled={isLoading}
                                    >
                                        <FaTrashAlt size={14} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onToggleOverlay(entry); }}
                                        title="Preview in left panel"
                                        aria-label="Preview in left panel"
                                        style={styles.inlineIconBtnStyle}
                                        disabled={isLoading}
                                    >
                                        <LuPanelLeftOpen size={18} />
                                    </button>
                                </div>

                                {displayMode === 'errorCard' && onErrorCardDownload && (
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={
                                            <Tooltip id={`tooltip-error-download-${entry.civitaiVersionID}`}>
                                                {`Download by ${errorDownloadMethod === 'server' ? 'server' : 'browser'}`}
                                            </Tooltip>
                                        }
                                    >
                                        <Dropdown as={ButtonGroup}>
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onErrorCardDownload(entry, errorDownloadMethod);
                                                }}
                                            >
                                                {errorDownloadMethod === 'server' ? <BsCloudDownloadFill /> : <FcDownload />}
                                            </Button>

                                            <Dropdown.Toggle
                                                split
                                                variant="success"
                                                size="sm"
                                                id={`errorCard-download-${entry.civitaiVersionID}`}
                                            />
                                            <Dropdown.Menu>
                                                <Dropdown.Item
                                                    active={errorDownloadMethod === 'server'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setErrorDownloadMethod('server');
                                                    }}
                                                >
                                                    server
                                                </Dropdown.Item>
                                                <Dropdown.Item
                                                    active={errorDownloadMethod === 'browser'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setErrorDownloadMethod('browser');
                                                    }}
                                                >
                                                    browser
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </OverlayTrigger>
                                )}
                            </div>

                            {displayMode === 'errorCard' && (() => {
                                const vid = entry.civitaiVersionID;
                                const st = dummyCreateStatusByVid[vid];
                                const running = Boolean(st?.running);

                                const color =
                                    st?.phase === 'success' ? (isDarkMode ? '#86efac' : '#166534') :
                                        st?.phase === 'fail' ? (isDarkMode ? '#fca5a5' : '#991b1b') :
                                            (isDarkMode ? '#fde68a' : '#92400e');

                                return (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            justifyContent: 'flex-end',
                                            paddingRight: 2,
                                        }}
                                    >
                                        <Button
                                            size="sm"
                                            variant="warning"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCreateAddDummyFromError(entry);
                                            }}
                                            disabled={isLoading || running}
                                            title="Download with custom downloader + insert into custom DB"
                                        >
                                            Create/Add Dummy
                                        </Button>

                                        <span
                                            style={{
                                                fontSize: 12,
                                                color,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: 260,
                                            }}
                                            title={st?.msg || st?.text || ''}
                                        >
                                            {st?.text || ''}
                                        </span>
                                    </div>
                                );
                            })()}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default BigCardMode;