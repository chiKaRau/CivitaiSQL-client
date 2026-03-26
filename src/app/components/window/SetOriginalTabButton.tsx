import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { PiTabsFill } from 'react-icons/pi';
import { darkTheme, getOfflineWindowStyles, lightTheme } from '../window_offline/OfflineWindow.theme';

interface SetOriginalTabButtonProps {
    handleSetOriginalTab: () => void | Promise<void>;
    isDarkMode: boolean;
    disabled?: boolean;
    tabCreator?: string;
}

const SetOriginalTabButton: React.FC<SetOriginalTabButtonProps> = ({
    handleSetOriginalTab,
    isDarkMode,
    disabled = false,
    tabCreator = '',
}) => {
    const theme = isDarkMode ? darkTheme : lightTheme;
    const { themedButtonStyle } = getOfflineWindowStyles(theme, isDarkMode);

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginLeft: '8px',
            }}
        >
            <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip id="tooltip-set-original-tab">
                        {`Set to Current Tabs: ${tabCreator}`}
                    </Tooltip>
                }
            >
                <span style={{ display: 'inline-flex' }}>
                    <Button
                        onClick={handleSetOriginalTab}
                        disabled={disabled}
                        style={{
                            ...themedButtonStyle,
                            margin: 0,
                        }}
                    >
                        <PiTabsFill />
                    </Button>
                </span>
            </OverlayTrigger>
        </div>
    );
};

export default SetOriginalTabButton;