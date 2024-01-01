import React, { useEffect, useState } from "react";

//Components
import { Toast } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import { BiUndo } from "react-icons/bi"
import { Carousel } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import CollapsePanel from "./CollapsePanel";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';

//api
import { fetchDatabaseLatestAddedModelsPanel } from "../../api/civitaiSQL_api"

//Interface
interface DatabaseDatabaseCustomModelPanelProps {
    toggleDatabaseCustomModelPanelOpen: () => void;
}

const DatabaseCustomModelPanel: React.FC<DatabaseDatabaseCustomModelPanelProps> = (props) => {

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const { civitaiUrl } = civitaiModel
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false)

    return (
        <div className="panel-container">
            {/* ... other JSX elements ... */}
            <button className="panel-close-button" onClick={props.toggleDatabaseCustomModelPanelOpen}>
                <BiUndo />
            </button>

            <div className="panel-container-content">

                <div className="panel-header-text">
                    <h6>Database's Custom Model Panel</h6>
                </div>


            </div>
        </div>

    );
};

export default DatabaseCustomModelPanel;
