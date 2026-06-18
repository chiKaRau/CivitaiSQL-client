import React from "react";
import { createPortal } from "react-dom";
import { AppTheme } from "../window_offline/OfflineWindow.theme";
import SmartImage from "../window_offline/SmartImage";

const CIVITAI_IMAGE_SEGMENT = "anim=false,width=450,optimized=true";

const isVideoMediaUrl = (value: string) => {
    const clean = (value || "").split("?")[0].split("#")[0].toLowerCase();

    return (
        clean.endsWith(".webm") ||
        clean.endsWith(".mp4") ||
        clean.endsWith(".mov") ||
        clean.endsWith(".m4v") ||
        clean.endsWith(".ogg")
    );
};

const rewriteCivitaiImageUrl = (value: string) => {
    const url = (value || "").trim();
    if (!url) return "";

    // Important: do not rewrite .webm / video URLs.
    if (isVideoMediaUrl(url)) {
        return url;
    }

    if (!url.includes("image.civitai.com")) {
        return url;
    }

    return url.replace(
        /(https:\/\/image\.civitai\.com\/[^/]+\/[^/]+\/)([^/]+)(\/[^?#]+)(\?[^#]*)?(#.*)?$/i,
        `$1${CIVITAI_IMAGE_SEGMENT}$3$4$5`
    );
};

export const HoverImagePreview: React.FC<{
    src: string;
    theme: AppTheme;
    isDarkMode: boolean;
}> = React.memo(({ src, theme, isDarkMode }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [position, setPosition] = React.useState({ left: 0, bottom: 0 });
    const thumbRef = React.useRef<HTMLSpanElement | null>(null);

    const PREVIEW_WIDTH = 320;
    const PREVIEW_MAX_HEIGHT = 420;
    const GAP = 10;
    const SIDE_PADDING = 12;

    const normalizedSrc = React.useMemo(() => rewriteCivitaiImageUrl(src), [src]);

    const updatePosition = React.useCallback(() => {
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
    }, []);

    const handleOpen = React.useCallback(() => {
        updatePosition();
        setIsOpen(true);
    }, [updatePosition]);

    React.useEffect(() => {
        if (!isOpen) return;

        const handleScrollOrResize = () => updatePosition();

        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);

        return () => {
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [isOpen, updatePosition]);

    if (!normalizedSrc) {
        return <span style={{ opacity: 0.5, color: theme.subText }}>—</span>;
    }

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
                    width: 52,
                    height: 52,
                    overflow: "hidden",
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? "#444" : "#f3f4f6",
                }}
            >
                <SmartImage
                    src={normalizedSrc}
                    alt="thumb"
                    isDarkMode={isDarkMode}
                    maxHeight={52}
                    borderRadius={8}
                    loading="lazy"
                    showRetryButton={false}
                    allowVideo={true}
                    mediaType="auto"
                />
            </span>

            {createPortal(
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
                        opacity: isOpen ? 1 : 0,
                        visibility: isOpen ? "visible" : "hidden",
                        transition: "opacity 0.12s ease",
                    }}
                >
                    {isOpen && (
                        <div
                            style={{
                                width: PREVIEW_WIDTH,
                                maxHeight: PREVIEW_MAX_HEIGHT,
                                overflow: "hidden",
                                borderRadius: 6,
                                backgroundColor: isDarkMode ? "#444" : "#f3f4f6",
                            }}
                        >
                            <SmartImage
                                src={normalizedSrc}
                                alt="preview"
                                isDarkMode={isDarkMode}
                                maxHeight={PREVIEW_MAX_HEIGHT}
                                borderRadius={6}
                                loading="eager"
                                showRetryButton={false}
                                allowVideo={true}
                                mediaType="auto"
                            />
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
}, (prev, next) =>
    prev.src === next.src &&
    prev.theme === next.theme &&
    prev.isDarkMode === next.isDarkMode
);