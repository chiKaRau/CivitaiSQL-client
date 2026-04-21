import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';

//components
import { OverlayTrigger, Tooltip, } from 'react-bootstrap';
import FolderDropdown from "../FolderDropdown"

//utils
import { initializeDatafromChromeStorage, } from "../../utils/chromeUtils"
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { FaFilter, } from 'react-icons/fa';
import { FaXmark, FaFolderTree, FaHardDrive } from 'react-icons/fa6';
import { AppTheme, darkTheme, lightTheme } from '../window_offline/OfflineWindow.theme';
import ModelVersionFileExistsBadge from '../ModelVersionFileExistsBadge';
import DatabaseUpdateModelPanel from '../database_panels/DatabaseUpdateModelPanel';
import CategoriesListSelector from '../CategoriesListSelector';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';

interface Version {
    id: number;
    name: string;
    baseModel: string;
    images: { url: string }[];
}

interface Model {
    name: string;
    creator: { username: string };
    tags: string[];
    modelVersions: Version[];
}

interface PanelProps {
    selectedVersion: Version;
    modelId: string;
    modelURL: string;
    modelData: Model;
    setHasUpdated: (hasUpdated: boolean) => void;
    onClose: () => void;
}

const WindowUpdateModelPanel: React.FC<PanelProps> = ({ selectedVersion, modelId, modelURL, modelData, setHasUpdated, onClose }) => {
    const dispatch = useDispatch();
    const chrome = useSelector((state: AppState) => state.chrome);
    const { isDarkMode } = chrome;
    const theme = isDarkMode ? darkTheme : lightTheme;
    const [selectedCategory, setSelectCategory] = useState(chrome.selectedCategory || "Characters")
    const [downloadFilePath, setDownloadFilePath] = useState(chrome.downloadFilePath || "")

    useEffect(() => {
        console.log("test-window-selectedVersion");
        console.log(selectedVersion)
        initializeDatafromChromeStorage(dispatch);
    }, []);

    useEffect(() => {
        setDownloadFilePath(chrome.downloadFilePath ?? "");
        setSelectCategory(chrome.selectedCategory ?? "Characters");
    }, [chrome.downloadFilePath, chrome.selectedCategory]);

    const sideCardStyle: React.CSSProperties = {
        background: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: '16px',
        padding: '14px',
        boxShadow: theme.buttonShadow,
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000,
                padding: '20px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '1400px',
                    height: '88vh',
                    background: theme.panelBackground,
                    color: theme.panelText,
                    borderRadius: '18px',
                    boxShadow: theme.buttonShadow,
                    border: `1px solid ${theme.panelBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 18px',
                        borderBottom: `1px solid ${theme.panelBorder}`,
                        background: theme.rowBackgroundColor,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: theme.panelText,
                                lineHeight: 1.3,
                            }}
                        >
                            Update Existing Model
                        </div>

                        <div
                            style={{
                                marginTop: '4px',
                                fontSize: '13px',
                                color: theme.subText,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                flexWrap: 'nowrap',
                                minWidth: 0,
                            }}
                        >
                            <span
                                style={{
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Model {modelId}_{selectedVersion?.id} : {selectedVersion?.name}
                            </span>

                            {!!modelId && !!selectedVersion?.id && (
                                <ModelVersionFileExistsBadge
                                    modelID={String(modelId)}
                                    versionID={String(selectedVersion.id)}
                                />
                            )}
                        </div>
                    </div>

                    <OverlayTrigger
                        placement="left"
                        container={document.body}
                        overlay={
                            <Tooltip id="tooltip-close-update-panel" style={{ zIndex: 20000 }}>
                                Close update panel
                            </Tooltip>
                        }
                    >
                        <button
                            onClick={onClose}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                border: `1px solid ${theme.buttonBorder}`,
                                background: theme.buttonBackground,
                                color: theme.buttonText,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: theme.buttonShadow,
                                flexShrink: 0,
                            }}
                        >
                            <FaXmark size={18} />
                        </button>
                    </OverlayTrigger>
                </div>

                {/* Body */}
                <div
                    style={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: '1.1fr 0.9fr',
                        minHeight: 0,
                        background: theme.gridBackgroundColor,
                    }}
                >
                    {/* Left */}
                    <div
                        style={{
                            minHeight: 0,
                            overflowY: 'auto',
                            padding: '16px',
                            borderRight: `1px solid ${theme.panelBorder}`,
                            background: theme.gridBackgroundColor,
                        }}
                    >
                        <div
                            style={{
                                borderRadius: '16px',
                                padding: '14px',
                                background: theme.panelBackground,
                                border: `1px solid ${theme.panelBorder}`,
                                boxShadow: theme.buttonShadow,
                            }}
                        >
                            <DatabaseUpdateModelPanel
                                modelID={modelId}
                                url={modelURL}
                                modelData={modelData}
                                selectedVersion={selectedVersion}
                                selectedCategory={selectedCategory}
                                downloadFilePath={downloadFilePath}
                                setDownloadFilePath={setDownloadFilePath}
                                setHasUpdated={setHasUpdated}
                                closePanel={onClose}
                                theme={theme}
                                isDarkMode={isDarkMode}
                            />

                        </div>
                    </div>

                    {/* Right */}
                    <div
                        style={{
                            minHeight: 0,
                            overflowY: 'auto',
                            padding: '16px',
                            background: theme.rowBackgroundColor,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                        }}
                    >
                        <div style={sideCardStyle}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                    fontWeight: 700,
                                    color: theme.panelText,
                                }}
                            >
                                <FaFilter />
                                Category Selector
                            </div>

                            <CategoriesListSelector
                                downloadFilePath={downloadFilePath}
                                selectedCategory={selectedCategory}
                                setSelectCategory={setSelectCategory}
                                isDarkMode={isDarkMode}
                                theme={theme}
                            />
                        </div>

                        <div style={sideCardStyle} >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                    fontWeight: 700,
                                    color: theme.panelText,
                                }}
                            >
                                <FaFolderTree />
                                Download Path
                            </div>

                            <DownloadFilePathOptionPanel
                                downloadFilePath={downloadFilePath}
                                setDownloadFilePath={setDownloadFilePath}
                                selectedCategory={selectedCategory}
                                theme={theme}
                            />
                        </div>

                        <div style={sideCardStyle}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                    fontWeight: 700,
                                    color: theme.panelText,
                                    flexShrink: 0,
                                }}
                            >
                                <FaHardDrive />
                                Folder Browser
                            </div>

                            <FolderDropdown isDarkMode={isDarkMode} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WindowUpdateModelPanel;
