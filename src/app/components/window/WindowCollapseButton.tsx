import React from 'react';
import { Collapse } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { darkTheme, lightTheme } from '../window_offline/OfflineWindow.theme';

interface CollapsePanelProps {
    isPanelOpen: boolean;
    handleTogglePanel: (panelId: string) => void;
    icons: React.ReactNode;
    buttons: React.ReactNode;
    panelId: string;
    isDarkMode?: boolean;
}

const WindowCollapseButton: React.FC<CollapsePanelProps> = ({
    isPanelOpen,
    handleTogglePanel,
    icons,
    buttons,
    panelId,
    isDarkMode = true
}) => {
    const theme = isDarkMode ? darkTheme : lightTheme;

    return (
        <div
            className="collapse-panel-container"
            style={{
                flexShrink: 0,
                margin: '1px 3px',
                padding: '5px',
                display: 'inline-block',
                backgroundColor: 'transparent',
            }}
        >
            <div
                className="toggle-section"
                onClick={() => handleTogglePanel(panelId)}
                aria-controls={`collapse-panel-${panelId}`}
                aria-expanded={isPanelOpen}
                style={{
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: theme.headerFontColor,
                    background: theme.headerBackgroundColor,
                    border: `1px solid ${theme.evenRowBackgroundColor}`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    minWidth: '46px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isDarkMode
                        ? '0 4px 12px rgba(0,0,0,0.25)'
                        : '0 4px 12px rgba(0,0,0,0.08)',
                }}
            >
                {icons}
            </div>

            <Collapse in={isPanelOpen} dimension="width">
                <div
                    id={`collapse-panel-${panelId}`}
                    style={{
                        marginTop: '10px',
                        padding: '10px',
                        borderRadius: '8px',
                        background: theme.headerBackgroundColor,
                        color: theme.headerFontColor,
                        border: `1px solid ${theme.evenRowBackgroundColor}`,
                        boxShadow: isDarkMode
                            ? '0 6px 18px rgba(0,0,0,0.35)'
                            : '0 6px 18px rgba(0,0,0,0.10)',
                        width: isPanelOpen ? 'max-content' : 'auto',
                    }}
                >
                    {buttons}
                </div>
            </Collapse>
        </div>
    );
};

WindowCollapseButton.propTypes = {
    isPanelOpen: PropTypes.bool.isRequired,
    handleTogglePanel: PropTypes.func.isRequired,
    icons: PropTypes.node.isRequired,
    buttons: PropTypes.node.isRequired,
    panelId: PropTypes.string.isRequired,
};

export default WindowCollapseButton;