import React, { useEffect, useState, useRef } from "react";
//Components
import { Toast, Collapse } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import { SlDocs } from "react-icons/sl"
import { TbCloudX } from "react-icons/tb"
import { Button, Badge } from 'react-bootstrap';
import { BsCheck, BsArrowRepeat, BsSortDown, BsSortUp, BsType } from 'react-icons/bs';

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

    const [originalModelsList, setOriginalModelsList] = useState<{ name: string; url: string; id: number; baseModel: string; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [modelsList, setModelsList] = useState<{ name: string; url: string; id: number; baseModel: string; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const [isSorted, setIsSorted] = useState(false)
    const [baseModelList, setBaseModelList] = useState<{ baseModel: string, display: boolean }[]>([]);
    const [isColapPanelOpen, setUsColapPanelOpen] = useState(false);


    //Retrivie Modellist when pane is open
    useEffect(() => {
        handleUpdateModelsList();
    }, [])

    useEffect(() => {
        //Preventing First time update
        if (isInitialMount.current) {
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
        setModelsList(data)
        setOriginalModelsList(data);
        const uniqueBaseModels = Array.from(
            new Set(data?.map((obj: any) => obj.baseModel))
        ).map(baseModel => ({ baseModel: baseModel as string, display: true }));
        setBaseModelList(uniqueBaseModels);
        setVisibleToasts(data?.map(() => true))
        setIsLoading(false)
    }

    const handleReverseModelList = () => {
        setModelsList(modelsList?.reverse());
        setOriginalModelsList(originalModelsList?.reverse());
        setIsSorted(!isSorted)
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
        removeBookmarkByUrl(url, dispatch, false);
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

                <div className="buttonGroup" style={{ padding: "5px", display: "flex", justifyContent: "flex-start", alignItems: "flex-start" }}>
                    <div style={{ marginRight: '10px' }}>
                        <Button variant="secondary" disabled={isLoading} onClick={handleReverseModelList}>
                            {isLoading ? <BsArrowRepeat className="spinner" /> : (isSorted ? <BsSortUp /> : <BsSortDown />)}
                        </Button>
                    </div>

                    <div className="collapse-panel-container" style={{ flexShrink: 0, margin: 0, padding: "0px 10px 0px 10px" }}>
                        <div className="toggle-section" onClick={handleToggleColapPanel} aria-controls="collapse-panel-info" aria-expanded={isColapPanelOpen} style={{
                            textAlign: 'center'
                        }}>
                            <BsType />
                        </div>

                        <Collapse in={isColapPanelOpen}>
                            <div id="collapse-panel-info" style={{
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

