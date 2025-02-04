// FolderDropdown.tsx
import React, { useState, useEffect } from 'react';
import { Dropdown, Button, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { FaClipboard } from 'react-icons/fa';
import { fetchGetFoldersList } from "../api/civitaiSQL_api";
import { updateDownloadFilePath } from '../store/actions/chromeActions';

interface FolderDropdownProps {
    filterText?: string;
}

const FolderDropdown: React.FC<FolderDropdownProps> = ({ filterText }) => {
    const dispatch = useDispatch();

    const [foldersList, setFoldersList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [clipboardText, setClipboardText] = useState<string>('');
    const [filteredFolders, setFilteredFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string>('');

    // Always keep our default folder constant in one place
    const DEFAULT_FOLDER = '/@scan@/ACG/Pending/';

    // Decide whether to use prop-based filter or clipboard-based
    const effectiveFilterText = filterText?.trim().length
        ? filterText
        : clipboardText;

    useEffect(() => {
        handleGetFoldersList();
    }, []);

    const handleGetFoldersList = async () => {
        setIsLoading(true);
        try {
            const data = await fetchGetFoldersList(dispatch);
            if (Array.isArray(data)) {
                setFoldersList(data);
            }
        } catch (error) {
            console.error('Error fetching folders list:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setClipboardText(text);
            // Reset the current selection when re-reading the clipboard
            setSelectedFolder('');
        } catch (error) {
            console.error('Error reading clipboard:', error);
        }
    };

    // Whenever folders list or the filter text changes, we re-filter
    useEffect(() => {
        if (effectiveFilterText.trim().length > 0) {
            // Filter everything except the default
            const filtered = foldersList.filter(folder =>
                folder !== DEFAULT_FOLDER &&
                folder.toLowerCase().includes(effectiveFilterText.toLowerCase())
            );
            // Always prepend the default folder
            filtered.unshift(DEFAULT_FOLDER);
            setFilteredFolders(filtered);
        } else {
            // If there's no filter text, just show everything plus the default at the front
            setFilteredFolders([]);
        }
    }, [foldersList, effectiveFilterText]);


    const handleSelectFolder = (folder: string) => {
        setSelectedFolder(folder);
        dispatch(updateDownloadFilePath(folder));
    };

    const dropdownToggleStyle: React.CSSProperties = {
        width: '325px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    };

    return (
        <div style={{ margin: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Dropdown>
                    <OverlayTrigger
                        placement="top"
                        overlay={
                            <Tooltip id="dropdown-toggle-tooltip">
                                {selectedFolder
                                    ? selectedFolder
                                    : filteredFolders.length > 0
                                        ? 'Select Folder'
                                        : 'No matching folders'}
                            </Tooltip>
                        }
                    >
                        <Dropdown.Toggle variant="secondary" style={dropdownToggleStyle}>
                            {selectedFolder
                                ? selectedFolder
                                : filteredFolders.length > 0
                                    ? 'Select Folder'
                                    : 'No matching folders'}
                        </Dropdown.Toggle>
                    </OverlayTrigger>

                    <Dropdown.Menu
                        style={{
                            width: '80%',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            whiteSpace: 'normal',
                        }}
                    >
                        {filteredFolders.map((folder, index) => (
                            <Dropdown.Item
                                key={index}
                                as="div"
                                style={{
                                    wordWrap: 'break-word',
                                    whiteSpace: 'normal',
                                    padding: '8px',
                                    cursor: 'pointer',
                                }}
                                onClick={() => handleSelectFolder(folder)}
                            >
                                {folder}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown>

                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip id="clipboard-tooltip">
                            {clipboardText ? clipboardText : 'Clipboard is empty'}
                        </Tooltip>
                    }
                >
                    <Button variant="outline-primary" onClick={handleReadClipboard}>
                        <FaClipboard />
                    </Button>
                </OverlayTrigger>
            </div>

            {isLoading && (
                <div style={{ marginTop: '10px', color: "white" }}>
                    <Spinner animation="border" size="sm" /> Loading folders...
                </div>
            )}
        </div>
    );
};

export default FolderDropdown;
