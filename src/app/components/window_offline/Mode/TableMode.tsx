import React, { useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { OfflineDownloadEntry } from '../OfflineWindow.types';

interface SelectAllHeaderCheckboxProps {
    isChecked: boolean;
    isIndeterminate: boolean;
    disabled?: boolean;
    onChange: () => void;
}

const SelectAllHeaderCheckbox: React.FC<SelectAllHeaderCheckboxProps> = ({
    isChecked,
    isIndeterminate,
    disabled = false,
    onChange,
}) => {
    const checkboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate = isIndeterminate;
        }
    }, [isIndeterminate]);

    return (
        <input
            type="checkbox"
            ref={checkboxRef}
            checked={isChecked}
            disabled={disabled}
            onChange={() => onChange()}
            style={{
                transform: 'scale(1.2)',
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
        />
    );
};

interface TableModeProps {
    entries: OfflineDownloadEntry[];
    isDarkMode: boolean;
    isModifyMode: boolean;
    selectedIds: Set<string>;
    visibleEntries: OfflineDownloadEntry[];
    isAllSelected: boolean;
    isIndeterminate: boolean;
    canChangeSelection: boolean;
    agGridStyle: React.CSSProperties;
    currentTheme: {
        evenRowBackgroundColor: string;
        oddRowBackgroundColor: string;
        rowFontColor: string;
    };
    toggleSelect: (entryOrId: OfflineDownloadEntry | string) => void;
    handleSelectAll: () => void;
}

const TableMode: React.FC<TableModeProps> = ({
    entries,
    isDarkMode,
    selectedIds,
    isAllSelected,
    isIndeterminate,
    canChangeSelection,
    agGridStyle,
    currentTheme,
    toggleSelect,
    handleSelectAll,
}) => {
    const cellStyle = () => ({
        color: currentTheme.rowFontColor,
    });

    const getRowStyle = (params: any) => {
        const isEven = params.node.rowIndex % 2 === 0;
        const versionId = String(params.data?.versionid ?? '');
        const isSelected = selectedIds.has(versionId);

        return {
            backgroundColor: isSelected
                ? isDarkMode
                    ? '#666666'
                    : '#e0e0e0'
                : isEven
                    ? currentTheme.evenRowBackgroundColor
                    : currentTheme.oddRowBackgroundColor,
            color: currentTheme.rowFontColor,
        };
    };

    const rowData = useMemo(() => {
        return entries.map((entry, index) => {
            const safetensorFile = entry.modelVersionObject?.files?.find(file =>
                file.name.endsWith('.safetensors')
            );

            const filesizeMB = safetensorFile
                ? (safetensorFile.sizeKB / 1024).toFixed(2)
                : 'N/A';

            const earlyAccessLabel = (() => {
                const s = entry.earlyAccessEndsAt?.trim();
                if (!s) return 'Public';

                const hasTimezone = /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
                const d = hasTimezone ? new Date(s) : new Date(`${s.replace(' ', 'T')}Z`);

                if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
                    return 'Public';
                }

                const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

                return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
            })();

            return {
                id: index + 1,
                originalEntry: entry,
                title: entry?.modelVersionObject?.model?.name ?? 'N/A',
                modelName: entry.civitaiFileName ?? 'N/A',
                versionName: entry.modelVersionObject?.name ?? 'N/A',
                modelId: entry.modelVersionObject?.modelId ?? 'N/A',
                versionid: String(entry.civitaiVersionID ?? ''),
                baseModel: entry.modelVersionObject?.baseModel ?? 'N/A',
                category: entry.selectedCategory ?? 'N/A',
                filepath: entry.downloadFilePath ?? 'N/A',
                url: entry.civitaiUrl ?? 'N/A',
                creator: entry.modelVersionObject?.creator?.username ?? 'N/A',
                filesize: `${filesizeMB} MB`,
                earlyAccessDisplay: earlyAccessLabel,
            };
        });
    }, [entries]);

    const columnDefs: ColDef[] = [
        {
            headerName: 'ID',
            field: 'id',
            width: 60,
            cellStyle: {
                textAlign: 'center',
                padding: '5px',
            },
        },
        {
            headerName: '',
            field: 'select',
            sortable: false,
            filter: false,
            width: 50,
            headerComponent: SelectAllHeaderCheckbox,
            headerComponentParams: {
                isChecked: isAllSelected,
                isIndeterminate,
                disabled: !canChangeSelection,
                onChange: () => {
                    if (!canChangeSelection) return;
                    handleSelectAll();
                },
            },
            cellRenderer: (params: any) => {
                const versionId = String(params.data?.versionid ?? '');

                return (
                    <input
                        type="checkbox"
                        disabled={!canChangeSelection}
                        checked={selectedIds.has(versionId)}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        onChange={(e) => {
                            e.stopPropagation();

                            if (!canChangeSelection) return;
                            toggleSelect(params.data.originalEntry);
                        }}
                        style={{
                            transform: 'scale(1.2)',
                            cursor: canChangeSelection ? 'pointer' : 'not-allowed',
                            accentColor: isDarkMode ? '#fff' : '#000',
                        }}
                    />
                );
            },
            headerClass: 'custom-header',
        },
        {
            headerName: 'Title',
            field: 'title',
            flex: 1,
            tooltipField: 'title',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: 'Model Name',
            field: 'modelName',
            flex: 1,
            tooltipField: 'modelName',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: 'Version Name',
            field: 'versionName',
            flex: 1,
            tooltipField: 'versionName',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: 'Model ID',
            field: 'modelId',
            sortable: true,
            filter: false,
            cellStyle,
        },
        {
            headerName: 'Version ID',
            field: 'versionid',
            sortable: true,
            filter: false,
            cellStyle,
        },
        {
            headerName: 'Base Model',
            field: 'baseModel',
            sortable: true,
            filter: false,
            cellStyle,
        },
        {
            headerName: 'URL',
            field: 'url',
            flex: 2,
            tooltipField: 'url',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '5px',
            },
            cellRenderer: (params: any) => {
                return (
                    <span
                        style={{
                            display: 'inline-block',
                            width: '100%',
                            userSelect: 'text',
                        }}
                    >
                        {params.value}
                    </span>
                );
            },
        },
        {
            headerName: 'FilePath',
            field: 'filepath',
            flex: 1,
            tooltipField: 'filepath',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: 'Category',
            field: 'category',
            flex: 1,
            tooltipField: 'category',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: 'Early Access',
            field: 'earlyAccessDisplay',
            sortable: true,
            filter: false,
            cellStyle,
        },
        {
            headerName: 'File Size (MB)',
            field: 'filesize',
            sortable: true,
            filter: false,
            cellStyle,
        },
    ];

    const defaultColDef: ColDef = {
        flex: 1,
        minWidth: 150,
        resizable: true,
        cellStyle,
    };

    return (
        <div className="ag-theme-alpine" style={agGridStyle}>
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={100}
                getRowStyle={getRowStyle}
                onRowClicked={(params: any) => {
                    if (!canChangeSelection) return;
                    if (!params.event.ctrlKey) return;

                    toggleSelect(params.data.originalEntry);
                }}
                headerHeight={40}
                onGridReady={(params) => {
                    params.api.sizeColumnsToFit();
                }}
            />
        </div>
    );
};

export default TableMode;