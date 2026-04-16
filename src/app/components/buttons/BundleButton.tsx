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
    fetchRemoveOfflineDownloadFileIntoOfflineDownloadList
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

    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadMethod, downloadFilePath, selectedCategory, offlineMode } = chrome;

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

    const handleAddOfflineDownloadFileintoOfflineDownloadList = async () => {
        if (["/@scan@/ErrorPath/"].includes(downloadFilePath)) {
            alert("Invalid DownloadFilePath");
            return;
        }

        setIsLoading(true);
        dispatch(clearError());

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        let civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID);
        let civitaiTags = civitaiData?.tags;

        const normalizedCivitaiUrl =
            `https://civitai.red/models/${civitaiModelID}?modelVersionId=${civitaiVersionID}`;

        if (
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            selectedCategory === null || selectedCategory === "" ||
            civitaiModelFileList === null || !civitaiModelFileList.length ||
            civitaiTags === null
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        let modelObject = {
            downloadFilePath,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl: normalizedCivitaiUrl,
            selectedCategory,
            civitaiTags
        };

        try {
            await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, false, dispatch);
            dispatch(updateDownloadFilePath("/@scan@/ACG/Pending/"));
            await refreshModelStatus();
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