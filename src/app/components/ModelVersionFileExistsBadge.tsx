import React from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { AiFillFile } from "react-icons/ai";
import useModelVersionFileExists from "../hooks/useModelVersionFileExists";

type Props = {
    modelID?: string;
    versionID?: string;
    refreshKey?: number | string;
    hideWhenMissing?: boolean;
};

const ModelVersionFileExistsBadge = ({
    modelID,
    versionID,
    refreshKey,
    hideWhenMissing = true,
}: Props) => {
    const { exists, filePath, isLoading } = useModelVersionFileExists(
        modelID,
        versionID,
        refreshKey
    );

    if (isLoading) {
        return null;
    }

    if (!exists && hideWhenMissing) {
        return null;
    }

    return (
        <OverlayTrigger
            placement="top"
            overlay={
                <Tooltip id="tooltip-local-file">
                    <div
                        style={{
                            maxWidth: "420px",
                            whiteSpace: "normal",
                            wordBreak: "break-all",
                            textAlign: "left",
                        }}
                    >
                        {exists
                            ? filePath || "Downloaded file exists"
                            : "Downloaded file not found"}
                    </div>
                </Tooltip>
            }
        >
            <span
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    cursor: "pointer",
                }}
            >
                <AiFillFile size={20} color={exists ? "#22c55e" : "#9ca3af"} />
            </span>
        </OverlayTrigger>
    );
};

export default ModelVersionFileExistsBadge;