import React, { useState, useRef, useEffect } from "react";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { setError, clearError } from '../../store/actions/errorsActions';
import { updateDownloadFilePath } from "../../store/actions/chromeActions"

//Components
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

//api
import {
    fetchDownloadFilesByServer,
    fetchDownloadFilesByBrowser,
    fetchDownloadFilesByServer_v2,
    fetchDownloadFilesByBrowser_v2,
    fetchAddRecordToDatabase,
    fetchCivitaiModelInfoFromCivitaiByVersionID,
    fetchAddOfflineDownloadFileIntoOfflineDownloadList,
    fetchRemoveOfflineDownloadFileIntoOfflineDownloadList,
    fetchAddOfflineDownloadFileIntoOfflineDownloadListByVersionAPI
} from "../../api/civitaiSQL_api"

//utils
import {
    updateDownloadMethodIntoChromeStorage,
    callChromeBrowserDownload,
    callChromeBrowserDownload_v2,
    bookmarkThisModel,
} from "../../utils/chromeUtils"
import {
    retrieveCivitaiFileName,
    retrieveCivitaiFilesList
} from "../../utils/objectUtils"

//Interface
interface BundleButtonProps {
    isDarkMode: boolean;
    isOfflineRecordExisting: boolean;
    isCheckingOfflineRecord: boolean;
    refreshModelStatus: () => Promise<void>;
}

const BundleButton: React.FC<BundleButtonProps> = ({
    isDarkMode,
    isOfflineRecordExisting,
    isCheckingOfflineRecord,
    refreshModelStatus
}) => {
    const isInitialMount = useRef(true);

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl, civitaiModelID, civitaiVersionID } = civitaiModel

    const chromeState = useSelector((state: AppState) => state.chrome);

    const {
        downloadMethod,
        downloadFilePath,
        selectedCategory,
        offlineMode
    } = chromeState;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            updateDownloadMethodIntoChromeStorage(downloadMethod);
        }
    }, [downloadMethod])

    const handleBundleAll = async () => {
        handleDownloadFile()
        handleAddModeltoDatabase()
        bookmarkThisModel(civitaiData?.type, dispatch)
    }

    const handleBundleAll_v2 = async () => {
        handleDownloadFile_v2();
        handleAddModeltoDatabase()
        bookmarkThisModel(civitaiData?.type, dispatch)
    }

    const handleAddModeltoDatabase = () => {
        setIsLoading(true)
        dispatch(clearError());

        if (
            civitaiUrl === "" || selectedCategory === "" ||
            civitaiUrl === undefined || selectedCategory === undefined ||
            civitaiUrl === null || selectedCategory === null
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        fetchAddRecordToDatabase(selectedCategory, civitaiUrl, downloadFilePath, dispatch);
        setIsLoading(false)
    }

    const handleDownloadFile = async () => {
        setIsLoading(true);
        dispatch(clearError());

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        let filesList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID)

        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            filesList === null || !filesList.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        if (downloadMethod === "server") {
            await fetchDownloadFilesByServer(
                civitaiUrl,
                civitaiFileName,
                civitaiModelID,
                civitaiVersionID,
                downloadFilePath,
                filesList,
                dispatch
            );
        } else {
            await fetchDownloadFilesByBrowser(civitaiUrl, downloadFilePath, dispatch);
            callChromeBrowserDownload({
                name: retrieveCivitaiFileName(civitaiData, civitaiVersionID),
                modelID: civitaiModelID,
                versionID: civitaiVersionID,
                downloadFilePath: downloadFilePath,
                filesList: filesList
            })
        }
        setIsLoading(false);
    };

    const handleDownloadFile_v2 = async () => {
        setIsLoading(true);
        dispatch(clearError());

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        let civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID)

        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            civitaiModelFileList === null || !civitaiModelFileList.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        let modelObject = {
            downloadFilePath, civitaiFileName, civitaiModelID,
            civitaiVersionID, civitaiModelFileList, civitaiUrl
        }

        if (downloadMethod === "server") {
            await fetchDownloadFilesByServer_v2(modelObject, dispatch);
        } else {
            await fetchDownloadFilesByBrowser_v2(civitaiUrl, downloadFilePath, dispatch);

            try {
                const data = await fetchCivitaiModelInfoFromCivitaiByVersionID(civitaiVersionID, dispatch);
                if (data) {
                    callChromeBrowserDownload_v2({ ...modelObject, modelVersionObject: data })
                } else {
                    throw new Error();
                }
            } catch (error) {
                console.error('Error fetching data for civitaiVersionID:', civitaiVersionID, error);
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            }
        }

        setIsLoading(false);
    };

    const normalizeCivitaiId = (value: unknown): string => {
        const normalizedValue = String(value ?? "").trim();

        if (
            !normalizedValue ||
            normalizedValue === "Selecting" ||
            normalizedValue === "undefined" ||
            normalizedValue === "null"
        ) {
            return "";
        }

        return normalizedValue;
    };

    const getCivitaiIdsFromUrl = (
        urlValue?: string | null
    ): {
        modelId: string;
        versionId: string;
    } => {
        if (!urlValue) {
            return {
                modelId: "",
                versionId: "",
            };
        }

        try {
            const parsedUrl = new URL(urlValue);

            const modelIdMatch = parsedUrl.pathname.match(
                /^\/models\/(\d+)(?:\/|$)/
            );

            return {
                modelId: modelIdMatch?.[1] ?? "",
                versionId:
                    parsedUrl.searchParams
                        .get("modelVersionId")
                        ?.trim() ?? "",
            };
        } catch (error) {
            console.error("Failed to parse Civitai URL:", urlValue, error);

            return {
                modelId: "",
                versionId: "",
            };
        }
    };

    const handleAddOfflineDownloadFileintoOfflineDownloadList = async () => {
        if (["/@scan@/ErrorPath/"].includes(downloadFilePath)) {
            alert("Invalid DownloadFilePath");
            return;
        }

        setIsLoading(true);
        dispatch(clearError());

        try {
            /*
             * Read IDs from both locations:
             *
             * 1. The current browser page.
             * 2. The civitaiUrl stored in Redux.
             *
             * The Redux IDs are still preferred when they are available.
             */
            const [activeTab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            const currentPageIds = getCivitaiIdsFromUrl(
                activeTab?.url ?? ""
            );

            const storedUrlIds = getCivitaiIdsFromUrl(
                civitaiUrl
            );

            let resolvedVersionID =
                normalizeCivitaiId(civitaiVersionID) ||
                normalizeCivitaiId(currentPageIds.versionId) ||
                normalizeCivitaiId(storedUrlIds.versionId);

            let resolvedModelID =
                normalizeCivitaiId(civitaiModelID) ||
                normalizeCivitaiId(currentPageIds.modelId) ||
                normalizeCivitaiId(storedUrlIds.modelId);

            if (!resolvedVersionID) {
                throw new Error(
                    "No version ID was found in civitaiModel or the current page URL"
                );
            }

            /*
             * Start with the model API data already stored in Redux.
             */
            let resolvedCivitaiData:
                | Record<string, any>
                | undefined = civitaiData;

            let usedVersionApiFallback = false;

            let civitaiFileName: string | null = null;
            let civitaiModelFileList: any[] = [];

            /*
             * Try reading the selected version from the existing model data.
             *
             * The try/catch is useful because partially loaded API data may
             * cause one of the existing helper functions to throw.
             */
            if (resolvedCivitaiData) {
                try {
                    civitaiFileName = retrieveCivitaiFileName(
                        resolvedCivitaiData,
                        resolvedVersionID
                    );

                    civitaiModelFileList =
                        retrieveCivitaiFilesList(
                            resolvedCivitaiData,
                            resolvedVersionID
                        ) ?? [];
                } catch (error) {
                    console.warn(
                        "Existing model API data could not be used. Trying version API.",
                        error
                    );

                    civitaiFileName = null;
                    civitaiModelFileList = [];
                }
            }

            /*
             * Fall back when:
             *
             * - civitaiData was not retrieved, or
             * - the requested version is not present in civitaiData, or
             * - the filename/files could not be retrieved.
             */
            if (
                !resolvedCivitaiData ||
                !civitaiFileName ||
                !civitaiModelFileList.length
            ) {
                const versionData =
                    await fetchCivitaiModelInfoFromCivitaiByVersionID(
                        resolvedVersionID,
                        dispatch
                    );

                if (!versionData) {
                    throw new Error(
                        `Failed to retrieve Civitai data for version ${resolvedVersionID}`
                    );
                }

                usedVersionApiFallback = true;

                /*
                 * The version API normally contains modelId.
                 * Use it if Redux and the URL did not provide the model ID.
                 */
                resolvedModelID =
                    resolvedModelID ||
                    normalizeCivitaiId(versionData.modelId) ||
                    normalizeCivitaiId(versionData.model?.id);

                /*
                 * Convert the version API response into the model API shape
                 * expected by retrieveCivitaiFileName and
                 * retrieveCivitaiFilesList.
                 */
                resolvedCivitaiData =
                    Array.isArray(versionData.modelVersions)
                        ? {
                            ...versionData,
                            tags:
                                versionData.tags ??
                                civitaiData?.tags ??
                                [],
                        }
                        : {
                            ...versionData,
                            tags:
                                versionData.tags ??
                                civitaiData?.tags ??
                                [],
                            modelVersions: [versionData],
                        };

                civitaiFileName =
                    retrieveCivitaiFileName(
                        resolvedCivitaiData,
                        resolvedVersionID
                    );

                civitaiModelFileList =
                    retrieveCivitaiFilesList(
                        resolvedCivitaiData,
                        resolvedVersionID
                    ) ?? [];
            }

            /*
             * Tags should not prevent the offline record from being added.
             */
            const civitaiTags =
                resolvedCivitaiData?.tags ?? [];

            if (!resolvedModelID) {
                throw new Error(
                    "No model ID was found in civitaiModel, the URL, or the version API response"
                );
            }

            if (!downloadFilePath) {
                throw new Error("Download file path is empty");
            }

            if (!selectedCategory) {
                throw new Error("Selected category is empty");
            }

            if (
                !civitaiFileName ||
                !civitaiModelFileList.length
            ) {
                throw new Error(
                    "The Civitai filename or model file list is missing"
                );
            }

            const normalizedCivitaiUrl =
                `https://civitai.red/models/${resolvedModelID}` +
                `?modelVersionId=${resolvedVersionID}`;

            const modelObject = {
                downloadFilePath,
                civitaiFileName,
                civitaiModelID: resolvedModelID,
                civitaiVersionID: resolvedVersionID,
                civitaiModelFileList,
                civitaiUrl: normalizedCivitaiUrl,
                selectedCategory,
                civitaiTags,
            };

            if (usedVersionApiFallback) {
                await fetchAddOfflineDownloadFileIntoOfflineDownloadListByVersionAPI(
                    modelObject,
                    false,
                    dispatch
                );
            } else {
                await fetchAddOfflineDownloadFileIntoOfflineDownloadList(
                    modelObject,
                    false,
                    dispatch
                );
            }

            dispatch(
                updateDownloadFilePath("/@scan@/ACG/Pending/")
            );

            await refreshModelStatus();
        } catch (error) {
            console.error(
                "Failed to add offline download file:",
                error
            );

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to add file into offline download list";

            dispatch(
                setError({
                    hasError: true,
                    errorMessage,
                })
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveOfflineDownloadFileFromOfflineDownloadList = async () => {
        if (!civitaiModelID || !civitaiVersionID) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            return;
        }

        const userConfirmed = window.confirm(
            `Are you sure you want to remove ${civitaiModelID}_${civitaiVersionID} from Offline List?`
        );
        if (!userConfirmed) return;

        setIsLoading(true);
        dispatch(clearError());

        try {
            await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                {
                    civitaiModelID,
                    civitaiVersionID,
                },
                dispatch
            );

            await refreshModelStatus();
        } catch (error) {
            console.error("Failed to remove offline record:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {offlineMode ?
                <OverlayTrigger
                    placement={"bottom"}
                    overlay={
                        <Tooltip id="tooltip">
                            {isOfflineRecordExisting
                                ? "Remove this file from offline download list"
                                : "Add file into offline download list"}
                        </Tooltip>
                    }
                >
                    <Button
                        variant={isOfflineRecordExisting ? "danger" : "success"}
                        onClick={
                            isOfflineRecordExisting
                                ? handleRemoveOfflineDownloadFileFromOfflineDownloadList
                                : handleAddOfflineDownloadFileintoOfflineDownloadList
                        }
                        disabled={isLoading || isCheckingOfflineRecord}
                        className="btn btn-primary btn-lg w-100"
                    >
                        {isCheckingOfflineRecord
                            ? "Checking..."
                            : isOfflineRecordExisting
                                ? "Remove from Offline List"
                                : "Offline Download"}
                        {isLoading && <span className="button-state-complete">✓</span>}
                    </Button>
                </OverlayTrigger>
                :
                <OverlayTrigger
                    placement={"bottom"}
                    overlay={<Tooltip id="tooltip">Download | Bookmark | Add Record</Tooltip>}
                >
                    <Button
                        variant={"primary"}
                        onClick={handleBundleAll_v2}
                        disabled={isLoading}
                        className="btn btn-primary btn-lg w-100"
                    >
                        Bundle Action
                        {isLoading && <span className="button-state-complete">✓</span>}
                    </Button>
                </OverlayTrigger>
            }
        </>
    );
};

export default BundleButton;