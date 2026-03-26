import * as React from "react";

type TrashButtonProps = {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    isDarkMode: boolean;
    compact?: boolean;
};

export const TrashButton: React.FC<TrashButtonProps> = ({
    onClick,
    isDarkMode,
    compact = false,
}) => {
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
                padding: compact ? 4 : 6,
                borderRadius: compact ? 5 : 6,
                lineHeight: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <svg width={compact ? "16" : "18"} height={compact ? "16" : "18"} viewBox="0 0 24 24" fill="none">
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