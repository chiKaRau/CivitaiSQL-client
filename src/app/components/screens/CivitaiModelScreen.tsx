import React, { useEffect, useState } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { togglePanel } from '../../store/actions/panelActions';
import { Button } from 'react-bootstrap';

//css
import '../../../css/styles.css'; // Import the CSS file

//components
import ButtonsGroup from "../buttons/ButtonsGroup"
import CategoriesListSelector from '../CategoriesListSelector';
import DatabaseModelInfoPanel from '../database_panels/DatabaseModelInfoPanel';
import DatabaseRelatedModelsPanel from '../database_panels/DatabaseRelatedModelsPanel';
import DatabaseLastestAddedModelsPanel from '../database_panels/DatabaseLastestAddedModelsPanel';
import DatabaseUpdateModelPanel from '../database_panels/DatabaseUpdateModelPanel';
import DatabaseCustomModelPanel from '../database_panels/DatabaseCustomModelPanel';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import BundleButton from '../buttons/BundleButton';
import ModelInfoPanel from '../ModelInfoPanel';

//Model Page
const CivitaiModelScreen: React.FC = () => {
    //Redux Store will check which Reducer has the "state.[key]" then return appropriate value from the state
    //Any Changes and Updates in Reducer would trigger rerender
    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const { civitaiUrl, civitaiModelID, civitaiVersionID } = civitaiModel;
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelName = civitaiData?.name;

    const databaseModel = useSelector((state: AppState) => state.databaseModel);
    const { isInDatabase } = databaseModel
    const databaseData: Record<string, any> | undefined = databaseModel.databaseModelObject;
    const databaseModelsList = databaseData;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { bookmarkID, isBookmarked } = chrome;

    const panels = useSelector((state: AppState) => state.panel.panels);
    const dispatch = useDispatch();

    const [showDatabaseSection, setShowDatabaseSection] = useState(false);

    const toggleDatabaseSection = () => {
        setShowDatabaseSection(!showDatabaseSection);
    };
    
    return (
        <>
            {/**Header Buttons */}
            <ButtonsGroup />

            {/**Bundle Button */}
            <BundleButton />

            {/**Categories List Selector */}
            < CategoriesListSelector />

            {/**Folder Lists Option */}
            < DownloadFilePathOptionPanel />
            
            {/**Model Info Panel */}
            <ModelInfoPanel />

            {/**Database Panels */}
            <div>
                {/**Database's Model Infomation Panel*/}
                {
                    panels["DatabaseModelInfoPanel"] && <DatabaseModelInfoPanel toggleDatabaseModelInfoPanelOpen={() => {
                        dispatch(togglePanel("DatabaseModelInfoPanel"));
                    }} />
                }

                {/**Database's Related Models Panel*/}
                {
                    panels["DatabaseRelatedModelsPanel"] && <DatabaseRelatedModelsPanel toggleDatabaseRelatedModelsPanelOpen={() => {
                        dispatch(togglePanel("DatabaseRelatedModelsPanel"));
                    }} />
                }

                {/**Database's Latest Added Models Panel*/}
                {
                    panels["DatabaseLastestAddedModelsPanel"] && <DatabaseLastestAddedModelsPanel toggleDatabaseLastestAddedModelsPanelOpen={() => {
                        dispatch(togglePanel("DatabaseLastestAddedModelsPanel"));
                    }} />
                }

                {/**Database's Latest Added Models Panel*/}
                {
                    panels["DatabaseUpdateModelPanel"] && <DatabaseUpdateModelPanel toggleDatabaseUpdateModelPanelOpen={() => {
                        dispatch(togglePanel("DatabaseUpdateModelPanel"));
                    }} />
                }

                {/**Database's Custom Model Panel*/}
                {
                    panels["DatabaseCustomModelPanel"] && <DatabaseCustomModelPanel toggleDatabaseCustomModelPanelOpen={() => {
                        dispatch(togglePanel("DatabaseCustomModelPanel"));
                    }} />
                }

            </div >
        </>
    );
};

export default CivitaiModelScreen;

