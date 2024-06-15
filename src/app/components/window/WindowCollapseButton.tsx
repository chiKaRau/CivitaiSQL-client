import React from 'react';
import { Collapse } from 'react-bootstrap';
import PropTypes from 'prop-types';

interface CollapsePanelProps {
    isPanelOpen: boolean;
    handleTogglePanel: (panelId: string) => void;
    icons: React.ReactNode;
    buttons: React.ReactNode;
    panelId: string;
}

const CollapsePanel: React.FC<CollapsePanelProps> = ({ isPanelOpen, handleTogglePanel, icons, buttons, panelId }) => {
    return (
        <div className="collapse-panel-container" style={{ flexShrink: 0, margin: '1px 3px', padding: '5px 15px 5px 15px', display: 'inline-block' }}>
            <div className="toggle-section" onClick={() => handleTogglePanel(panelId)} aria-controls={`collapse-panel-${panelId}`} aria-expanded={isPanelOpen} style={{ textAlign: 'center', cursor: 'pointer' }}>
                {icons}
            </div>
            <Collapse in={isPanelOpen} dimension="width">
                <div id={`collapse-panel-${panelId}`} style={{
                    marginTop: '10px',
                    padding: '10px ',
                    borderRadius: '5px',
                    background: '#f9f9f9',
                    width: isPanelOpen ? 'max-content' : 'auto', // Adjust width
                }}>
                    {buttons}
                </div>
            </Collapse>
        </div>
    );
};

CollapsePanel.propTypes = {
    isPanelOpen: PropTypes.bool.isRequired,
    handleTogglePanel: PropTypes.func.isRequired,
    icons: PropTypes.element.isRequired,
    buttons: PropTypes.element.isRequired,
    panelId: PropTypes.string.isRequired,
};

export default CollapsePanel;
