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
}: LocalFileFolderOptionProps) => {
    const { exists, isLoading } = useModelVersionFileExists(modelID, versionID);

    const isAvailable =
        !!localScanPath &&
        !isPendingPath(localScanPath) &&
        !isLoading &&
        !!exists;

    useEffect(() => {
        onAvailabilityChange?.(isAvailable);
    }, [isAvailable, onAvailabilityChange]);

    if (!isAvailable) {
        return null;
    }

    return (
        <label
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                color: theme.panelText,
                cursor: "pointer",
            }}
        >
            <input
                type="radio"
                name={radioName}
                value="Database_and_LocalFileFolder"
                checked={updateOption === "Database_and_LocalFileFolder"}
                onChange={() => setUpdateOption("Database_and_LocalFileFolder")}
            />
            <span style={{ wordBreak: "break-word" }}>
                This Model is existed in this PC&apos;s {localScanPath},
                Replace the Parent with this Sub. (Sub move to Delete dir)
                Remove the Sub Record from Database.
            </span>
        </label>
    );
};

export default LocalFileFolderOption;