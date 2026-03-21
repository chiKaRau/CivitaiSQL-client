import React from 'react';
import { Collapse } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { darkTheme, lightTheme } from '../window_offline/OfflineWindow.theme';

interface CollapsePanelProps {
    isPanelOpen: boolean;
    handleTogglePanel: (panelId: string) => void;
    icons: React.ReactNode;
    buttons?: React.ReactNode;
    panelId: string;
    isDarkMode?: boolean;
    hideInlinePanel?: boolean;
}

const WindowCollapseButton: React.FC<CollapsePanelProps> = ({
    isPanelOpen,
    handleTogglePanel,
    icons,
    buttons,
    panelId,
    isDarkMode = true,
    hideInlinePanel = false
}) => {
    const theme = isDarkMode ? darkTheme : lightTheme;

    const outerShellBorder = isPanelOpen
        ? `1px solid ${theme.evenRowBackgroundColor}`
        : '1px solid transparent';

    const outerShellBackground = isPanelOpen
        ? theme.headerBackgroundColor
        : 'transparent';

    const outerShellShadow = isPanelOpen
        ? (
            isDarkMode
                ? '0 6px 18px rgba(0,0,0,0.35)'
                : '0 6px 18px rgba(0,0,0,0.10)'
        )
        : 'none';

    return (
        <div
            className="collapse-panel-container"
            style={{
                flexShrink: 0,
                margin: '1px 3px',
                padding: '5px',
                display: 'inline-block',
                verticalAlign: 'top',

                border: outerShellBorder,
                borderRadius: '10px',
                background: outerShellBackground,
                boxShadow: outerShellShadow,

                transition:
                    'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
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

            {!hideInlinePanel && (
                <Collapse in={isPanelOpen}>
                    <div>
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
                    </div>
                </Collapse>
            )}
        </div>
    );
};

WindowCollapseButton.propTypes = {
    isPanelOpen: PropTypes.bool.isRequired,
    handleTogglePanel: PropTypes.func.isRequired,
    icons: PropTypes.node.isRequired,
    buttons: PropTypes.node,
    panelId: PropTypes.string.isRequired,
};

export default WindowCollapseButton;