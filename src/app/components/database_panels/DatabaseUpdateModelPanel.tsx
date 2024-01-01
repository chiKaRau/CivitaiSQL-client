import React, { useEffect, useState, useRef } from "react";
//Components
import { Toast } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import { BsFillFileEarmarkArrowUpFill } from 'react-icons/bs';
import { Button } from 'react-bootstrap';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { updateDownloadFilePath } from "../../store/actions/chromeActions"
import { setError, clearError } from '../../store/actions/errorsActions';

//api
import {
    fetchUpdateRecordAtDatabase,
    fetchDatabaseModelInfoByModelID,
    fetchDownloadFilesByServer, fetchDownloadFilesByBrowser
} from "../../api/civitaiSQL_api"

//utils
import { bookmarkThisModel, callChromeBrowserDownload } from "../../utils/chromeUtils"
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
    const { isInDatabase } = databaseModel

    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedCategory, downloadMethod, downloadFilePath } = chrome;

    const [modelsList, setModelsList] = useState<{ name: string; url: string; id: number; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [updateOption, setUpdateOption] = useState("Database_and_UpdateFolder")
    const [hasUpdateCompleted, setHasUpdateCompleted] = useState(false)

    //Retrivie Modellist when pane is open
    useEffect(() => {
        handleUpdateModelsList();
    }, [])

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
        setModelsList(data)
        setVisibleToasts(data?.map(() => true))
        setIsLoading(false)
    }

    const handleClose = (index: any) => {
        const newVisibleToasts = [...visibleToasts];
        newVisibleToasts[index] = false;
        setVisibleToasts(newVisibleToasts);
    };

    useEffect(() => {
        if (hasUpdateCompleted) {
            handleDownload();
            bookmarkThisModel(civitaiData?.type, dispatch)
            setHasUpdateCompleted(false)
            props.toggleDatabaseUpdateModelPanelOpen()
        }
    }, [hasUpdateCompleted])

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

        switch (updateOption) {
            case "Database_and_UpdateFolder":
                dispatch(updateDownloadFilePath("/@scan@/Update/"))
                break;
            case "Database_and_FileFolder":
                dispatch(updateDownloadFilePath(downloadFilePath))
                break;
            case "Database_Only":
                dispatch(updateDownloadFilePath('/@scan@/ACG/Temp/'))
                break;
            default:
                dispatch(updateDownloadFilePath('/@scan@/ACG/Temp/'))
                break;
        }

        fetchUpdateRecordAtDatabase(id, civitaiUrl, selectedCategory, dispatch);
        setHasUpdateCompleted(true)
        setIsLoading(false)
    }

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

                {isLoading ?
                    <div className="centered-container">
                        <Spinner />
                    </div>
                    :
                    <>
                        {modelsList?.map((model, index) => {
                            if (!visibleToasts[index]) return null;

                            return (
                                <div key={index} className="panel-toast-container">
                                    <Toast onClose={() => handleClose(index)}>
                                        <Toast.Header>
                                            <Col xs={10} className="panel-toast-header">
                                                <b><span>#{model?.id}</span> : <span>{model?.name}</span></b>
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
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        value="Database_and_UpdateFolder"
                                                        checked={updateOption === 'Database_and_UpdateFolder'}
                                                        onChange={() => setUpdateOption('Database_and_UpdateFolder')}
                                                        className="radio-input"
                                                    />
                                                    Database & Update Folder
                                                </label>
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        value="Database_and_FileFolder"
                                                        checked={updateOption === 'Database_and_FileFolder'}
                                                        onChange={() => setUpdateOption('Database_and_FileFolder')}
                                                        className="radio-input"
                                                    />
                                                    Database & File Folder
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
                                            <Button
                                                variant={"primary"}
                                                disabled={isLoading}
                                                onClick={() => handleUpdateModel(model?.id)}
                                                className="btn btn-primary btn-lg w-100"
                                            >
                                                <BsFillFileEarmarkArrowUpFill />
                                                {isLoading && <span className="button-state-complete">✓</span>}
                                            </Button>

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

