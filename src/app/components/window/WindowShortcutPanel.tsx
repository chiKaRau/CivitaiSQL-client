import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import WindowUpdateModelPanel from './WindowUpdateModelPanel';
import { fetchAddOfflineDownloadFileIntoOfflineDownloadList, fetchBackupOfflineDownloadList, fetchCivitaiModelInfoFromCivitaiByModelID, fetchFindVersionNumbersForModel, fetchFindVersionNumbersForOfflineDownloadList, fetchGetOfflineRecordByModelAndVersion, fetchRemoveOfflineDownloadFileIntoOfflineDownloadList } from '../../api/civitaiSQL_api';
import { useDispatch } from 'react-redux';
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { BsDatabaseFillExclamation } from "react-icons/bs";
import { GoChecklist } from "react-icons/go";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { PiListDashesFill } from "react-icons/pi";
// top of file (with the other icon imports)
import { MdDeleteSweep, MdFirstPage, MdLastPage } from "react-icons/md";

import { IoIosRefresh } from "react-icons/io";
import { MdAddCircle, MdLibraryAdd, MdRemove } from "react-icons/md";
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from '../../utils/objectUtils';


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

const ui = {
    panel: {
        position: 'relative' as const,
        padding: '8px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.04)',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap' as const,
    },
    grow: { flex: '1 1 auto' },
    group: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap' as const,
    },
    divider: {
        width: '100%',
        height: '1px',
        background: 'rgba(255,255,255,0.10)',
        margin: '8px 0',
    },
    label: {
        opacity: 0.9,
        fontSize: '12px',
        whiteSpace: 'nowrap' as const,
    },
    select: {
        padding: '6px 8px',
        fontSize: '13px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(0,0,0,0.25)',
        color: 'inherit',
        maxWidth: '520px',
    },
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '999px',
        fontSize: '12px',
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(0,0,0,0.18)',
        whiteSpace: 'nowrap' as const,
    },
    pillBlue: {
        border: '1px solid rgba(80,140,255,0.45)',
        background: 'rgba(80,140,255,0.12)',
    },
    pillRed: {
        border: '1px solid rgba(255,80,80,0.45)',
        background: 'rgba(255,80,80,0.12)',
    },
};

const IconBtn: React.FC<{
    title: string;
    ariaLabel: string;
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}> = ({ title, ariaLabel, onClick, disabled, children }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={ariaLabel}
            style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                lineHeight: 0,
            }}
        >
            <span style={{ fontSize: 18, display: 'inline-flex' }}>{children}</span>
        </button>
    );
};


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

    const offlineIdsInThisModel = useMemo(() => {
        if (!modelData) return [];
        const ids = modelData.modelVersions.map(v => v.id.toString());
        return ids.filter(id => existingOfflineVersions.includes(id));
    }, [modelData, existingOfflineVersions]);

    const handleRemoveAllFromOfflineList = async () => {
        if (!modelData) return;

        if (offlineIdsInThisModel.length === 0) {
            alert("No versions from this model are in the Offline List.");
            return;
        }

        const userConfirmed = window.confirm(
            `Remove ${offlineIdsInThisModel.length} version(s) from the Offline List for model ${modelId}?`
        );
        if (!userConfirmed) return;

        setIsLoading(true);
        try {
            // remove sequentially to be polite with the backend
            for (const civitaiVersionID of offlineIdsInThisModel) {
                await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                    { civitaiModelID: modelId, civitaiVersionID },
                    dispatch
                );
            }

            // Optimistically update badges so ^ disappears immediately
            setExistingOfflineVersions(prev =>
                prev.filter(id => !offlineIdsInThisModel.includes(id))
            );

            setMessage({ text: `${offlineIdsInThisModel.length} item(s) removed from Offline List.`, type: 'success' });
        } catch (error: any) {
            console.error("Bulk remove failed:", error?.message || error);
            setMessage({ text: 'Failed to remove some entries. Check console for details.', type: 'error' });
        } finally {
            setSelectedUrl("");
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

        // const isBackupSuccessful = await fetchBackupOfflineDownloadList(dispatch);
        // if (!isBackupSuccessful) {
        //     alert("Backup failed. Cannot proceed with the download.");
        //     return;
        // }

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

    const shouldShowReplaceButtons = useMemo(() => {
        return !!modelData && offlineIdsInThisModel.length === 1;
    }, [modelData, offlineIdsInThisModel]);

    const getFirstVersionId = () => {
        return modelData?.modelVersions?.[0]?.id?.toString() ?? "";
    };

    const getMaxVersionId = () => {
        if (!modelData?.modelVersions?.length) return "";
        const maxId = Math.max(...modelData.modelVersions.map(v => Number(v.id)));
        return maxId.toString();
    };

    const handleReplaceOfflineVersion = async (targetVersionId: string, label: string) => {
        if (!modelData) return;
        if (offlineIdsInThisModel.length !== 1) return;

        const oldVersionId = offlineIdsInThisModel[0]; // the only offline version in this model
        if (!oldVersionId) return;

        if (!targetVersionId || targetVersionId === oldVersionId) {
            alert(`No need to replace. Target is the same as current offline version (${oldVersionId}).`);
            return;
        }

        const userConfirmed = window.confirm(
            `Replace Offline List entry for model ${modelId}:\n\n` +
            `FROM version ${oldVersionId}\nTO   version ${targetVersionId} (${label})\n\nContinue?`
        );
        if (!userConfirmed) return;

        setIsLoading(true);
        try {
            // 1) read old offline record to reuse downloadFilePath + selectedCategory (+ hold/downloadPriority)
            const offlineRecord = await fetchGetOfflineRecordByModelAndVersion(modelId, oldVersionId, dispatch);
            if (!offlineRecord) {
                setMessage({ text: `Offline record not found for ${modelId}_${oldVersionId}`, type: 'error' });
                return;
            }

            const downloadFilePath = offlineRecord.downloadFilePath;
            const selectedCategory = offlineRecord.selectedCategory;
            const hold = !!offlineRecord.hold;
            const downloadPriority = offlineRecord.downloadPriority ?? 10;

            // 2) get civitai model info (you requested to call this)
            const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);
            if (!data) {
                setMessage({ text: `Failed to fetch civitai model info for model ${modelId}`, type: 'error' });
                return;
            }

            // 3) build new object for target version
            const civitaiUrl = `https://civitai.com/models/${modelId}?modelVersionId=${targetVersionId}`;
            const civitaiVersionID = targetVersionId;     // replacing version
            const civitaiModelID = modelId;               // model stays same

            const civitaiFileName = retrieveCivitaiFileName(data, civitaiVersionID);
            const civitaiModelFileList = retrieveCivitaiFilesList(data, civitaiVersionID);
            const civitaiTags = data?.tags;

            // Validate (same rules you already use)
            if (
                !civitaiUrl ||
                !civitaiFileName ||
                !civitaiModelID ||
                !civitaiVersionID ||
                !downloadFilePath ||
                !selectedCategory ||
                !civitaiModelFileList ||
                !civitaiModelFileList.length ||
                civitaiTags == null
            ) {
                console.log("fail in handleReplaceOfflineVersion()");
                setMessage({ text: 'Replace failed: missing required fields (see console).', type: 'error' });
                return;
            }

            const modelObject = {
                downloadFilePath,
                civitaiFileName,
                civitaiModelID,
                civitaiVersionID,
                civitaiModelFileList,
                civitaiUrl,
                selectedCategory,
                civitaiTags,
                hold,
                downloadPriority,
            };

            // 4) SAFER order: add new first, then remove old
            await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, false, dispatch);

            await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                { civitaiModelID: modelId, civitaiVersionID: oldVersionId },
                dispatch
            );

            // 5) update UI badges
            setExistingOfflineVersions(prev => {
                const next = prev.filter(id => id !== oldVersionId);
                if (!next.includes(targetVersionId)) next.push(targetVersionId);
                return next;
            });

            // optionally switch dropdown selection to the new version
            const targetV = modelData.modelVersions.find(v => v.id.toString() === targetVersionId) || null;
            setSelectedVersion(targetV);

            setSelectedUrl("");
            setMessage({ text: `Replaced Offline entry: ${oldVersionId} → ${targetVersionId}`, type: 'success' });
        } catch (error: any) {
            console.error("Replace offline version failed:", error?.message || error);
            setMessage({ text: 'Replace failed (see console).', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div style={ui.panel}>
            {isLoading ? (
                <p style={{ margin: 0 }}>Loading...</p>
            ) : modelData ? (
                <>
                    {/* Row 1: Refresh + Dropdown + Add actions */}
                    <div style={ui.row}>
                        <IconBtn
                            title="Refresh model info"
                            ariaLabel="Refresh model info"
                            onClick={forceRerender}
                            disabled={isLoading}
                        >
                            <IoIosRefresh />
                        </IconBtn>

                        {/* Dropdown + hover carousel */}
                        <div
                            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onMouseEnter={() => setShowCarousel(true)}
                            onMouseLeave={() => setShowCarousel(false)}
                        >
                            <span style={ui.label}>{modelId}_</span>

                            <select
                                id="versionDropdown"
                                onChange={(e) => handleVersionChange(Number(e.target.value))}
                                value={selectedVersion?.id || ''}
                                style={ui.select}
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


                            {/* Safer carousel overlay */}
                            {showCarousel && selectedVersion && selectedVersion.images.length > 0 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '110%',
                                        left: 0,
                                        padding: '6px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'rgba(15,15,15,0.92)', // looks good in dark mode
                                        boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                                        zIndex: 9999,
                                    }}
                                >
                                    <Carousel images={selectedVersion.images.map((image) => image.url)} />
                                </div>
                            )}
                        </div>

                        <div style={ui.group}>
                            <IconBtn
                                title="Add selected version to list"
                                ariaLabel="Add selected version"
                                onClick={handleAdd}
                                disabled={!selectedVersion || isLoading}
                            >
                                <MdAddCircle />
                            </IconBtn>

                            <IconBtn
                                title="Add all versions to list"
                                ariaLabel="Add all versions"
                                onClick={handleAddAll}
                                disabled={!modelData?.modelVersions?.length || isLoading}
                            >
                                <MdLibraryAdd />
                            </IconBtn>

                            <IconBtn
                                title="Clear selectedUrl"
                                ariaLabel="Clear selectedUrl"
                                onClick={() => setSelectedUrl("")}
                                disabled={isLoading}
                            >
                                <MdRemove />
                            </IconBtn>
                        </div>

                        {/* Spacer pushes right-side group to next line nicely when narrow */}
                        <div style={ui.grow} />
                    </div>

                    <div style={ui.divider} />

                    {/* Row 2: Status + Offline actions */}
                    <div style={ui.row}>
                        {/* Status pills (don’t overflow like big icons) */}
                        <div style={ui.group}>
                            {selectedVersion && existingVersions.includes(selectedVersion.id.toString()) && (
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip id="tooltip-db">This version already exists in the database.</Tooltip>}
                                >
                                    <span style={{ ...ui.pill, ...ui.pillBlue, cursor: 'default' }}>
                                        <BsDatabaseFillExclamation style={{ fontSize: 16 }} />
                                        In DB
                                    </span>
                                </OverlayTrigger>
                            )}

                            {selectedVersion && existingOfflineVersions.includes(selectedVersion.id.toString()) && (
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip id="tooltip-off">This version already exists in the Offline List. Click to remove it.</Tooltip>}
                                >
                                    <span
                                        style={{ ...ui.pill, ...ui.pillBlue, cursor: 'pointer' }}
                                        onClick={() => handleRemovefromOfflineList(modelId, selectedVersion?.id?.toString() || '')}
                                    >
                                        <PiListDashesFill style={{ fontSize: 16 }} />
                                        In Offline
                                    </span>
                                </OverlayTrigger>
                            )}

                            {message && message.type === 'error' && (
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip id="tooltip-dup">This URL is already in the checkbox list.</Tooltip>}
                                >
                                    <span style={{ ...ui.pill, ...ui.pillRed }}>
                                        <GoChecklist style={{ fontSize: 16 }} />
                                        Duplicate URL
                                    </span>
                                </OverlayTrigger>
                            )}
                        </div>

                        <div style={ui.grow} />

                        {/* Offline action buttons grouped, consistent sizing */}
                        <div style={ui.group}>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id="tooltip-remove-all">Remove all versions of this model from Offline List</Tooltip>}
                            >
                                <span>
                                    <IconBtn
                                        title="Remove all offline versions for this model"
                                        ariaLabel="Remove all offline versions for this model"
                                        onClick={handleRemoveAllFromOfflineList}
                                        disabled={offlineIdsInThisModel.length === 0 || isLoading}
                                    >
                                        <MdDeleteSweep />
                                    </IconBtn>
                                </span>
                            </OverlayTrigger>

                            {shouldShowReplaceButtons && (
                                <>
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip id="tooltip-replace-first">Replace Offline version with FIRST version</Tooltip>}
                                    >
                                        <span>
                                            <IconBtn
                                                title="Replace with first version"
                                                ariaLabel="Replace with first version"
                                                onClick={() => handleReplaceOfflineVersion(getFirstVersionId(), "first")}
                                                disabled={isLoading}
                                            >
                                                <MdFirstPage />
                                            </IconBtn>
                                        </span>
                                    </OverlayTrigger>

                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip id="tooltip-replace-max">Replace Offline version with HIGHEST version ID</Tooltip>}
                                    >
                                        <span>
                                            <IconBtn
                                                title="Replace with highest version"
                                                ariaLabel="Replace with highest version"
                                                onClick={() => handleReplaceOfflineVersion(getMaxVersionId(), "highest")}
                                                disabled={isLoading}
                                            >
                                                <MdLastPage />
                                            </IconBtn>
                                        </span>
                                    </OverlayTrigger>
                                </>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <p style={{ margin: 0 }}>No data available.</p>
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