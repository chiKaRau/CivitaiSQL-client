import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Form, Button, Badge, ButtonGroup } from 'react-bootstrap';

type GroupingModelItem = {
    url: string;
    modelId: string;
    versionId: string;
    imgSrc: string;
    name: string;
    creator: string;
    modelType: string;
    baseModel: string;

    savedText: string;
    savedQuantity: number;
    isSaved: boolean;

    offlineText: string;
    offlineQuantity: number;
    isOffline: boolean;

    updateText: string;
    stagedText: string;
    lockedText: string;

    isChecked: boolean;

    isAddedVersion?: boolean;
    parentModelUrl?: string;

    collectedAt: number;
};

type QuickFilter =
    | "all"
    | "saved"
    | "notSaved"
    | "offline"
    | "staged";

type GroupingModelVersion = {
    id: string;
    versionName: string;
    baseModel: string;
    availability: string;
    publishedAt: string;
    sizeKB: number | null;
    imgSrc: string;
    url: string;
};

type VersionPanelState = {
    expanded: boolean;
    loading: boolean;
    error: string;
    versions: GroupingModelVersion[];
};

const PLACEHOLDER_IMAGE = "https://placehold.co/450x675";

function toDisplayImageUrl(url: string, width = 450): string {
    if (!url) return "";
    if (url.includes("optimized=true") || url.includes("width=")) return url;

    return url.replace(
        "/original=true/",
        `/anim=false,width=${width},optimized=true/`
    );
}

function getModelIdFromItem(item: GroupingModelItem): string {
    if (item.modelId) return item.modelId;

    const match = item.url.match(/\/models\/(\d+)/);
    return match ? match[1] : "";
}

function buildVersionUrl(item: GroupingModelItem, versionId: string): string {
    const modelId = getModelIdFromItem(item);

    try {
        const parsed = new URL(item.url);
        return `${parsed.origin}/models/${modelId}?modelVersionId=${versionId}`;
    } catch {
        return `https://civitai.red/models/${modelId}?modelVersionId=${versionId}`;
    }
}

function normalizeSelectionUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}${parsed.search}`.toLowerCase();
    } catch {
        return String(url || "").toLowerCase();
    }
}

function formatVersionSize(sizeKB: number | null): string {
    if (sizeKB == null || Number.isNaN(sizeKB)) return "";

    const mb = sizeKB / 1024;
    const gb = mb / 1024;

    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${Math.round(sizeKB)} KB`;
}

function formatDateText(value: string): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString();
}

const GrouppingWindow: React.FC = () => {

    const groupingPortRef = React.useRef<chrome.runtime.Port | null>(null);
    const connectedTabIdRef = React.useRef<number | null>(null);
    const lastTabUrlRef = React.useRef<string>("");

    const [items, setItems] = useState<GroupingModelItem[]>([]);
    const [searchText, setSearchText] = useState("");
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

    const [versionPanelByModelId, setVersionPanelByModelId] =
        useState<Record<string, VersionPanelState>>({});

    const connectGroupingWindowToTab = React.useCallback((tabId: number) => {
        if (!tabId) return;

        // Already connected to this tab
        if (connectedTabIdRef.current === tabId && groupingPortRef.current) {
            chrome.tabs.sendMessage(
                tabId,
                { action: "get-grouping-models" },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn(chrome.runtime.lastError.message);
                        return;
                    }

                    setItems(Array.isArray(response?.items) ? response.items : []);
                }
            );

            return;
        }

        // Disconnect old tab port
        if (groupingPortRef.current) {
            try {
                groupingPortRef.current.disconnect();
            } catch {
                // ignore
            }

            groupingPortRef.current = null;
        }

        connectedTabIdRef.current = tabId;

        // Clear old tab cards immediately so UI doesn't show stale cards
        setItems([]);

        try {
            groupingPortRef.current = chrome.tabs.connect(tabId, {
                name: "grouping-window",
            });
        } catch (e) {
            console.warn("Failed to connect grouping window to tab:", e);
            return;
        }

        chrome.tabs.sendMessage(
            tabId,
            { action: "get-grouping-models" },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.warn(chrome.runtime.lastError.message);
                    return;
                }

                setItems(Array.isArray(response?.items) ? response.items : []);
            }
        );
    }, []);

    const filteredItems = useMemo(() => {
        const q = searchText.trim().toLowerCase();

        return items.filter((item) => {
            if (quickFilter === "saved" && !item.isSaved) return false;
            if (quickFilter === "notSaved" && item.isSaved) return false;
            if (quickFilter === "offline" && !item.isOffline) return false;
            if (quickFilter === "staged" && !item.stagedText) return false;

            if (!q) return true;

            return [
                item.name,
                item.creator,
                item.modelType,
                item.baseModel,
                item.savedText,
                item.offlineText,
                item.stagedText,
                item.updateText,
                item.modelId,
                item.versionId,
                item.url,
            ]
                .join(" ")
                .toLowerCase()
                .includes(q);
        });
    }, [items, searchText, quickFilter]);

    const stats = useMemo(() => {
        return {
            total: items.length,
            showing: filteredItems.length,
            saved: items.filter(x => x.isSaved).length,
            offline: items.filter(x => x.isOffline).length,
            staged: items.filter(x => !!x.stagedText).length,
        };
    }, [items, filteredItems]);

    const handleClear = () => {
        chrome.storage.local.get("originalTabId", (result) => {
            if (!result.originalTabId) {
                setItems([]);
                return;
            }

            chrome.tabs.sendMessage(
                result.originalTabId,
                { action: "clear-grouping-models" },
                () => {
                    setItems([]);
                }
            );
        });
    };

    const getAddableVersionsForItem = (
        item: GroupingModelItem,
        versions: GroupingModelVersion[]
    ): GroupingModelVersion[] => {
        // The first API version is the default/current model card itself.
        // So do not show it as an add option.
        const withoutFirstVersion = versions.slice(1);

        // Also avoid showing versions already added to the grouping window.
        return withoutFirstVersion.filter(version => {
            const versionKey = normalizeSelectionUrl(version.url);

            return !items.some(x =>
                normalizeSelectionUrl(x.url) === versionKey
            );
        });
    };

    const toggleItemSelection = (item: GroupingModelItem) => {
        const nextChecked = !item.isChecked;

        setItems(prev =>
            prev.map(x =>
                x.url === item.url
                    ? { ...x, isChecked: nextChecked }
                    : x
            )
        );

        chrome.storage.local.get("originalTabId", (result) => {
            if (!result.originalTabId) return;

            chrome.tabs.sendMessage(
                result.originalTabId,
                {
                    action: "set-grouping-selected",
                    url: item.url,
                    imgSrc: item.imgSrc,
                    isChecked: nextChecked,
                },
                () => {
                    if (chrome.runtime.lastError) {
                        console.warn(chrome.runtime.lastError.message);
                    }
                }
            );
        });
    };

    const fetchVersionsForItem = async (item: GroupingModelItem) => {
        const modelId = getModelIdFromItem(item);
        if (!modelId) return;

        setVersionPanelByModelId(prev => ({
            ...prev,
            [modelId]: {
                expanded: true,
                loading: true,
                error: "",
                versions: prev[modelId]?.versions || [],
            },
        }));

        try {
            const response = await fetch(`https://civitai.red/api/v1/models/${modelId}`);

            if (!response.ok) {
                throw new Error(`API failed: ${response.status}`);
            }

            const model = await response.json();
            const modelVersions = Array.isArray(model?.modelVersions)
                ? model.modelVersions
                : [];

            const versions: GroupingModelVersion[] = modelVersions.map((version: any) => {
                const files = Array.isArray(version.files) ? version.files : [];
                const primaryFile = files.find((x: any) => x?.primary) || files[0] || null;

                const images = Array.isArray(version.images) ? version.images : [];
                const firstImage = images[0]?.url || "";

                return {
                    id: String(version.id || ""),
                    versionName: version.name || "",
                    baseModel: version.baseModel || "",
                    availability: version.availability || "",
                    publishedAt: version.publishedAt || "",
                    sizeKB: typeof primaryFile?.sizeKB === "number" ? primaryFile.sizeKB : null,
                    imgSrc: firstImage ? toDisplayImageUrl(firstImage) : item.imgSrc || PLACEHOLDER_IMAGE,
                    url: buildVersionUrl(item, String(version.id || "")),
                };
            });

            setVersionPanelByModelId(prev => ({
                ...prev,
                [modelId]: {
                    expanded: true,
                    loading: false,
                    error: "",
                    versions,
                },
            }));
        } catch (error: any) {
            setVersionPanelByModelId(prev => ({
                ...prev,
                [modelId]: {
                    expanded: true,
                    loading: false,
                    error: String(error?.message || error),
                    versions: prev[modelId]?.versions || [],
                },
            }));
        }
    };

    const toggleVersionPanel = (
        item: GroupingModelItem,
        event: React.MouseEvent
    ) => {
        event.stopPropagation();

        const modelId = getModelIdFromItem(item);
        if (!modelId) return;

        const current = versionPanelByModelId[modelId];

        if (current?.versions?.length > 0 || current?.loading) {
            setVersionPanelByModelId(prev => ({
                ...prev,
                [modelId]: {
                    ...current,
                    expanded: !current.expanded,
                },
            }));

            return;
        }

        fetchVersionsForItem(item);
    };

    const createGroupingItemFromVersion = (
        parentItem: GroupingModelItem,
        version: GroupingModelVersion
    ): GroupingModelItem => {
        return {
            url: version.url,
            modelId: parentItem.modelId || getModelIdFromItem(parentItem),
            versionId: version.id,
            imgSrc: version.imgSrc || parentItem.imgSrc,

            name: `${parentItem.name || "Unknown Model"} - ${version.versionName || `Version ${version.id}`}`,
            creator: parentItem.creator,
            modelType: parentItem.modelType,
            baseModel: version.baseModel || parentItem.baseModel,

            savedText: "",
            savedQuantity: 0,
            isSaved: false,

            offlineText: "",
            offlineQuantity: 0,
            isOffline: false,

            updateText: "",
            stagedText: "",
            lockedText: "",

            isChecked: false,

            // new
            isAddedVersion: true,
            parentModelUrl: parentItem.parentModelUrl || parentItem.url,

            collectedAt: Date.now(),
        };
    };

    const addVersionToGroupingWindow = (
        parentItem: GroupingModelItem,
        version: GroupingModelVersion,
        event: React.MouseEvent
    ) => {
        event.stopPropagation();

        const newItem = createGroupingItemFromVersion(parentItem, version);
        const newKey = normalizeSelectionUrl(newItem.url);
        const modelId = newItem.modelId;

        setItems(prev => {
            const alreadyExists = prev.some(
                x => normalizeSelectionUrl(x.url) === newKey
            );

            if (alreadyExists) return prev;

            // Insert after the parent model and after any already-added versions
            // for the same model.
            let insertIndex = prev.findIndex(x =>
                normalizeSelectionUrl(x.url) === normalizeSelectionUrl(parentItem.url)
            );

            if (insertIndex === -1) {
                insertIndex = prev.findIndex(x => x.modelId === modelId);
            }

            if (insertIndex === -1) {
                return [...prev, newItem];
            }

            let lastSameModelIndex = insertIndex;

            for (let i = insertIndex + 1; i < prev.length; i++) {
                if (prev[i].modelId === modelId && prev[i].isAddedVersion) {
                    lastSameModelIndex = i;
                    continue;
                }

                break;
            }

            const next = [...prev];
            next.splice(lastSameModelIndex + 1, 0, newItem);
            return next;
        });

        chrome.storage.local.get("originalTabId", (result) => {
            if (!result.originalTabId) return;

            chrome.tabs.sendMessage(
                result.originalTabId,
                {
                    action: "add-grouping-item",
                    item: newItem,
                },
                () => {
                    if (chrome.runtime.lastError) {
                        console.warn(chrome.runtime.lastError.message);
                    }
                }
            );
        });
    };

    const removeVersionFromGroupingWindow = (
        item: GroupingModelItem,
        event: React.MouseEvent
    ) => {
        event.stopPropagation();

        setItems(prev =>
            prev.filter(x =>
                normalizeSelectionUrl(x.url) !== normalizeSelectionUrl(item.url)
            )
        );

        chrome.storage.local.get("originalTabId", (result) => {
            if (!result.originalTabId) return;

            chrome.tabs.sendMessage(
                result.originalTabId,
                {
                    action: "remove-grouping-item",
                    url: item.url,
                    wasChecked: item.isChecked,
                },
                () => {
                    if (chrome.runtime.lastError) {
                        console.warn(chrome.runtime.lastError.message);
                    }
                }
            );
        });
    };

    const loadGroupingModels = React.useCallback(() => {
        chrome.storage.local.get("originalTabId", (result) => {
            const tabId = Number(result.originalTabId || 0);
            if (!tabId) return;

            connectGroupingWindowToTab(tabId);
        });
    }, [connectGroupingWindowToTab]);

    useEffect(() => {
        const messageListener = (message: any) => {
            if (message.action === "grouping-models-updated") {
                setItems(Array.isArray(message.items) ? message.items : []);
            }
        };

        const storageListener = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            if (areaName !== "local") return;
            if (!changes.originalTabId) return;

            const nextTabId = Number(changes.originalTabId.newValue || 0);
            if (!nextTabId) {
                setItems([]);
                return;
            }

            connectGroupingWindowToTab(nextTabId);
        };

        chrome.runtime.onMessage.addListener(messageListener);
        chrome.storage.onChanged.addListener(storageListener);

        loadGroupingModels();

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
            chrome.storage.onChanged.removeListener(storageListener);

            if (groupingPortRef.current) {
                try {
                    groupingPortRef.current.disconnect();
                } catch {
                    // ignore
                }

                groupingPortRef.current = null;
            }

            connectedTabIdRef.current = null;
        };
    }, [connectGroupingWindowToTab, loadGroupingModels]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            chrome.storage.local.get("originalTabId", (result) => {
                const tabId = Number(result.originalTabId || 0);
                if (!tabId) return;

                chrome.tabs.get(tabId, (tab) => {
                    if (chrome.runtime.lastError) return;

                    const currentUrl = tab.url || "";

                    if (!currentUrl) return;

                    if (!lastTabUrlRef.current) {
                        lastTabUrlRef.current = currentUrl;
                        return;
                    }

                    if (lastTabUrlRef.current !== currentUrl) {
                        lastTabUrlRef.current = currentUrl;

                        // clear old page cards immediately
                        setItems([]);

                        // wait a bit for new page cards to render, then load
                        window.setTimeout(() => {
                            loadGroupingModels();
                        }, 800);

                        // one more delayed load because Civitai cards may render slowly
                        window.setTimeout(() => {
                            loadGroupingModels();
                        }, 2000);
                    }
                });
            });
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [loadGroupingModels]);

    return (
        <Container
            fluid
            className="bg-dark text-light p-3"
            style={{
                height: "100vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Row className="mb-3 align-items-end g-2">
                <Col md={3}>
                    <h4 className="mb-1">Groupping Window</h4>
                    <div className="text-secondary">
                        Showing {stats.showing} / {stats.total}
                    </div>
                </Col>

                <Col md={3}>
                    <Form.Label>Search</Form.Label>
                    <Form.Control
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="name, creator, saved, offline..."
                    />
                </Col>

                <Col md={4}>
                    <Form.Label>Filter</Form.Label>
                    <div>
                        <ButtonGroup size="sm">
                            <Button
                                variant={quickFilter === "all" ? "light" : "outline-light"}
                                onClick={() => setQuickFilter("all")}
                            >
                                All {stats.total}
                            </Button>

                            <Button
                                variant={quickFilter === "saved" ? "success" : "outline-success"}
                                onClick={() => setQuickFilter("saved")}
                            >
                                Saved {stats.saved}
                            </Button>

                            <Button
                                variant={quickFilter === "notSaved" ? "secondary" : "outline-secondary"}
                                onClick={() => setQuickFilter("notSaved")}
                            >
                                Not Saved
                            </Button>

                            <Button
                                variant={quickFilter === "offline" ? "primary" : "outline-primary"}
                                onClick={() => setQuickFilter("offline")}
                            >
                                Offline {stats.offline}
                            </Button>

                            <Button
                                variant={quickFilter === "staged" ? "warning" : "outline-warning"}
                                onClick={() => setQuickFilter("staged")}
                            >
                                Staged {stats.staged}
                            </Button>
                        </ButtonGroup>
                    </div>
                </Col>

                <Col md={2} className="text-end">
                    <Button variant="primary" className="me-2" onClick={loadGroupingModels}>
                        Refresh
                    </Button>

                    <Button variant="danger" onClick={handleClear}>
                        Clear
                    </Button>
                </Col>
            </Row>

            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    paddingRight: 8,
                }}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                        gap: 16,
                    }}
                >
                    {filteredItems.map((item) => {
                        const centerLabels = [
                            item.savedText && {
                                text: item.savedText,
                                bg: item.isSaved ? "#22c55e" : "#ef4444",
                            },
                            item.offlineText && {
                                text: item.offlineText,
                                bg: "#2563eb",
                            },
                            item.stagedText && {
                                text: item.stagedText,
                                bg: "#7c3aed",
                            },
                        ].filter(Boolean) as Array<{ text: string; bg: string }>;

                        return (
                            <div
                                key={item.url}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleItemSelection(item)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleItemSelection(item);
                                    }
                                }}
                                style={{
                                    background: "#1f1f1f",
                                    border: item.isChecked ? "3px solid yellow" : "1px solid #333",
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    position: "relative",
                                    boxShadow: item.isChecked
                                        ? "0 0 0 4px rgba(255,255,0,0.25), 0 4px 12px rgba(0,0,0,0.35)"
                                        : "0 4px 12px rgba(0,0,0,0.35)",
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}
                            >
                                <div
                                    style={{
                                        position: "relative",
                                        aspectRatio: "7 / 9",
                                        background: "#111",
                                    }}
                                >
                                    {item.imgSrc ? (
                                        <img
                                            src={item.imgSrc}
                                            alt={item.name}
                                            draggable={false}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                display: "block",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                height: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#777",
                                            }}
                                        >
                                            No Image
                                        </div>
                                    )}

                                    <input
                                        type="checkbox"
                                        checked={item.isChecked}
                                        readOnly
                                        style={{
                                            position: "absolute",
                                            top: 10,
                                            right: 10,
                                            zIndex: 5,
                                            transform: "scale(1.8)",
                                            pointerEvents: "none",
                                        }}
                                    />

                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 8,
                                            left: 8,
                                            right: 48,
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 6,
                                            zIndex: 3,
                                        }}
                                    >
                                        {item.modelType && <Badge bg="info">{item.modelType}</Badge>}
                                        {item.baseModel && <Badge bg="secondary">{item.baseModel}</Badge>}
                                        {item.updateText && (
                                            <Badge bg="light" text="dark">
                                                {item.updateText}
                                            </Badge>
                                        )}
                                        {item.lockedText && <Badge bg="dark">{item.lockedText}</Badge>}
                                    </div>

                                    {centerLabels.length > 0 && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                transform: "translate(-50%, -50%)",
                                                zIndex: 4,
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 6,
                                                pointerEvents: "none",
                                            }}
                                        >
                                            {centerLabels.map((label) => (
                                                <div
                                                    key={label.text}
                                                    style={{
                                                        backgroundColor: label.bg,
                                                        color: "white",
                                                        textShadow: "0px 0px 3px black",
                                                        padding: "5px 8px",
                                                        borderRadius: 5,
                                                        fontWeight: 700,
                                                        fontSize: 13,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {label.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {item.isChecked && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                bottom: 8,
                                                left: "50%",
                                                transform: "translateX(-50%)",
                                                zIndex: 4,
                                                background: "rgba(255,255,0,0.9)",
                                                color: "#111",
                                                padding: "4px 8px",
                                                borderRadius: 999,
                                                fontWeight: 800,
                                                fontSize: 12,
                                                pointerEvents: "none",
                                            }}
                                        >
                                            SELECTED
                                        </div>
                                    )}
                                </div>

                                <div style={{ padding: 10 }}>
                                    <div
                                        title={item.name}
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 15,
                                            lineHeight: 1.25,
                                            minHeight: 38,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {item.name || "Unknown Model"}
                                    </div>

                                    <div
                                        style={{
                                            marginTop: 6,
                                            color: "#aaa",
                                            fontSize: 13,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                        title={item.creator}
                                    >
                                        {item.creator || "Unknown Creator"}
                                    </div>

                                    <div
                                        style={{
                                            marginTop: 6,
                                            color: "#777",
                                            fontSize: 12,
                                        }}
                                    >
                                        {item.modelId}
                                        {item.versionId ? ` / ${item.versionId}` : ""}
                                    </div>


                                    <div style={{ marginTop: 8 }}>
                                        {!item.isAddedVersion && (
                                            <Button
                                                size="sm"
                                                variant="outline-info"
                                                onClick={(event) => toggleVersionPanel(item, event)}
                                            >
                                                Versions
                                            </Button>
                                        )}

                                        {item.isAddedVersion && (
                                            <Button
                                                size="sm"
                                                variant="outline-danger"
                                                onClick={(event) => removeVersionFromGroupingWindow(item, event)}
                                            >
                                                Remove Version
                                            </Button>
                                        )}
                                    </div>

                                    {(() => {
                                        const modelId = getModelIdFromItem(item);
                                        const panel = versionPanelByModelId[modelId];

                                        if (!panel?.expanded) return null;

                                        return (
                                            <div
                                                onClick={(event) => event.stopPropagation()}
                                                style={{
                                                    marginTop: 10,
                                                    borderTop: "1px solid #333",
                                                    paddingTop: 10,
                                                    maxHeight: 260,
                                                    overflowY: "auto",
                                                }}
                                            >
                                                {panel.loading && (
                                                    <div style={{ color: "#aaa", fontSize: 13 }}>
                                                        Loading versions...
                                                    </div>
                                                )}

                                                {panel.error && (
                                                    <div style={{ color: "#ef4444", fontSize: 13 }}>
                                                        {panel.error}
                                                    </div>
                                                )}

                                                {!panel.loading && !panel.error && panel.versions.length === 0 && (
                                                    <div style={{ color: "#777", fontSize: 13 }}>
                                                        No versions found.
                                                    </div>
                                                )}

                                                {(() => {
                                                    const addableVersions = getAddableVersionsForItem(item, panel.versions);

                                                    if (!panel.loading && !panel.error && panel.versions.length <= 1) {
                                                        return (
                                                            <div style={{ color: "#777", fontSize: 13 }}>
                                                                No extra versions.
                                                            </div>
                                                        );
                                                    }

                                                    if (!panel.loading && !panel.error && addableVersions.length === 0) {
                                                        return (
                                                            <div style={{ color: "#777", fontSize: 13 }}>
                                                                All extra versions already added.
                                                            </div>
                                                        );
                                                    }

                                                    return addableVersions.map((version) => {
                                                        const sizeText = formatVersionSize(version.sizeKB);
                                                        const publishedText = formatDateText(version.publishedAt);
                                                        const isEarlyAccess =
                                                            String(version.availability || "").toLowerCase() === "earlyaccess";

                                                        return (
                                                            <div
                                                                key={version.id}
                                                                style={{
                                                                    display: "flex",
                                                                    gap: 8,
                                                                    padding: "8px 0",
                                                                    borderBottom: "1px solid #333",
                                                                }}
                                                            >
                                                                <img
                                                                    src={version.imgSrc || PLACEHOLDER_IMAGE}
                                                                    alt={version.versionName}
                                                                    draggable={false}
                                                                    style={{
                                                                        width: 52,
                                                                        height: 70,
                                                                        objectFit: "cover",
                                                                        borderRadius: 6,
                                                                        flexShrink: 0,
                                                                    }}
                                                                />

                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                    <div
                                                                        title={version.versionName}
                                                                        style={{
                                                                            fontWeight: 700,
                                                                            fontSize: 13,
                                                                            lineHeight: 1.25,
                                                                            whiteSpace: "nowrap",
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                        }}
                                                                    >
                                                                        {version.versionName || `Version ${version.id}`}
                                                                    </div>

                                                                    <div
                                                                        style={{
                                                                            marginTop: 4,
                                                                            display: "flex",
                                                                            gap: 4,
                                                                            flexWrap: "wrap",
                                                                        }}
                                                                    >
                                                                        <Badge bg="secondary">{version.id}</Badge>

                                                                        {version.baseModel && (
                                                                            <Badge bg="info">{version.baseModel}</Badge>
                                                                        )}

                                                                        {isEarlyAccess && (
                                                                            <Badge bg="warning" text="dark">
                                                                                EA
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    <div
                                                                        style={{
                                                                            marginTop: 4,
                                                                            color: "#999",
                                                                            fontSize: 11,
                                                                        }}
                                                                    >
                                                                        {[publishedText, sizeText].filter(Boolean).join(" • ")}
                                                                    </div>

                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline-success"
                                                                        style={{ marginTop: 6 }}
                                                                        onClick={(event) => addVersionToGroupingWindow(item, version, event)}
                                                                    >
                                                                        Add Version
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        );
                                    })()}

                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredItems.length === 0 && (
                    <div
                        style={{
                            textAlign: "center",
                            color: "#777",
                            marginTop: 80,
                        }}
                    >
                        No models found.
                    </div>
                )}
            </div>
        </Container>
    );
};

export default GrouppingWindow;