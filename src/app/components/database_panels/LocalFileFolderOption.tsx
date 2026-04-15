import React, { useEffect } from "react";
import useModelVersionFileExists from "../../hooks/useModelVersionFileExists";

type LocalFileFolderOptionProps = {
    modelID?: string;
    versionID?: string;
    localScanPath: string;
    updateOption: string;
    setUpdateOption: React.Dispatch<React.SetStateAction<string>>;
    theme: any;
};

const LocalFileFolderOption = ({
    modelID,
    versionID,
    localScanPath,
    updateOption,
    setUpdateOption,
    theme,
}: LocalFileFolderOptionProps) => {
    const { exists, isLoading } = useModelVersionFileExists(modelID, versionID);

    useEffect(() => {
        if (!isLoading && !exists && updateOption === "Database_and_LocalFileFolder") {
            setUpdateOption("Database_and_UpdateFolder");
        }
    }, [exists, isLoading, updateOption, setUpdateOption]);

    if (!localScanPath || isLoading || !exists) {
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
                value="Database_and_LocalFileFolder"
                checked={updateOption === "Database_and_LocalFileFolder"}
                onChange={() => setUpdateOption("Database_and_LocalFileFolder")}
            />
            <span style={{ wordBreak: "break-word" }}>
                This Model is existed in this PC's {localScanPath},
                Replace the Parent with this Sub. (Sub move to Delete dir)
                Remove the Sub Record from Database.
            </span>
        </label>
    );
};

export default LocalFileFolderOption;