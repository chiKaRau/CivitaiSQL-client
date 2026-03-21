import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WindowUpdateModelPanel from './WindowUpdateModelPanel';
import { fetchFindVersionNumbersForModel } from '../../api/civitaiSQL_api';
import { useDispatch, useSelector } from 'react-redux';
import { updateDownloadFilePath } from '../../store/actions/chromeActions';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
    FaXmark,
    FaRotateRight,
    FaPlus,
    FaPenToSquare,
    FaChevronLeft,
    FaChevronRight,
    FaDatabase,
    FaUser,
    FaTag
} from 'react-icons/fa6';
import { AppState } from '../../store/configureStore';
import { AppTheme, darkTheme, lightTheme } from '../window_offline/OfflineWindow.theme';

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
    url: string;
    setUrlList: (updater: (prevUrlList: string[]) => string[]) => void;
    onClose: () => void;
    setIsFullInfoModelPanelVisible: (isFullInfoModelPanelVisible: boolean) => void;
    urlList: string[];
}

const WindowFullInfoModelPanel: React.FC<PanelProps> = ({
    url,
    urlList,
    setUrlList,
    onClose,
    setIsFullInfoModelPanelVisible
}) => {
    const dispatch = useDispatch();

    const [modelData, setModelData] = useState<Model | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [existingVersions, setExistingVersions] = useState<any[]>([]);
    const [renderKey, setRenderKey] = useState(0);
    const [hasUpdated, setHasUpdated] = useState(false);
    const [isUpdatePanelVisible, setIsUpdatePanelVisible] = useState(false);
    const chromeData = useSelector((state: AppState) => state.chrome);
    const { isDarkMode } = chromeData;
    const theme = isDarkMode ? darkTheme : lightTheme;

    const modelId = url.match(/\/models\/(\d+)/)?.[1] || '';

    const getIconButtonStyle = (theme: AppTheme): React.CSSProperties => ({
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        border: `1px solid ${theme.buttonBorder}`,
        background: theme.buttonBackground,
        color: theme.buttonText,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: theme.buttonShadow,
    });

    const getPrimaryButtonStyle = (theme: AppTheme): React.CSSProperties => ({
        padding: '10px 16px',
        borderRadius: '10px',
        border: `1px solid ${theme.buttonBorder}`,
        background: theme.buttonBackground,
        color: theme.buttonText,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: theme.buttonShadow,
    });

    const getSecondaryButtonStyle = (theme: AppTheme): React.CSSProperties => ({
        padding: '10px 16px',
        borderRadius: '10px',
        border: `1px solid ${theme.buttonBorder}`,
        background: theme.panelBackground,
        color: theme.panelText,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: theme.buttonShadow,
    });

    const iconButtonStyle = getIconButtonStyle(theme);
    const primaryButtonStyle = getPrimaryButtonStyle(theme);
    const secondaryButtonStyle = getSecondaryButtonStyle(theme);

    useEffect(() => {
        fetchModelInfo();
    }, [renderKey]);

    useEffect(() => {
        if (hasUpdated) {
            fetchModelInfo();

            setUrlList(currentUrls => currentUrls.filter(currentUrl => currentUrl !== url));

            chrome.storage.local.get('originalTabId', (result) => {
                if (result.originalTabId) {
                    chrome.tabs.sendMessage(result.originalTabId, { action: "uncheck-url", url: url });
                }
            });

            setHasUpdated(false);
            dispatch(updateDownloadFilePath("/@scan@/ACG/Pending/"));
            setIsFullInfoModelPanelVisible(false);
        }
    }, [hasUpdated]);

    const fetchModelInfo = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`https://civitai.com/api/v1/models/${modelId}`);
            const data = response.data;

            setModelData(data);
            const firstVersion = data.modelVersions[0];
            setSelectedVersion(firstVersion);

            const imagesArray = response?.data?.modelVersions?.map((version: any) => ({
                id: version.id,
                baseModel: version.baseModel || 'No Base Model',
                images: version.images.map((image: any) => image.url)
            }));

            const versionIds = imagesArray.map((version: any) => version.id);

            const existingVersionsSet = await fetchFindVersionNumbersForModel(modelId, versionIds, dispatch);
            setExistingVersions(Array.from(existingVersionsSet || []));

            if (!(new URL(url).searchParams.has('modelVersionId'))) {
                if (urlList.includes(url)) {
                    setMessage({ text: 'This URL is already in the list.', type: 'error' });
                } else {
                    setMessage(null);
                }
            }
        } catch (error) {
            console.error('Error fetching model info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVersionChange = (versionId: number) => {
        const version = modelData?.modelVersions.find(v => v.id === versionId) || null;
        setSelectedVersion(version);

        if (version) {
            const formattedUrl =
                (version.id === modelData?.modelVersions[0].id && !(new URL(url).searchParams.has('modelVersionId')))
                    ? url
                    : `https://civitai.com/models/${modelId}?modelVersionId=${version.id}`;

            if (urlList.includes(formattedUrl)) {
                setMessage({ text: 'This URL is already in the list.', type: 'error' });
            } else {
                setMessage(null);
            }
        }
    };

    const handleAdd = () => {
        if (!selectedVersion || !modelData) return;

        const formattedUrl =
            (selectedVersion.id === modelData?.modelVersions[0].id && !(new URL(url).searchParams.has('modelVersionId')))
                ? url
                : `https://civitai.com/models/${modelId}?modelVersionId=${selectedVersion.id}`;

        setUrlList(prevUrlList => {
            if (prevUrlList.includes(formattedUrl)) {
                setMessage({ text: 'This URL is already in the list.', type: 'error' });
                return prevUrlList;
            }

            setMessage({ text: 'URL added successfully!', type: 'success' });
            return [...prevUrlList, formattedUrl];
        });

        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "check-url", url: formattedUrl });
            }
        });
    };

    const forceRerender = () => {
        setRenderKey((prevKey) => prevKey + 1);
    };

    const toggleUpdateModelPanel = () => {
        setIsUpdatePanelVisible(!isUpdatePanelVisible);
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
                padding: '24px',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 'none',
                    height: '100%',
                    maxHeight: 'calc(100vh - 48px)',
                    overflowY: 'auto',
                    background: theme.panelBackground,
                    color: theme.panelText,
                    borderRadius: '18px',
                    boxShadow: theme.buttonShadow,
                    border: `1px solid ${theme.panelBorder}`,
                    padding: '20px',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginBottom: '18px',
                        borderBottom: '1px solid #eef1f4',
                        paddingBottom: '14px',
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                color: theme.panelText,
                                lineHeight: 1.3,
                                wordBreak: 'break-word',
                            }}
                        >
                            {modelData?.name || 'Model Info'}
                        </div>

                        {modelData?.creator?.username && (
                            <div
                                style={{
                                    marginTop: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: theme.subText,
                                    fontSize: '14px',
                                }}
                            >
                                <FaUser />
                                <span>Created by: {modelData.creator.username}</span>
                            </div>
                        )}

                        {modelData?.tags?.length ? (
                            <div
                                style={{
                                    marginTop: '10px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    color: '#4b5563',
                                    fontSize: '14px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <FaTag style={{ marginTop: '3px' }} />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {modelData.tags.slice(0, 12).map((tag, index) => (
                                        <span
                                            key={index}
                                            style={{
                                                background: '#eef4ff',
                                                color: '#2457c5',
                                                border: '1px solid #d8e6ff',
                                                padding: '4px 8px',
                                                borderRadius: '999px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <OverlayTrigger overlay={<Tooltip id="tooltip-refresh-model" style={{ zIndex: 20000 }}>Refresh model info</Tooltip>}>
                            <button onClick={forceRerender} style={iconButtonStyle}>
                                <FaRotateRight size={16} />
                            </button>
                        </OverlayTrigger>

                        <OverlayTrigger overlay={<Tooltip id="tooltip-close-panel" style={{ zIndex: 20000 }}>Close panel</Tooltip>}>
                            <button onClick={onClose} style={iconButtonStyle}>
                                <FaXmark size={18} />
                            </button>
                        </OverlayTrigger>
                    </div>
                </div>

                {isLoading ? (
                    <div
                        style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontSize: '16px',
                            fontWeight: 600,
                        }}
                    >
                        Loading model info...
                    </div>
                ) : modelData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Version selector */}
                        <div
                            style={{
                                background: theme.panelBackground,
                                border: `1px solid ${theme.panelBorder}`,
                                borderRadius: '14px',
                                padding: '16px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    marginBottom: '10px',
                                    color: theme.panelText,
                                }}
                            >
                                Select Version
                            </div>

                            <select
                                id="versionDropdown"
                                onChange={(e) => handleVersionChange(Number(e.target.value))}
                                value={selectedVersion?.id || ''}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: `1px solid ${theme.panelBorder}`,
                                    background: theme.panelBackground,
                                    color: theme.panelText,
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            >
                                {modelData.modelVersions.map(version => (
                                    <option
                                        key={version.id}
                                        value={version.id}
                                        style={{
                                            background: theme.panelBackground,
                                            color: theme.panelText,
                                        }}
                                    >
                                        {version.name} (Base Model: {version.baseModel || 'No Base Model'})
                                        {existingVersions.includes(version.id.toString()) ? '  *' : ''}
                                    </option>
                                ))}
                            </select>

                            {selectedVersion && (
                                <div
                                    style={{
                                        marginTop: '12px',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                    }}
                                >
                                    <span
                                        style={{
                                            background: '#eef4ff',
                                            color: '#2457c5',
                                            border: '1px solid #d8e6ff',
                                            padding: '6px 10px',
                                            borderRadius: '999px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Version ID: {selectedVersion.id}
                                    </span>

                                    <span
                                        style={{
                                            background: theme.rowBackgroundColor,
                                            color: theme.panelText,
                                            border: `1px solid ${theme.panelBorder}`,
                                            padding: '6px 10px',
                                            borderRadius: '999px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Base Model: {selectedVersion.baseModel || 'No Base Model'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        {selectedVersion && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '10px',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <OverlayTrigger overlay={<Tooltip id="tooltip-add-download-list" style={{ zIndex: 20000 }}>Add selected version URL to download list</Tooltip>}>
                                    <button onClick={handleAdd} style={primaryButtonStyle}>
                                        <FaPlus />
                                        <span>Add to Download List</span>
                                    </button>
                                </OverlayTrigger>

                                <OverlayTrigger overlay={<Tooltip id="tooltip-update-existing" style={{ zIndex: 20000 }}>Update existing database record to selected version</Tooltip>}>
                                    <button onClick={toggleUpdateModelPanel} style={secondaryButtonStyle}>
                                        <FaPenToSquare />
                                        <span>Update Existing Model</span>
                                    </button>
                                </OverlayTrigger>
                            </div>
                        )}

                        {/* Carousel */}
                        {selectedVersion && (
                            <div
                                style={{
                                    border: `1px solid ${theme.panelBorder}`,
                                    borderRadius: '14px',
                                    padding: '16px',
                                    background: theme.panelBackground,
                                    color: theme.panelText,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        marginBottom: '14px',
                                        color: theme.panelText,
                                    }}
                                >
                                    Images for {selectedVersion.name}
                                </div>

                                <Carousel
                                    images={selectedVersion.images.map(image => image.url)}
                                    theme={theme}
                                />
                            </div>
                        )}

                        {/* Already exists info */}
                        {selectedVersion && existingVersions.includes(selectedVersion.id.toString()) && (
                            <div
                                style={{
                                    marginTop: '2px',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    color: theme.panelText,
                                    backgroundColor: theme.rowBackgroundColor,
                                    border: `1px solid ${theme.panelBorder}`,
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    fontWeight: 700,
                                }}
                            >
                                <FaDatabase />
                                <span>This version already exists in the database.</span>
                            </div>
                        )}

                        {selectedVersion && isUpdatePanelVisible && (
                            <WindowUpdateModelPanel
                                selectedVersion={selectedVersion}
                                modelId={modelId}
                                modelURL={`https://civitai.com/models/${modelId}?modelVersionId=${selectedVersion.id}`}
                                modelData={modelData}
                                setHasUpdated={setHasUpdated}
                                onClose={toggleUpdateModelPanel}
                            />
                        )}

                        {/* Notification */}
                        {message && (
                            <div
                                style={{
                                    marginTop: '4px',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    color: message.type === 'success' ? '#155724' : '#842029',
                                    backgroundColor: message.type === 'success' ? '#e8f8ec' : '#fdeaea',
                                    border: `1px solid ${message.type === 'success' ? '#b9e3c3' : '#f4b9bf'}`,
                                    textAlign: 'center',
                                    fontWeight: 700,
                                }}
                            >
                                {message.text}
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontSize: '16px',
                            fontWeight: 600,
                        }}
                    >
                        No data available.
                    </div>
                )}
            </div>
        </div>
    );
};

interface CarouselProps {
    images: string[];
    theme: AppTheme;
}

const Carousel: React.FC<CarouselProps> = ({ images, theme }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrev = () => {
        setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
    };

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '520px',
                margin: '0 auto',
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '360px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: theme.rowBackgroundColor,
                    border: `1px solid ${theme.panelBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                {images.length > 0 ? (
                    <img
                        src={images[currentIndex]}
                        alt={`Image ${currentIndex + 1}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            background: theme.panelBackground,
                        }}
                    />
                ) : (
                    <div style={{ color: theme.subText, fontWeight: 600 }}>
                        No images available
                    </div>
                )}

                {images.length > 1 && (
                    <>
                        <OverlayTrigger overlay={<Tooltip id="tooltip-prev-image" style={{ zIndex: 20000 }}>Previous image</Tooltip>}>
                            <button
                                onClick={handlePrev}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '10px',
                                    transform: 'translateY(-50%)',
                                    background: 'rgba(17,24,39,0.72)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '999px',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <FaChevronLeft size={14} />
                            </button>
                        </OverlayTrigger>

                        <OverlayTrigger overlay={<Tooltip id="tooltip-next-image" style={{ zIndex: 20000 }}>Next image</Tooltip>}>
                            <button
                                onClick={handleNext}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: '10px',
                                    transform: 'translateY(-50%)',
                                    background: 'rgba(17,24,39,0.72)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '999px',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <FaChevronRight size={14} />
                            </button>
                        </OverlayTrigger>
                    </>
                )}
            </div>

            {images.length > 0 && (
                <div
                    style={{
                        marginTop: '10px',
                        textAlign: 'center',
                        fontSize: '13px',
                        color: theme.subText,
                        fontWeight: 600,
                    }}
                >
                    {currentIndex + 1} / {images.length}
                </div>
            )}
        </div>
    );
};

export default WindowFullInfoModelPanel;