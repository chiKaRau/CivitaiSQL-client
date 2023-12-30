import React, { useEffect, useState } from "react";

//Components
import { Toast } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { Carousel, Collapse } from 'react-bootstrap';

//Interface
interface CollapsePanelProps {
    collectionName: string;
    modelsList: any;
}

const CollapsePanel: React.FC<CollapsePanelProps> = (props) => {

    const [modelsList, setModelsList] = useState<{ name: string; url: string; id: number; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setModelsList(props?.modelsList)
        setVisibleToasts(props?.modelsList?.map(() => true))
    }, [])

    const handleClose = (index: any) => {
        const newVisibleToasts = [...visibleToasts];
        newVisibleToasts[index] = false;
        setVisibleToasts(newVisibleToasts);
    };

    return (

        <div className="collapse-panel-container">
            <div className="toggle-section"
                onClick={() => setOpen(!open)} aria-controls="collapse-panel" aria-expanded={open}>
                <center>{props?.collectionName}</center>
            </div>
            <hr />

            <Collapse in={open}>
                <div id="collapse-panel">
                    {modelsList?.map((model, index) => {
                        if (!visibleToasts[index]) return null; // Hide the toast if the flag is false

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
                </div>
            </Collapse>
        </div>

    );
};

export default CollapsePanel;
