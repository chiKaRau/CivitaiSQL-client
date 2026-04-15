import React from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

type Props = {
    modelId?: string | number | null;
    versionId?: string | number | null;
};

const CivitaiApiLinks = ({ modelId, versionId }: Props) => {
    const iconStyle = {
        fontSize: 14,
        cursor: "pointer",
        verticalAlign: "middle" as const,
    };

    const rowStyle = {
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "4px 0",
    };

    return (
        <>
            <div style={rowStyle}>
                <strong>Model API:</strong>
                {modelId ? (
                    <>
                        <span>{String(modelId)}</span>
                        <a
                            href={`https://civitai.com/api/v1/models/${modelId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Model API"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "gray", display: "inline-flex", alignItems: "center" }}
                        >
                            <FaExternalLinkAlt style={iconStyle} />
                        </a>
                    </>
                ) : (
                    <span>N/A</span>
                )}
            </div>

            <div style={rowStyle}>
                <strong>Version API:</strong>
                {versionId ? (
                    <>
                        <span>{String(versionId)}</span>
                        <a
                            href={`https://civitai.com/api/v1/model-versions/${versionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Version API"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "gray", display: "inline-flex", alignItems: "center" }}
                        >
                            <FaExternalLinkAlt style={iconStyle} />
                        </a>
                    </>
                ) : (
                    <span>N/A</span>
                )}
            </div>
        </>
    );
};

export default CivitaiApiLinks;