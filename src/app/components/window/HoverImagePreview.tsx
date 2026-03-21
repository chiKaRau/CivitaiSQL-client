import React from "react";
import { createPortal } from "react-dom";
import { AppTheme } from "../window_offline/OfflineWindow.theme";

export const HoverImagePreview: React.FC<{ src: string, theme: AppTheme }> = ({ src, theme }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [position, setPosition] = React.useState({ left: 0, bottom: 0 });
    const thumbRef = React.useRef<HTMLSpanElement | null>(null);

    const PREVIEW_WIDTH = 320;
    const PREVIEW_MAX_HEIGHT = 420;
    const GAP = 10;
    const SIDE_PADDING = 12;

    const updatePosition = () => {
        const el = thumbRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();

        const left = Math.max(
            SIDE_PADDING,
            Math.min(
                rect.left + rect.width / 2 - PREVIEW_WIDTH / 2,
                window.innerWidth - PREVIEW_WIDTH - SIDE_PADDING
            )
        );

        const bottom = Math.max(
            SIDE_PADDING,
            window.innerHeight - rect.top + GAP
        );

        setPosition({ left, bottom });
    };

    const handleOpen = () => {
        updatePosition();
        setIsOpen(true);
    };

    React.useEffect(() => {
        if (!isOpen) return;

        const handleScrollOrResize = () => updatePosition();

        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);

        return () => {
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [isOpen]);

    return (
        <>
            <span
                ref={thumbRef}
                onMouseEnter={handleOpen}
                onMouseLeave={() => setIsOpen(false)}
                style={{
                    display: "inline-block",
                    lineHeight: 0,
                    cursor: "zoom-in",
                }}
            >
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
            </span>

            {isOpen &&
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            left: position.left,
                            bottom: position.bottom,
                            zIndex: 999999,
                            pointerEvents: "none",
                            padding: 6,
                            backgroundColor: theme.panelBackground,
                            color: theme.panelText,
                            border: `1px solid ${theme.panelBorder}`,
                            borderRadius: 8,
                            boxShadow: theme.buttonShadow,
                            maxWidth: PREVIEW_WIDTH + 20,
                        }}
                    >
                        <img
                            src={src}
                            alt="preview"
                            style={{
                                display: "block",
                                maxWidth: PREVIEW_WIDTH,
                                maxHeight: PREVIEW_MAX_HEIGHT,
                                borderRadius: 6,
                            }}
                        />
                    </div>,
                    document.body
                )}
        </>
    );
};