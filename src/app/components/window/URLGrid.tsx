import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, RowStyle } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";
import { HoverImagePreview } from "./HoverImagePreview";

interface URLGridProps {
    urlList: string[];
    setUrlList: (updater: (prevUrlList: string[]) => string[]) => void;
    selectedUrl: string | null;
    onUrlSelect: (url: string) => void;
    isDarkMode: boolean;
    urlImgSrcMap?: Record<string, string>;
    urlVersionIdMap?: Record<string, string>;
    modelPrimaryVersionIdMap?: Record<string, string>;
    urlBadgeMap?: Record<string, string>;
}


const URLGrid: React.FC<URLGridProps> = ({
    urlList,
    setUrlList,
    selectedUrl,
    onUrlSelect,
    isDarkMode,
    urlImgSrcMap = {},
    urlVersionIdMap = {},
    modelPrimaryVersionIdMap = {},
    urlBadgeMap = {}
}) => {

    const theme = isDarkMode ? darkTheme : lightTheme;

    const ImageTooltip: React.FC<any> = (props) => {
        const src: string = props?.value || "";
        if (!src) return null;

        return (
            <div
                style={{
                    padding: 6,
                    backgroundColor: theme.panelBackground,
                    color: theme.panelText,
                    border: `1px solid ${theme.panelBorder}`,
                    borderRadius: 8,
                    boxShadow: theme.buttonShadow,
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

    const TrashButton = ({ onClick }: { onClick: (e: any) => void }) => {
        const deleteColor = isDarkMode ? "#ff9a9a" : "#c62828";
        const deleteBorder = isDarkMode
            ? "1px solid rgba(255, 154, 154, 0.18)"
            : "1px solid rgba(198, 40, 40, 0.18)";
        const deleteBackground = isDarkMode
            ? "rgba(255, 154, 154, 0.08)"
            : "rgba(198, 40, 40, 0.06)";

        return (
            <button
                type="button"
                onClick={onClick}
                title="Delete"
                style={{
                    cursor: "pointer",
                    background: deleteBackground,
                    color: deleteColor,
                    border: deleteBorder,
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
    };

    const TextTooltip: React.FC<any> = (props) => {
        const value = String(props?.value || "");
        if (!value) return null;

        return (
            <div
                style={{
                    padding: 8,
                    backgroundColor: theme.panelBackground,
                    color: theme.panelText,
                    border: `1px solid ${theme.panelBorder}`,
                    borderRadius: 8,
                    boxShadow: theme.buttonShadow,
                    maxWidth: 520,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: "1.35",
                }}
            >
                {value}
            </div>
        );
    };

    const columnDefs: ColDef[] = [
        {
            headerName: "#",
            width: 60,
            minWidth: 50,
            maxWidth: 70,
            sortable: false,
            filter: false,
            editable: false,
            pinned: "left",
            lockPinned: true,
            suppressMovable: true,
            valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
            cellStyle: {
                textAlign: "center",
                fontWeight: 600,
            },
        },
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
            tooltipComponent: "textTooltip",
            cellStyle: {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                padding: "5px",
                color: theme.rowFontColor,
            },
            cellRenderer: (params: any) => (
                <span
                    style={{
                        display: "inline-block",
                        width: "100%",
                        userSelect: "text",
                        color: theme.rowFontColor,
                    }}
                >
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
            cellStyle: { padding: "5px", textAlign: "center" },
            cellRenderer: (params: any) => {
                const src = params.value as string;
                if (!src) {
                    return <span style={{ opacity: 0.5, color: theme.subText }}>—</span>;
                }

                return <HoverImagePreview src={src} theme={theme} />;
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

    const components = useMemo(
        () => ({
            imageTooltip: ImageTooltip,
            textTooltip: TextTooltip,
        }),
        [theme]
    );

    return (
        <div
            className={isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
            style={{
                height: 300,
                width: "100%",
                backgroundColor: theme.gridBackgroundColor,
                color: theme.rowFontColor,
                ["--ag-background-color" as any]: theme.gridBackgroundColor,
                ["--ag-foreground-color" as any]: theme.rowFontColor,
                ["--ag-header-background-color" as any]: theme.headerBackgroundColor,
                ["--ag-header-foreground-color" as any]: theme.headerFontColor,
                ["--ag-odd-row-background-color" as any]: theme.oddRowBackgroundColor,
                ["--ag-border-color" as any]: theme.panelBorder,
                ["--ag-secondary-border-color" as any]: theme.panelBorder,
                ["--ag-selected-row-background-color" as any]: theme.rowBackgroundColor,
                ["--ag-data-color" as any]: theme.rowFontColor,
                ["--ag-tooltip-background-color" as any]: theme.panelBackground,
            }}
        >
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                components={components}
                rowHeight={64}
                defaultColDef={{ sortable: true, resizable: true }}
                tooltipShowDelay={250}
                getRowStyle={(params): RowStyle =>
                    params.data.url === selectedUrl
                        ? { backgroundColor: theme.rowBackgroundColor, color: theme.rowFontColor, padding: "5px" }
                        : { backgroundColor: "", color: theme.rowFontColor, padding: "5px" }
                }
                onCellClicked={(params) => {
                    if (params.colDef.field !== "actions") onUrlSelect(params.data.url);
                }}
            />
        </div>
    );
};

export default URLGrid;