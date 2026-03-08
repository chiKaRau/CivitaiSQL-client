// HistoryTableMode.tsx

import React, { useMemo } from 'react';
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

const defaultColDef: ColDef = {
    flex: 1,
    minWidth: 150,
    resizable: true,
};

const HistoryTableMode: React.FC<HistoryTableModeProps> = ({
    entries,
    agGridStyle,
    currentTheme,
}) => {
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
                        style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "contain",
                            borderRadius: "4px",
                            display: "block",
                            margin: "0 auto",
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
            headerName: "Updated At",
            field: "updatedAt",
            flex: 1,
            sortable: true,
            filter: false,
            tooltipField: "updatedAt",
            cellStyle,
        },
    ];

    const rowData = useMemo(() => {
        return entries.map((entry) => ({
            civitaiModelID: entry.civitaiModelID ?? "N/A",
            civitaiVersionID: entry.civitaiVersionID ?? "N/A",
            imageUrl: entry.imageUrl ?? "",
            createdAt: formatHistoryDateTime(entry.createdAt),
            updatedAt: formatHistoryDateTime(entry.updatedAt),
        }));
    }, [entries]);

    return (
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
    );
};

export default HistoryTableMode;