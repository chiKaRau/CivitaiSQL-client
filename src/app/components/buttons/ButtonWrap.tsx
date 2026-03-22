import React, { useState, useRef } from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";

interface ButtonConfig {
    placement?: "top" | "bottom" | "left" | "right";
    tooltip?: string;
    variant?: string;
    buttonIcon?: React.ReactNode;
    disabled?: boolean;
}

interface ButtonWrapProps {
    buttonConfig: ButtonConfig;
    handleFunctionCall: () => void | Promise<void>;
    isDarkMode?: boolean;

    // true = match WindowCollapseButton outer box in the main row
    // false = just render the button itself (good inside expanded panel)
    withShell?: boolean;
}

const ButtonWrap: React.FC<ButtonWrapProps> = ({
    buttonConfig,
    handleFunctionCall,
    isDarkMode = true,
    withShell = true
}) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [isFunctionCallComplete, setIsFunctionCallComplete] = useState(false);

    const {
        placement = "top",
        tooltip = "",
        variant = "primary",
        buttonIcon,
        disabled = false
    } = buttonConfig;

    const theme = isDarkMode ? darkTheme : lightTheme;

    const renderTooltip = (tooltipText: string) => (
        <Tooltip id={`tooltip-${tooltipText.replace(/\s+/g, "-")}`}>
            {tooltipText}
        </Tooltip>
    );

    const handleButtonClick = async () => {
        setIsFunctionCallComplete(true);
        try {
            await handleFunctionCall();
        } finally {
            setIsFunctionCallComplete(false);
        }
    };

    return (
        <div
            style={
                withShell
                    ? {
                        flexShrink: 0,
                        margin: "1px 3px",
                        padding: "5px",
                        display: "inline-block",
                        verticalAlign: "top",
                        border: "1px solid transparent",
                        borderRadius: "10px",
                        background: "transparent",
                    }
                    : {
                        display: "inline-block",
                        verticalAlign: "top",
                    }
            }
        >
            <OverlayTrigger placement={placement} overlay={renderTooltip(tooltip)}>
                <span style={{ display: "inline-flex" }}>
                    <Button
                        ref={buttonRef}
                        variant={variant}
                        onClick={handleButtonClick}
                        disabled={disabled || isFunctionCallComplete}
                        className={`button buttonWrap ${isFunctionCallComplete ? "button-state-loading" : "button-state-default"}`}
                        style={{
                            position: "relative",
                            backgroundColor: theme.headerBackgroundColor,
                            color: theme.headerFontColor,
                            border: `1px solid ${theme.evenRowBackgroundColor}`,
                            borderRadius: "8px",
                            padding: "10px 12px",
                            minWidth: "46px",
                            minHeight: "44px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            boxShadow: isDarkMode
                                ? "0 4px 12px rgba(0,0,0,0.25)"
                                : "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                    >
                        {buttonIcon}

                        {isFunctionCallComplete && (
                            <span
                                style={{
                                    position: "absolute",
                                    top: "4px",
                                    right: "6px",
                                    fontSize: "11px",
                                    lineHeight: 1,
                                }}
                            >
                                ✓
                            </span>
                        )}
                    </Button>
                </span>
            </OverlayTrigger>
        </div>
    );
};

export default ButtonWrap;