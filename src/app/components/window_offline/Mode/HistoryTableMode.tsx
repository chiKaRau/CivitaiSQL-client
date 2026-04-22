import React, { useCallback, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { CellStyle, ColDef } from 'ag-grid-community';
import SmartImage from '../SmartImage';
import ModelVersionFileExistsBadge from '../../ModelVersionFileExistsBadge';
import CivitaiUrlLinks from '../../CivitaiUrlLinks';

export interface ModelOfflineDownloadHistoryEntry {
    id?: number;
    civitaiModelID: number;
    civitaiVersionID: number;
    imageUrlList: string[];
    localPath: string;
    createdAt: string;
    updatedAt: string;
}

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

const HistoryTableMode: React.FC<HistoryTableModeProps> = ({
    entries,
    isDarkMode,
    agGridStyle,
    currentTheme,
    handleOpenDownloadPath,
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
            width: 80,
            maxWidth: 80,
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
                            margin: "0 auto",
                            cursor: "zoom-in",
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
            width: 220,
            maxWidth: 260,
            minWidth: 180,
            wrapText: false,
            autoHeight: false,
            sortable: false,
            filter: false,
            cellStyle: {
                ...cellStyle,
                whiteSpace: "normal",
                lineHeight: "1.25",
                paddingTop: "8px",
                paddingBottom: "8px",
                userSelect: "text",
            } as CellStyle,
            cellRenderer: (p: any) => {
                const modelId = p?.data?.civitaiModelID;
                const versionId = p?.data?.civitaiVersionID;

                return (
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "nowrap",
                            whiteSpace: "nowrap",
                            fontWeight: 600,
                        }}
                    >
                        <span>{p.value}</span>

                        {!!modelId &&
                            !!versionId &&
                            modelId !== "N/A" &&
                            versionId !== "N/A" && (
                                <ModelVersionFileExistsBadge
                                    modelID={String(modelId)}
                                    versionID={String(versionId)}
                                />
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
                const path = typeof p.value === "string" ? p.value.trim() : "";

                if (!path) {
                    return <span>N/A</span>;
                }

                return (
                    <span
                        title={path}
                        onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenDownloadPath(path);
                        }}
                        style={{
                            display: "inline-block",
                            width: "100%",
                            cursor: "pointer",
                            color: isDarkMode ? "#93c5fd" : "#2563eb",
                            textDecoration: "underline",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            lineHeight: "1.25",
                        }}
                    >
                        {path}
                    </span>
                );
            },
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
        }
    ], [cellStyle, numberCellStyle, centeredImageCellStyle, isDarkMode, handleOpenDownloadPath]);

    const rowData = useMemo(() => {
        return entries.map((entry) => {
            const imageUrlList = Array.isArray(entry.imageUrlList) ? entry.imageUrlList : [];
            const previewImageUrl = imageUrlList[0] ?? "";
            const fallbackImageUrls = imageUrlList.slice(1);

            return {
                civitaiModelID: entry.civitaiModelID ?? "N/A",
                civitaiVersionID: entry.civitaiVersionID ?? "N/A",
                modelVersionDisplay:
                    entry.civitaiModelID && entry.civitaiVersionID
                        ? `${entry.civitaiModelID}_${entry.civitaiVersionID}`
                        : "N/A",
                localPath: entry.localPath ?? "",
                previewImageUrl,
                fallbackImageUrls,
                imageCount: imageUrlList.length,
                civitaiUrl:
                    entry.civitaiModelID && entry.civitaiVersionID
                        ? `https://civitai.red/models/${entry.civitaiModelID}?modelVersionId=${entry.civitaiVersionID}`
                        : "",
                civitaiArchiveUrl:
                    entry.civitaiModelID && entry.civitaiVersionID
                        ? `https://civitaiarchive.com/models/${entry.civitaiModelID}?modelVersionId=${entry.civitaiVersionID}`
                        : "",
                createdAt: formatHistoryDateTime(entry.createdAt),
                updatedAt: formatHistoryDateTime(entry.updatedAt),
            };
        });
    }, [entries]);

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
                    getRowStyle={getRowStyle}
                    headerHeight={40}
                    rowHeight={95}
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

export default HistoryTableMode;