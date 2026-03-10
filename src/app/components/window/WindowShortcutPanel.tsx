import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import WindowUpdateModelPanel from './WindowUpdateModelPanel';
import { fetchAddOfflineDownloadFileIntoOfflineDownloadList, fetchBackupOfflineDownloadList, fetchCivitaiModelInfoFromCivitaiByModelID, fetchFindVersionNumbersForModel, fetchFindVersionNumbersForOfflineDownloadList, fetchGetOfflineRecordByModelAndVersion, fetchRemoveOfflineDownloadFileIntoOfflineDownloadList } from '../../api/civitaiSQL_api';
import { useDispatch } from 'react-redux';
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { BsDatabaseFillExclamation } from "react-icons/bs";
import { GoChecklist } from "react-icons/go";
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
    setUrlList: (updater: (prevUrlList: string[]) => string[]) => void;
    urlList: string[];
    setUrlImgSrcMap?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setUrlVersionIdMap?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setModelPrimaryVersionIdMap?: React.Dispatch<
        React.SetStateAction<Record<string, string>>
    >;
    setUrlBadgeMap?: React.Dispatch<React.SetStateAction<Record<string, string>>>;

    lockedUrl: string;
    setLockedUrl: React.Dispatch<React.SetStateAction<string>>;
    neighborCount: number;
    setNeighborCount: React.Dispatch<React.SetStateAction<number>>;
    handleAddAroundLocked: (direction: "prev" | "next") => void;
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


const WindowShortcutPanel: React.FC<PanelProps> = ({
    url,
    urlList,
    setUrlList,
    setSelectedUrl,
    setUrlImgSrcMap,
    setUrlVersionIdMap,
    setModelPrimaryVersionIdMap,
    setUrlBadgeMap,
    lockedUrl,
    setLockedUrl,
    neighborCount,
    setNeighborCount,
    handleAddAroundLocked
}) => {

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

    const isLocked = lockedUrl === url;

    // Extract modelId from the URL
    const modelId = url.match(/\/models\/(\d+)/)?.[1] || '';

    const [isUpdatePanelVisible, setIsUpdatePanelVisible] = useState(false);

    // Fetch model info when the component is mounted or `renderKey` changes
    useEffect(() => {
        fetchModelInfo();
    }, [renderKey]); // Add renderKey as a dependency

    const computeBadgeForVid = (vid: string) => {
        const star = existingVersions.includes(vid) ? " *" : "";
        const caret = existingOfflineVersions.includes(vid) ? " ^" : "";
        return `${star}${caret}`;
    };

    // Fetch the model information
    const fetchModelInfo = async () => {
        setIsLoading(true);
        try {
            console.log("test-fetchModelInfo");
            const response = await axios.post(`https://civitai.com/api/v1/models/${modelId}`);
            const data = response.data;

            // --- Backfill URLGrid display + thumbnails using THIS ONE API CALL ---
            try {
                const firstVersionId = data?.modelVersions?.[0]?.id ? String(data.modelVersions[0].id) : "";

                if (firstVersionId && setModelPrimaryVersionIdMap) {
                    setModelPrimaryVersionIdMap(prev => ({
                        ...prev,
                        [String(modelId)]: firstVersionId
                    }));
                }

                const firstImg = data?.modelVersions?.[0]?.images?.[0]?.url || "";

                const urlHasParam = new URL(url).searchParams.has("modelVersionId");

                // 1) If the selected URL is the "plain" one, store its versionId so URLGrid can display it
                if (!urlHasParam && firstVersionId && setUrlVersionIdMap) {
                    setUrlVersionIdMap(prev => ({ ...prev, [url]: firstVersionId }));
                }

                // 2) Fill image map for any URLs from this model that are in urlList but missing images
                if (setUrlImgSrcMap) {
                    setUrlImgSrcMap(prev => {
                        const next = { ...prev };

                        // helper to build the version URL format your panel uses
                        const makeUrl = (vid: string) => `https://civitai.com/models/${modelId}?modelVersionId=${vid}`;

                        for (const v of data.modelVersions || []) {
                            const vid = String(v.id);
                            const img = v?.images?.[0]?.url || "";
                            if (!img) continue;

                            // the "plain" url represents first version when it has no param
                            const candidateUrl =
                                !urlHasParam && vid === firstVersionId ? url : makeUrl(vid);

                            // only fill if it exists in the current list AND missing in map
                            if (urlList.includes(candidateUrl) && !next[candidateUrl]) {
                                next[candidateUrl] = img;
                            }
                        }

                        // also fill plain-url image if missing
                        if (!urlHasParam && firstImg && urlList.includes(url) && !next[url]) {
                            next[url] = firstImg;
                        }

                        return next;
                    });
                }
            } catch {
                // ignore
            }
            // --- end backfill ---

            console.log(response);

            setModelData(data);
            const firstVersion = data?.modelVersions?.[0] || null;
            setSelectedVersion(firstVersion); // Select the first version by default

            const imagesArray = (response?.data?.modelVersions || []).map((version: any) => ({
                id: version?.id,
                baseModel: version?.baseModel || 'No Base Model',
                images: (version?.images || []).map((image: any) => image?.url).filter(Boolean)
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

    const hasUrlParam = (() => {
        try {
            return new URL(url).searchParams.has("modelVersionId");
        } catch {
            return false;
        }
    })();

    const firstVersionId = modelData?.modelVersions?.[0]?.id
        ? String(modelData.modelVersions[0].id)
        : "";

    const buildVersionUrl = (vid: string) => `https://civitai.com/models/${modelId}?modelVersionId=${vid}`;

    // Given a version object, compute the EXACT URL format your app uses
    const computeUrlForVersion = (vid: string) => {
        // if this panel was opened from a "plain" model URL (no modelVersionId),
        // then the first version uses the plain url
        if (!hasUrlParam && firstVersionId && vid === firstVersionId) return url;
        return buildVersionUrl(vid);
    };

    // Fill maps from already-fetched modelData (NO API)
    const upsertMetaForUrls = (pairs: Array<{ targetUrl: string; vid: string; img?: string; badge?: string }>) => {
        if (setUrlVersionIdMap) {
            // only needed for the plain url row to display a version id
            if (!hasUrlParam && firstVersionId) {
                setUrlVersionIdMap(prev => ({ ...prev, [url]: firstVersionId }));
            }
        }

        if (setUrlBadgeMap) {
            setUrlBadgeMap(prev => {
                const next = { ...prev };
                for (const p of pairs) {
                    next[p.targetUrl] = p.badge ?? "";
                }
                return next;
            });
        }

        if (setUrlImgSrcMap) {
            setUrlImgSrcMap(prev => {
                const next = { ...prev };
                for (const p of pairs) {
                    if (p.img && !next[p.targetUrl]) {
                        next[p.targetUrl] = p.img;
                    }
                }
                return next;
            });
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

        const vid = String(selectedVersion.id);
        const formattedUrl =
            (vid === String(modelData.modelVersions[0]?.id) && !hasUrlParam)
                ? url
                : `https://civitai.com/models/${modelId}?modelVersionId=${vid}`;

        setUrlList(prevUrlList => {
            if (prevUrlList.includes(formattedUrl)) {
                setMessage({ text: "This URL is already in the list.", type: "error" });
                return prevUrlList;
            }
            setMessage({ text: "URL added successfully!", type: "success" });
            return [...prevUrlList, formattedUrl];
        });

        // ✅ NEW: fill image map immediately using already-fetched modelData
        const img = selectedVersion?.images?.[0]?.url || "";
        const badge = computeBadgeForVid(vid);
        upsertMetaForUrls([{ targetUrl: formattedUrl, vid, img, badge }]);

        chrome.storage.local.get("originalTabId", (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "check-url", url: formattedUrl });
            }
        });
    };

    // Handle Add All Button Click
    const handleAddAll = () => {
        if (!modelData) return;

        const metaPairs: Array<{ targetUrl: string; vid: string; img?: string; badge?: string }> = [];
        const newUrls: string[] = [];

        for (const v of modelData.modelVersions) {
            const vid = String(v.id);

            const formattedUrl =
                (vid === String(modelData.modelVersions[0]?.id) && !hasUrlParam)
                    ? url
                    : `https://civitai.com/models/${modelId}?modelVersionId=${vid}`;

            // Keep your existing "only add if not already in list"
            if (!urlList.includes(formattedUrl)) {
                newUrls.push(formattedUrl);
            }

            // ✅ NEW: always prepare meta (even if URL already exists but image missing)
            const img = v?.images?.[0]?.url || "";
            const badge = computeBadgeForVid(vid);
            metaPairs.push({ targetUrl: formattedUrl, vid, img, badge });
        }

        if (newUrls.length === 0) {
            setMessage({ text: "All URLs are already in the list.", type: "error" });
            // still backfill images for any missing ones
            upsertMetaForUrls(metaPairs);
            return;
        }

        setUrlList(prev => [...prev, ...newUrls]);
        setMessage({ text: `${newUrls.length} URL(s) added successfully!`, type: "success" });

        // ✅ NEW: backfill images + plain-url versionId mapping right now
        upsertMetaForUrls(metaPairs);

        newUrls.forEach((formattedUrl) => {
            chrome.storage.local.get("originalTabId", (result) => {
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
                            {showCarousel && selectedVersion && Array.isArray(selectedVersion.images) && selectedVersion.images.length > 0 && (
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
                                    <Carousel images={(selectedVersion.images || []).map((image) => image?.url).filter(Boolean)} />
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

                        <div style={ui.group}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                    marginTop: "10px",
                                    padding: "10px",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    borderRadius: "8px",
                                    background: "rgba(255,255,255,0.04)",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        padding: "4px 8px",
                                        borderRadius: "999px",
                                        border: isLocked
                                            ? "1px solid rgba(245,158,11,0.45)"
                                            : "1px solid rgba(255,255,255,0.15)",
                                        background: isLocked
                                            ? "rgba(245,158,11,0.12)"
                                            : "rgba(0,0,0,0.18)",
                                    }}
                                >
                                    {isLocked ? "Locked" : "Not Locked"}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setLockedUrl(isLocked ? "" : url)}
                                    style={{
                                        padding: "6px 10px",
                                        fontSize: "12px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        background: isLocked ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.06)",
                                        color: "inherit",
                                        cursor: "pointer",
                                    }}
                                >
                                    {isLocked ? "Unlock" : "Lock This Model"}
                                </button>

                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
                                    <span style={{ fontSize: "12px" }}>N</span>

                                    <button
                                        type="button"
                                        onClick={() => setNeighborCount(prev => Math.max(1, prev - 1))}
                                        disabled={neighborCount <= 1}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            border: "1px solid rgba(255,255,255,0.15)",
                                            background: "rgba(255,255,255,0.06)",
                                            color: "inherit",
                                            cursor: neighborCount <= 1 ? "not-allowed" : "pointer",
                                            opacity: neighborCount <= 1 ? 0.6 : 1,
                                        }}
                                    >
                                        -
                                    </button>

                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        min={1}
                                        value={neighborCount}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setNeighborCount(Number.isFinite(val) && val > 0 ? val : 1);
                                        }}
                                        style={{ width: "80px" }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setNeighborCount(prev => prev + 1)}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            border: "1px solid rgba(255,255,255,0.15)",
                                            background: "rgba(255,255,255,0.06)",
                                            color: "inherit",
                                            cursor: "pointer",
                                        }}
                                    >
                                        +
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleAddAroundLocked("prev")}
                                    disabled={!isLocked}
                                    style={{
                                        padding: "6px 10px",
                                        fontSize: "12px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        background: !isLocked ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.18)",
                                        color: "inherit",
                                        cursor: !isLocked ? "not-allowed" : "pointer",
                                        opacity: !isLocked ? 0.6 : 1,
                                    }}
                                >
                                    Add Previous N
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleAddAroundLocked("next")}
                                    disabled={!isLocked}
                                    style={{
                                        padding: "6px 10px",
                                        fontSize: "12px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        background: !isLocked ? "rgba(255,255,255,0.04)" : "rgba(34,197,94,0.18)",
                                        color: "inherit",
                                        cursor: !isLocked ? "not-allowed" : "pointer",
                                        opacity: !isLocked ? 0.6 : 1,
                                    }}
                                >
                                    Add Next N
                                </button>
                            </div>
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

const Carousel: React.FC<CarouselProps> = ({ images = [] }) => {
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