import React, { useState, useRef, CSSProperties, useEffect } from "react";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { setError, clearError } from '../../store/actions/errorsActions';

//Components
import { Button, OverlayTrigger, Tooltip, Dropdown, ButtonGroup } from 'react-bootstrap';

//api
import {
    fetchDownloadFilesByServer,
    fetchDownloadFilesByBrowser,
    fetchDownloadFilesByServer_v2,
    fetchDownloadFilesByBrowser_v2,
    fetchAddRecordToDatabase,
    fetchCivitaiModelInfoFromCivitaiByVersionID,
    fetchAddOfflineDownloadFileIntoOfflineDownloadList
} from "../../api/civitaiSQL_api"

//utils
import {
    updateDownloadMethodIntoChromeStorage, callChromeBrowserDownload,
    callChromeBrowserDownload_v2, bookmarkThisModel,
} from "../../utils/chromeUtils"
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils"

const BundleButton: React.FC = (props: any) => {
    const isInitialMount = useRef(true);

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl, civitaiModelID, civitaiVersionID } = civitaiModel

    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadMethod, downloadFilePath, selectedCategory, offlineMode } = chrome;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        //Preventing First time update
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

        //Check for null or empty
        if (civitaiUrl === "" || selectedCategory === "" ||
            civitaiUrl === undefined || selectedCategory === undefined ||
            civitaiUrl === null || selectedCategory === null) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        fetchAddRecordToDatabase(selectedCategory, civitaiUrl, dispatch);
        setIsLoading(false)
    }

    // Function to handle the API call and update the button state
    const handleDownloadFile = async () => {
        setIsLoading(true);
        dispatch(clearError());

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        let filesList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID)

        //Check for null or empty
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
            //If download Method is server, the server will download the file into server's folder
            await fetchDownloadFilesByServer(civitaiUrl, civitaiFileName, civitaiModelID,
                civitaiVersionID, downloadFilePath, filesList, dispatch);
        } else {
            //if download Method is browser, the chrome browser will download the file into server's folder
            await fetchDownloadFilesByBrowser(civitaiUrl, downloadFilePath, dispatch);
            callChromeBrowserDownload({
                name: retrieveCivitaiFileName(civitaiData, civitaiVersionID), modelID: civitaiModelID,
                versionID: civitaiVersionID, downloadFilePath: downloadFilePath, filesList: filesList
            })
        }
        setIsLoading(false);
    };

    // Function to handle the API call and update the button state
    const handleDownloadFile_v2 = async () => {
        setIsLoading(true);
        dispatch(clearError());

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        //the fileList would contains the urls of all files such as safetensor, training data, ...
        let civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID)

        //Check for null or empty
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
            //If download Method is server, the server will download the file into server's folder
            await fetchDownloadFilesByServer_v2(modelObject, dispatch);
        } else {
            //if download Method is browser, the chrome browser will download the file into server's folder
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

    // Function to handle the API call and update the button state
    const handleAddOfflineDownloadFileintoOfflineDownloadList = async () => {

        if (["/@scan@/ACG/Pending", "/@scan@/ACG/Pending/", "/@scan@/ErrorPath/"].includes(downloadFilePath)) {
            alert("Invalid DownloadFilePath");
            return;
        }

        setIsLoading(true);
        dispatch(clearError());

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        //the fileList would contains the urls of all files such as safetensor, training data, ...
        let civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID)

        let civitaiTags = civitaiData?.tags;

        //Check for null or empty
        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            selectedCategory === null || selectedCategory === "" ||
            civitaiModelFileList === null || !civitaiModelFileList.length ||
            civitaiTags === null
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        let modelObject = {
            downloadFilePath, civitaiFileName, civitaiModelID,
            civitaiVersionID, civitaiModelFileList, civitaiUrl, selectedCategory, civitaiTags
        }

        //If download Method is server, the server will download the file into server's folder
        await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, false, dispatch);

        setIsLoading(false);
    };

    return (
        <>
            {/*
            <OverlayTrigger placement={"bottom"}
                overlay={<Tooltip id="tooltip">Download | Bookmark | Add Record</Tooltip>}>
                <Button
                    variant={"primary"}
                    onClick={handleBundleAll}
                    disabled={isLoading}
                    className="btn btn-primary btn-lg w-100"
                >
                    Bundle Action
                    {isLoading && <span className="button-state-complete">✓</span>}
                </Button>
            </OverlayTrigger>
            */}

            {offlineMode ?
                <OverlayTrigger placement={"bottom"}
                    overlay={<Tooltip id="tooltip">Add file into offline download list</Tooltip>}>
                    <Button
                        variant={"success"}
                        onClick={handleAddOfflineDownloadFileintoOfflineDownloadList}
                        disabled={isLoading}
                        className="btn btn-primary btn-lg w-100"
                    >
                        Offline Download
                        {isLoading && <span className="button-state-complete">✓</span>}
                    </Button>
                </OverlayTrigger>
                :
                <OverlayTrigger placement={"bottom"}
                    overlay={<Tooltip id="tooltip">Download | Bookmark | Add Record</Tooltip>}>
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

