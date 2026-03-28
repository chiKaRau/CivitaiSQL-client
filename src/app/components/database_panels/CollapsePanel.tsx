import React, { useEffect, useMemo, useState } from "react";

// Components
import { Toast, Carousel, Collapse } from "react-bootstrap";
import Col from "react-bootstrap/Col";

// theme
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";
import SmartImage from "../window_offline/SmartImage";

// Interface
interface CollapsePanelProps {
    collectionName: string;
    modelsList: {
        name: string;
        url: string;
        id: number;
        imageUrls: { url: string; height: number; width: number; nsfw: string }[];
    }[];
    isDarkMode?: boolean;
}

const CollapsePanel: React.FC<CollapsePanelProps> = ({
    collectionName,
    modelsList: incomingModelsList,
    isDarkMode = true
}) => {
    const theme = isDarkMode ? darkTheme : lightTheme;

    const [modelsList, setModelsList] = useState<
        {
            name: string;
            url: string;
            id: number;
            imageUrls: { url: string; height: number; width: number; nsfw: string }[];
        }[]
    >([]);
    const [hiddenToastIds, setHiddenToastIds] = useState<number[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setModelsList(incomingModelsList || []);
        setHiddenToastIds([]);
    }, [incomingModelsList]);

    const collapseId = useMemo(
        () => `collapse-panel-${collectionName.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
        [collectionName]
    );

    const handleClose = (id: number) => {
        setHiddenToastIds((prev) => [...prev, id]);
    };

    return (
        <div
            style={{
                marginBottom: "14px",
                border: `1px solid ${theme.panelBorder}`,
                borderRadius: "10px",
                backgroundColor: theme.panelBackground,
                boxShadow: isDarkMode
                    ? "0 6px 18px rgba(0,0,0,0.35)"
                    : "0 6px 18px rgba(0,0,0,0.10)",
                overflow: "hidden",
            }}
        >
            <div
                onClick={() => setOpen(!open)}
                aria-controls={collapseId}
                aria-expanded={open}
                style={{
                    cursor: "pointer",
                    padding: "12px 14px",
                    backgroundColor: theme.headerBackgroundColor,
                    color: theme.headerFontColor,
                    borderBottom: open ? `1px solid ${theme.panelBorder}` : "none",
                    fontWeight: 700,
                    textAlign: "center",
                    userSelect: "none",
                }}
            >
                {collectionName}
            </div>

            <Collapse in={open}>
                <div
                    id={collapseId}
                    style={{
                        padding: "12px",
                        backgroundColor: theme.panelBackground,
                    }}
                >
                    {modelsList?.map((model) => {
                        if (hiddenToastIds.includes(model.id)) return null;

                        return (
                            <div
                                key={model.id}
                                style={{
                                    marginBottom: "12px",
                                }}
                            >
                                <Toast
                                    onClose={() => handleClose(model.id)}
                                    style={{
                                        width: "100%",
                                        backgroundColor: theme.panelBackground,
                                        color: theme.panelText,
                                        border: `1px solid ${theme.panelBorder}`,
                                        borderRadius: "10px",
                                        boxShadow: isDarkMode
                                            ? "0 6px 18px rgba(0,0,0,0.35)"
                                            : "0 6px 18px rgba(0,0,0,0.10)",
                                    }}
                                >
                                    <Toast.Header
                                        style={{
                                            backgroundColor: theme.headerBackgroundColor,
                                            color: theme.headerFontColor,
                                            borderBottom: `1px solid ${theme.panelBorder}`,
                                        }}
                                        closeButton
                                    >
                                        <Col
                                            xs={10}
                                            style={{
                                                color: theme.headerFontColor,
                                                display: "flex",
                                                alignItems: "center",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <b>
                                                <span>#{model?.id}</span> : <span>{model?.name}</span>
                                            </b>
                                        </Col>
                                    </Toast.Header>

                                    <Toast.Body
                                        style={{
                                            backgroundColor: theme.panelBackground,
                                            color: theme.panelText,
                                        }}
                                    >
                                        <div style={{ marginBottom: "10px" }}>
                                            {model?.imageUrls?.[0]?.url && (
                                                <Carousel fade interval={null}>
                                                    {model?.imageUrls?.map((image, index) => (
                                                        <Carousel.Item key={index}>
                                                            <div
                                                                style={{
                                                                    width: "100%",
                                                                    maxHeight: "320px",
                                                                    borderRadius: "8px",
                                                                    backgroundColor: theme.headerBackgroundColor,
                                                                    overflow: "hidden",
                                                                }}
                                                            >
                                                                <SmartImage
                                                                    src={image.url || "https://placehold.co/200x250"}
                                                                    alt={model.name}
                                                                    isDarkMode={isDarkMode}
                                                                    maxHeight="320px"
                                                                    borderRadius={8}
                                                                    loading="lazy"
                                                                    showRetryButton={false}
                                                                />
                                                            </div>
                                                        </Carousel.Item>
                                                    ))}
                                                </Carousel>
                                            )}
                                        </div>

                                        <a
                                            href={model?.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                color: theme.subText,
                                                textDecoration: "underline",
                                                wordBreak: "break-all",
                                            }}
                                        >
                                            {model?.url}
                                        </a>
                                    </Toast.Body>
                                </Toast>
                            </div>
                        );
                    })}
                </div>
            </Collapse>
        </div>
    );
};

export default CollapsePanel;