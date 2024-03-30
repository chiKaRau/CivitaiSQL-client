import React, { useEffect, useState, useRef } from "react";

//Components
import { Toast, Badge } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel } from 'react-bootstrap';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { BsCheck, BsArrowRepeat } from 'react-icons/bs';
import Spinner from 'react-bootstrap/Spinner';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { setError, clearError } from '../../store/actions/errorsActions';

//api
import {
    fetchDatabaseRelatedModelsByName,
    fetchDatabaseRelatedModelsByTagsList
} from "../../api/civitaiSQL_api"

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

    const [modelsList, setModelsList] = useState<{ name: string; url: string; id: number; baseModel: string; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [possibleCombinationTags, setPossibleCombinationTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false)
    const [inputValue, setInputValue] = useState("")


    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelName = data?.name;
    const modelTags = data?.tags;

    //Find Possible tags from civitai name and tags
    useEffect(() => {
        setPossibleCombinationTags(retrievePossibleCombination(modelName, modelTags))
    }, [])

    const handleAddTagIntoSelectedTagsListBySelecting = (tag: string) => {
        if (selectedTags.includes(tag)) {
            // Remove the tag from the array
            setSelectedTags(selectedTags.filter(t => t !== tag));

            // Remove the tag from inputValue if it exists
            setInputValue(prevValue => {
                // Split the inputValue by commas or spaces, trim each part, and filter out the tag
                const tags = prevValue.split(/[\s,]+/).map(t => t.trim()).filter(t => t !== tag && t !== "");
                // Rejoin the remaining tags with ", " to form the updated inputValue
                return tags.join(", ");
            });
        } else {
            // Add the tag to the array
            setSelectedTags([...selectedTags, tag]);

            // Append the tag to inputValue, ensuring it's properly formatted
            setInputValue(prevValue => prevValue ? `${prevValue}, ${tag}` : tag);
        }
    }

    const handleUpdateModelsList = async () => {
        setIsLoading(true)
        dispatch(clearError());

        //Check for null or empty
        if (inputValue === null || inputValue === undefined || inputValue === "") {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        const data = await fetchDatabaseRelatedModelsByTagsList(inputValue.split(/,\s*|\s+/), dispatch);
        setModelsList(data)
        setVisibleToasts(data?.map(() => true))
        setIsLoading(false)
    }

    const handleClose = (index: any) => {
        const newVisibleToasts = [...visibleToasts];
        newVisibleToasts[index] = false;
        setVisibleToasts(newVisibleToasts);
    };

    const handleClearTags = () => {
        setSelectedTags([])
        setInputValue("")
    }

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
                    <Button variant="danger" disabled={isLoading}
                        onClick={handleClearTags}>
                        {isLoading ? <BsArrowRepeat className="spinner" /> : "Clear"}
                    </Button>
                    <FormControl
                        placeholder="file name"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                    <Button variant="primary" disabled={isLoading}
                        onClick={() => handleUpdateModelsList()}>
                        {isLoading ? <BsArrowRepeat className="spinner" /> : "Submit"}
                    </Button>
                </InputGroup>

                {/*Possible Tags */}
                {possibleCombinationTags.map((tag, index) => (
                    <label key={index}
                        className={`panel-tag-button ${inputValue.split(/,\s*|\s+/).includes(tag) ? 'panel-tag-default' : 'panel-tag-selected'}`}
                        onClick={() => handleAddTagIntoSelectedTagsListBySelecting(tag)}>
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
                                                <Badge>{model?.baseModel}</Badge>  <b><span> #{model?.id}</span> : <span>{model?.name}</span></b>
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

