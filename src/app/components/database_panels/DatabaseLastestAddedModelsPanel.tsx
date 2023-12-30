import React, { useEffect, useState } from "react";

//Components
import { Toast } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import CollapsePanel from "../CollapsePanel";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';

//api
import { fetchDatabaseLastestAddedModelsPanel } from "../../api/civitaiSQL_api"

//Interface
interface DatabaseLastestAddedModelsPanelProps {
    toggleDatabaseLastestAddedModelsPanelOpen: () => void;
}

const DatabaseLastestAddedModelsPanel: React.FC<DatabaseLastestAddedModelsPanelProps> = (props) => {

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const { civitaiUrl } = civitaiModel
    const dispatch = useDispatch();

    const [modelsObject, setModelsObject] = useState({})
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        handleUpdateModelsList();
    }, [])

    const handleUpdateModelsList = async () => {
        setIsLoading(true)
        const data = await fetchDatabaseLastestAddedModelsPanel(dispatch);
        setModelsObject(data)
        setIsLoading(false)
    }

    return (
        <div className="panel-container">
            {/* ... other JSX elements ... */}
            <button className="panel-close-button" onClick={props.toggleDatabaseLastestAddedModelsPanelOpen}>
                <BiUndo />
            </button>

            <div className="panel-container-content">

                <div className="panel-header-text">
                    <h6>Database's Latest Added Models Panel</h6>
                </div>

                {isLoading ?
                    <div className="centered-container">
                        <Spinner />
                    </div>
                    :
                    <>
                        {Object.entries(modelsObject).map(([key, value]) => {
                            return <CollapsePanel collectionName={key} modelsList={value} />
                        })}
                    </>
                }

            </div>
        </div>

    );
};

export default DatabaseLastestAddedModelsPanel;
