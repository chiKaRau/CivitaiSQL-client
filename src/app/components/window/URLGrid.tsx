import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowStyle } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface URLGridProps {
    urlList: string[];
    setUrlList: (updater: (prevUrlList: string[]) => string[]) => void; // Callback to update the URL list
    selectedUrl: string | null; // Selected URL passed down from the parent
    onUrlSelect: (url: string) => void; // Callback to update the selected URL
}

const URLGrid: React.FC<URLGridProps> = ({ urlList, setUrlList, selectedUrl, onUrlSelect }) => {
    // Prepare the data for the grid
    const rowData = urlList.map((url, index) => {
        const uri = new URL(url);
        const modelId = uri.pathname.match(/\/models\/(\d+)/)?.[1] || 'Unknown'; // Extract modelId
        const versionId = uri.searchParams.get('modelVersionId') || 'Selecting'; // Extract versionId
        return {
            id: index + 1,
            url,
            modelId,
            versionId,
        };
    });

    // Define the column structure
    const columnDefs: ColDef[] = [
        {
            headerName: 'ID',
            field: 'id',
            width: 60,
            cellStyle: { textAlign: 'center', padding: '5px' } // Center-align ID column 
        },
        {
            headerName: 'Model ID',
            field: 'modelId',
            width: 120,
            cellStyle: { textAlign: 'center', padding: '5px' } // Center-align Model ID column
        },
        {
            headerName: 'Version ID',
            field: 'versionId',
            width: 150,
            cellStyle: { textAlign: 'center', padding: '5px' } // Center-align Version ID column
        },
        {
            headerName: 'URL',
            field: 'url',
            flex: 2, // URL column takes more space
            tooltipField: 'url', // Tooltip displays the full URL
            cellStyle: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '5px' },
            cellRenderer: (params: any) => {
                return (
                    <span
                        style={{
                            display: 'inline-block',
                            width: '100%',
                            userSelect: 'text', // Allow text selection
                        }}
                    >
                        {params.value}
                    </span>
                );
            },
        },
        {
            headerName: 'Actions',
            field: 'actions',
            width: 100, // Fixed size for the actions column
            cellRenderer: (params: any) => {
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent row selection on button click
                            handleDelete(params.data.url); // Call delete handler
                        }}
                        style={{
                            cursor: 'pointer',
                            background: '#ff4d4f',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                        }}
                    >
                        Delete
                    </button>
                );
            },
        },
    ];

    // Handle row deletion
    const handleDelete = (urlToRemove: string) => {
        setUrlList((prevUrlList) => prevUrlList.filter((url) => url !== urlToRemove));

        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: 'uncheck-url', url: urlToRemove });
            }
        });
    };

    return (
        <div
            className="ag-theme-alpine"
            style={{
                height: 300,
                width: '100%',
            }}
        >
            <AgGridReact
                rowData={rowData} // Set rows for the grid
                columnDefs={columnDefs} // Set columns for the grid
                defaultColDef={{
                    sortable: true,
                    resizable: true,
                }}
                tooltipShowDelay={500} // Add slight delay before showing tooltips
                getRowStyle={(params): RowStyle => {
                    return params.data.url === selectedUrl
                        ? { backgroundColor: '#d1e7fd', padding: '5px' } // Highlight selected row with padding
                        : { backgroundColor: '', padding: '5px' }; // Default style with padding
                }}
                onCellClicked={(params) => {
                    // Update the selected URL when a cell is clicked
                    if (params.colDef.field === 'url') {
                        const url = params.value;
                        onUrlSelect(url);
                    }
                }}
            />
        </div>
    );
};

export default URLGrid;
