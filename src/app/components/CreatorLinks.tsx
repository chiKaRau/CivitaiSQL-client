import React from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

type Props = {
    creator?: string | null;
};

const CreatorLinks = ({ creator }: Props) => {
    if (!creator) {
        return <span>N/A</span>;
    }

    const encodedCreator = encodeURIComponent(creator);

    const redUrl = `https://civitai.red/user/${encodedCreator}/models`;
    const greenUrl = `https://civitai.green/user/${encodedCreator}/models`;
    const grayUrl = `https://civitai.com/user/${encodedCreator}/models`;

    const iconStyle = {
        fontSize: 16,
        cursor: "pointer",
        verticalAlign: "middle" as const,
    };

    return (
        <span
            onClick={(e) => e.stopPropagation()}
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
                title="Open creator in civitai.red"
                style={{ color: "red", display: "inline-flex", alignItems: "center" }}
                onClick={(e) => e.stopPropagation()}
            >
                <FaExternalLinkAlt style={iconStyle} />
            </a>

            <a
                href={greenUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open creator in civitai.green"
                style={{ color: "green", display: "inline-flex", alignItems: "center" }}
                onClick={(e) => e.stopPropagation()}
            >
                <FaExternalLinkAlt style={iconStyle} />
            </a>

            <a
                href={grayUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open creator in civitai.com"
                style={{ color: "gray", display: "inline-flex", alignItems: "center" }}
                onClick={(e) => e.stopPropagation()}
            >
                <FaExternalLinkAlt style={iconStyle} />
            </a>
        </span>
    );
};

export default CreatorLinks;