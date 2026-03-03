import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, RowStyle } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface URLGridProps {
    urlList: string[];
    setUrlList: (updater: (prevUrlList: string[]) => string[]) => void;
    selectedUrl: string | null;
    onUrlSelect: (url: string) => void;

    // url -> imgSrc map
    urlImgSrcMap?: Record<string, string>;

    // NEW: url -> versionId map (filled ONLY by ShortcutPanel after it fetches API)
    urlVersionIdMap?: Record<string, string>;

    modelPrimaryVersionIdMap?: Record<string, string>;

    urlBadgeMap?: Record<string, string>;

}

// Tooltip that shows a larger image
const ImageTooltip: React.FC<any> = (props) => {
    const src: string = props?.value || "";
    if (!src) return null;

    return (
        <div
            style={{
                padding: 6,
                background: "rgba(0,0,0,0.85)",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                maxWidth: 340,
            }}
        >
            <img
                src={src}
                alt="preview"
                style={{
                    display: "block",
                    maxWidth: 320,
                    maxHeight: 420,
                    borderRadius: 6,
                }}
            />
        </div>
    );
};

const URLGrid: React.FC<URLGridProps> = ({
    urlList,
    setUrlList,
    selectedUrl,
    onUrlSelect,
    urlImgSrcMap = {},
    urlVersionIdMap = {},
    modelPrimaryVersionIdMap = {},
    urlBadgeMap = {}

}) => {
    const rowData = useMemo(() => {
        const seenModelIds = new Set<string>();

        return urlList.map((url) => {
            let modelId = "Unknown";
            let versionFromUrl = "";

            try {
                const uri = new URL(url);
                modelId = uri.pathname.match(/\/models\/(\d+)/)?.[1] || "Unknown";
                versionFromUrl = uri.searchParams.get("modelVersionId") || "";
            } catch {
                // ignore parsing errors
            }

            const primaryVid = modelPrimaryVersionIdMap[modelId] || "";
            const effectiveVersionId = versionFromUrl || urlVersionIdMap[url] || "";

            const isPrimary =
                !!primaryVid && !!effectiveVersionId && effectiveVersionId === primaryVid;

            // IMPORTANT: if we still don't know versionId, show ONLY modelId (your request)
            const badge = urlBadgeMap?.[url] || "";

            const modelVersionDisplay = effectiveVersionId
                ? `${modelId}_${effectiveVersionId}${isPrimary ? " (main)" : ""}${badge}`
                : `${modelId}${isPrimary ? " (main)" : ""}${badge}`;

            const imgSrc = urlImgSrcMap[url] || "";

            return {
                url,
                modelId,
                versionId: effectiveVersionId,
                isPrimary,
                modelVersionDisplay,
                imgSrc,
            };
        });
    }, [urlList, urlImgSrcMap, urlVersionIdMap, modelPrimaryVersionIdMap, urlBadgeMap]);

    const handleDelete = (urlToRemove: string) => {
        setUrlList((prev) => prev.filter((u) => u !== urlToRemove));

        chrome.storage.local.get("originalTabId", (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, {
                    action: "uncheck-url",
                    url: urlToRemove,
                });
            }
        });
    };

    const TrashButton = ({ onClick }: { onClick: (e: any) => void }) => (
        <button
            type="button"
            onClick={onClick}
            title="Delete"
            style={{
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: 6,
                borderRadius: 6,
                lineHeight: 0,
            }}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                    d="M9 3h6m-8 4h10m-9 0 1 14h6l1-14M10 11v7M14 11v7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    );

    const columnDefs: ColDef[] = [
        {
            headerName: "Model & Version",
            field: "modelVersionDisplay",   // <-- use your real field name
            width: 170,                     // <-- shorter (tweak 150~220)
            minWidth: 140,
            wrapText: true,
            autoHeight: true,
            cellStyle: {
                whiteSpace: "normal",
                wordBreak: "break-word",
                textAlign: "left",
                padding: "5px"
            },
            cellRenderer: (params: any) => {
                const isPrimary = !!params?.data?.isPrimary;
                return <span style={{ fontWeight: isPrimary ? 800 : 600 }}>{params.value}</span>;
            },
        },
        {
            headerName: "URL",
            field: "url",
            flex: 2,
            tooltipField: "url",
            cellStyle: {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                padding: "5px",
            },
            cellRenderer: (params: any) => (
                <span style={{ display: "inline-block", width: "100%", userSelect: "text" }}>
                    {params.value}
                </span>
            ),
        },
        {
            headerName: "Image",
            field: "imgSrc",
            width: 110,
            sortable: false,
            resizable: false,
            tooltipField: "imgSrc",
            tooltipComponent: "imageTooltip",
            cellStyle: { padding: "5px", textAlign: "center" },
            cellRenderer: (params: any) => {
                const src = params.value as string;
                if (!src) return <span style={{ opacity: 0.5 }}>—</span>;

                return (
                    <img
                        src={src}
                        alt="thumb"
                        style={{
                            width: 52,
                            height: 52,
                            objectFit: "cover",
                            borderRadius: 8,
                            display: "inline-block",
                        }}
                    />
                );
            },
        },
        {
            headerName: "Actions",
            field: "actions",
            width: 90,
            sortable: false,
            resizable: false,
            cellStyle: { textAlign: "center", padding: "5px" },
            cellRenderer: (params: any) => (
                <TrashButton
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(params.data.url);
                    }}
                />
            ),
        },
    ];

    const components = useMemo(() => ({ imageTooltip: ImageTooltip }), []);

    return (
        <div className="ag-theme-alpine" style={{ height: 300, width: "100%" }}>
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                components={components}
                rowHeight={64}
                defaultColDef={{ sortable: true, resizable: true }}
                tooltipShowDelay={250}
                getRowStyle={(params): RowStyle =>
                    params.data.url === selectedUrl
                        ? { backgroundColor: "#d1e7fd", padding: "5px" }
                        : { backgroundColor: "", padding: "5px" }
                }
                onCellClicked={(params) => {
                    if (params.colDef.field !== "actions") onUrlSelect(params.data.url);
                }}
            />
        </div>
    );
};

export default URLGrid;