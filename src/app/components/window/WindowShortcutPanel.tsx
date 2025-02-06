import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WindowUpdateModelPanel from './WindowUpdateModelPanel';
import { fetchBackupOfflineDownloadList, fetchFindVersionNumbersForModel, fetchFindVersionNumbersForOfflineDownloadList, fetchRemoveOfflineDownloadFileIntoOfflineDownloadList } from '../../api/civitaiSQL_api';
import { useDispatch } from 'react-redux';
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { BsDatabaseFillExclamation } from "react-icons/bs";
import { GoChecklist } from "react-icons/go";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { PiListDashesFill } from "react-icons/pi";

import { IoIosRefresh } from "react-icons/io";
import { MdAddCircle, MdLibraryAdd, MdRemove } from "react-icons/md";


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
    setSelectedUrl: (selectedUrl: string) => void;
    setUrlList: (updater: (prevUrlList: string[]) => string[]) => void; // Callback to update the URL list
    urlList: string[]; // Pass the list of URLs to check for duplicates
}

const WindowShortcutPanel: React.FC<PanelProps> = ({ url, urlList, setUrlList, setSelectedUrl }) => {
    const dispatch = useDispatch();

    const [modelData, setModelData] = useState<Model | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [existingVersions, setExistingVersions] = useState<any[]>([]);
    const [existingOfflineVersions, setExistingOfflineVersions] = useState<string[]>([]);

    const [renderKey, setRenderKey] = useState(0); // State to manage re-renders
    const [hasUpdated, setHasUpdated] = useState(false);
    const [showCarousel, setShowCarousel] = useState(false);


    // Extract modelId from the URL
    const modelId = url.match(/\/models\/(\d+)/)?.[1] || '';

    const [isUpdatePanelVisible, setIsUpdatePanelVisible] = useState(false);

    // Fetch model info when the component is mounted or `renderKey` changes
    useEffect(() => {
        fetchModelInfo();
    }, [renderKey]); // Add renderKey as a dependency
    // Fetch the model information
    const fetchModelInfo = async () => {
        setIsLoading(true);
        try {
            console.log("test-fetchModelInfo");
            const response = await axios.post(`https://civitai.com/api/v1/models/${modelId}`);
            const data = response.data;
            console.log(response);

            setModelData(data);
            const firstVersion = data.modelVersions[0];
            setSelectedVersion(firstVersion); // Select the first version by default

            const imagesArray = response?.data?.modelVersions?.map((version: any) => ({
                id: version.id,
                baseModel: version.baseModel || 'No Base Model',
                images: version.images.map((image: any) => image.url)
            }));

            // Get version IDs to check with the API
            const versionIds = imagesArray.map((version: any) => version.id);

            // Check for existing version numbers
            const existingVersionsSet = await fetchFindVersionNumbersForModel(modelId, versionIds, dispatch);
            console.log(existingVersionsSet);
            // Safely convert the Set to an array and set state
            setExistingVersions(Array.from(existingVersionsSet || []));

            if (!(new URL(url).searchParams.has('modelVersionId'))) {
                // Use "first one" URL format
                if (urlList.includes(url)) {
                    setMessage({ text: 'This URL is already in the list.', type: 'error' });
                } else {
                    setMessage(null);
                }
            }

            const offlineSet = await fetchFindVersionNumbersForOfflineDownloadList(modelId, versionIds, dispatch);
            setExistingOfflineVersions(Array.from(offlineSet || []) as string[]);

        } catch (error) {
            console.error('Error fetching model info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Dropdown Change
    const handleVersionChange = (versionId: number) => {
        const version = modelData?.modelVersions.find(v => v.id === versionId) || null;
        setSelectedVersion(version);

        if (version) {

            const formattedUrl =
                (version.id === modelData?.modelVersions[0].id && !(new URL(url).searchParams.has('modelVersionId')))
                    ? url
                    : `https://civitai.com/models/${modelId}?modelVersionId=${version.id}`;

            console.log(formattedUrl)
            console.log(urlList)

            // Check if the selected version URL is in the list
            if (urlList.includes(formattedUrl)) {
                setMessage({ text: 'This URL is already in the list.', type: 'error' });
            } else {
                setMessage(null); // Clear the message if the version is not in the list
            }
        }
    };

    // Handle Add Button Click
    const handleAdd = () => {
        if (!selectedVersion || !modelData) return;

        const formattedUrl =
            (selectedVersion.id === modelData?.modelVersions[0].id && !(new URL(url).searchParams.has('modelVersionId')))
                ? url
                : `https://civitai.com/models/${modelId}?modelVersionId=${selectedVersion.id}`;

        setUrlList(prevUrlList => {
            if (prevUrlList.includes(formattedUrl)) {
                setMessage({ text: 'This URL is already in the list.', type: 'error' });
                return prevUrlList; // Return the original list if duplicate
            }

            setMessage({ text: 'URL added successfully!', type: 'success' });
            return [...prevUrlList, formattedUrl]; // Add the new URL if it's not a duplicate
        });

        console.log("check-url")
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "check-url", url: formattedUrl });
            }
        });

    };

    // Handle Add All Button Click
    const handleAddAll = () => {
        if (!modelData) return;

        const modelVersions = modelData.modelVersions;
        const newUrls: string[] = [];

        modelVersions.forEach((version) => {
            const formattedUrl =
                (version.id === modelData.modelVersions[0].id &&
                    !(new URL(url).searchParams.has('modelVersionId')))
                    ? url
                    : `https://civitai.com/models/${modelId}?modelVersionId=${version.id}`;

            if (!urlList.includes(formattedUrl)) {
                newUrls.push(formattedUrl);
            }
        });

        if (newUrls.length === 0) {
            setMessage({ text: 'All URLs are already in the list.', type: 'error' });
            return;
        }

        setUrlList(prevUrlList => {
            const updatedList = [...prevUrlList, ...newUrls];
            return updatedList;
        });

        setMessage({ text: `${newUrls.length} URL(s) added successfully!`, type: 'success' });

        newUrls.forEach((formattedUrl) => {
            chrome.storage.local.get('originalTabId', (result) => {
                if (result.originalTabId) {
                    chrome.tabs.sendMessage(result.originalTabId, { action: "check-url", url: formattedUrl });
                }
            });
        });
    };

    const forceRerender = () => {
        setRenderKey((prevKey) => prevKey + 1); // Increment renderKey to force a re-render
    };

    const handleRemovefromOfflineList = async (civitaiModelID: string, civitaiVersionID: string) => {

        const userConfirmed = window.confirm(`Are you sure you want to remove the ${civitaiModelID}_${civitaiVersionID} ?`);
        if (!userConfirmed) {
            console.log("User canceled the removal operation.");
            return; // Exit the function if the user cancels
        }

        const isBackupSuccessful = await fetchBackupOfflineDownloadList(dispatch);
        if (!isBackupSuccessful) {
            alert("Backup failed. Cannot proceed with the download.");
            return;
        }

        setIsLoading(true);
        try {


            await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                {
                    civitaiModelID,
                    civitaiVersionID,
                },
                dispatch
            );


        } catch (error: any) {
            console.error("Failed to remove selected entries:", error.message);
        } finally {
            setSelectedUrl("")
            setIsLoading(false);
        }
    };

    const toggleUpdateModelPanel = () => {
        setIsUpdatePanelVisible(!isUpdatePanelVisible);
    };

    return (
        <div style={{ position: 'relative' }}> {/* Added relative positioning to contain the absolute carousel */}
            {isLoading ? (
                <p>Loading...</p>
            ) : modelData ? (
                <div>
                    {/* Flex Container for Buttons, Dropdown, and Messages */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '10px',
                        }}
                    >
                        {/* Icon Button for Force Re-render */}
                        <button
                            onClick={forceRerender}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '20px',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Force Re-render"
                            aria-label="Force Re-render"
                        >
                            <IoIosRefresh />
                        </button>

                        {/* Dropdown with Hover to Show Carousel */}
                        <div
                            style={{ position: 'relative', display: 'inline-block' }}
                            onMouseEnter={() => setShowCarousel(true)}
                            onMouseLeave={() => setShowCarousel(false)}
                        >
                            {/* Dropdown */}
                            <label htmlFor="versionDropdown" style={{ marginRight: '8px', whiteSpace: 'nowrap' }}>
                                {modelId}_
                            </label>
                            <select
                                id="versionDropdown"
                                onChange={(e) => handleVersionChange(Number(e.target.value))}
                                value={selectedVersion?.id || ''}
                                style={{ padding: '4px', fontSize: '14px' }}
                            >
                                <option value="">Select Version</option>
                                {modelData.modelVersions.map((version) => (
                                    <option key={version.id} value={version.id}>
                                        {version.id}_{version.name}
                                        {existingVersions.includes(version.id.toString()) ? ' *' : ''}
                                        {existingOfflineVersions.includes(version.id.toString()) ? ' ^' : ''}
                                    </option>
                                ))}
                            </select>

                            {/* Carousel Overlay */}
                            {showCarousel && selectedVersion && selectedVersion.images.length > 0 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: '0',
                                        marginTop: '5px',
                                        width: '75px', // Match the Carousel's width
                                        padding: '5px',
                                        backgroundColor: 'white',
                                        border: '1px solid #ccc',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                        zIndex: '100',
                                    }}
                                >
                                    <Carousel images={selectedVersion.images.map((image) => image.url)} />
                                </div>
                            )}
                        </div>

                        {/* Icon Button for Add to Download List */}
                        {selectedVersion && (
                            <button
                                onClick={handleAdd}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                title="Add to Download List"
                                aria-label="Add to Download List"
                            >
                                <MdAddCircle />
                            </button>
                        )}

                        {/* Icon Button for Add All to Download List */}
                        {selectedVersion && modelData && modelData.modelVersions.length > 0 && (
                            <button
                                onClick={handleAddAll}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                title="Add All to Download List"
                                aria-label="Add All to Download List"
                            >
                                <MdLibraryAdd />
                            </button>
                        )}

                        {/* Message Icons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {/* Database Icon with Tooltip */}
                            {selectedVersion && existingVersions.includes(selectedVersion.id.toString()) && (
                                <OverlayTrigger
                                    placement="top"
                                    overlay={
                                        <Tooltip id={`tooltip-db`}>
                                            This version already exists in the database.
                                        </Tooltip>
                                    }
                                >
                                    <span
                                        style={{
                                            fontSize: '24px',
                                            color: 'blue',
                                            cursor: 'pointer', // Changed to 'pointer' to indicate interactivity
                                        }}
                                    >
                                        <BsDatabaseFillExclamation />
                                    </span>
                                </OverlayTrigger>
                            )}

                            {selectedVersion && existingOfflineVersions.includes(selectedVersion.id.toString()) && (
                                <OverlayTrigger
                                    placement="top"
                                    overlay={
                                        <Tooltip id={`tooltip-db`}>
                                            This version already exists in the Offline List.
                                        </Tooltip>
                                    }
                                >
                                    <span
                                        style={{
                                            fontSize: '24px',
                                            color: 'blue',
                                            cursor: 'pointer', // Changed to 'pointer' to indicate interactivity
                                        }}
                                        onClick={() => handleRemovefromOfflineList(modelId, selectedVersion?.id?.toString() || '')}
                                    >
                                        <PiListDashesFill />
                                    </span>
                                </OverlayTrigger>
                            )}

                            {/* Checklist Icon with Tooltip */}
                            {message && message.type === 'error' && (
                                <OverlayTrigger
                                    placement="top"
                                    overlay={
                                        <Tooltip id={`tooltip-checklist`}>
                                            This URL is already in the checkbox list.
                                        </Tooltip>
                                    }
                                >
                                    <span
                                        style={{
                                            fontSize: '24px',
                                            color: 'red',
                                            cursor: 'pointer', // Changed to 'pointer' to indicate interactivity
                                        }}
                                    >
                                        <GoChecklist />
                                    </span>
                                </OverlayTrigger>
                            )}

                            <OverlayTrigger
                                placement="top"
                                overlay={
                                    <Tooltip id={`tooltip-checklist`}>
                                        Remove selectedUrl
                                    </Tooltip>
                                }
                            >
                                <button
                                    onClick={() => setSelectedUrl("")}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    title="Remove selectedUrl"
                                    aria-label="Remove selectedUrl"
                                >
                                    <MdRemove />
                                </button>
                            </OverlayTrigger>
                        </div>
                    </div>

                    {/* Carousel Overlay */}
                    {/* Already handled within the dropdown's relative container */}

                </div>
            ) : (
                <p>No data available.</p>
            )}
        </div>
    );
};

interface CarouselProps {
    images: string[];
}

const Carousel: React.FC<CarouselProps> = ({ images }) => {
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
                width: '75px', // Reduced from 300px to 75px (25%)
                height: '75px', // Reduced from 300px to 75px (25%)
                margin: '0 auto',
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
                    }}
                />
            ) : (
                <p style={{ fontSize: '8px', textAlign: 'center' }}>No images available</p> // Smaller text
            )}

            <button
                onClick={handlePrev}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '16px', // Reduced from 32px to 16px (50%)
                    height: '16px', // Reduced from 32px to 16px (50%)
                    cursor: 'pointer',
                    padding: '0',
                    fontSize: '8px', // Reduced font size
                    lineHeight: '16px', // Center the arrow vertically
                    textAlign: 'center',
                }}
            >
                <FaAngleLeft />
            </button>
            <button
                onClick={handleNext}
                style={{
                    position: 'absolute',
                    top: '50%',
                    right: '0',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '16px', // Reduced from 32px to 16px (50%)
                    height: '16px', // Reduced from 32px to 16px (50%)
                    cursor: 'pointer',
                    padding: '0',
                    fontSize: '8px', // Reduced font size
                    lineHeight: '16px', // Center the arrow vertically
                    textAlign: 'center',
                }}
            >
                <FaAngleRight />
            </button>
        </div>
    );
};

export default WindowShortcutPanel;