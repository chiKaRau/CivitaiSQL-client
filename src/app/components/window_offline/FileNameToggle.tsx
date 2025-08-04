import React, { useState } from 'react'
import { Button } from 'react-bootstrap'

interface FileNameToggleProps {
    label?: string     // e.g. "File Name:"
    fileName: string
    truncateAfter?: number  // only show button if name is longer than this
}

const FileNameToggle: React.FC<FileNameToggleProps> = ({
    label = 'File Name: ',
    fileName,
    truncateAfter = 30
}) => {
    const [expanded, setExpanded] = useState(false)
    const isTooLong = fileName.length > truncateAfter

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
                title={fileName}
                style={{
                    whiteSpace: expanded ? 'normal' : 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,               // let it take all available space
                    marginRight: '8px',    // space before the button
                }}
            >
                <strong>{label}</strong>
                {fileName}
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

export default FileNameToggle
