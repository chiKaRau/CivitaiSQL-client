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
        flexWrap: "wrap" as const,
    };

    const iconGroupStyle = {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
    };

    const renderIcons = (redUrl: string, greenUrl: string, grayUrl: string) => (
        <span
            onClick={(e) => e.stopPropagation()}
            style={iconGroupStyle}
        >
            <a
                href={redUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open red"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "red", display: "inline-flex", alignItems: "center" }}
            >
                <FaExternalLinkAlt style={iconStyle} />
            </a>

            <a
                href={greenUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open green"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "green", display: "inline-flex", alignItems: "center" }}
            >
                <FaExternalLinkAlt style={iconStyle} />
            </a>

            <a
                href={grayUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open gray"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "gray", display: "inline-flex", alignItems: "center" }}
            >
                <FaExternalLinkAlt style={iconStyle} />
            </a>
        </span>
    );

    return (
        <>
            <div style={rowStyle}>
                <strong>Model API:</strong>
                {modelId ? (
                    <>
                        <span>{String(modelId)}</span>
                        {renderIcons(
                            `https://civitai.red/api/v1/models/${modelId}`,
                            `https://civitai.green/api/v1/models/${modelId}`,
                            `https://civitai.com/api/v1/models/${modelId}`
                        )}
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
                        {renderIcons(
                            `https://civitai.red/api/v1/model-versions/${versionId}`,
                            `https://civitai.green/api/v1/model-versions/${versionId}`,
                            `https://civitai.com/api/v1/model-versions/${versionId}`
                        )}
                    </>
                ) : (
                    <span>N/A</span>
                )}
            </div>
        </>
    );
};

export default CivitaiApiLinks;