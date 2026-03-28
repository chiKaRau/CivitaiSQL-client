import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { CellStyle, ColDef, RowStyle } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";
import { HoverImagePreview } from "./HoverImagePreview";
import { TrashButton } from "./TrashButton";
import SmartImage from "../window_offline/SmartImage";

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
                <SmartImage
                    src={src}
                    alt="preview"
                    isDarkMode={isDarkMode}
                    maxHeight={420}
                    borderRadius={6}
                    loading="lazy"
                    showRetryButton={false}
                />
            </div>
        );
    };

    const reverseByModelGroup = <T extends { modelId: string; isPrimary?: boolean }>(rows: T[]) => {
        const groups: T[][] = [];
        const groupIndexMap = new Map<string, number>();

        rows.forEach((row) => {
            const existingIndex = groupIndexMap.get(row.modelId);

            if (existingIndex === undefined) {
                groupIndexMap.set(row.modelId, groups.length);
                groups.push([row]);
            } else {
                groups[existingIndex].push(row);
            }
        });

        return groups
            .reverse()
            .flatMap((group) => {
                const mainRows = group.filter((row) => row.isPrimary);
                const otherRows = group.filter((row) => !row.isPrimary);
                return [...mainRows, ...otherRows];
            });
    };

    const rowData = useMemo(() => {
        const rawRows = urlList.map((url) => {
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

            const badge = urlBadgeMap?.[url] || "";

            const modelVersionDisplay = effectiveVersionId
                ? `${modelId}_${effectiveVersionId}${isPrimary ? " (main)" : ""}${badge}`
                : `${modelId}${isPrimary ? " (main)" : ""}${badge}`;

            const imgSrc = urlImgSrcMap[url] || "";

            return {
                id: url, // stable row id
                url,
                modelId,
                versionId: effectiveVersionId,
                isPrimary,
                modelVersionDisplay,
                imgSrc,
            };
        });

        return reverseByModelGroup(rawRows);
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

    const columnDefs = useMemo<ColDef[]>(() => [
        {
            headerName: "#",
            width: 60,
            minWidth: 50,
            maxWidth: 70,
            sortable: true,
            filter: false,
            editable: false,
            pinned: "left",
            lockPinned: true,
            suppressMovable: true,
            valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
            cellStyle: {
                textAlign: "center",
                fontWeight: 600,
            } as CellStyle,
        },
        {
            headerName: "Model & Version",
            field: "modelVersionDisplay",
            width: 170,
            minWidth: 140,
            wrapText: true,
            autoHeight: true,
            cellStyle: {
                whiteSpace: "normal",
                wordBreak: "break-word",
                textAlign: "left",
                padding: "5px"
            } as CellStyle,
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
            } as CellStyle,
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
            cellStyle: {
                padding: "5px",
                textAlign: "center",
            } as CellStyle,
            cellRenderer: (params: any) => {
                const src = params.value as string;
                if (!src) {
                    return <span style={{ opacity: 0.5, color: theme.subText }}>—</span>;
                }

                return <HoverImagePreview src={src} theme={theme} isDarkMode={isDarkMode} />;
            },
        },
        {
            headerName: "Remove",
            field: "actions",
            width: 90,
            sortable: false,
            resizable: false,
            cellStyle: {
                textAlign: "center",
                padding: "5px",
            } as CellStyle,
            cellRenderer: (params: any) => (
                <TrashButton
                    onClick={() => handleDelete(params.data.url)}
                    isDarkMode={isDarkMode}
                />
            ),
        },
    ], [theme, isDarkMode]);

    const defaultColDef = useMemo<ColDef>(() => ({
        sortable: true,
        resizable: true,
    }), []);

    const components = useMemo(
        () => ({
            imageTooltip: ImageTooltip,
            textTooltip: TextTooltip,
        }),
        [theme, isDarkMode]
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
                defaultColDef={defaultColDef}
                components={components}
                rowHeight={64}
                getRowId={(params) => params.data.id}
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

export default React.memo(URLGrid);