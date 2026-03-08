import React, { useEffect, useState, useRef } from "react";
//Components
import { Toast } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel, Collapse } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import { BsFillFileEarmarkArrowUpFill, BsFillCartCheckFill, BsType, BsArrowRepeat, BsSortDown, BsSortUp } from 'react-icons/bs';
import { Button, Badge } from 'react-bootstrap';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { updateDownloadFilePath } from "../../store/actions/chromeActions"
import { setError, clearError } from '../../store/actions/errorsActions';

//api
import {
    fetchUpdateRecordAtDatabase,
    fetchDatabaseModelInfoByModelID,
    fetchDownloadFilesByServer,
    fetchDownloadFilesByBrowser,
    fetchCheckCartList,
    fetchDownloadFilesByServer_v2,
    fetchDownloadFilesByBrowser_v2,
    fetchCivitaiModelInfoFromCivitaiByVersionID,
    fetchAddOfflineDownloadFileIntoOfflineDownloadList,
    fetchCivitaiModelInfoFromCivitaiByModelID
} from "../../api/civitaiSQL_api"

//utils
import { bookmarkThisModel, callChromeBrowserDownload, callChromeBrowserDownload_v2 } from "../../utils/chromeUtils"
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils"

//Interface
interface DatabaseUpdateModelPanelProps {
    toggleDatabaseUpdateModelPanelOpen: () => void;
}

const DatabaseUpdateModelPanel: React.FC<DatabaseUpdateModelPanelProps> = (props) => {
    const isInitialMount = useRef(true);

    const dispatch = useDispatch();

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl, civitaiVersionID, civitaiModelID } = civitaiModel

    const databaseModel = useSelector((state: AppState) => state.databaseModel);
    const databaseData: Record<string, any> | undefined = databaseModel.databaseModelObject;
    const databaseModelsList = databaseData;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedCategory, downloadMethod, downloadFilePath, offlineMode } = chrome;

    const [originalModelsList, setOriginalModelsList] = useState<{
        name: string;
        url: string;
        id: number;
        baseModel: string;
        localPath?: string | null;
        imageUrls: { url: string; height: number; width: number; nsfw: string }[];
    }[]>([]);

    const [modelsList, setModelsList] = useState<{
        name: string;
        url: string;
        id: number;
        baseModel: string;
        localPath?: string | null;
        imageUrls: { url: string; height: number; width: number; nsfw: string }[];
    }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [visibleIsCarted, setVisibleIsCarted] = useState<boolean[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [updateOption, setUpdateOption] = useState("Database_and_UpdateFolder")
    const [hasUpdateCompleted, setHasUpdateCompleted] = useState(false)

    const [isSorted, setIsSorted] = useState(false)
    const [baseModelList, setBaseModelList] = useState<{ baseModel: string, display: boolean }[]>([]);
    const [isColapPanelOpen, setUsColapPanelOpen] = useState(false);
    const [effectiveDownloadFilePath, setEffectiveDownloadFilePath] = useState("");

    let UpdateDownloadFilePath = "";

    // Check if downloadFilePath matches the format /@scan@/{some word} (with optional trailing slash)
    const regex = /^\/@scan@\/[^\/]+\/?$/; // Matches /@scan@/{some word} or /@scan@/{some word}/

    if (regex.test(downloadFilePath)) {
        UpdateDownloadFilePath = `/@scan@/Update/${downloadFilePath.replace("/@scan@/", "")}`;
    } else {
        UpdateDownloadFilePath = `/@scan@/Update/${downloadFilePath.replace("/@scan@/ACG/", "")}`;
    }

    //Retrivie Modellist when pane is open
    useEffect(() => {
        handleUpdateModelsList();
    }, [])

    useEffect(() => {
        //Preventing First time update
        if (isInitialMount.current) {
            console.log("test-civitaiUrl");
            console.log(civitaiUrl);
            isInitialMount.current = false;
        } else {
            setModelsList(originalModelsList?.reverse().filter(model =>
                baseModelList.some(baseModelObj => baseModelObj.baseModel === model.baseModel && baseModelObj.display)
            ));
            setOriginalModelsList(originalModelsList?.reverse());
        }
    }, [baseModelList]);


    const handleUpdateModelsList = async () => {
        setIsLoading(true)
        dispatch(clearError());

        let modelID = civitaiModel.civitaiModelID;
        //Check for null or empty
        if (
            modelID === null || modelID === "") {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        const data = await fetchDatabaseModelInfoByModelID(modelID, dispatch);

        console.log("update panel record data : ", data)

        setModelsList(data)
        setOriginalModelsList(data);
        const uniqueBaseModels = Array.from(
            new Set(data?.map((obj: any) => obj.baseModel))
        ).map(baseModel => ({ baseModel: baseModel as string, display: true }));
        setBaseModelList(uniqueBaseModels);
        setVisibleToasts(data?.map(() => true))

        const cartListData = data || [];
        const cartedStatusArray = await Promise.all(
            cartListData.map(async (element: any) => {
                return await handleCheckCartList(element.url);
            })
        );
        setVisibleIsCarted(cartedStatusArray);

        setIsLoading(false)
    }

    const handleClose = (index: any) => {
        const newVisibleToasts = [...visibleToasts];
        newVisibleToasts[index] = false;
        setVisibleToasts(newVisibleToasts);
    };


    useEffect(() => {
        if (hasUpdateCompleted) {
            if (offlineMode) {
                handleAddOfflineDownloadFileintoOfflineDownloadList(effectiveDownloadFilePath);
            } else {
                handleDownload_v2(effectiveDownloadFilePath);
                bookmarkThisModel(civitaiData?.type, dispatch);
                setHasUpdateCompleted(false);
                props.toggleDatabaseUpdateModelPanelOpen();
            }
        }
    }, [hasUpdateCompleted, effectiveDownloadFilePath]);

    const handleAddOfflineDownloadFileintoOfflineDownloadList = async (targetDownloadFilePath?: string) => {

        setIsLoading(true)
        // Utility function to delay execution

        const finalDownloadFilePath = targetDownloadFilePath || downloadFilePath;

        //Fetch Civitai ModelInfo
        const modelId = civitaiUrl.match(/\/models\/(\d+)/)?.[1] || '';
        // Fetch data with error handling
        try {
            const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);
            if (data) {

                let versionIndex = 0;
                const uri = new URL(civitaiUrl);

                if (uri.searchParams.has('modelVersionId')) {
                    let modelVersionId = uri.searchParams.get('modelVersionId');
                    versionIndex = data.modelVersions.findIndex((version: any) => {
                        return version.id == modelVersionId
                    });
                }

                let civitaiVersionID = data?.modelVersions[versionIndex]?.id.toString();
                let civitaiModelID = modelId;

                let civitaiFileName = retrieveCivitaiFileName(data, civitaiVersionID);
                //the fileList would contains the urls of all files such as safetensor, training data, ...
                let civitaiModelFileList = retrieveCivitaiFilesList(data, civitaiVersionID)

                let civitaiTags = data?.tags;

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
                    console.log("fail in handleAddOfflineDownloadFileintoOfflineDownloadList()")
                    return;
                }

                let modelObject = {
                    downloadFilePath: finalDownloadFilePath,
                    civitaiFileName,
                    civitaiModelID,
                    civitaiVersionID,
                    civitaiModelFileList,
                    civitaiUrl,
                    selectedCategory,
                    civitaiTags
                }

                await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, false, dispatch);
                props.toggleDatabaseUpdateModelPanelOpen();
            }

        } catch (error) {
            console.error(error);
        }

        setIsLoading(false)
    };

    const handleDownload = async () => {

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
                name: civitaiFileName, modelID: civitaiModelID,
                versionID: civitaiVersionID, downloadFilePath: downloadFilePath, filesList: filesList
            })
        }

        setIsLoading(false)
    }

    const handleDownload_v2 = async (targetDownloadFilePath?: string) => {

        setIsLoading(true);
        dispatch(clearError());

        const finalDownloadFilePath = targetDownloadFilePath || downloadFilePath;

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        //the fileList would contains the urls of all files such as safetensor, training data, ...
        let civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID)

        //Check for null or empty
        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            finalDownloadFilePath === null || finalDownloadFilePath === "" ||
            civitaiModelFileList === null || !civitaiModelFileList.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        let modelObject = {
            downloadFilePath: finalDownloadFilePath,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl
        }

        if (downloadMethod === "server") {
            //If download Method is server, the server will download the file into server's folder
            await fetchDownloadFilesByServer_v2(modelObject, dispatch);
        } else {
            //if download Method is browser, the chrome browser will download the file into server's folder
            await fetchDownloadFilesByBrowser_v2(civitaiUrl, finalDownloadFilePath, dispatch);

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

        setIsLoading(false)
    }

    const handleUpdateModel = async (id: number) => {
        setIsLoading(true)
        dispatch(clearError());

        //Check for null or empty
        if (civitaiUrl === "" || selectedCategory === "" ||
            civitaiUrl === undefined || selectedCategory === undefined || id === undefined ||
            civitaiUrl === null || selectedCategory === null || id === null) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        let selectedPath = "";

        switch (updateOption) {
            case "Database_and_LocalUpdateFolder": {
                const clickedModel = modelsList.find(m => m.id === id);
                const localScanPath = normalizeLocalPathToScanPath(clickedModel?.localPath);
                const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);
                selectedPath = localUpdatePath || UpdateDownloadFilePath;
                break;
            }
            case "Database_and_LocalFileFolder": {
                const clickedModel = modelsList.find(m => m.id === id);
                const localScanPath = normalizeLocalPathToScanPath(clickedModel?.localPath);
                selectedPath = localScanPath || downloadFilePath;
                break;
            }
            case "Database_and_UpdateFolder":
                selectedPath = UpdateDownloadFilePath;
                break;
            case "Database_and_FileFolder":
                selectedPath = downloadFilePath;
                break;
            case "Database_Only":
                selectedPath = downloadFilePath;
                break;
            default:
                selectedPath = '/@scan@/ACG/Temp/';
                break;
        }

        dispatch(updateDownloadFilePath(selectedPath));
        setEffectiveDownloadFilePath(selectedPath);

        fetchUpdateRecordAtDatabase(id, civitaiUrl, selectedCategory, dispatch);

        if (updateOption !== "Database_Only") {
            setHasUpdateCompleted(true)
        } else {
            bookmarkThisModel(civitaiData?.type, dispatch)
            setHasUpdateCompleted(false)
            props.toggleDatabaseUpdateModelPanelOpen()
        }
        setIsLoading(false)
    }

    const handleCheckCartList = async (url: string) => {
        setIsLoading(true)
        dispatch(clearError());

        //Check for null or empty
        if (url === "" || url === undefined || url === null) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return false;
        }

        let isCarted = await fetchCheckCartList(url, dispatch);

        setIsLoading(false)
        return isCarted ? true : false;
    }

    const handleToggleColapPanel = () => {
        setUsColapPanelOpen(!isColapPanelOpen);
    };

    const handleToggleBaseModelCheckbox = (index: number) => {
        setBaseModelList(prevState => {
            const newState = [...prevState];
            newState[index].display = !newState[index].display;
            return newState;
        });
    };

    const handleReverseModelList = () => {
        setModelsList(modelsList?.reverse());
        setOriginalModelsList(originalModelsList?.reverse());
        setIsSorted(!isSorted)
    }

    const normalizeLocalPathToScanPath = (localPath?: string | null) => {
        if (!localPath) return "";

        const normalized = localPath.replace(/\\/g, "/");
        const marker = "/@scan@/";
        const markerIndex = normalized.indexOf(marker);

        if (markerIndex === -1) return "";

        let scanPath = normalized.substring(markerIndex);
        if (!scanPath.endsWith("/")) {
            scanPath += "/";
        }

        return scanPath;
    };

    const buildUpdatePathFromScanPath = (scanPath: string) => {
        if (!scanPath) return "";

        const regex = /^\/@scan@\/[^\/]+\/?$/;

        if (regex.test(scanPath)) {
            return `/@scan@/Update/${scanPath.replace("/@scan@/", "")}`;
        } else {
            return `/@scan@/Update/${scanPath.replace("/@scan@/ACG/", "")}`;
        }
    };

    return (
        <div className="panel-container">
            {/* ... other JSX elements ... */}
            <button className="panel-close-button" onClick={props.toggleDatabaseUpdateModelPanelOpen}>
                <BiUndo />
            </button>

            <div className="panel-container-content">

                <div className="panel-header-text">
                    <h6>Database's Update Model Panel</h6>
                </div>

                <div className="buttonGroup" style={{ padding: "5px", display: "flex", justifyContent: "flex-start", alignItems: "flex-start" }}>
                    <div style={{ marginRight: '10px' }}>
                        <Button variant="secondary" disabled={isLoading} onClick={handleReverseModelList}>
                            {isLoading ? <BsArrowRepeat className="spinner" /> : (isSorted ? <BsSortUp /> : <BsSortDown />)}
                        </Button>
                    </div>

                    <div className="collapse-panel-container" style={{ flexShrink: 0, margin: 0, padding: "0px 10px 0px 10px" }}>
                        <div className="toggle-section" onClick={handleToggleColapPanel} aria-controls="collapse-panel-update" aria-expanded={isColapPanelOpen} style={{
                            textAlign: 'center'
                        }}>
                            <BsType />
                        </div>

                        <Collapse in={isColapPanelOpen}>
                            <div id="collapse-panel-update" style={{
                                marginTop: '10px',
                                padding: '10px',
                                borderRadius: '5px',
                                background: '#f9f9f9',
                                width: '100%'
                            }}>
                                {baseModelList.map((item, index) => (
                                    <div key={index}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={item.display}
                                                onChange={() => handleToggleBaseModelCheckbox(index)}
                                            />
                                            {item.baseModel}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </Collapse>
                    </div>
                </div>

                {isLoading ?
                    <div className="centered-container">
                        <Spinner />
                    </div>
                    :
                    <>
                        {modelsList?.map((model, index) => {
                            const localScanPath = normalizeLocalPathToScanPath(model?.localPath);
                            const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);
                            if (!visibleToasts[index]) return null;
                            return (
                                <div key={index} className="panel-toast-container">
                                    <Toast onClose={() => handleClose(index)}>
                                        <Toast.Header>
                                            <Col xs={10} className="panel-toast-header">
                                                <Badge>{model?.baseModel}</Badge><b><span> #{model?.id}</span> : <span>{model?.name}</span></b>
                                            </Col>
                                        </Toast.Header>
                                        <Toast.Body>
                                            {/* Image Carousel */}
                                            <div className="panel-image-carousel-container">
                                                {model?.imageUrls[0]?.url
                                                    &&
                                                    <Carousel fade>
                                                        {model?.imageUrls?.map((image) => {
                                                            return (
                                                                <Carousel.Item >
                                                                    <img
                                                                        src={image.url || "https://placehold.co/200x250"}
                                                                        alt={model.name}
                                                                    />
                                                                </Carousel.Item>
                                                            )
                                                        })}
                                                    </Carousel>}
                                            </div>

                                            {/* Url */}
                                            <a href={model?.url}> {model?.url} </a>

                                            {/**Update Radio Button */}
                                            <div className="radio-container">

                                                {localUpdatePath && (
                                                    <label className="radio-label">
                                                        <input
                                                            type="radio"
                                                            value="Database_and_LocalUpdateFolder"
                                                            checked={updateOption === 'Database_and_LocalUpdateFolder'}
                                                            onChange={() => setUpdateOption('Database_and_LocalUpdateFolder')}
                                                            className="radio-input"
                                                        />
                                                        <div className="truncated-text-container">
                                                            <span>
                                                                Database & Update to {localUpdatePath}
                                                            </span>
                                                        </div>
                                                    </label>
                                                )}

                                                {localScanPath && (
                                                    <label className="radio-label">
                                                        <input
                                                            type="radio"
                                                            value="Database_and_LocalFileFolder"
                                                            checked={updateOption === 'Database_and_LocalFileFolder'}
                                                            onChange={() => setUpdateOption('Database_and_LocalFileFolder')}
                                                            className="radio-input"
                                                        />
                                                        <div className="truncated-text-container">
                                                            <span>
                                                                Database & {localScanPath}
                                                            </span>
                                                        </div>
                                                    </label>
                                                )}

                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        value="Database_and_UpdateFolder"
                                                        checked={updateOption === 'Database_and_UpdateFolder'}
                                                        onChange={() => setUpdateOption('Database_and_UpdateFolder')}
                                                        className="radio-input"
                                                    />
                                                    <div className="truncated-text-container">
                                                        <span>
                                                            Database & Update to {UpdateDownloadFilePath}
                                                        </span>
                                                    </div>
                                                </label>
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        value="Database_and_FileFolder"
                                                        checked={updateOption === 'Database_and_FileFolder'}
                                                        onChange={() => setUpdateOption('Database_and_FileFolder')}
                                                        className="radio-input"
                                                    />
                                                    <div className="truncated-text-container">
                                                        <span>
                                                            Database & {downloadFilePath}
                                                        </span>
                                                    </div>
                                                </label>
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        value="Database_Only"
                                                        checked={updateOption === 'Database_Only'}
                                                        onChange={() => setUpdateOption('Database_Only')}
                                                        className="radio-input"
                                                    />
                                                    Database Only
                                                </label>
                                            </div>

                                            {/**Update button */}
                                            <div className="panel-update-button-container">
                                                <Button
                                                    variant={offlineMode ? "success" : "primary"}
                                                    disabled={isLoading}
                                                    onClick={() => handleUpdateModel(model?.id)}
                                                    className="btn btn-primary btn-lg w-100"
                                                >
                                                    <BsFillFileEarmarkArrowUpFill />
                                                    {isLoading && <span className="button-state-complete">✓</span>}
                                                </Button>
                                                {visibleIsCarted[index] ? <BsFillCartCheckFill className="icon" /> : null}
                                            </div>

                                        </Toast.Body>
                                    </Toast>
                                </div>
                            );
                        })}
                    </>
                }

            </div >
        </div >

    );
};

export default DatabaseUpdateModelPanel;

