import React, { useState } from 'react'
import { Button } from 'react-bootstrap'

interface TitleNameToggleProps {
    label?: string     // e.g. "File Name:"
    titleName: string
    truncateAfter?: number  // only show button if name is longer than this
}

const TitleNameToggle: React.FC<TitleNameToggleProps> = ({
    titleName,
    truncateAfter = 30
}) => {
    const [expanded, setExpanded] = useState(false)
    const isTooLong = titleName.length > truncateAfter

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '4px 0',
            }}
        >
            <span
                title={titleName}
                style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    whiteSpace: expanded ? 'normal' : 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,               // let it take all available space
                    marginRight: '8px',    // space before the button
                }}
            >
                {titleName}
            </span>

            {isTooLong && (
                <Button
                    size="sm"
                    variant="link"
                    onClick={() => setExpanded((v) => !v)}
                    style={{ padding: 0 }}
                >
                    {expanded ? 'Hide' : 'Show'}
                </Button>
            )}
        </div>
    )
}

export default TitleNameToggle
