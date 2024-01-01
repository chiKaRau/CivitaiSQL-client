import React, { useEffect, useState, useRef } from "react";
//Components
import { Toast } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import { SlDocs } from "react-icons/sl"
import { TbCloudX } from "react-icons/tb"
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { setIsBookmarked } from "../../store/actions/chromeActions"
import { setError, clearError } from '../../store/actions/errorsActions';

//api
import {
    fetchAddRecordToDatabase, fetchRemoveRecordFromDatabaseByID,
    fetchDatabaseModelInfoByModelID
} from "../../api/civitaiSQL_api"

//utils
import { removeBookmarkByUrl, bookmarkThisModel, unBookmarkThisModel } from "../../utils/chromeUtils"

//Interface
interface DatabaseModelInfoPanelProps {
    toggleDatabaseModelInfoPanelOpen: () => void;
}

const DatabaseModelInfoPanel: React.FC<DatabaseModelInfoPanelProps> = (props) => {
    const isInitialMount = useRef(true);

    const dispatch = useDispatch();

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl } = civitaiModel

    const databaseModel = useSelector((state: AppState) => state.databaseModel);
    const databaseData: Record<string, any> | undefined = databaseModel.databaseModelObject;
    const databaseModelsList = databaseData;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedCategory, bookmarkID } = chrome;

    const [modelsList, setModelsList] = useState<{ name: string; url: string; id: number; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [isLoading, setIsLoading] = useState(false)

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
        bookmarkThisModel(civitaiData?.type, dispatch)
        props.toggleDatabaseModelInfoPanelOpen()
        setIsLoading(false)
    }

    const handleRemoveModelFromDatabase = (id: number) => {
        setIsLoading(true)
        dispatch(clearError());

        //Check for null or empty
        if (id === null || id === undefined) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        fetchRemoveRecordFromDatabaseByID(id, dispatch)
        props.toggleDatabaseModelInfoPanelOpen()
        setIsLoading(false)
    }

    const handleRemoveModelBookmarkByUrl = (url: string) => {
        removeBookmarkByUrl(url, dispatch);
        if (url === civitaiUrl) {
            dispatch(setIsBookmarked(true))
        }
    }

    return (
        <div className="panel-container">
            {/* ... other JSX elements ... */}
            <button className="panel-close-button" onClick={props.toggleDatabaseModelInfoPanelOpen}>
                <BiUndo />
            </button>

            <div className="panel-container-content">

                <div className="panel-header-text">
                    <h6>Database's ModelInfo Panel</h6>
                </div>

                <Button
                    variant={"primary"}
                    onClick={handleAddModeltoDatabase}
                    disabled={isLoading}
                    className="btn btn-primary btn-lg w-100"
                >
                    <SlDocs />
                    {isLoading && <span className="button-state-complete">✓</span>}
                </Button>

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


                                            {/**Remove button */}
                                            <Button
                                                variant={"danger"}
                                                disabled={isLoading}
                                                onClick={() => {
                                                    handleRemoveModelBookmarkByUrl(model?.url);
                                                    handleRemoveModelFromDatabase(model?.id);
                                                }}
                                                className="btn btn-danger btn-lg w-100"
                                            >
                                                <TbCloudX />
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

export default DatabaseModelInfoPanel;

