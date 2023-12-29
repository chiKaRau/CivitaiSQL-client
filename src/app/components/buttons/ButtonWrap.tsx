import React, { useState, useRef, CSSProperties } from "react";

//Components
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

//Interface
interface ButtonWrapProps {
    buttonConfig: object;
    handleFunctionCall: () => void;
}

const ButtonWrap: React.FC<ButtonWrapProps> = (props: any) => {
    const buttonRef = useRef(null);
    const [isFunctionCallComplete, setIsFunctionCallComplete] = useState(false);

    const { placement, tooltip, variant, buttonIcon, disabled } = props.buttonConfig;

    const renderTooltip = (tooltipText: string) => (
        <Tooltip id="tooltip">{tooltipText}</Tooltip>
    );

    // Function to handle the API call and update the button state
    const handleButtonClick = async () => {
        setIsFunctionCallComplete(true);
        await props.handleFunctionCall();
        setIsFunctionCallComplete(false);
    };

    return (
        <OverlayTrigger placement={placement} overlay={renderTooltip(tooltip)}>
            <Button
                ref={buttonRef}
                variant={variant}
                onClick={handleButtonClick}
                disabled={disabled}
                className={`button buttonWrap ${isFunctionCallComplete ? "button-state-loading" : "button-state-default"}`}
            >
                {buttonIcon}
                {isFunctionCallComplete && <span className="button-state-complete">✓</span>}
            </Button>
        </OverlayTrigger>

    );
};

export default ButtonWrap;

