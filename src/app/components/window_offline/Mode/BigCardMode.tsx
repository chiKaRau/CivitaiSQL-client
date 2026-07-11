// BigCardMode.tsx

import React from 'react';
import { Card, Carousel, Form, Button, Dropdown, ButtonGroup, OverlayTrigger, Tooltip, Spinner } from 'react-bootstrap';
import { BsPencilFill, BsCloudDownloadFill } from 'react-icons/bs';
import { TiRefreshOutline } from "react-icons/ti";
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
import SmartImage from '../SmartImage';
import VersionIdEditor from '../VersionIdEditor';
import ModelVersionFileExistsBadge from '../../ModelVersionFileExistsBadge';
import CivitaiUrlLinks from '../../CivitaiUrlLinks';
import CreatorLinks from '../../CreatorLinks';
import CivitaiApiLinks from '../../CivitaiApiLinks';
import { useDispatch } from 'react-redux';
import { fetchAddRecordToDatabase } from '../../../api/civitaiSQL_api';

type DownloadMethod = 'server' | 'browser';

type CartDownloadStatus = "queued" | "downloading" | "success" | "fail";

type AddRecordStatus = {
    phase: 'idle' | 'adding' | 'success' | 'fail';
    text: string;
    msg?: string;
    running?: boolean;
};

interface BigCardModeProps {
    filteredDownloadList: OfflineDownloadEntry[];
    isDarkMode: boolean;
    isModifyMode: boolean;
    selectedIds: Set<string>;
    toggleSelect: (entryOrId: OfflineDownloadEntry | string) => void;
    handleSelectAll: () => void;
    showGalleries: boolean;
    onToggleOverlay: (entry: OfflineDownloadEntry) => void;
    onRefreshRecord?: (entry: OfflineDownloadEntry) => void;
    onRefreshModelVersionObject?: (entry: OfflineDownloadEntry) => void;
    activePreviewId: string | null;
    canChangeSelection: boolean;
    displayMode?: string;
    cartDownloadStatusByVid?: Record<string, CartDownloadStatus>;
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
    handleOpenDownloadPath: (downloadPath: string) => void | Promise<void>;
    dummyCreateStatusByVid: Record<
        string,
        {
            phase: 'idle' | 'downloading' | 'inserting' | 'success' | 'fail';
            text: string;
            msg?: string;
            running?: boolean;
            completedDownloadPath?: string;
            completedDownloadFileName?: string;
        }
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

    editingVersionId: string | null;
    setEditingVersionId: (id: string | null) => void;
    handleVersionIdSave: (entry: OfflineDownloadEntry, nextVersionId: string) => void | Promise<void>;
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
    onRefreshModelVersionObject,
    activePreviewId,
    displayMode,
    cartDownloadStatusByVid,
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
    handleOpenDownloadPath,
    editingVersionId,
    setEditingVersionId,
    handleVersionIdSave,
}) => {
    const dispatch = useDispatch();

    const [errorDownloadMethod, setErrorDownloadMethod] = React.useState<'server' | 'browser'>('browser');
    const [editingVersionValue, setEditingVersionValue] = React.useState("");

    const [addRecordStatusByVid, setAddRecordStatusByVid] = React.useState<Record<string, AddRecordStatus>>({});

    const handleCopyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error("Failed to copy to clipboard:", err);
        }
    };

    const handleAddRecordFromError = async (entry: OfflineDownloadEntry) => {
        const vid = String(entry.civitaiVersionID ?? '').trim();
        if (!vid) return;

        const currentStatus = addRecordStatusByVid[vid];
        if (currentStatus?.running) return;

        const setStatus = (patch: Partial<AddRecordStatus>) => {
            setAddRecordStatusByVid((prev) => ({
                ...prev,
                [vid]: {
                    ...(prev[vid] || { phase: 'idle', text: '' }),
                    ...patch,
                },
            }));
        };

        const selectedCategory = String(entry.selectedCategory ?? '').trim();
        const downloadFilePath = String(entry.downloadFilePath ?? '').trim();

        const civitaiUrl = String(
            (entry as any).civitaiUrl ||
            `https://civitai.com/models/${entry.civitaiModelID}?modelVersionId=${entry.civitaiVersionID}`
        ).trim();

        if (!selectedCategory) {
            setStatus({
                phase: 'fail',
                text: 'Add record failed.',
                msg: 'selectedCategory is empty.',
                running: false,
            });
            return;
        }

        if (!downloadFilePath || downloadFilePath === 'N/A') {
            setStatus({
                phase: 'fail',
                text: 'Add record failed.',
                msg: 'downloadFilePath is empty.',
                running: false,
            });
            return;
        }

        try {
            setStatus({
                phase: 'adding',
                text: 'Adding record...',
                msg: '',
                running: true,
            });

            const isAddRecordSuccessful = await fetchAddRecordToDatabase(
                selectedCategory,
                civitaiUrl,
                downloadFilePath,
                dispatch
            );

            //above is for using the model api to add the record to the database
            //use the version api to add the record to the database
            //so create a new api @PostMapping("/create-record-to-all-tables") with version api version 

            if (isAddRecordSuccessful) {
                setStatus({
                    phase: 'success',
                    text: 'Add record success.',
                    msg: '',
                    running: false,
                });
            } else {
                setStatus({
                    phase: 'fail',
                    text: 'Add record failed.',
                    msg: 'fetchAddRecordToDatabase returned false.',
                    running: false,
                });
            }
        } catch (err: any) {
            setStatus({
                phase: 'fail',
                text: 'Add record failed.',
                msg: err?.response?.data?.message || err?.message || 'Unknown error',
                running: false,
            });
        }
    };

    const REFRESH_HOLD_MS = 1500;
    const refreshHoldTimerRef = React.useRef<number | null>(null);
    const [refreshModelVersionObjectId, setRefreshModelVersionObjectId] = React.useState<string | null>(null);

    const clearRefreshHoldTimer = React.useCallback(() => {
        if (refreshHoldTimerRef.current !== null) {
            window.clearTimeout(refreshHoldTimerRef.current);
            refreshHoldTimerRef.current = null;
        }
    }, []);

    React.useEffect(() => {
        return () => {
            if (refreshHoldTimerRef.current !== null) {
                window.clearTimeout(refreshHoldTimerRef.current);
            }
        };
    }, []);

    const startRefreshHold = React.useCallback((versionId: string) => {
        if (!onRefreshModelVersionObject || isLoading) return;

        clearRefreshHoldTimer();
        setRefreshModelVersionObjectId(null);

        refreshHoldTimerRef.current = window.setTimeout(() => {
            setRefreshModelVersionObjectId(versionId);
            refreshHoldTimerRef.current = null;
        }, REFRESH_HOLD_MS);
    }, [clearRefreshHoldTimer, isLoading, onRefreshModelVersionObject]);

    const stopRefreshHold = React.useCallback((versionId?: string) => {
        clearRefreshHoldTimer();

        if (!versionId) {
            setRefreshModelVersionObjectId(null);
            return;
        }

        setRefreshModelVersionObjectId((current) => (
            current === versionId ? null : current
        ));
    }, [clearRefreshHoldTimer]);


    const renderCartDownloadBadge = (status?: CartDownloadStatus) => {
        if (!status) return null;

        const STATUS_BADGE_SHIFT_X = 30;

        const baseStyle = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 700,
            pointerEvents: 'none' as const,
            whiteSpace: 'nowrap' as const,
            border: '1px solid transparent',
            transform: `translateX(${STATUS_BADGE_SHIFT_X}px)`,
        };

        if (status === "queued") {
            return (
                <div
                    title="Queued"
                    aria-label="Queued"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        ...baseStyle,
                        pointerEvents: 'auto',
                        background: isDarkMode ? 'rgba(107,114,128,0.9)' : '#e5e7eb',
                        color: isDarkMode ? '#fff' : '#374151',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
                    }}
                >
                    <BsCloudDownloadFill size={13} />
                </div>
            );
        }

        if (status === "downloading") {
            return (
                <div
                    title="Downloading"
                    aria-label="Downloading"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        ...baseStyle,
                        pointerEvents: 'auto',
                        background: isDarkMode ? 'rgba(37,99,235,0.9)' : '#dbeafe',
                        color: isDarkMode ? '#fff' : '#1d4ed8',
                        borderColor: isDarkMode ? 'rgba(147,197,253,0.35)' : 'rgba(37,99,235,0.25)',
                    }}
                >
                    <BsCloudDownloadFill size={13} />
                    <Spinner
                        animation="border"
                        size="sm"
                        style={{
                            width: 12,
                            height: 12,
                            borderWidth: 2,
                        }}
                    />
                </div>
            );
        }

        if (status === "success") {
            return (
                <div
                    title="Downloaded"
                    aria-label="Downloaded"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        ...baseStyle,
                        pointerEvents: 'auto',
                        background: isDarkMode ? 'rgba(22,101,52,0.9)' : '#dcfce7',
                        color: isDarkMode ? '#fff' : '#166534',
                        borderColor: isDarkMode ? 'rgba(134,239,172,0.35)' : 'rgba(22,163,74,0.25)',
                    }}
                >
                    <BsCloudDownloadFill size={13} />
                    <FaCheck size={12} />
                </div>
            );
        }

        return (
            <div
                title="Download failed"
                aria-label="Download failed"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...baseStyle,
                    pointerEvents: 'auto',
                    background: isDarkMode ? 'rgba(127,29,29,0.9)' : '#fee2e2',
                    color: isDarkMode ? '#fff' : '#991b1b',
                    borderColor: isDarkMode ? 'rgba(252,165,165,0.35)' : 'rgba(220,38,38,0.25)',
                }}
            >
                <BsCloudDownloadFill size={13} />
                <FaTimes size={12} color="#ef4444" />
            </div>
        );
    };

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

                    const isPreviewing = activePreviewId === entry.civitaiVersionID;

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
                    const cartDownloadStatus =
                        displayMode === "cartCard"
                            ? cartDownloadStatusByVid?.[String(entry.civitaiVersionID ?? "")]
                            : undefined;

                    const showEA = isEntryEarlyAccess(entry);

                    const canOpenPath =
                        !!entry.downloadFilePath &&
                        entry.downloadFilePath.trim() !== '' &&
                        entry.downloadFilePath !== 'N/A';

                    const isEditingThisPath = editingPathId === entry.civitaiVersionID;

                    const refreshKey = String(entry.civitaiVersionID ?? entry.modelVersionObject?.id ?? '');
                    const isRefreshingModelVersionObject = refreshModelVersionObjectId === refreshKey;

                    const titleSuffixSuggestions = Array.from(
                        new Set(
                            [
                                entry.aiSuggestedArtworkTitle,
                                entry.jikanNormalizedArtworkTitle,
                            ]
                                .map((v) => (v ?? "").trim())
                                .filter(Boolean)
                        )
                    );

                    const badgeModelId = String(
                        entry.civitaiModelID ?? entry.modelVersionObject?.modelId ?? ""
                    );

                    const badgeVersionId = String(
                        entry.civitaiVersionID ?? entry.modelVersionObject?.id ?? ""
                    );

                    const addRecordStatus = addRecordStatusByVid[String(entry.civitaiVersionID ?? '')];
                    const addRecordRunning = Boolean(addRecordStatus?.running);
                    const isAddRecordFailedError =
                        /Add record failed for\s+\d+_\d+/i.test(String(entry.errorMessage ?? ''));

                    return (
                        <Card
                            key={`${entry.civitaiModelID}-${entry.civitaiVersionID}`}
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
                                toggleSelect(entry);
                            }}
                            onKeyDown={(e) => {
                                if (!canSelect) return;

                                const target = e.target as HTMLElement | null;
                                if (
                                    target &&
                                    target.closest('input, textarea, select, button, [contenteditable="true"], [data-no-select="true"]')
                                ) {
                                    return;
                                }

                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleSelect(entry);
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
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        pointerEvents: 'auto',
                                    }}
                                >
                                    <span
                                        style={{
                                            pointerEvents: 'none',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            lineHeight: 1,
                                            color: isDarkMode ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.72)',
                                            background: isDarkMode ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.82)',
                                            border: isDarkMode
                                                ? '1px solid rgba(255,255,255,0.12)'
                                                : '1px solid rgba(0,0,0,0.10)',
                                            borderRadius: 999,
                                            padding: '2px 6px',
                                        }}
                                    >
                                        #{cardIndex + 1}
                                    </span>

                                    <ModelVersionFileExistsBadge
                                        modelID={badgeModelId}
                                        versionID={badgeVersionId}
                                    />

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearRefreshHoldTimer();

                                            if (isRefreshingModelVersionObject) {
                                                setRefreshModelVersionObjectId(null);
                                                onRefreshModelVersionObject?.(entry);
                                                return;
                                            }

                                            setRefreshModelVersionObjectId(null);
                                            onRefreshRecord?.(entry);
                                        }}
                                        onMouseEnter={() => startRefreshHold(refreshKey)}
                                        onMouseLeave={() => stopRefreshHold(refreshKey)}
                                        disabled={isLoading}
                                        title={
                                            isRefreshingModelVersionObject
                                                ? "Refresh/update ModelVersionObject from Version API"
                                                : "Refresh/update this record (hover 1.5 seconds to switch to ModelVersionObject refresh)"
                                        }
                                        aria-label={
                                            isRefreshingModelVersionObject
                                                ? "Refresh/update ModelVersionObject from Version API"
                                                : "Refresh/update this record"
                                        }
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: isRefreshingModelVersionObject ? 4 : 0,
                                            width: isRefreshingModelVersionObject ? 58 : 22,
                                            height: 22,
                                            borderRadius: 8,
                                            border: isDarkMode
                                                ? '1px solid rgba(255,255,255,0.18)'
                                                : '1px solid rgba(0,0,0,0.18)',
                                            background: isRefreshingModelVersionObject
                                                ? (isDarkMode ? 'rgba(245,158,11,0.32)' : 'rgba(245,158,11,0.24)')
                                                : 'transparent',
                                            color: isRefreshingModelVersionObject
                                                ? (isDarkMode ? '#fbbf24' : '#b45309')
                                                : 'inherit',
                                            cursor: isLoading ? 'not-allowed' : 'pointer',
                                            padding: isRefreshingModelVersionObject ? '0 6px' : 0,
                                            opacity: isLoading ? 0.6 : 1,
                                            fontSize: 10,
                                            fontWeight: 700,
                                            pointerEvents: 'auto',
                                            transition: 'all 0.15s ease',
                                            boxShadow: isRefreshingModelVersionObject
                                                ? (isDarkMode
                                                    ? '0 0 0 1px rgba(251,191,36,0.35)'
                                                    : '0 0 0 1px rgba(180,83,9,0.22)')
                                                : 'none',
                                        }}
                                    >
                                        {isRefreshingModelVersionObject ? (
                                            <>
                                                <TiRefreshOutline size={16} />
                                            </>
                                        ) : (
                                            <MdRefresh size={16} />
                                        )}
                                    </button>
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
                                                        transform: 'translateX(25px)'
                                                    }}
                                                >
                                                    <TfiCheckBox /> Selected
                                                </div>
                                            )}

                                            {renderCartDownloadBadge(cartDownloadStatus)}
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
                                                    <SmartImage
                                                        src={withWidth(url, baseW)}
                                                        srcSet={buildSrcSet(url, [320, 480, 640, 800])}
                                                        sizes="(max-width: 420px) 100vw, 380px"
                                                        loading={imgIndex === 0 && cardIndex < 4 ? 'eager' : 'lazy'}
                                                        width={width ?? undefined}
                                                        height={height ?? undefined}
                                                        alt={`Slide ${imgIndex + 1}`}
                                                        isDarkMode={isDarkMode}
                                                        maxHeight="300px"
                                                    />
                                                </Carousel.Item>
                                            );
                                        })}
                                    </Carousel>
                                ) : (
                                    (() => {
                                        const normalizedImages = entry.imageUrlsArray
                                            .map((img) => normalizeImg(img as any))
                                            .filter((img) => img.url);

                                        const first = normalizedImages[0];
                                        const baseW = 380;

                                        return (
                                            <SmartImage
                                                src={withWidth(first.url, baseW)}
                                                fallbackSources={normalizedImages.slice(1).map(img => withWidth(img.url, baseW))}
                                                srcSet={buildSrcSet(first.url, [320, 480, 640, 800])}
                                                sizes="(max-width: 420px) 100vw, 380px"
                                                loading={cardIndex < 4 ? 'eager' : 'lazy'}
                                                width={first.width ?? undefined}
                                                height={first.height ?? undefined}
                                                alt="Preview"
                                                isDarkMode={isDarkMode}
                                                maxHeight="300px"
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
                                                    suffixSuggestions={titleSuffixSuggestions}
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

                                            <button
                                                type="button"
                                                data-no-select="true"
                                                onClick={(e) => {
                                                    e.stopPropagation();

                                                    if (canOpenPath) {
                                                        handleOpenDownloadPath(entry.downloadFilePath);
                                                    }
                                                }}
                                                title={entry.downloadFilePath ?? 'N/A'}
                                                aria-label="Open model download directory"
                                                disabled={!canOpenPath}
                                                style={{
                                                    flex: 1,
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'break-word',
                                                    lineHeight: 1.35,
                                                    textAlign: 'left',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    padding: 0,
                                                    margin: 0,
                                                    color: isDarkMode ? '#66b2ff' : '#0d6efd',
                                                    cursor: entry.downloadFilePath ? 'pointer' : 'default',
                                                    textDecoration: entry.downloadFilePath ? 'underline' : 'none',
                                                }}
                                            >
                                                {entry.downloadFilePath ?? 'N/A'}
                                            </button>

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
                                            <strong>Version ID:</strong>{' '}
                                            {(() => {
                                                const versionKey = String(
                                                    entry.civitaiVersionID ?? entry.modelVersionObject?.id ?? ''
                                                );

                                                const displayVersionId =
                                                    entry.civitaiVersionID ?? entry.modelVersionObject?.id ?? 'N/A';

                                                return editingVersionId === versionKey ? (
                                                    <VersionIdEditor
                                                        value={editingVersionValue}
                                                        isDarkMode={isDarkMode}
                                                        onChange={setEditingVersionValue}
                                                        onSave={() => handleVersionIdSave(entry, editingVersionValue)}
                                                        onCancel={() => {
                                                            setEditingVersionId(null);
                                                            setEditingVersionValue('');
                                                        }}
                                                    />
                                                ) : (
                                                    <span
                                                        data-no-select="true"
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingVersionValue(versionKey);
                                                            setEditingVersionId(versionKey);
                                                        }}
                                                        title="Double-click to edit Version ID"
                                                        style={{
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline dotted',
                                                        }}
                                                    >
                                                        {displayVersionId}
                                                    </span>
                                                );
                                            })()}
                                        </p>
                                        <p style={{ margin: "4px 0" }}>
                                            <strong>Civitai URL:</strong>{" "}
                                            <CivitaiUrlLinks
                                                civitaiModelID={entry.civitaiModelID}
                                                civitaiVersionID={entry.civitaiVersionID}
                                                isDarkMode={isDarkMode}
                                            />
                                        </p>
                                        <p style={{ margin: "4px 0" }}>
                                            <strong>Creator:</strong>{" "}
                                            {entry.modelVersionObject?.creator?.username ? (
                                                <>
                                                    <span>{entry.modelVersionObject.creator.username}</span>{" "}
                                                    <CreatorLinks creator={entry.modelVersionObject.creator.username} />
                                                </>
                                            ) : (
                                                "N/A"
                                            )}
                                        </p>

                                        <p>
                                            <CivitaiApiLinks
                                                modelId={entry.modelVersionObject?.modelId}
                                                versionId={entry.modelVersionObject?.id}
                                            />
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

                                        {entry.errorMessage && (
                                            <details
                                                data-no-select="true"
                                                style={{
                                                    marginTop: '8px',
                                                    border: isDarkMode
                                                        ? '1px solid rgba(248,113,113,0.35)'
                                                        : '1px solid rgba(220,38,38,0.25)',
                                                    borderRadius: '6px',
                                                    backgroundColor: isDarkMode ? '#1f1111' : '#fff5f5',
                                                    overflow: 'hidden',
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <summary
                                                    style={{
                                                        cursor: 'pointer',
                                                        padding: '6px 8px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        color: isDarkMode ? '#fca5a5' : '#b91c1c',
                                                        userSelect: 'none',
                                                    }}
                                                >
                                                    Error Log
                                                </summary>

                                                <pre
                                                    style={{
                                                        margin: 0,
                                                        padding: '8px',
                                                        maxHeight: '140px',
                                                        overflow: 'auto',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        fontSize: '0.72rem',
                                                        lineHeight: 1.35,
                                                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                                        backgroundColor: isDarkMode ? '#111827' : '#f8fafc',
                                                        color: isDarkMode ? '#fecaca' : '#7f1d1d',
                                                        borderTop: isDarkMode
                                                            ? '1px solid rgba(248,113,113,0.25)'
                                                            : '1px solid rgba(220,38,38,0.2)',
                                                    }}
                                                >
                                                    {entry.errorMessage}
                                                </pre>

                                                {isAddRecordFailedError && (
                                                    <div
                                                        style={{
                                                            padding: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-end',
                                                            gap: 8,
                                                            borderTop: isDarkMode
                                                                ? '1px solid rgba(248,113,113,0.25)'
                                                                : '1px solid rgba(220,38,38,0.2)',
                                                        }}
                                                    >
                                                        {addRecordStatus?.text && (
                                                            <span
                                                                title={addRecordStatus.msg || addRecordStatus.text}
                                                                style={{
                                                                    fontSize: 12,
                                                                    color:
                                                                        addRecordStatus.phase === 'success'
                                                                            ? (isDarkMode ? '#86efac' : '#166534')
                                                                            : addRecordStatus.phase === 'fail'
                                                                                ? (isDarkMode ? '#fca5a5' : '#991b1b')
                                                                                : (isDarkMode ? '#fde68a' : '#92400e'),
                                                                    maxWidth: 220,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                {addRecordStatus.text}
                                                            </span>
                                                        )}

                                                        <Button
                                                            size="sm"
                                                            variant="warning"
                                                            disabled={isLoading || addRecordRunning}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                await handleAddRecordFromError(entry);
                                                            }}
                                                        >
                                                            {addRecordRunning ? (
                                                                <>
                                                                    <Spinner animation="border" size="sm" style={{ marginRight: 6 }} />
                                                                    Adding...
                                                                </>
                                                            ) : (
                                                                'Add Record'
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                            </details>
                                        )}

                                        {(displayMode === 'errorCard' || displayMode === 'failedCard') && (
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
                                    <div style={{ marginTop: isEditingThisPath ? 45 : 8 }}>
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
                                                <div style={{ marginTop: 6, marginBottom: showAiSuggestionsPanel ? 30 : 0 }}>
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleOverlay(entry);
                                        }}
                                        title="Preview in left panel"
                                        aria-label="Preview in left panel"
                                        style={isPreviewing ? styles.inlineIconBtnActiveStyle : styles.inlineIconBtnStyle}
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
                                    st?.phase === 'success'
                                        ? (isDarkMode ? '#86efac' : '#166534')
                                        : st?.phase === 'fail'
                                            ? (isDarkMode ? '#fca5a5' : '#991b1b')
                                            : (isDarkMode ? '#fde68a' : '#92400e');

                                const hasCompletedDownloadInfo =
                                    !!st?.completedDownloadPath || !!st?.completedDownloadFileName;

                                return (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'stretch',
                                            gap: 8,
                                            paddingRight: 2,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                justifyContent: 'flex-end',
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

                                        {hasCompletedDownloadInfo && (
                                            <div
                                                data-no-select="true"
                                                style={{
                                                    border: `1px solid ${isDarkMode ? '#555' : '#d1d5db'}`,
                                                    borderRadius: 8,
                                                    padding: '8px 10px',
                                                    background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {!!st?.completedDownloadPath && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <strong style={{ flexShrink: 0, fontSize: 12 }}>Path:</strong>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenDownloadPath(st.completedDownloadPath || "");
                                                            }}
                                                            title={st.completedDownloadPath}
                                                            style={{
                                                                flex: 1,
                                                                whiteSpace: 'normal',
                                                                wordBreak: 'break-word',
                                                                lineHeight: 1.35,
                                                                textAlign: 'left',
                                                                border: 'none',
                                                                background: 'transparent',
                                                                padding: 0,
                                                                margin: 0,
                                                                color: isDarkMode ? '#66b2ff' : '#0d6efd',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline',
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            {st.completedDownloadPath}
                                                        </button>
                                                    </div>
                                                )}

                                                {!!st?.completedDownloadFileName && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <strong style={{ flexShrink: 0, fontSize: 12 }}>File:</strong>

                                                        <div
                                                            style={{
                                                                flex: 1,
                                                                minWidth: 0,
                                                                fontSize: 12,
                                                                wordBreak: 'break-word',
                                                                lineHeight: 1.35,
                                                            }}
                                                            title={st.completedDownloadFileName}
                                                        >
                                                            {st.completedDownloadFileName}
                                                        </div>

                                                        <Button
                                                            size="sm"
                                                            variant={isDarkMode ? "outline-light" : "outline-secondary"}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopyToClipboard(st.completedDownloadFileName || "");
                                                            }}
                                                            style={{ flexShrink: 0 }}
                                                        >
                                                            Copy
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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