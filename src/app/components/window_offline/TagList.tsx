// src/components/TagList.tsx
import React, { useState } from 'react'
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap'

interface TagListProps {
    tags: string[]
    isDarkMode: boolean
}

const TagList: React.FC<TagListProps> = ({ tags, isDarkMode }) => {
    const [copiedTag, setCopiedTag] = useState<string | null>(null)

    const handleCopy = (tag: string) => {
        navigator.clipboard.writeText(tag)
        setCopiedTag(tag)
        setTimeout(() => setCopiedTag(null), 1500)
    }

    // Pre-build a CSS-Properties object that includes cssText
    const baseStyles: React.CSSProperties & { cssText?: string } = {
        cursor: 'pointer',
        fontSize: '0.85rem',
        padding: '4px 10px',
        userSelect: 'none',
        lineHeight: 1.2,
        position: 'relative',
        overflow: 'hidden',
    }

    // Inject !important rules via cssText
    baseStyles.cssText = `
    background-color: ${isDarkMode
            ? 'rgba(37, 67, 112, 0.78) !important'
            : '#bbb !important'};
    color: ${isDarkMode ? '#ddd !important' : '#000 !important'};
  `

    return (
        <div
            style={{
                margin: '8px 0',
                fontSize: '0.9rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
            }}
        >
            <strong style={{ marginRight: '8px' }}>Tags:</strong>
            {tags.map(tag => {
                const isCopied = copiedTag === tag
                return (
                    <OverlayTrigger
                        key={tag}
                        placement="top"
                        overlay={
                            <Tooltip id={`tt-${tag}`}>
                                {isCopied ? 'Copied!' : 'Click to copy'}
                            </Tooltip>
                        }
                    >
                        <Badge
                            pill
                            onClick={() => handleCopy(tag)}
                            // cast to any so TS won’t complain about cssText
                            style={baseStyles as any}
                        >
                            <span style={{ visibility: isCopied ? 'hidden' : 'visible' }}>
                                {tag}
                            </span>
                        </Badge>
                    </OverlayTrigger>
                )
            })}
        </div>
    )
}

export default TagList
