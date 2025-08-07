// QuickModeControls.tsx
import React from 'react';
import { Collapse } from 'react-bootstrap';

interface QuickModeControlsProps {
    quickMode: boolean;
    onToggleQuick: () => void;
    currentPrefix: string;
    isLocked: boolean;
    onToggleLock: () => void;
    suffixInput: string;
    onSuffixChange: (val: string) => void;
    onApply: () => void;
}

export const QuickModeControls: React.FC<QuickModeControlsProps> = ({
    quickMode,
    onToggleQuick,
    currentPrefix,
    isLocked,
    onToggleLock,
    suffixInput,
    onSuffixChange,
    onApply
}) => (
    <div className="collapse-panel-container">
        {/* Header styled exactly like your Folder Settings toggle */}
        <div
            className="toggle-section"
            onClick={onToggleQuick}
            aria-controls="quick-mode-panel"
            aria-expanded={quickMode}
        >
            <center> Quick Mode </center>
        </div>
        <hr />

        {/* Collapsible body, same look as the main panel */}
        <Collapse in={quickMode}>
            <div id="quick-mode-panel" style={{ padding: '1rem' }}>
                <div className="mb-2">
                    Current prefix: <strong>{currentPrefix || 'none'}</strong> {isLocked && '(locked)'}
                </div>
                <div className="mb-2">
                    Combined: <strong>{currentPrefix}{suffixInput}</strong>
                </div>

                <label className="me-3">
                    <input type="checkbox" checked={isLocked} onChange={onToggleLock} /> Lock Prefix
                </label>

                <input
                    type="text"
                    value={suffixInput}
                    onChange={e => onSuffixChange(e.target.value)}
                    placeholder="Enter suffix"
                    className="me-3"
                />

                <button type="button" className="btn btn-primary" onClick={onApply}>
                    Apply
                </button>
            </div>
        </Collapse>
    </div>
);
