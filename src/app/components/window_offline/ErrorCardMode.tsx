// ErrorCardMode.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Spinner, Button, Badge, ButtonGroup, Tooltip, Dropdown, OverlayTrigger, Form } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchGetErrorModelList,
    fetchCivitaiModelInfoFromCivitaiByVersionID,
    fetchRemoveFromErrorModelList,
    fetchAddRecordToDatabase,
    fetchDownloadFilesByServer_v2,
    fetchRemoveOfflineDownloadFileIntoOfflineDownloadList,
} from '../../api/civitaiSQL_api';
import axios from 'axios';

import { bookmarkThisUrl, callChromeBrowserDownload_v2 } from '../../utils/chromeUtils';
import { AppState } from '../../store/configureStore';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import CategoriesListSelector from '../CategoriesListSelector';
import { BsCloudDownloadFill } from 'react-icons/bs';
import { FcDownload } from 'react-icons/fc';
import { IoLibrary } from "react-icons/io5";
import { MdOutlineFontDownload, MdFontDownload } from "react-icons/md";



interface OfflineDownloadEntry {
    civitaiModelID: string;
    civitaiVersionID: string;
    imageUrlsArray: (string | { url: string; width?: number; height?: number; nsfw?: any })[];
    downloadFilePath: string;   // ← add this line
    // ...other properties as defined in your app
}

interface ErrorCardModeProps {
    isDarkMode: boolean;
    modify_downloadFilePath: string;
    modify_selectedCategory: string;
    offlineDownloadList?: OfflineDownloadEntry[];
    handleRefreshList?: () => void;  // NEW PROP
}


interface FetchedModelInfo {
    previewImage: string;
    modelData: any; // Replace with a more precise type if available
    currentImageIndex: number;
    usingOfflineFallback?: boolean; // flag to mark fallback usage
}

const ErrorCardMode: React.FC<ErrorCardModeProps> = ({
    isDarkMode,
    modify_downloadFilePath,
    modify_selectedCategory,
    offlineDownloadList,
    handleRefreshList
}) => {
    const dispatch = useDispatch();

    // 1) The raw list of error strings from your server
    const [errorList, setErrorList] = useState<string[]>([]);
    // 2) Local loading flag for fetching the error list initially
    const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
    // 3) A dictionary of versionID -> FetchedModelInfo so we only fetch once per versionID
    const [fetchedInfos, setFetchedInfos] = useState<Record<string, FetchedModelInfo>>({});
    // 4) If you want a loading state per card, keep track in a local set
    const [loadingVersionIDs, setLoadingVersionIDs] = useState<Set<string>>(new Set());
    const [downloadMethod, setDownloadMethod] = useState("browser");
    const [shouldAddRecordAndBookmark, setShouldAddRecordAndBookmark] = useState<Record<string, boolean>>({});

    // track, per-versionID, whether we force using modify_downloadFilePath
    const [useModifyPath, setUseModifyPath] = useState<Record<string, boolean>>({});


    // Called when user toggles the checkbox
    const handleCheckboxChange = useCallback(
        (versionID: string, checked: boolean) => {
            setShouldAddRecordAndBookmark((prev) => ({
                ...prev,
                [versionID]: checked,
            }));
        },
        []
    );

    // ----------------------------------
    // Fetch error list ONCE when mounted
    // ----------------------------------
    useEffect(() => {
        let isMounted = true;
        const fetchErrorStrings = async () => {
            setIsLoadingList(true);
            try {
                const data = await fetchGetErrorModelList(dispatch);
                // Data should be an array of strings like "618112_1228199_Illustrious_MaxineDE_IL_v6"
                if (isMounted && Array.isArray(data)) {
                    setErrorList(data);
                }
            } catch (error) {
                console.error("Failed to fetch error model list:", error);
            } finally {
                if (isMounted) {
                    setIsLoadingList(false);
                }
            }
        };
        fetchErrorStrings();
        return () => { isMounted = false; };
    }, [dispatch]);

    // ----------------------------------
    // Extract versionID from "modelID_versionID_name"
    // e.g. "618112_1228199_Illustrious_MaxineDE_IL_v6"
    // ----------------------------------
    const getVersionIDFromErrorItem = (errorItem: string) => {
        const parts = errorItem.split('_');
        return parts.length < 2 ? null : parts[1];
    };

    // ----------------------------------
    // Handler: user clicks a card -> fetch model info
    // ----------------------------------
    const handleCardClick = useCallback(
        async (errorItem: string) => {
            const versionID = getVersionIDFromErrorItem(errorItem);
            if (!versionID) {
                console.warn("Could not parse versionID from:", errorItem);
                return;
            }
            if (fetchedInfos[versionID]) {
                console.log("Already fetched info for versionID:", versionID);
                return;
            }
            setLoadingVersionIDs((prev) => new Set(prev).add(versionID));

            let modelData: any = null;
            let offlineFallbackUsed = false;

            try {
                // Call the new API endpoint.
                const response = await axios.get(`https://civitai.com/api/v1/model-versions/${versionID}`);
                modelData = response.data;
            } catch (error: any) {
                if (error.response && (error.response.status === 400 || error.response.status === 404)) {
                    console.warn(`API returned ${error.response.status} for versionID: ${versionID}. Searching offlineDownloadList for fallback.`);
                    if (offlineDownloadList && offlineDownloadList.length > 0) {
                        const fallbackEntry = offlineDownloadList.find(
                            (entry: OfflineDownloadEntry) => entry.civitaiVersionID === versionID
                        );
                        if (fallbackEntry && fallbackEntry.imageUrlsArray?.length > 0) {
                            modelData = {
                                images: fallbackEntry.imageUrlsArray.map((img) =>
                                    typeof img === 'string'
                                        ? { url: img }
                                        : { url: img.url, width: img.width, height: img.height }
                                ),
                            };
                            offlineFallbackUsed = true;
                        }
                    }
                } else {
                    console.error("Error fetching model version info:", error.message);
                }
            }
            // Final fallback if modelData is still null.
            if (!modelData && offlineDownloadList && offlineDownloadList.length > 0) {
                const fallbackEntry = offlineDownloadList.find(
                    (entry: OfflineDownloadEntry) => entry.civitaiVersionID === versionID
                );
                if (fallbackEntry && fallbackEntry.imageUrlsArray?.length > 0) {
                    modelData = {
                        images: fallbackEntry.imageUrlsArray.map((img) =>
                            typeof img === 'string'
                                ? { url: img }
                                : { url: img.url, width: img.width, height: img.height }
                        ),
                    };
                    offlineFallbackUsed = true;
                }
            }
            if (!modelData) {
                console.warn("No model data available for versionID:", versionID);
                setLoadingVersionIDs((prev) => {
                    const copy = new Set(prev);
                    copy.delete(versionID);
                    return copy;
                });
                return;
            }
            const images = modelData.images || [];
            let previewImage = images[0]?.url || "";
            if (!previewImage && offlineDownloadList && offlineDownloadList.length > 0) {
                const parts = errorItem.split('_');
                if (parts.length >= 2) {
                    const modelID = parts[0];
                    const fallbackEntry = offlineDownloadList.find(
                        (entry: OfflineDownloadEntry) =>
                            entry.civitaiModelID === modelID && entry.civitaiVersionID === versionID
                    );
                    if (fallbackEntry && fallbackEntry.imageUrlsArray?.length > 0) {
                        previewImage = fallbackEntry.imageUrlsArray[0];
                    }
                }
            }
            // Update state with fetched info including our fallback flag.
            setFetchedInfos((prev) => ({
                ...prev,
                [versionID]: {
                    previewImage,
                    modelData,
                    currentImageIndex: 0,
                    usingOfflineFallback: offlineFallbackUsed,
                },
            }));
            console.log("Fetched info for versionID:", versionID, modelData);
            setLoadingVersionIDs((prev) => {
                const copy = new Set(prev);
                copy.delete(versionID);
                return copy;
            });
        },
        [dispatch, fetchedInfos, offlineDownloadList]
    );

    // ----------------------------------
    // Handler: Image Load Error -> Show next image
    // ----------------------------------
    const handleImageError = useCallback(
        (versionID: string) => {
            setFetchedInfos((prev) => {
                const info = prev[versionID];
                if (!info) return prev;
                const nextIndex = info.currentImageIndex + 1;
                if (nextIndex < (info.modelData.images?.length || 0)) {
                    return {
                        ...prev,
                        [versionID]: {
                            ...info,
                            previewImage: info.modelData.images[nextIndex].url,
                            currentImageIndex: nextIndex,
                        },
                    };
                } else {
                    return {
                        ...prev,
                        [versionID]: {
                            ...info,
                            previewImage: "",
                            currentImageIndex: nextIndex,
                        },
                    };
                }
            });
        },
        []
    );

    const handleDownload = async (modelID: string, versionID: string, modelVersionObject: any) => {
        console.log(`Download clicked for VersionID: ${versionID}`);

        const civitaiUrl = `https://civitai.com/models/${modelID}?modelVersionId=${versionID}`;
        // Find the first file whose name ends in ".safetensors"
        const civitaiFileName =
            modelVersionObject?.files?.find((file: any) => file.name.toLowerCase().endsWith(".safetensors"))?.name || "";

        const civitaiModelID = modelID;
        const civitaiVersionID = versionID;

        // Build the civitaiModelFileList from modelVersionObject.files
        const civitaiModelFileList = modelVersionObject?.files?.map((file: any) => ({
            name: file.name,
            downloadUrl: file.downloadUrl,
        })) || [];

        const offlineEntry = offlineDownloadList?.find(
            (e) => e.civitaiModelID === modelID && e.civitaiVersionID === versionID
        );
        // only treat offlineEntry.downloadFilePath as valid if offlineEntry exists
        const offlinePath =
            offlineEntry?.downloadFilePath && offlineEntry.downloadFilePath !== 'N/A'
                ? offlineEntry.downloadFilePath
                : '';

        // decide which path to actually use (we’ll wire the toggle in the UI next)
        const downloadFilePath = (!offlinePath || useModifyPath[versionID])
            ? modify_downloadFilePath
            : offlinePath;

        // **NEW**: block pending
        if (downloadFilePath === '/@scan@/ACG/Pending/') {
            alert('Invalid download path: Pending entries cannot be downloaded');
            return;
        }



        // Check for null or empty
        if (
            !civitaiUrl ||
            !civitaiFileName ||
            !civitaiModelID ||
            !civitaiVersionID ||
            !downloadFilePath ||
            !civitaiModelFileList.length
        ) {
            alert("Some required data is missing. Please check the model information and try again.");
            return;
        }

        // Decide whether to add record & bookmark based on our checkbox state
        // If the key doesn't exist, default to true
        const doAddRecordAndBookmark = shouldAddRecordAndBookmark[versionID] ?? true;

        // Debug log for model object
        console.log({
            downloadFilePath,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl,
            modify_selectedCategory,
            doAddRecordAndBookmark
        });

        const modelObject = {
            downloadFilePath,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl,
        };

        // Simulating the fetch operation and Chrome browser download logic
        try {
            if (downloadMethod === "server") {
                // Perform your actual download
                const isDownloadSuccessful = await fetchDownloadFilesByServer_v2(
                    {
                        civitaiUrl,
                        civitaiFileName,
                        civitaiModelID,
                        civitaiVersionID,
                        downloadFilePath,
                        civitaiModelFileList
                    },
                    dispatch
                );

                // If download is successful, do the DB insert and bookmark
                if (isDownloadSuccessful && doAddRecordAndBookmark) {
                    await fetchAddRecordToDatabase(modify_selectedCategory, civitaiUrl, downloadFilePath, dispatch);
                    bookmarkThisUrl(
                        modelVersionObject?.model?.type ?? "N/A",
                        civitaiUrl,
                        `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                    );
                }
            } else {
                const data = await fetchCivitaiModelInfoFromCivitaiByVersionID(civitaiVersionID, dispatch);
                if (data) {
                    // callChromeBrowserDownload_v2({ ...modelObject, modelVersionObject: data });
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        // Store the original tab ID in local storage
                        // chrome.storage.local.set({ originalTabId: tabs[0].id });
                        // Then open the new window
                        chrome.runtime.sendMessage({ action: "browser-download_v2_background", data: { ...modelObject, modelVersionObject: data } });
                        //window.close(); // This closes the popup window
                    });
                } else {
                    throw new Error("Failed to fetch model information");
                }

                if (doAddRecordAndBookmark) {
                    await fetchAddRecordToDatabase(modify_selectedCategory, civitaiUrl, downloadFilePath, dispatch);
                    bookmarkThisUrl(
                        modelVersionObject?.model?.type ?? "N/A",
                        civitaiUrl,
                        `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                    );
                }
            }
            console.log("Model download initiated.");
        } catch (error) {
            console.error("Error during download:", error);
            alert("Failed to initiate download. Please try again.");
        }
    }

    const handleRemoveBoth = useCallback(async (modelID: string, versionID: string) => {
        const userConfirmed = window.confirm("Are you sure you want to remove both error and offline download entries for this model?");
        if (!userConfirmed) {
            console.log("User canceled the removal operation.");
            return;
        }

        console.log(`Remove Both clicked for VersionID: ${versionID}`);

        // Prepare the model object (same as Delete)
        const modelObject = {
            civitaiModelID: modelID,
            civitaiVersionID: versionID,
        };

        try {
            // Remove from the error model list first
            await fetchRemoveFromErrorModelList(modelObject, dispatch);
            // Then remove from the offline download list
            await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(modelObject, dispatch);

            // Upon successful deletion, update the UI: remove the error item from errorList
            setErrorList((prev) =>
                prev.filter((item) => {
                    const parts = item.split('_');
                    return !(parts[0] === modelID && parts[1] === versionID);
                })
            );

            // Also remove from fetchedInfos
            setFetchedInfos((prev) => {
                const newFetched = { ...prev };
                delete newFetched[versionID];
                return newFetched;
            });

            console.log(`Successfully removed both entries for VersionID: ${versionID}`);
            // Call the refresh handler to update the list
            handleRefreshList && handleRefreshList();

        } catch (error: any) {
            console.error(`Failed to remove both entries for VersionID: ${versionID}:`, error.message);
            // Optionally, you can show a user-facing error notification here
        }
    }, [dispatch]);


    const handleDelete = useCallback(async (modelID: string, versionID: string) => {

        const userConfirmed = window.confirm("Are you sure you want to delete this error model?");
        if (!userConfirmed) {
            console.log("User canceled the removal operation.");
            return; // Exit the function if the user cancels
        }

        console.log(`Delete clicked for VersionID: ${versionID}`);

        try {
            // Prepare the modelObject
            const modelObject = {
                civitaiModelID: modelID,
                civitaiVersionID: versionID,
            };

            // Call the API to remove the model from the error list
            await fetchRemoveFromErrorModelList(modelObject, dispatch);

            // Upon successful deletion, remove the errorItem from errorList
            setErrorList((prev) => prev.filter(item => {
                const parts = item.split('_');
                return !(parts[0] === modelID && parts[1] === versionID);
            }));

            // Also remove from fetchedInfos
            setFetchedInfos((prev) => {
                const newFetched = { ...prev };
                delete newFetched[versionID];
                return newFetched;
            });

            console.log(`Successfully deleted VersionID: ${versionID}`);
        } catch (error: any) {
            console.error(`Failed to delete VersionID: ${versionID}:`, error.message);
            // Optionally, implement user-facing error notifications here
        }
    }, [dispatch]);

    // --------------- RENDER ---------------
    if (isLoadingList) {
        return (
            <div style={{ textAlign: 'center', marginTop: '20px', color: isDarkMode ? '#fff' : '#000' }}>
                <Spinner animation="border" role="status" />
                <p>Loading error list...</p>
            </div>
        );
    }
    if (!errorList || errorList.length === 0) {
        return (
            <div style={{ color: isDarkMode ? '#fff' : '#000', textAlign: 'center' }}>
                No error models found.
            </div>
        );
    }

    return (
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {errorList.map((errorItem, index) => {
                    const versionID = getVersionIDFromErrorItem(errorItem) || "unknown";
                    const fetched = fetchedInfos[versionID];
                    const isCardLoading = loadingVersionIDs.has(versionID);
                    const previewImage = fetched?.previewImage || "";
                    const parts = errorItem.split('_');
                    const modelID = parts[0] || "unknown";
                    const restName = parts.slice(2).join('_');
                    const baseModel = fetched?.modelData?.baseModel || "N/A";
                    const earlyAccessEndsAt = fetched?.modelData?.earlyAccessEndsAt || null;
                    const isChecked = shouldAddRecordAndBookmark[versionID] ?? true;

                    return (
                        <div
                            key={index}
                            style={{
                                width: '280px',
                                border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                borderRadius: '6px',
                                backgroundColor: isDarkMode ? '#333' : '#fff',
                                color: isDarkMode ? '#fff' : '#000',
                                boxShadow: isDarkMode ? '2px 2px 8px rgba(255,255,255,0.1)' : '2px 2px 8px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                padding: '10px',
                                position: 'relative',
                            }}
                            onClick={() => handleCardClick(errorItem)}
                        >
                            {fetched && baseModel !== "N/A" && (
                                <Badge
                                    bg="primary"
                                    style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '0.75rem' }}
                                >
                                    {baseModel}
                                </Badge>
                            )}
                            {fetched && earlyAccessEndsAt && (
                                <Badge
                                    bg="warning"
                                    text="dark"
                                    style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.75rem' }}
                                >
                                    {new Date(earlyAccessEndsAt).toLocaleDateString()}
                                </Badge>
                            )}
                            {previewImage ? (
                                <img
                                    src={previewImage}
                                    alt="preview"
                                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }}
                                    onError={() => handleImageError(versionID)}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '200px',
                                        backgroundColor: isDarkMode ? '#555' : '#ddd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                    }}
                                >
                                    {isCardLoading ? <Spinner animation="border" role="status" /> : <span>No preview yet (click to fetch)</span>}
                                </div>
                            )}

                            {/* Fallback warning text */}
                            {fetched?.usingOfflineFallback && (
                                <div style={{ textAlign: 'center', color: 'red', fontSize: '0.8rem', marginTop: '5px' }}>
                                    Fetch failed – loaded from offline list
                                </div>
                            )}

                            <div style={{ marginTop: '10px', fontSize: '0.9rem', lineHeight: 1.3 }}>
                                <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                                    {restName || errorItem}
                                </div>
                                <div>ModelID: {modelID}</div>
                                <div>VersionID: {versionID}</div>
                                <p style={{ margin: '4px 0' }}>
                                    <strong>URL:</strong>{' '}
                                    <a
                                        href={`https://civitai.com/models/${modelID}?modelVersionId=${versionID}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: isDarkMode ? '#1e90ff' : '#007bff' }}
                                    >
                                        Visit Model
                                    </a>
                                </p>

                                {(() => {
                                    const entry = offlineDownloadList?.find(
                                        e => e.civitaiModelID === modelID && e.civitaiVersionID === versionID
                                    );
                                    const offlinePath = entry?.downloadFilePath && entry.downloadFilePath !== 'N/A'
                                        ? entry.downloadFilePath
                                        : '';
                                    const isUsingModify = useModifyPath[versionID];
                                    const displayPath = (!offlinePath || isUsingModify)
                                        ? modify_downloadFilePath
                                        : offlinePath;

                                    return (
                                        <p style={{ margin: '4px 0', fontStyle: 'italic', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                                            <strong>Download Path:</strong>
                                            <span onClick={(e) => (e.stopPropagation(), void navigator.clipboard.writeText(displayPath))} style={{ cursor: 'copy' }}>{displayPath}</span>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUseModifyPath(prev => ({
                                                        ...prev,
                                                        [versionID]: !prev[versionID]
                                                    }));
                                                }}
                                                style={{ cursor: 'pointer', marginLeft: '6px' }}
                                                title="Click to toggle between offline and modify paths"
                                            >
                                                {useModifyPath[versionID]
                                                    ? <MdOutlineFontDownload />
                                                    : <MdFontDownload />
                                                }
                                            </span>

                                        </p>
                                    );
                                })()}


                            </div>

                            {/* Group download, delete and remove buttons on the same line */}
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                {fetched && (
                                    <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip">{`Download By ${downloadMethod === "server" ? "server" : "browser"}`}</Tooltip>}>
                                        <Dropdown as={ButtonGroup}>
                                            <Button variant="success" onClick={() => handleDownload(modelID, versionID, fetched?.modelData)}>
                                                {downloadMethod === "server" ? <BsCloudDownloadFill /> : <FcDownload />}
                                            </Button>
                                            <Dropdown.Toggle split variant="success" id="dropdown-split-basic" />
                                            <Dropdown.Menu>
                                                <Dropdown.Item active={downloadMethod === "server"} onClick={() => setDownloadMethod("server")}>
                                                    server
                                                </Dropdown.Item>
                                                <Dropdown.Item active={downloadMethod === "browser"} onClick={() => setDownloadMethod("browser")}>
                                                    browser
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </OverlayTrigger>
                                )}
                                {fetched && (
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={
                                            <Tooltip id={`tooltip-add-${versionID}`}>
                                                Add record to database and bookmark it
                                            </Tooltip>
                                        }
                                    >
                                        <Form.Check
                                            type="checkbox"
                                            id={`addRecordBookmark-${versionID}`}
                                            label={<IoLibrary size={16} />}
                                            checked={isChecked}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleCheckboxChange(versionID, e.target.checked);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </OverlayTrigger>
                                )}

                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(modelID, versionID); }}>
                                        Delete
                                    </Button>
                                    <Button variant="warning" size="sm" onClick={(e) => { e.stopPropagation(); handleRemoveBoth(modelID, versionID); }}>
                                        Remove Both
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default ErrorCardMode;