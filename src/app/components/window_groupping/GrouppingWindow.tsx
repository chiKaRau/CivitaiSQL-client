import React, { useEffect, useMemo, useState } from 'react';
import { Container, Form, Button, Badge } from 'react-bootstrap';
import SmartImage from '../window_offline/SmartImage';

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

type SortField =
    | "name"
    | "nameReverse"
    | "creator"
    | "modelType"
    | "baseModel"
    | "modelId"
    | "versionId"
    | "savedQuantity"
    | "offlineQuantity"
    | "collectedAt";

type SortDirection = "asc" | "desc";

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

function getSortTextValue(item: GroupingModelItem, field: SortField): string {
    if (field === "name") return item.name || "";
    if (field === "nameReverse") return reverseText(item.name || "");
    if (field === "creator") return item.creator || "";
    if (field === "modelType") return item.modelType || "";
    if (field === "baseModel") return item.baseModel || "";

    return "";
}

function getSortNumberValue(item: GroupingModelItem, field: SortField): number {
    if (field === "modelId") return Number(item.modelId || 0);
    if (field === "versionId") return Number(item.versionId || 0);
    if (field === "savedQuantity") return Number(item.savedQuantity || 0);
    if (field === "offlineQuantity") return Number(item.offlineQuantity || 0);
    if (field === "collectedAt") return Number(item.collectedAt || 0);

    return 0;
}

function reverseText(value: string): string {
    return Array.from(value || "").reverse().join("");
}

function isNumberSortField(field: SortField): boolean {
    return [
        "modelId",
        "versionId",
        "savedQuantity",
        "offlineQuantity",
        "collectedAt",
    ].includes(field);
}

function getParentGroupKey(item: GroupingModelItem): string {
    return normalizeSelectionUrl(item.parentModelUrl || item.url);
}

const GrouppingWindow: React.FC = () => {

    const groupingPortRef = React.useRef<chrome.runtime.Port | null>(null);
    const connectedTabIdRef = React.useRef<number | null>(null);
    const lastTabUrlRef = React.useRef<string>("");

    const itemsRef = React.useRef<GroupingModelItem[]>([]);
    const didMountSelectionResetRef = React.useRef(false);

    const [items, setItems] = useState<GroupingModelItem[]>([]);
    const [searchText, setSearchText] = useState("");
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

    const [sortField, setSortField] = useState<SortField>("collectedAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [versionPanelByModelId, setVersionPanelByModelId] =
        useState<Record<string, VersionPanelState>>({});

    const connectGroupingWindowToTab = React.useCallback((tabId: number) => {
        if (!tabId) return;

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

        if (groupingPortRef.current) {
            try {
                groupingPortRef.current.disconnect();
            } catch {
                // ignore
            }

            groupingPortRef.current = null;
        }

        connectedTabIdRef.current = tabId;
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

    const sortedItems = useMemo(() => {
        const directionMultiplier = sortDirection === "asc" ? 1 : -1;

        const compareItems = (a: GroupingModelItem, b: GroupingModelItem) => {
            if (isNumberSortField(sortField)) {
                const aValue = getSortNumberValue(a, sortField);
                const bValue = getSortNumberValue(b, sortField);

                return (aValue - bValue) * directionMultiplier;
            }

            const aValue = getSortTextValue(a, sortField).toLowerCase();
            const bValue = getSortTextValue(b, sortField).toLowerCase();

            return aValue.localeCompare(bValue) * directionMultiplier;
        };

        const parentItems = filteredItems.filter(item => !item.isAddedVersion);
        const versionItems = filteredItems.filter(item => item.isAddedVersion);

        const versionItemsByParent = new Map<string, GroupingModelItem[]>();

        versionItems.forEach(versionItem => {
            const parentKey = getParentGroupKey(versionItem);

            if (!versionItemsByParent.has(parentKey)) {
                versionItemsByParent.set(parentKey, []);
            }

            versionItemsByParent.get(parentKey)!.push(versionItem);
        });

        const sortedParents = [...parentItems].sort(compareItems);

        const result: GroupingModelItem[] = [];
        const usedVersionUrls = new Set<string>();

        sortedParents.forEach(parentItem => {
            result.push(parentItem);

            const parentKey = normalizeSelectionUrl(parentItem.url);
            const childVersions = versionItemsByParent.get(parentKey) || [];

            childVersions
                .sort((a, b) => Number(a.versionId || 0) - Number(b.versionId || 0))
                .forEach(versionItem => {
                    result.push(versionItem);
                    usedVersionUrls.add(normalizeSelectionUrl(versionItem.url));
                });
        });

        const orphanVersions = versionItems
            .filter(item => !usedVersionUrls.has(normalizeSelectionUrl(item.url)))
            .sort(compareItems);

        return [...result, ...orphanVersions];
    }, [filteredItems, sortField, sortDirection]);

    const stats = useMemo(() => {
        return {
            total: items.length,
            showing: sortedItems.length,
            saved: items.filter(x => x.isSaved).length,
            offline: items.filter(x => x.isOffline).length,
            staged: items.filter(x => !!x.stagedText).length,
        };
    }, [items, sortedItems]);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const clearAllSelections = React.useCallback(() => {
        const checkedItems = itemsRef.current.filter(item => item.isChecked);

        if (checkedItems.length === 0) return;

        setItems(prev =>
            prev.map(item =>
                item.isChecked
                    ? { ...item, isChecked: false }
                    : item
            )
        );

        chrome.storage.local.get("originalTabId", (result) => {
            if (!result.originalTabId) return;

            checkedItems.forEach(item => {
                chrome.tabs.sendMessage(
                    result.originalTabId,
                    {
                        action: "set-grouping-selected",
                        url: item.url,
                        imgSrc: item.imgSrc,
                        isChecked: false,
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            console.warn(chrome.runtime.lastError.message);
                        }
                    }
                );
            });
        });
    }, []);

    useEffect(() => {
        if (!didMountSelectionResetRef.current) {
            didMountSelectionResetRef.current = true;
            return;
        }

        clearAllSelections();
    }, [searchText, quickFilter, sortField, sortDirection, clearAllSelections]);

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
        const withoutFirstVersion = versions.slice(1);

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

                        setItems([]);

                        window.setTimeout(() => {
                            loadGroupingModels();
                        }, 800);

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

    const areAllDisplayedSelected =
        sortedItems.length > 0 && sortedItems.every(item => item.isChecked);

    const setDisplayedItemsSelection = (nextChecked: boolean) => {
        if (sortedItems.length === 0) return;

        const displayedUrlSet = new Set(
            sortedItems.map(item => normalizeSelectionUrl(item.url))
        );

        setItems(prev =>
            prev.map(item =>
                displayedUrlSet.has(normalizeSelectionUrl(item.url))
                    ? { ...item, isChecked: nextChecked }
                    : item
            )
        );

        chrome.storage.local.get("originalTabId", (result) => {
            if (!result.originalTabId) return;

            sortedItems.forEach(item => {
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
        });
    };

    const handleToggleDisplayedSelection = () => {
        setDisplayedItemsSelection(!areAllDisplayedSelected);
    };

    return (
        <Container fluid className="gw-root bg-dark text-light">
            <style>
                {`
                    .gw-root {
                        height: 100vh;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        padding: 14px;
                    }

                    .gw-toolbar {
                        display: grid;
                        grid-template-columns: minmax(180px, 0.8fr) minmax(220px, 1fr) minmax(260px, 1.5fr) minmax(260px, 1.2fr) auto;
                        gap: 12px;
                        align-items: end;
                        margin-bottom: 14px;
                    }

                    .gw-title {
                        min-width: 0;
                    }

                    .gw-title h4 {
                        margin: 0;
                        line-height: 1.2;
                    }

                    .gw-stat {
                        color: #9ca3af;
                        font-size: 13px;
                        margin-top: 4px;
                    }

                    .gw-label {
                        color: #d1d5db;
                        font-size: 13px;
                        margin-bottom: 5px;
                    }

                    .gw-filter-wrap,
                    .gw-action-wrap,
                    .gw-sort-wrap {
                        display: flex;
                        gap: 6px;
                        flex-wrap: wrap;
                    }

                    .gw-filter-wrap .btn {
                        white-space: nowrap;
                    }

                    .gw-sort-select {
                        min-width: 165px;
                        flex: 1;
                    }

                    .gw-content {
                        flex: 1;
                        overflow-y: auto;
                        padding-right: 6px;
                    }

                    .gw-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                        gap: 16px;
                        align-items: start;
                    }

                    .gw-card {
                        background: #1f1f1f;
                        border-radius: 12px;
                        overflow: hidden;
                        position: relative;
                        cursor: pointer;
                        user-select: none;
                        min-width: 0;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                        border: 1px solid #333;
                    }

                    .gw-card-selected {
                        border: 3px solid yellow;
                        box-shadow: 0 0 0 4px rgba(255,255,0,0.25), 0 4px 12px rgba(0,0,0,0.35);
                    }

                    .gw-image-wrap {
                        position: relative;
                        aspect-ratio: 7 / 9;
                        background: #111;
                        overflow: hidden;
                    }

                    .gw-image-wrap::before {
                        content: "";
                        position: absolute;
                        left: 0;
                        right: 0;
                        top: 0;
                        height: 95px;
                        background: linear-gradient(to bottom, rgba(0,0,0,0.65), transparent);
                        z-index: 2;
                        pointer-events: none;
                    }

                    .gw-image {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                    }

                    .gw-no-image {
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #777;
                    }

                    .gw-checkbox-shell {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        z-index: 6;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0,0,0,0.55);
                        border-radius: 999px;
                        pointer-events: none;
                    }

                    .gw-checkbox-shell input {
                        transform: scale(1.35);
                        pointer-events: none;
                    }

                    .gw-top-badges {
                        position: absolute;
                        top: 8px;
                        left: 8px;
                        right: 50px;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 5px;
                        z-index: 4;
                        max-height: 58px;
                        overflow: hidden;
                        pointer-events: none;
                    }

                    .gw-badge-truncate {
                        max-width: 100%;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .gw-center-labels {
                        position: absolute;
                        top: 50%;
                        left: 8px;
                        right: 8px;
                        transform: translateY(-50%);
                        z-index: 4;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                        pointer-events: none;
                    }

                    .gw-center-label {
                        color: white;
                        text-shadow: 0 0 3px black;
                        padding: 5px 8px;
                        border-radius: 6px;
                        font-weight: 700;
                        font-size: 13px;
                        max-width: 100%;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .gw-selected-pill {
                        position: absolute;
                        bottom: 8px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 4;
                        background: rgba(255,255,0,0.92);
                        color: #111;
                        padding: 4px 9px;
                        border-radius: 999px;
                        font-weight: 800;
                        font-size: 12px;
                        pointer-events: none;
                    }

                    .gw-body {
                        padding: 10px;
                        min-width: 0;
                    }

                    .gw-name {
                        font-weight: 700;
                        font-size: 15px;
                        line-height: 1.25;
                        min-height: 38px;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        overflow-wrap: anywhere;
                    }

                    .gw-creator {
                        margin-top: 6px;
                        color: #aaa;
                        font-size: 13px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .gw-id {
                        margin-top: 6px;
                        color: #777;
                        font-size: 12px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .gw-card-actions {
                        margin-top: 8px;
                        display: flex;
                        gap: 6px;
                        flex-wrap: wrap;
                    }

                    .gw-version-panel {
                        margin-top: 10px;
                        border-top: 1px solid #333;
                        padding-top: 10px;
                        max-height: 300px;
                        overflow-y: auto;
                        overflow-x: hidden;
                    }

                    .gw-version-row {
                        display: grid;
                        grid-template-columns: 52px minmax(0, 1fr);
                        gap: 8px;
                        padding: 8px 0;
                        border-bottom: 1px solid #333;
                    }

                    .gw-version-thumb {
                        width: 52px;
                        height: 70px;
                        object-fit: cover;
                        border-radius: 6px;
                    }

                    .gw-version-info {
                        min-width: 0;
                    }

                    .gw-version-name {
                        font-weight: 700;
                        font-size: 13px;
                        line-height: 1.25;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .gw-version-badges {
                        margin-top: 4px;
                        display: flex;
                        gap: 4px;
                        flex-wrap: wrap;
                    }

                    .gw-version-meta {
                        margin-top: 4px;
                        color: #999;
                        font-size: 11px;
                    }

                    .gw-empty {
                        text-align: center;
                        color: #777;
                        margin-top: 80px;
                    }

                    @media (max-width: 1100px) {
                        .gw-toolbar {
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                        }

                        .gw-action-wrap {
                            justify-content: flex-start;
                        }
                    }

                    @media (max-width: 650px) {
                        .gw-root {
                            padding: 10px;
                        }

                        .gw-toolbar {
                            grid-template-columns: 1fr;
                        }

                        .gw-grid {
                            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                            gap: 12px;
                        }

                        .gw-action-wrap .btn,
                        .gw-filter-wrap .btn {
                            flex: 1 1 auto;
                        }
                    }
                `}
            </style>

            <div className="gw-toolbar">
                <div className="gw-title">
                    <h4>Groupping Window</h4>
                    <div className="gw-stat">
                        Showing {stats.showing} / {stats.total}
                    </div>
                </div>

                <div>
                    <Form.Label className="gw-label">Search</Form.Label>
                    <Form.Control
                        size="sm"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="name, creator, saved, offline..."
                    />
                </div>

                <div>
                    <Form.Label className="gw-label">Filter</Form.Label>
                    <div className="gw-filter-wrap">
                        <Button
                            size="sm"
                            variant={quickFilter === "all" ? "light" : "outline-light"}
                            onClick={() => setQuickFilter("all")}
                        >
                            All {stats.total}
                        </Button>

                        <Button
                            size="sm"
                            variant={quickFilter === "saved" ? "success" : "outline-success"}
                            onClick={() => setQuickFilter("saved")}
                        >
                            Saved {stats.saved}
                        </Button>

                        <Button
                            size="sm"
                            variant={quickFilter === "notSaved" ? "secondary" : "outline-secondary"}
                            onClick={() => setQuickFilter("notSaved")}
                        >
                            Not Saved
                        </Button>

                        <Button
                            size="sm"
                            variant={quickFilter === "offline" ? "primary" : "outline-primary"}
                            onClick={() => setQuickFilter("offline")}
                        >
                            Offline {stats.offline}
                        </Button>

                        <Button
                            size="sm"
                            variant={quickFilter === "staged" ? "warning" : "outline-warning"}
                            onClick={() => setQuickFilter("staged")}
                        >
                            Staged {stats.staged}
                        </Button>
                    </div>
                </div>

                <div>
                    <Form.Label className="gw-label">Sort</Form.Label>

                    <div className="gw-sort-wrap">
                        <Form.Select
                            size="sm"
                            className="gw-sort-select"
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value as SortField)}
                        >
                            <option value="collectedAt">Added Order</option>
                            <option value="name">Name</option>
                            <option value="nameReverse">Name Reverse</option>
                            <option value="creator">Creator</option>
                            <option value="modelType">Model Type</option>
                            <option value="baseModel">Base Model</option>
                            <option value="modelId">Model ID</option>
                            <option value="versionId">Version ID</option>
                            <option value="savedQuantity">Saved Count</option>
                            <option value="offlineQuantity">Offline Count</option>
                        </Form.Select>

                        <Button
                            size="sm"
                            variant="outline-light"
                            onClick={() =>
                                setSortDirection(prev => prev === "asc" ? "desc" : "asc")
                            }
                        >
                            {sortDirection === "asc" ? "ASC" : "DESC"}
                        </Button>
                    </div>
                </div>

                <div>
                    <Form.Label className="gw-label">&nbsp;</Form.Label>
                    <div className="gw-action-wrap">
                        <Button
                            size="sm"
                            variant={areAllDisplayedSelected ? "outline-warning" : "outline-success"}
                            disabled={sortedItems.length === 0}
                            onClick={handleToggleDisplayedSelection}
                        >
                            {areAllDisplayedSelected ? "Unselect Displayed" : `Select All ${stats.showing}`}
                        </Button>

                        <Button size="sm" variant="primary" onClick={loadGroupingModels}>
                            Refresh
                        </Button>

                        <Button size="sm" variant="danger" onClick={handleClear}>
                            Clear
                        </Button>
                    </div>
                </div>
            </div>

            <div className="gw-content">
                <div className="gw-grid">
                    {sortedItems.map((item) => {
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

                        const modelId = getModelIdFromItem(item);
                        const panel = versionPanelByModelId[modelId];
                        const shouldShowVersionPanel = !item.isAddedVersion && panel?.expanded;

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
                                className={`gw-card ${item.isChecked ? "gw-card-selected" : ""}`}
                            >
                                <div className="gw-image-wrap">
                                    {item.imgSrc ? (
                                        <SmartImage
                                            src={item.imgSrc}
                                            fallbackSources={[PLACEHOLDER_IMAGE]}
                                            alt={item.name || "model image"}
                                            isDarkMode={true}
                                            loading="lazy"
                                            maxHeight="100%"
                                            borderRadius={0}
                                            showRetryButton={false}
                                        />
                                    ) : (
                                        <div className="gw-no-image">
                                            No Image
                                        </div>
                                    )}

                                    <div className="gw-checkbox-shell">
                                        <input
                                            type="checkbox"
                                            checked={item.isChecked}
                                            readOnly
                                        />
                                    </div>

                                    <div className="gw-top-badges">
                                        {item.isAddedVersion && (
                                            <Badge bg="warning" text="dark" className="gw-badge-truncate">
                                                Added Version
                                            </Badge>
                                        )}

                                        {item.modelType && (
                                            <Badge bg="info" className="gw-badge-truncate">
                                                {item.modelType}
                                            </Badge>
                                        )}

                                        {item.baseModel && (
                                            <Badge bg="secondary" className="gw-badge-truncate">
                                                {item.baseModel}
                                            </Badge>
                                        )}

                                        {item.updateText && (
                                            <Badge bg="light" text="dark" className="gw-badge-truncate">
                                                {item.updateText}
                                            </Badge>
                                        )}

                                        {item.lockedText && (
                                            <Badge bg="dark" className="gw-badge-truncate">
                                                {item.lockedText}
                                            </Badge>
                                        )}
                                    </div>

                                    {centerLabels.length > 0 && (
                                        <div className="gw-center-labels">
                                            {centerLabels.map((label) => (
                                                <div
                                                    key={label.text}
                                                    className="gw-center-label"
                                                    style={{ backgroundColor: label.bg }}
                                                >
                                                    {label.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {item.isChecked && (
                                        <div className="gw-selected-pill">
                                            SELECTED
                                        </div>
                                    )}
                                </div>

                                <div className="gw-body">
                                    <div className="gw-name" title={item.name}>
                                        {item.name || "Unknown Model"}
                                    </div>

                                    <div className="gw-creator" title={item.creator}>
                                        {item.creator || "Unknown Creator"}
                                    </div>

                                    <div className="gw-id" title={`${item.modelId}${item.versionId ? ` / ${item.versionId}` : ""}`}>
                                        {item.modelId}
                                        {item.versionId ? ` / ${item.versionId}` : ""}
                                    </div>

                                    <div className="gw-card-actions">
                                        {!item.isAddedVersion && (
                                            <Button
                                                size="sm"
                                                variant="outline-info"
                                                onClick={(event) => toggleVersionPanel(item, event)}
                                            >
                                                {panel?.expanded ? "Hide Versions" : "Versions"}
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

                                    {shouldShowVersionPanel && (
                                        <div
                                            className="gw-version-panel"
                                            onClick={(event) => event.stopPropagation()}
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
                                                        <div key={version.id} className="gw-version-row">
                                                            <img
                                                                src={version.imgSrc || PLACEHOLDER_IMAGE}
                                                                alt={version.versionName}
                                                                draggable={false}
                                                                className="gw-version-thumb"
                                                            />

                                                            <div className="gw-version-info">
                                                                <div
                                                                    title={version.versionName}
                                                                    className="gw-version-name"
                                                                >
                                                                    {version.versionName || `Version ${version.id}`}
                                                                </div>

                                                                <div className="gw-version-badges">
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

                                                                <div className="gw-version-meta">
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
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {sortedItems.length === 0 && (
                    <div className="gw-empty">
                        No models found.
                    </div>
                )}
            </div>
        </Container>
    );
};

export default GrouppingWindow;