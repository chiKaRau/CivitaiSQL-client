import React, { useEffect, useState } from "react";

//also remove bookmark
//prob option?

//Components
import { Toast } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';

//api
import { fetchDatabaseModelInfoByModelID } from "../../api/civitaiSQL_api"

//Interface
interface DatabaseModelInfoPanelProps {
    toggleDatabaseModelInfoPanelOpen: () => void;
}

const DatabaseModelInfoPanel: React.FC<DatabaseModelInfoPanelProps> = (props) => {

    const databaseModel = useSelector((state: AppState) => state.databaseModel);
    const databaseData: Record<string, any> | undefined = databaseModel.databaseModelObject;
    const databaseModelsList = databaseData;
    
    const [modelsList, setModelsList] = useState<{ name: string; url: string; id: number; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        handleCallingAPI();
    }, [])

    const handleCallingAPI = async () => {
        setIsLoading(true)

        const data: { name: string; url: string; id: number; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[] = databaseModelsList.map((record: any) => ({
            name: record.name,
            url: record.url,
            id: record.id,
            imageUrls: record.imageUrls,
        }));

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
            <button className="panel-close-button" onClick={props.toggleDatabaseModelInfoPanelOpen}>
                <BiUndo />
            </button>

            <div className="panel-container-content">

                <div className="panel-header-text">
                    <h6>Database's ModelInfo Panel</h6>
                </div>

                {isLoading ?
                    <div className="centered-spinner-container">
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

export default DatabaseModelInfoPanel;

