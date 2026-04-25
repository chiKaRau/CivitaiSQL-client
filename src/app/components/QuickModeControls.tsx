// QuickModeControls.tsx
import React, { useState } from 'react';
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

const cleanSuffixInput = (value: string) => {
    return value.replace(/[<>:"\\|?*]/g, '');
};

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
    const [clipboardSuggestion, setClipboardSuggestion] = useState<string>('');
    const [showClipboardSuggestion, setShowClipboardSuggestion] = useState<boolean>(false);

    const handleReadClipboardForSuggestion = async () => {
        try {
            if (!navigator.clipboard?.readText) {
                setClipboardSuggestion('');
                setShowClipboardSuggestion(false);
                return;
            }

            const text = await navigator.clipboard.readText();
            const cleaned = cleanSuffixInput(text.trim());

            setClipboardSuggestion(cleaned);
            setShowClipboardSuggestion(cleaned.length > 0);
        } catch (error) {
            console.error('Error reading clipboard:', error);
            setClipboardSuggestion('');
            setShowClipboardSuggestion(false);
        }
    };

    const handleUseClipboardSuggestion = () => {
        if (!clipboardSuggestion.trim()) {
            return;
        }

        onSuffixChange(clipboardSuggestion);
        setShowClipboardSuggestion(false);
    };

    const handleClearSuffix = () => {
        onSuffixChange('');
    };

    const panelStyle: React.CSSProperties = {
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: '14px',
        overflow: 'visible',
        background: theme.panelBackground,
        color: theme.panelText,
        boxShadow: theme.buttonShadow,
        marginBottom: '12px',
        position: 'relative',
    };

    const headerStyle: React.CSSProperties = {
        width: '100%',
        background: theme.rowBackgroundColor,
        color: theme.panelText,
        padding: '12px 14px',
        cursor: 'pointer',
        fontWeight: 700,
        borderBottom: quickMode ? `1px solid ${theme.panelBorder}` : 'none',
        borderTopLeftRadius: '14px',
        borderTopRightRadius: '14px',
    };

    const contentStyle: React.CSSProperties = {
        padding: '1rem',
        overflow: 'visible',
    };

    const controlRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        overflow: 'visible',
    };

    const inputWrapperStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '320px',
        maxWidth: '100%',
    };

    const inputStyle: React.CSSProperties = {
        padding: '8px 34px 8px 10px',
        borderRadius: '10px',
        border: `1px solid ${theme.panelBorder}`,
        background: theme.panelBackground,
        color: theme.panelText,
        outline: 'none',
        width: '100%',
    };

    const clearButtonStyle: React.CSSProperties = {
        position: 'absolute',
        right: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        border: `1px solid ${theme.buttonBorder}`,
        background: theme.buttonBackground,
        color: theme.buttonText,
        cursor: 'pointer',
        display: suffixInput ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        lineHeight: 1,
        fontWeight: 700,
        fontSize: '15px',
    };

    const suggestionBoxStyle: React.CSSProperties = {
        marginTop: '10px',
        padding: '10px 12px',
        borderRadius: '10px',
        border: `1px solid ${theme.panelBorder}`,
        background: theme.rowBackgroundColor,
        color: theme.panelText,
        boxShadow: theme.buttonShadow,
        cursor: 'pointer',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        maxWidth: '100%',
    };

    const suggestionLabelStyle: React.CSSProperties = {
        fontSize: '12px',
        opacity: 0.75,
        marginBottom: '4px',
    };

    const suggestionValueStyle: React.CSSProperties = {
        fontWeight: 700,
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

    const shouldShowSuggestion =
        showClipboardSuggestion &&
        clipboardSuggestion.trim().length > 0 &&
        clipboardSuggestion !== suffixInput;

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
                <div id="quick-mode-panel" style={contentStyle}>
                    <div className="mb-2" style={{ color: theme.panelText }}>
                        Current prefix: <strong>{currentPrefix || 'none'}</strong> {isLocked && '(locked)'}
                    </div>

                    <div className="mb-2" style={{ color: theme.panelText }}>
                        Combined: <strong>{currentPrefix}{suffixInput}</strong>
                    </div>

                    <div style={controlRowStyle}>
                        <label style={{ color: theme.panelText }}>
                            <input
                                type="checkbox"
                                checked={isLocked}
                                onChange={onToggleLock}
                                style={{ marginRight: '6px' }}
                            />
                            Lock Prefix
                        </label>

                        <span style={inputWrapperStyle}>
                            <input
                                type="text"
                                value={suffixInput}
                                onFocus={() => {
                                    void handleReadClipboardForSuggestion();
                                }}
                                onChange={e => {
                                    onSuffixChange(cleanSuffixInput(e.target.value));
                                }}
                                placeholder={clipboardSuggestion || 'Enter suffix'}
                                style={inputStyle}
                            />

                            <button
                                type="button"
                                aria-label="Clear suffix"
                                title="Clear"
                                style={clearButtonStyle}
                                onMouseDown={event => {
                                    event.preventDefault();
                                }}
                                onClick={handleClearSuffix}
                            >
                                x
                            </button>
                        </span>

                        <button
                            type="button"
                            onClick={onApply}
                            style={buttonStyle}
                        >
                            Apply
                        </button>
                    </div>

                    {shouldShowSuggestion && (
                        <div
                            style={suggestionBoxStyle}
                            onMouseDown={event => {
                                event.preventDefault();
                                handleUseClipboardSuggestion();
                            }}
                            title="Use clipboard text"
                        >
                            <div style={suggestionLabelStyle}>
                                Clipboard suggestion
                            </div>
                            <div style={suggestionValueStyle}>
                                {clipboardSuggestion}
                            </div>
                        </div>
                    )}
                </div>
            </Collapse>
        </div>
    );
};