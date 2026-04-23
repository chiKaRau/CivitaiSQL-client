import React, { useEffect } from "react";
import useModelVersionFileExists from "../../hooks/useModelVersionFileExists";

type LocalFileFolderOptionProps = {
    modelID?: string;
    versionID?: string;
    localScanPath: string;
    updateOption: string;
    setUpdateOption: (value: string) => void;
    onAvailabilityChange?: (isAvailable: boolean) => void;
    theme: any;
    radioName?: string;
    offlineMode?: boolean;
};

const isPendingPath = (path?: string | null) => {
    if (!path) return false;
    const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
    return /\/Pending$/i.test(normalized) || /\/Pending\//i.test(`${normalized}/`);
};

const LocalFileFolderOption = ({
    modelID,
    versionID,
    localScanPath,
    updateOption,
    setUpdateOption,
    onAvailabilityChange,
    theme,
    radioName,
    offlineMode = false,
}: LocalFileFolderOptionProps) => {
    const { filePath, isLoading } = useModelVersionFileExists(modelID, versionID);

    const isAvailable =
        !!localScanPath &&
        !isPendingPath(localScanPath) &&
        !isLoading &&
        !!filePath;

    useEffect(() => {
        onAvailabilityChange?.(isAvailable);
    }, [isAvailable, onAvailabilityChange]);

    if (!isAvailable) {
        return null;
    }

    const isSelected = updateOption === "Database_and_LocalFileFolder";

    const cardStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "10px",
        border: isSelected
            ? `1px solid ${theme.buttonBorder}`
            : `1px solid ${theme.panelBorder}`,
        background: isSelected ? theme.rowBackgroundColor : theme.panelBackground,
        cursor: "pointer",
        color: theme.panelText,
        fontSize: "14px",
        wordBreak: "break-word",
    };

    const titleStyle: React.CSSProperties = {
        fontWeight: 700,
        fontSize: "13px",
        color: theme.panelText,
        marginBottom: "4px",
    };

    const hintStyle: React.CSSProperties = {
        fontSize: "12px",
        color: theme.subText,
        marginBottom: "6px",
    };

    const pathStyle: React.CSSProperties = {
        marginTop: "4px",
        marginBottom: "8px",
        padding: "6px 8px",
        borderRadius: "8px",
        border: `1px solid ${theme.panelBorder}`,
        background: theme.headerBackgroundColor,
        color: theme.headerFontColor,
        fontSize: "12px",
        fontWeight: 600,
        wordBreak: "break-all",
    };

    const listStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        fontSize: "12.5px",
        lineHeight: 1.45,
        color: theme.panelText,
    };

    const actionStyle: React.CSSProperties = {
        fontWeight: 700,
        color: theme.buttonText,
    };

    const moveStyle: React.CSSProperties = {
        fontWeight: 700,
        color: theme.subText,
    };

    const removeStyle: React.CSSProperties = {
        fontWeight: 700,
        color: "#dc3545",
    };

    return (
        <label style={cardStyle}>
            <input
                type="radio"
                name={radioName}
                value="Database_and_LocalFileFolder"
                checked={isSelected}
                onChange={() => setUpdateOption("Database_and_LocalFileFolder")}
                style={{ marginTop: "3px", flexShrink: 0 }}
            />

            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={titleStyle}>Use existing local model folder</div>

                <div style={hintStyle}>
                    A <strong>Saved Model</strong> was found in:
                </div>

                <div style={pathStyle}>{localScanPath}</div>

                <div style={listStyle}>
                    <div>
                        a. <span style={actionStyle}>{offlineMode ? "Queue" : "Download"}</span> the{" "}
                        <strong>Selecting Model</strong>{" "}
                        {offlineMode
                            ? "using this existing folder for later download"
                            : "now using this existing folder"}
                    </div>

                    <div>
                        b. <span style={moveStyle}>Move</span> the previous{" "}
                        <strong>Saved Model</strong> to the Delete folder and{" "}
                        <span style={removeStyle}>remove</span> its database record
                    </div>
                </div>
            </div>
        </label>
    );
};

export default LocalFileFolderOption;