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

    collectedAt: number;
};

type QuickFilter =
    | "all"
    | "saved"
    | "notSaved"
    | "offline"
    | "staged";

const GrouppingWindow: React.FC = () => {

    const groupingPortRef = React.useRef<chrome.runtime.Port | null>(null);
    const connectedTabIdRef = React.useRef<number | null>(null);
    const lastTabUrlRef = React.useRef<string>("");

    const [items, setItems] = useState<GroupingModelItem[]>([]);
    const [searchText, setSearchText] = useState("");
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

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