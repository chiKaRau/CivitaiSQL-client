// QuickModeControls.tsx
import React from 'react';
import { Collapse } from 'react-bootstrap';
import { AppTheme } from './window_offline/OfflineWindow.theme';

interface QuickModeControlsProps {
    quickMode: boolean;
    onToggleQuick: () => void;
    currentPrefix: string;
    isLocked: boolean;
    onToggleLock: () => void;
    suffixInput: string;
    onSuffixChange: (val: string) => void;
    onApply: () => void;
    theme: AppTheme;
}

export const QuickModeControls: React.FC<QuickModeControlsProps> = ({
    quickMode,
    onToggleQuick,
    currentPrefix,
    isLocked,
    onToggleLock,
    suffixInput,
    onSuffixChange,
    onApply,
    theme
}) => {
    const panelStyle: React.CSSProperties = {
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: '14px',
        overflow: 'hidden',
        background: theme.panelBackground,
        color: theme.panelText,
        boxShadow: theme.buttonShadow,
        marginBottom: '12px',
    };

    const headerStyle: React.CSSProperties = {
        width: '100%',
        background: theme.rowBackgroundColor,
        color: theme.panelText,
        padding: '12px 14px',
        cursor: 'pointer',
        fontWeight: 700,
        borderBottom: quickMode ? `1px solid ${theme.panelBorder}` : 'none',
    };

    const inputStyle: React.CSSProperties = {
        padding: '8px 10px',
        borderRadius: '10px',
        border: `1px solid ${theme.panelBorder}`,
        background: theme.panelBackground,
        color: theme.panelText,
        outline: 'none',
        marginRight: '12px',
    };

    const buttonStyle: React.CSSProperties = {
        padding: '8px 14px',
        borderRadius: '10px',
        border: `1px solid ${theme.buttonBorder}`,
        background: theme.buttonBackground,
        color: theme.buttonText,
        cursor: 'pointer',
        boxShadow: theme.buttonShadow,
        fontWeight: 700,
    };

    return (
        <div style={panelStyle}>
            <div
                onClick={onToggleQuick}
                aria-controls="quick-mode-panel"
                aria-expanded={quickMode}
                style={headerStyle}
            >
                <center>Quick Mode</center>
            </div>

            <Collapse in={quickMode}>
                <div id="quick-mode-panel" style={{ padding: '1rem' }}>
                    <div className="mb-2" style={{ color: theme.panelText }}>
                        Current prefix: <strong>{currentPrefix || 'none'}</strong> {isLocked && '(locked)'}
                    </div>

                    <div className="mb-2" style={{ color: theme.panelText }}>
                        Combined: <strong>{currentPrefix}{suffixInput}</strong>
                    </div>

                    <label className="me-3" style={{ color: theme.panelText }}>
                        <input
                            type="checkbox"
                            checked={isLocked}
                            onChange={onToggleLock}
                            style={{ marginRight: '6px' }}
                        />
                        Lock Prefix
                    </label>

                    <input
                        type="text"
                        value={suffixInput}
                        onChange={e => onSuffixChange(e.target.value.replace(/[<>:"\\|?*]/g, ''))}
                        placeholder="Enter suffix"
                        style={inputStyle}
                    />

                    <button
                        type="button"
                        onClick={onApply}
                        style={buttonStyle}
                    >
                        Apply
                    </button>
                </div>
            </Collapse>
        </div>
    );
};