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

    collectedAt: number;
};

type QuickFilter =
    | "all"
    | "saved"
    | "notSaved"
    | "offline"
    | "staged";

const GrouppingWindow: React.FC = () => {
    const [items, setItems] = useState<GroupingModelItem[]>([]);
    const [searchText, setSearchText] = useState("");
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

    const loadGroupingModels = () => {
        chrome.storage.local.get("originalTabId", (result) => {
            if (!result.originalTabId) return;

            chrome.tabs.sendMessage(
                result.originalTabId,
                { action: "activate-grouping-mode" },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn(chrome.runtime.lastError.message);
                        return;
                    }

                    setItems(Array.isArray(response?.items) ? response.items : []);
                }
            );
        });
    };

    useEffect(() => {
        const listener = (message: any) => {
            if (message.action === "grouping-models-updated") {
                setItems(Array.isArray(message.items) ? message.items : []);
            }
        };

        chrome.runtime.onMessage.addListener(listener);
        loadGroupingModels();

        return () => {
            chrome.runtime.onMessage.removeListener(listener);

            chrome.storage.local.get("originalTabId", (result) => {
                if (!result.originalTabId) return;

                chrome.tabs.sendMessage(result.originalTabId, {
                    action: "deactivate-grouping-mode",
                });
            });
        };
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
                    {filteredItems.map((item) => (
                        <div
                            key={item.url}
                            style={{
                                background: "#1f1f1f",
                                border: "1px solid #333",
                                borderRadius: 12,
                                overflow: "hidden",
                                position: "relative",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                            }}
                        >
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    display: "block",
                                    color: "inherit",
                                    textDecoration: "none",
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

                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 8,
                                            left: 8,
                                            right: 8,
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 6,
                                            zIndex: 2,
                                        }}
                                    >
                                        {item.modelType && (
                                            <Badge bg="info">{item.modelType}</Badge>
                                        )}

                                        {item.baseModel && (
                                            <Badge bg="secondary">{item.baseModel}</Badge>
                                        )}

                                        {item.savedText && (
                                            <Badge bg={item.isSaved ? "success" : "danger"}>
                                                {item.savedText}
                                            </Badge>
                                        )}

                                        {item.offlineText && (
                                            <Badge bg="primary">{item.offlineText}</Badge>
                                        )}

                                        {item.stagedText && (
                                            <Badge bg="warning" text="dark">
                                                {item.stagedText}
                                            </Badge>
                                        )}

                                        {item.updateText && (
                                            <Badge bg="light" text="dark">
                                                {item.updateText}
                                            </Badge>
                                        )}

                                        {item.lockedText && (
                                            <Badge bg="dark">{item.lockedText}</Badge>
                                        )}
                                    </div>
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
                            </a>
                        </div>
                    ))}
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