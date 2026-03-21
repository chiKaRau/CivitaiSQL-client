import React, { useState, useRef } from "react";
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
}

const ButtonWrap: React.FC<ButtonWrapProps> = ({
    buttonConfig,
    handleFunctionCall,
    isDarkMode = true
}) => {
    const buttonRef = useRef(null);
    const [isFunctionCallComplete, setIsFunctionCallComplete] = useState(false);

    const {
        placement = "top",
        tooltip = "",
        buttonIcon,
        disabled = false
    } = buttonConfig;

    const renderTooltip = (tooltipText: string) => (
        <Tooltip id="tooltip">{tooltipText}</Tooltip>
    );

    const handleButtonClick = async () => {
        setIsFunctionCallComplete(true);
        try {
            await handleFunctionCall();
        } finally {
            setIsFunctionCallComplete(false);
        }
    };

    const theme = isDarkMode ? darkTheme : lightTheme;


    return (
        <OverlayTrigger placement={placement} overlay={renderTooltip(tooltip)}>
            <Button
                ref={buttonRef}
                onClick={handleButtonClick}
                disabled={disabled || isFunctionCallComplete}
                className={`button buttonWrap ${isFunctionCallComplete ? "button-state-loading" : "button-state-default"}`}
                style={{
                    backgroundColor: theme.rowBackgroundColor,
                    color: theme.rowFontColor,
                    border: `1px solid ${theme.evenRowBackgroundColor}`,
                    boxShadow: isDarkMode
                        ? "0 4px 12px rgba(0,0,0,0.25)"
                        : "0 4px 12px rgba(0,0,0,0.08)",
                }}
            >
                {buttonIcon}
                {isFunctionCallComplete && <span className="button-state-complete">✓</span>}
            </Button>
        </OverlayTrigger>
    );
};

export default ButtonWrap;