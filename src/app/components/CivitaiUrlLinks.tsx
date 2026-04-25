import React from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

type Props = {
    civitaiModelID?: string | number | null;
    civitaiVersionID?: string | number | null;
    isDarkMode?: boolean;
};

const CivitaiUrlLinks = ({
    civitaiModelID,
    civitaiVersionID,
}: Props) => {
    if (!civitaiModelID || !civitaiVersionID) {
        return <span>N/A</span>;
    }

    const modelID = String(civitaiModelID);
    const versionID = String(civitaiVersionID);

    const redUrl = `https://civitai.red/models/${modelID}?modelVersionId=${versionID}`;
    const grayUrl = `https://civitai.com/models/${modelID}?modelVersionId=${versionID}`;

    const iconStyle = {
        fontSize: 16,
        cursor: "pointer",
        verticalAlign: "middle" as const,
    };

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
            }}
        >
            <a
                href={redUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in civitai.red"
                style={{ color: "red", display: "inline-flex", alignItems: "center" }}
            >
                <FaExternalLinkAlt style={iconStyle} />
            </a>

            <a
                href={grayUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in civitai.com"
                style={{ color: "gray", display: "inline-flex", alignItems: "center" }}
            >
                <FaExternalLinkAlt style={iconStyle} />
            </a>
        </span>
    );
};

export default CivitaiUrlLinks;