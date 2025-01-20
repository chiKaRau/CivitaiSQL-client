// ErrorCardMode.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Spinner, Button, Badge, ButtonGroup, Tooltip, Dropdown, OverlayTrigger } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchGetErrorModelList,
    fetchCivitaiModelInfoFromCivitaiByVersionID,
    fetchRemoveFromErrorModelList,
    fetchAddRecordToDatabase,
    fetchDownloadFilesByServer_v2,
} from '../../api/civitaiSQL_api';
import { bookmarkThisUrl, callChromeBrowserDownload_v2 } from '../../utils/chromeUtils';
import { AppState } from '../../store/configureStore';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import CategoriesListSelector from '../CategoriesListSelector';
import { BsCloudDownloadFill } from 'react-icons/bs';
import { FcDownload } from 'react-icons/fc';

interface ErrorCardModeProps {
    isDarkMode: boolean;
    modify_downloadFilePath: string;
    modify_selectedCategory: string;
}

interface FetchedModelInfo {
    previewImage: string;
    modelData: any; // Replace with a more precise type if available
    currentImageIndex: number;
}

const ErrorCardMode: React.FC<ErrorCardModeProps> = ({ isDarkMode, modify_downloadFilePath, modify_selectedCategory }) => {
    const dispatch = useDispatch();

    // 1) The raw list of error strings from your server
    const [errorList, setErrorList] = useState<string[]>([]);

    // 2) Local loading flag for fetching the error list initially
    const [isLoadingList, setIsLoadingList] = useState<boolean>(false);

    // 3) A dictionary of `versionID -> FetchedModelInfo` so we only fetch once per versionID
    const [fetchedInfos, setFetchedInfos] = useState<Record<string, FetchedModelInfo>>({});

    // 4) If you want a loading state *per card*, keep track in a local set
    const [loadingVersionIDs, setLoadingVersionIDs] = useState<Set<string>>(new Set());

    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    const [downloadMethod, setDownloadMethod] = useState("browser")



    // ----------------------------------
    // Fetch error list ONCE when mounted
    // ----------------------------------
    useEffect(() => {
        let isMounted = true;

        const fetchErrorStrings = async () => {
            setIsLoadingList(true);
            try {
                const data = await fetchGetErrorModelList(dispatch);
                // data should be an array of strings like "618112_1228199_Illustrious_MaxineDE_IL_v6"
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

        return () => {
            isMounted = false;
        };
    }, [dispatch]);

    // ----------------------------------
    // Extract versionID from "modelID_versionID_name"
    // e.g. "618112_1228199_Illustrious_MaxineDE_IL_v6"
    // versionID is the 2nd part if we do .split('_')
    // ----------------------------------
    const getVersionIDFromErrorItem = (errorItem: string) => {
        // e.g. "618112_1228199_Illustrious_MaxineDE_IL_v6"
        const parts = errorItem.split('_');
        if (parts.length < 2) return null;
        return parts[1]; // the second part is versionID
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

            // If we've already fetched this versionID, don't fetch again
            if (fetchedInfos[versionID]) {
                console.log("Already fetched info for versionID:", versionID);
                return;
            }

            try {
                // Indicate loading for this particular versionID
                setLoadingVersionIDs((prev) => new Set(prev).add(versionID));

                // Call your API function
                const modelData = await fetchCivitaiModelInfoFromCivitaiByVersionID(versionID, dispatch);

                // Since modelData is directly the model, use it directly
                if (modelData) {
                    const images = modelData.images || [];
                    const previewImage = images[0]?.url || "";

                    setFetchedInfos((prev) => ({
                        ...prev,
                        [versionID]: {
                            previewImage,
                            modelData: modelData, // Directly using modelData
                            currentImageIndex: 0,
                        },
                    }));

                    console.log("Fetched info for versionID:", versionID, modelData);
                } else {
                    console.warn("No valid model info returned for versionID:", versionID);
                }
            } catch (error) {
                console.error("Error fetching model info for versionID:", versionID, error);
            } finally {
                // Remove from loadingVersionIDs
                setLoadingVersionIDs((prev) => {
                    const copy = new Set(prev);
                    copy.delete(versionID);
                    return copy;
                });
            }
        },
        [dispatch, fetchedInfos]
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
                    // No more images to show; you might set a default placeholder
                    return {
                        ...prev,
                        [versionID]: {
                            ...info,
                            previewImage: "", // Could set to a default image URL if desired
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

        // Example of modifying the download file path - customize as needed
        const downloadFilePath = modify_downloadFilePath;

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

        // Debug log for model object
        console.log({
            downloadFilePath,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl,
            modify_selectedCategory
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
                if (isDownloadSuccessful) {
                    await fetchAddRecordToDatabase(modify_selectedCategory, civitaiUrl, dispatch);
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
                await fetchAddRecordToDatabase(modify_selectedCategory, civitaiUrl, dispatch);
                bookmarkThisUrl(
                    modelVersionObject?.model?.type ?? "N/A",
                    civitaiUrl,
                    `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                );
            }
            console.log("Model download initiated.");
        } catch (error) {
            console.error("Error during download:", error);
            alert("Failed to initiate download. Please try again.");
        }
    }

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

    // ---------------
    // RENDER
    // ---------------
    if (isLoadingList) {
        // Still fetching the error list
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
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '20px',
                    justifyContent: 'center',
                }}
            >
                {errorList.map((errorItem, index) => {
                    const versionID = getVersionIDFromErrorItem(errorItem) || "unknown";
                    const fetched = fetchedInfos[versionID];
                    const isCardLoading = loadingVersionIDs.has(versionID);

                    // If we have fetched info, show the current preview image
                    const previewImage = fetched?.previewImage || "";

                    // Parse out the modelID and name from the item just for display
                    // e.g. "618112_1228199_Illustrious_MaxineDE_IL_v6"
                    const parts = errorItem.split('_');
                    const modelID = parts[0] || "unknown";
                    const restName = parts.slice(2).join('_'); // everything after versionID

                    // Extract baseModel and earlyAccessEndsAt if available
                    const baseModel = fetched?.modelData?.baseModel || "N/A";
                    const earlyAccessEndsAt = fetched?.modelData?.earlyAccessEndsAt || null;

                    return (
                        <div
                            key={index}
                            style={{
                                width: '280px',
                                border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                borderRadius: '6px',
                                backgroundColor: isDarkMode ? '#333' : '#fff',
                                color: isDarkMode ? '#fff' : '#000',
                                boxShadow: isDarkMode
                                    ? '2px 2px 8px rgba(255,255,255,0.1)'
                                    : '2px 2px 8px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                padding: '10px',
                                position: 'relative',
                            }}
                            // Click card to fetch info (if not fetched yet)
                            onClick={() => handleCardClick(errorItem)}
                        >
                            {/* BaseModel Badge on Top-Left */}
                            {fetched && baseModel !== "N/A" && (
                                <Badge
                                    bg="primary"
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '10px',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    {baseModel}
                                </Badge>
                            )}

                            {/* Early Access Badge on Top-Right */}
                            {fetched && earlyAccessEndsAt && (
                                <Badge
                                    bg="warning"
                                    text="dark"
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    {new Date(earlyAccessEndsAt).toLocaleDateString()}
                                </Badge>
                            )}

                            {/* If no preview yet, show a placeholder, else show the image */}
                            {previewImage ? (
                                <img
                                    src={previewImage}
                                    alt="preview"
                                    style={{
                                        width: '100%',
                                        maxHeight: '200px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                    }}
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
                                    {isCardLoading ? (
                                        <Spinner animation="border" role="status" />
                                    ) : (
                                        <span>No preview yet (click to fetch)</span>
                                    )}
                                </div>
                            )}

                            <div style={{ marginTop: '10px', fontSize: '0.9rem', lineHeight: 1.3 }}>
                                <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                                    {restName || errorItem}
                                </div>
                                <div>ModelID: {modelID}</div>
                                <div>VersionID: {versionID}</div>
                            </div>

                            {/* Download and Delete Buttons */}

                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                {/* {fetched && (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent triggering card click
                                            handleDownload(modelID, versionID, fetched?.modelData);
                                        }}
                                    >
                                        Download
                                    </Button>
                                )} */}

                                {fetched && (
                                    <OverlayTrigger placement={"top"}
                                        overlay={<Tooltip id="tooltip">{`Download By ${downloadMethod === "server" ? "server" : "browser"}`}</Tooltip>}>
                                        <Dropdown as={ButtonGroup}>
                                            <Button variant="success"
                                                onClick={() => handleDownload(modelID, versionID, fetched?.modelData)} >
                                                {downloadMethod === "server" ? <BsCloudDownloadFill /> : <FcDownload />}
                                            </Button>
                                            <Dropdown.Toggle split variant="success" id="dropdown-split-basic" />
                                            <Dropdown.Menu>
                                                <Dropdown.Item
                                                    active={downloadMethod === "server"}
                                                    onClick={() => setDownloadMethod("server")} >
                                                    server
                                                </Dropdown.Item>
                                                <Dropdown.Item
                                                    active={downloadMethod === "browser"}
                                                    onClick={() => setDownloadMethod("browser")} >
                                                    browser
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </OverlayTrigger>
                                )}

                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent triggering card click
                                        handleDelete(modelID, versionID);
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>

                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default ErrorCardMode;
