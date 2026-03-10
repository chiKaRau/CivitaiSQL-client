import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';

export interface ModelOfflineDownloadHistoryEntry {
    civitaiModelID: number;
    civitaiVersionID: number;
    imageUrl: string;
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
}) => {
    const [hoveredImageUrl, setHoveredImageUrl] = useState<string | null>(null);

    const cellStyle = {
        color: currentTheme.rowFontColor,
    };

    const defaultColDef: ColDef = {
        flex: 1,
        minWidth: 150,
        resizable: true,
    };

    const getRowStyle = (params: any) => {
        const isEven = params.node.rowIndex % 2 === 0;
        return {
            backgroundColor: isEven
                ? currentTheme.evenRowBackgroundColor
                : currentTheme.oddRowBackgroundColor,
            color: currentTheme.rowFontColor,
        };
    };

    const columnDefs: ColDef[] = [
        {
            headerName: "#",
            width: 80,
            sortable: false,
            filter: false,
            valueGetter: (params: any) => {
                return (params.node?.rowIndex ?? 0) + 1;
            },
            cellStyle: {
                ...cellStyle,
                textAlign: "center",
                fontWeight: 700,
            },
        },
        {
            headerName: "Image",
            field: "imageUrl",
            width: 130,
            sortable: false,
            filter: false,
            cellRenderer: (params: any) => {
                const url = params.value;
                if (!url) return <span>N/A</span>;

                return (
                    <img
                        src={url}
                        alt="History"
                        onMouseEnter={() => setHoveredImageUrl(url)}
                        onMouseLeave={() => setHoveredImageUrl((prev) => (prev === url ? null : prev))}
                        style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "contain",
                            borderRadius: "4px",
                            display: "block",
                            margin: "0 auto",
                            cursor: "zoom-in",
                        }}
                    />
                );
            },
            cellStyle: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
            },
        },
        {
            headerName: "Model ID",
            field: "civitaiModelID",
            sortable: true,
            filter: false,
            cellStyle,
        },
        {
            headerName: "Version ID",
            field: "civitaiVersionID",
            sortable: true,
            filter: false,
            cellStyle,
        },
        {
            headerName: "Created At",
            field: "createdAt",
            flex: 1,
            sortable: true,
            filter: false,
            tooltipField: "createdAt",
            cellStyle,
        },
        {
            headerName: "Civitai URL",
            field: "civitaiUrl",
            minWidth: 140,
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
                        Visit Model
                    </a>
                );
            },
            cellStyle,
        },
        {
            headerName: "Civitai Archive URL",
            field: "civitaiArchiveUrl",
            minWidth: 160,
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
    ];

    const rowData = useMemo(() => {
        return entries.map((entry) => ({
            civitaiModelID: entry.civitaiModelID ?? "N/A",
            civitaiVersionID: entry.civitaiVersionID ?? "N/A",
            imageUrl: entry.imageUrl ?? "",
            civitaiUrl:
                entry.civitaiModelID && entry.civitaiVersionID
                    ? `https://civitai.com/models/${entry.civitaiModelID}?modelVersionId=${entry.civitaiVersionID}`
                    : "",
            civitaiArchiveUrl:
                entry.civitaiModelID && entry.civitaiVersionID
                    ? `https://civitaiarchive.com/models/${entry.civitaiModelID}?modelVersionId=${entry.civitaiVersionID}`
                    : "",
            createdAt: formatHistoryDateTime(entry.createdAt),
        }));
    }, [entries]);

    return (
        <>
            <div className="ag-theme-alpine" style={agGridStyle}>
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    getRowStyle={getRowStyle}
                    headerHeight={40}
                    rowHeight={95}
                    onGridReady={(params) => {
                        params.api.sizeColumnsToFit();
                    }}
                />
            </div>

            {hoveredImageUrl && (
                <div
                    onMouseEnter={() => setHoveredImageUrl(hoveredImageUrl)}
                    onMouseLeave={() => setHoveredImageUrl(null)}
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
                    <img
                        src={hoveredImageUrl}
                        alt="Preview"
                        style={{
                            maxWidth: "70vw",
                            maxHeight: "70vh",
                            objectFit: "contain",
                            borderRadius: "8px",
                            display: "block",
                        }}
                    />
                </div>
            )}
        </>
    );
};

export default HistoryTableMode;