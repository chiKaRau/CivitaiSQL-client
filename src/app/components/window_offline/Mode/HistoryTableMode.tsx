import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { CellStyle, ColDef } from 'ag-grid-community';
import SmartImage from '../SmartImage';
import ModelVersionFileExistsBadge from '../../ModelVersionFileExistsBadge';
import CivitaiUrlLinks from '../../CivitaiUrlLinks';
import { ModelOfflineDownloadHistoryEntry } from '../OfflineWindow.types';
import { FaTrashAlt } from 'react-icons/fa';

interface HistoryTableModeProps {
    entries: ModelOfflineDownloadHistoryEntry[];
    isDarkMode: boolean;
    agGridStyle: React.CSSProperties;
    currentTheme: {
        evenRowBackgroundColor: string;
        oddRowBackgroundColor: string;
        rowFontColor: string;
    };
    handleOpenDownloadPath: (downloadPath: string) => Promise<void>;
    onDeleteHistoryRecord: (historyId: number) => Promise<void>;
    deletingHistoryId: number | null;
}

function pad2(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
}

function formatHistoryDateTime(value?: string) {
    if (!value) return "N/A";

    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const d = new Date(normalized);

    if (Number.isNaN(d.getTime())) return value;

    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function isUpdatePath(path?: string) {
    const value = (path || "").trim();

    if (!value) return false;

    // Matches:
    // \Update\
    // /Update/
    // \Update
    // /Update
    return /(^|[\\/])Update([\\/]|$)/i.test(value);
}

function getDirectoryPathForOpen(path?: string) {
    const trimmed = (path || "").trim();
    if (!trimmed) return "";

    const normalized = trimmed.replace(/\//g, "\\").replace(/\\+$/, "");

    const lastSlashIndex = normalized.lastIndexOf("\\");
    if (lastSlashIndex < 0) {
        return normalized;
    }

    const lastPart = normalized.slice(lastSlashIndex + 1);
    const looksLikeFile = /\.[^\\]+$/.test(lastPart);

    const directoryOnly = looksLikeFile
        ? normalized.slice(0, lastSlashIndex)
        : normalized;

    const filesDownloadMatch = directoryOnly.match(/\\files\\download(\\.*)$/i);
    if (filesDownloadMatch?.[1]) {
        return filesDownloadMatch[1];
    }

    const scanMatch = directoryOnly.match(/(\\@scan\\.*)$/i);
    if (scanMatch?.[1]) {
        return scanMatch[1];
    }

    return directoryOnly;
}

const HISTORY_IMAGE_SIZE = 80;
const HISTORY_IMAGE_CELL_HEIGHT = 92; // 80 image + 6px top + 6px bottom

const HistoryTableMode: React.FC<HistoryTableModeProps> = ({
    entries,
    isDarkMode,
    agGridStyle,
    currentTheme,
    handleOpenDownloadPath,
    onDeleteHistoryRecord,
    deletingHistoryId,
}) => {
    const [hoveredImage, setHoveredImage] = useState<{
        src: string;
        fallbackSources: string[];
    } | null>(null);

    const cellStyle = useMemo<CellStyle>(() => ({
        color: currentTheme.rowFontColor,
    }), [currentTheme.rowFontColor]);

    const centeredImageCellStyle = useMemo<CellStyle>(() => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px",
        overflow: "hidden",
        boxSizing: "border-box",
    }), []);

    const numberCellStyle = useMemo<CellStyle>(() => ({
        ...cellStyle,
        textAlign: "center",
        fontWeight: 700,
    }), [cellStyle]);

    const countCellStyle = useMemo<CellStyle>(() => ({
        ...cellStyle,
        textAlign: "center",
        fontWeight: 600,
    }), [cellStyle]);

    const getRowStyle = useCallback((params: any) => {
        const isEven = params.node.rowIndex % 2 === 0;
        return {
            backgroundColor: isEven
                ? currentTheme.evenRowBackgroundColor
                : currentTheme.oddRowBackgroundColor,
            color: currentTheme.rowFontColor,
        };
    }, [
        currentTheme.evenRowBackgroundColor,
        currentTheme.oddRowBackgroundColor,
        currentTheme.rowFontColor,
    ]);

    const defaultColDef = useMemo<ColDef>(() => ({
        minWidth: 150,
        resizable: true,
    }), []);

    const imageDataCacheRef = useRef<Record<string, {
        signature: string;
        previewImageUrl: string;
        fallbackImageUrls: string[];
        imageCount: number;
    }>>({});

    const getStableImageData = useCallback((entry: ModelOfflineDownloadHistoryEntry) => {
        const rowKey = String(
            entry.id ?? `${entry.civitaiModelID}_${entry.civitaiVersionID}_${entry.createdAt}`
        );

        const imageUrlList = Array.isArray(entry.imageUrlList)
            ? entry.imageUrlList
            : [];

        const signature = imageUrlList.join("\n");

        const cached = imageDataCacheRef.current[rowKey];

        if (cached && cached.signature === signature) {
            return cached;
        }

        const next = {
            signature,
            previewImageUrl: imageUrlList[0] || "",
            fallbackImageUrls: imageUrlList.slice(1),
            imageCount: imageUrlList.length,
        };

        imageDataCacheRef.current[rowKey] = next;

        return next;
    }, []);

    const columnDefs = useMemo<ColDef[]>(() => [
        {
            headerName: "#",
            width: 65,
            minWidth: 50,
            maxWidth: 65,
            sortable: false,
            filter: false,
            valueGetter: (params: any) => {
                return (params.node?.rowIndex ?? 0) + 1;
            },
            cellStyle: numberCellStyle,
        },
        {
            headerName: "Image",
            field: "previewImageUrl",
            width: 92,
            minWidth: 92,
            maxWidth: 92,
            sortable: false,
            filter: false,
            cellRenderer: (params: any) => {
                const url = params.value;
                const fallbackSources = Array.isArray(params.data?.fallbackImageUrls)
                    ? params.data.fallbackImageUrls
                    : [];

                if (!url) return <span>N/A</span>;

                return (
                    <div
                        onMouseEnter={() =>
                            setHoveredImage((prev) =>
                                prev?.src === url ? prev : { src: url, fallbackSources }
                            )
                        }
                        onMouseLeave={() =>
                            setHoveredImage((prev) =>
                                prev?.src === url ? null : prev
                            )
                        }
                        style={{
                            width: "80px",
                            height: "80px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                            cursor: "zoom-in",
                            overflow: "hidden",
                        }}
                    >
                        <SmartImage
                            src={url}
                            fallbackSources={fallbackSources}
                            alt="History"
                            isDarkMode={isDarkMode}
                            maxHeight="80px"
                            borderRadius="4px"
                            loading="lazy"
                        />
                    </div>
                );
            },
            cellStyle: centeredImageCellStyle,
        },
        {
            headerName: "Model & Version",
            field: "modelVersionDisplay",
            width: 190,
            minWidth: 170,
            sortable: true,
            filter: true,
            tooltipField: "modelVersionDisplay",
            cellStyle: {
                ...cellStyle,
                userSelect: "text",
            } as CellStyle,
            cellRenderer: (p: any) => {
                const modelRecordExists = p?.data?.modelRecordExists === true;
                const offlineRecordExists = p?.data?.offlineRecordExists === true;

                return (
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                            whiteSpace: "normal",
                            fontWeight: 600,
                            lineHeight: "1.25",
                        }}
                    >
                        <span>{p.value}</span>

                        {modelRecordExists && (
                            <span
                                title="Exists in models_table"
                                style={{
                                    fontWeight: 900,
                                }}
                            >
                                *
                            </span>
                        )}

                        {offlineRecordExists && (
                            <span
                                title="Exists in model_offline_table"
                                style={{
                                    fontWeight: 900,
                                }}
                            >
                                ^
                            </span>
                        )}
                    </span>
                );
            },
        },
        {
            headerName: "Local Path",
            field: "localPath",
            flex: 1,
            minWidth: 230,
            wrapText: true,
            autoHeight: true,
            sortable: true,
            tooltipField: "localPath",
            cellStyle: {
                ...cellStyle,
                whiteSpace: "normal",
                lineHeight: "1.25",
                paddingTop: "8px",
                paddingBottom: "8px",
                userSelect: "text",
            } as CellStyle,
            cellRenderer: (p: any) => {
                const dbPath = typeof p?.data?.localPath === "string"
                    ? p.data.localPath.trim()
                    : "";

                const checkedFilePath = typeof p?.data?.checkedFilePath === "string"
                    ? p.data.checkedFilePath.trim()
                    : "";

                const hasExistingLocalFile = !!p?.data?.hasExistingLocalFile && checkedFilePath !== "";
                const checkedDirectoryPath = hasExistingLocalFile
                    ? getDirectoryPathForOpen(checkedFilePath)
                    : "";

                if (!dbPath && !checkedFilePath) {
                    return <span>N/A</span>;
                }

                const lineStyle: React.CSSProperties = {
                    display: "block",
                    width: "100%",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    lineHeight: "1.25",
                    userSelect: "text",
                    marginBottom: 4,
                };

                const labelStyle: React.CSSProperties = {
                    fontWeight: 700,
                    marginRight: 6,
                    opacity: 0.75,
                };

                return (
                    <div style={{ width: "100%" }}>
                        {dbPath && (
                            <span style={lineStyle} title={dbPath}>
                                <span style={labelStyle}>DB:</span>
                                {dbPath}
                            </span>
                        )}

                        {hasExistingLocalFile && (
                            <span
                                style={{
                                    ...lineStyle,
                                    cursor: checkedDirectoryPath ? "pointer" : "default",
                                    color: checkedDirectoryPath
                                        ? (isDarkMode ? "#93c5fd" : "#2563eb")
                                        : currentTheme.rowFontColor,
                                    textDecoration: checkedDirectoryPath ? "underline" : "none",
                                }}
                                title={checkedDirectoryPath || checkedFilePath}
                                onClick={(e) => {
                                    e.stopPropagation();

                                    if (checkedDirectoryPath) {
                                        void handleOpenDownloadPath(checkedDirectoryPath);
                                    }
                                }}
                            >
                                <span style={labelStyle}>LOCAL:</span>
                                {checkedDirectoryPath || checkedFilePath}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            headerName: "Type",
            field: "historyPathType",
            width: 115,
            minWidth: 105,
            maxWidth: 130,
            sortable: true,
            filter: true,
            cellStyle: {
                ...cellStyle,
                textAlign: "center",
                fontWeight: 700,
            } as CellStyle,
            valueGetter: (p: any) => {
                const dbPath = typeof p?.data?.localPath === "string"
                    ? p.data.localPath
                    : "";

                const checkedFilePath = typeof p?.data?.checkedFilePath === "string"
                    ? p.data.checkedFilePath
                    : "";

                return isUpdatePath(dbPath) || isUpdatePath(checkedFilePath)
                    ? "Update"
                    : "Download";
            },
        },
        {
            headerName: "Creator",
            field: "creatorName",
            width: 160,
            minWidth: 140,
            sortable: true,
            filter: true,
            tooltipField: "creatorName",
            cellStyle,
            valueFormatter: (p: any) => p.value || "N/A",
        },
        {
            headerName: "Created At",
            field: "createdAt",
            width: 150,
            minWidth: 150,
            maxWidth: 200,
            sortable: true,
            filter: false,
            tooltipField: "createdAt",
            cellStyle,
        },
        {
            headerName: "Civitai URL",
            field: "civitaiUrl",
            width: 120,
            minWidth: 120,
            maxWidth: 130,
            sortable: false,
            filter: false,
            cellRenderer: (p: any) => {
                const modelId = p?.data?.civitaiModelID;
                const versionId = p?.data?.civitaiVersionID;
                return (
                    <CivitaiUrlLinks
                        civitaiModelID={modelId}
                        civitaiVersionID={versionId}
                        isDarkMode={isDarkMode}
                    />
                );
            },
            cellStyle,
        },
        {
            headerName: "Civitai Archive URL",
            field: "civitaiArchiveUrl",
            width: 120,
            minWidth: 120,
            sortable: false,
            filter: false,
            cellRenderer: (params: any) => {
                const url = params.value;
                if (!url) return <span>N/A</span>;

                return (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            color: isDarkMode ? "#1e90ff" : "#007bff",
                            textDecoration: "underline",
                            fontWeight: 600,
                        }}
                    >
                        Visit Archive
                    </a>
                );
            },
            cellStyle,
        },
        {
            headerName: "Is Error",
            field: "isError",
            width: 110,
            minWidth: 100,
            sortable: true,
            filter: true,
            cellStyle: {
                ...cellStyle,
                textAlign: "center",
                fontWeight: 700,
            } as CellStyle,
            cellRenderer: (p: any) => {
                return p.value ? "Y" : "N";
            },
        },
        {
            headerName: "Error Message",
            field: "errorMessage",
            width: 240,
            minWidth: 200,
            wrapText: true,
            autoHeight: true,
            sortable: true,
            filter: true,
            tooltipField: "errorMessage",
            cellStyle: {
                ...cellStyle,
                whiteSpace: "normal",
                lineHeight: "1.25",
                paddingTop: "8px",
                paddingBottom: "8px",
                userSelect: "text",
            } as CellStyle,
            valueFormatter: (p: any) => p.value || "N/A",
        },
        {
            headerName: "Error At",
            field: "errorAt",
            width: 160,
            minWidth: 150,
            sortable: true,
            filter: true,
            tooltipField: "errorAt",
            cellStyle,
            valueFormatter: (p: any) => p.value ? formatHistoryDateTime(p.value) : "N/A",
        }, {
            headerName: "Delete",
            field: "id",
            width: 95,
            minWidth: 90,
            maxWidth: 100,
            pinned: "right",
            sortable: false,
            filter: false,
            cellStyle: {
                ...cellStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            } as CellStyle,
            cellRenderer: (p: any) => {
                const id = Number(p?.data?.id);
                const canDelete = Number.isFinite(id) && id > 0;
                const isDeleting = p?.data?.isDeletingHistoryRecord === true;
                const modelVersionDisplay = p?.data?.modelVersionDisplay || "this history record";

                return (
                    <button
                        type="button"
                        disabled={!canDelete || isDeleting}
                        title={
                            canDelete
                                ? `Delete ${modelVersionDisplay}`
                                : "Cannot delete: missing history record id"
                        }
                        onClick={(e) => {
                            e.stopPropagation();

                            if (!canDelete || isDeleting) {
                                return;
                            }

                            const confirmed = window.confirm(
                                `Delete history record ${modelVersionDisplay}?`
                            );

                            if (!confirmed) {
                                return;
                            }

                            void onDeleteHistoryRecord(id);
                        }}
                        style={{
                            width: "34px",
                            height: "30px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "6px",
                            border: `1px solid ${isDarkMode ? "#7f1d1d" : "#fecaca"}`,
                            backgroundColor: isDeleting
                                ? (isDarkMode ? "#374151" : "#e5e7eb")
                                : (isDarkMode ? "#450a0a" : "#fee2e2"),
                            color: isDeleting
                                ? (isDarkMode ? "#d1d5db" : "#6b7280")
                                : (isDarkMode ? "#fecaca" : "#b91c1c"),
                            cursor: !canDelete || isDeleting ? "not-allowed" : "pointer",
                            opacity: !canDelete || isDeleting ? 0.65 : 1,
                        }}
                    >
                        {isDeleting ? "..." : <FaTrashAlt />}
                    </button>
                );
            },
        },
    ], [
        cellStyle,
        numberCellStyle,
        centeredImageCellStyle,
        isDarkMode,
        handleOpenDownloadPath,
        onDeleteHistoryRecord,
        currentTheme.rowFontColor
    ]);

    const rowData = useMemo(() => {
        return entries.map((entry) => {
            const rowId = String(
                entry.id ?? `${entry.civitaiModelID}_${entry.civitaiVersionID}_${entry.createdAt}`
            );

            const imageData = getStableImageData(entry);

            return {
                ...entry,
                rowId,
                isDeletingHistoryRecord:
                    entry.id !== undefined &&
                    Number(entry.id) === deletingHistoryId,

                modelVersionDisplay: `${entry.civitaiModelID}_${entry.civitaiVersionID}`,
                modelRecordExists: entry.modelRecordExists === true,
                offlineRecordExists: entry.offlineRecordExists === true,

                previewImageUrl: imageData.previewImageUrl,
                fallbackImageUrls: imageData.fallbackImageUrls,
                imageCount: imageData.imageCount,

                civitaiUrl: `https://civitai.com/models/${entry.civitaiModelID}?modelVersionId=${entry.civitaiVersionID}`,
                civitaiArchiveUrl: `https://civitaiarchive.com/models/${entry.civitaiModelID}?modelVersionId=${entry.civitaiVersionID}`,

                localPath: entry.localPath || "",
                checkedFilePath: (entry as any).checkedFilePath || "",
                creatorName: entry.creatorName || "",
                isError: entry.isError === true,
                errorMessage: entry.errorMessage || "",
                errorAt: entry.errorAt ? formatHistoryDateTime(entry.errorAt) : "",

                createdAt: formatHistoryDateTime(entry.createdAt),
                updatedAt: formatHistoryDateTime(entry.updatedAt),
            };
        });
    }, [entries, getStableImageData, deletingHistoryId]);

    const getHistoryRowId = useCallback((params: any) => {
        const d = params.data;

        return String(
            d?.rowId ??
            d?.id ??
            `${d?.civitaiModelID}_${d?.civitaiVersionID}_${d?.createdAt}`
        );
    }, []);

    return (
        <>
            <div
                className={isDarkMode ? "ag-theme-alpine-dark" : "ag-theme-alpine"}
                style={{
                    ...agGridStyle,
                    backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                    color: isDarkMode ? "#f9fafb" : "#111827",
                }}
            >
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    getRowId={getHistoryRowId}
                    getRowStyle={getRowStyle}
                    rowHeight={92}
                    suppressCellFocus={true}
                />
            </div>

            {hoveredImage && (
                <div
                    onMouseEnter={() => setHoveredImage(hoveredImage)}
                    onMouseLeave={() => setHoveredImage(null)}
                    style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 4000,
                        backgroundColor: isDarkMode ? "rgba(17,24,39,0.96)" : "rgba(255,255,255,0.96)",
                        border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                        borderRadius: "12px",
                        padding: "12px",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        maxWidth: "80vw",
                        maxHeight: "80vh",
                        pointerEvents: "auto",
                    }}
                >
                    <SmartImage
                        src={hoveredImage.src}
                        fallbackSources={hoveredImage.fallbackSources}
                        alt="Preview"
                        isDarkMode={isDarkMode}
                        maxHeight="70vh"
                        borderRadius="8px"
                        loading="eager"
                    />
                </div>
            )}
        </>
    );
};

export default React.memo(HistoryTableMode);