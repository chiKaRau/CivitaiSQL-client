import React, { useEffect, useState, useRef } from "react";

//Components
import { Toast } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel } from 'react-bootstrap';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { BsCheck, BsArrowRepeat } from 'react-icons/bs';
import Spinner from 'react-bootstrap/Spinner';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';

//api
import { fetchDatabaseRelatedModelsByName } from "../../api/civitaiSQL_api"

//util
import { retrievePossibleCombination } from "../../utils/stringUtils"

//Interface
interface DatabaseRelatedModelsPanel {
    toggleDatabaseRelatedModelsPanelOpen: () => void;
}

const DatabaseRelatedModelsPanel: React.FC<DatabaseRelatedModelsPanel> = (props) => {
    const isInitialMount = useRef(true);

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const dispatch = useDispatch();

    const [modelsList, setModelsList] = useState<{ name: string; url: string; id: number; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [possibleCombinationTags, setPossibleCombinationTags] = useState<string[]>([]);
    const [selectedTag, setSelectedTag] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelName = data?.name;
    const modelTags = data?.tags;

    //Find Possible tags from civitai name and tags
    useEffect(() => {
        setPossibleCombinationTags(retrievePossibleCombination(modelName, modelTags))
    }, [])

    useEffect(() => {
        //Prevent trigger handleUpdateModelsList on mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            handleUpdateModelsList();
        }
    }, [selectedTag])

    const handleSelectTag = (tag: string) => {
        if (tag === selectedTag) {
            setSelectedTag("")
        } else {
            setSelectedTag(tag)
        }
    }

    const handleUpdateModelsList = async () => {
        setIsLoading(true)
        const data = await fetchDatabaseRelatedModelsByName(selectedTag, dispatch);
        setModelsList(data)
        setVisibleToasts(data?.map(() => true))
        setIsLoading(false)
    }

    const handleClose = (index: any) => {
        const newVisibleToasts = [...visibleToasts];
        newVisibleToasts[index] = false;
        setVisibleToasts(newVisibleToasts);
    };

    return (
        <div className="panel-container">
            {/* ... other JSX elements ... */}
            <button className="panel-close-button" onClick={props.toggleDatabaseRelatedModelsPanelOpen}>
                <BiUndo />
            </button>

            <div className="panel-container-content">

                <div className="panel-header-text">
                    <h6>Database's Related Models Panel</h6>
                </div>

                {/*Input Field */}
                <InputGroup className="mb-3">
                    <FormControl
                        placeholder="file name"
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                    />
                    <Button variant="outline-secondary" disabled={isLoading} onClick={() => handleUpdateModelsList()}>
                        {isLoading ? <BsArrowRepeat className="spinner" /> : <BsCheck />}
                    </Button>
                </InputGroup>

                {/*Possible Tags */}
                {possibleCombinationTags.map((tag, index) => (
                    <label key={index}
                        className={`panel-tag-button ${tag === selectedTag ? 'panel-tag-default' : 'panel-tag-selected'}`}
                        onClick={() => handleSelectTag(tag)}>
                        {tag}
                    </label>
                ))}

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
                                                        {model?.imageUrls?.map((image, index) => {
                                                            return (
                                                                <Carousel.Item key={index}>
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

                                        </Toast.Body>
                                    </Toast>
                                </div>
                            );
                        })}
                    </>
                }

            </div>
        </div>

    );
};

export default DatabaseRelatedModelsPanel;

