import React, { useEffect, useState } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { togglePanel } from '../../store/actions/panelActions';

//css
import '../../../css/styles.css'; // Import the CSS file

//components
import ButtonsGroup from "../buttons/ButtonsGroup"
import CategoriesListSelector from '../CategoriesListSelector';
import DatabaseModelInfoPanel from '../database_panels/DatabaseModelInfoPanel';
import DatabaseRelatedModelsPanel from '../database_panels/DatabaseRelatedModelsPanel';
import DatabaseLastestAddedModelsPanel from '../database_panels/DatabaseLastestAddedModelsPanel';
import DatabaseUpdateModelPanel from '../database_panels/DatabaseUpdateModelPanel';

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


    return (
        <>
            {/**Header Buttons */}
            <ButtonsGroup />

            <div>
                <p> CivitaiModelSection </p>
                <p> Url: {civitaiUrl}</p>
                <p> ModelID: {civitaiModelID}</p>
                <p> VersionID: {civitaiVersionID}</p>
                <p> Name: {modelName}</p>
                <p> bookmarkID: {bookmarkID}</p>
                <p> isBookmarked: {isBookmarked ? "true" : "false"}</p>
            </div>

            {isInDatabase && (
                <div>
                    <p>DatabaseModelSection</p>
                    <p>Total Models: {databaseModelsList?.length}</p>
                    {databaseModelsList?.map((element: any, index: any) => (
                        <div key={index}>
                            <p>id: {element.id}</p>
                            <p>name: {element.name}</p>
                        </div>
                    ))}
                </div>
            )}

            {/**Categories List Selector */}
            <CategoriesListSelector />

            {/**Database Panels */}
            <div>
                {/**Database's Model Infomation Panel*/}
                {panels["DatabaseModelInfoPanel"] && <DatabaseModelInfoPanel toggleDatabaseModelInfoPanelOpen={() => {
                    dispatch(togglePanel("DatabaseModelInfoPanel"));
                }} />}

                {/**Database's Related Models Panel*/}
                {panels["DatabaseRelatedModelsPanel"] && <DatabaseRelatedModelsPanel toggleDatabaseRelatedModelsPanelOpen={() => {
                    dispatch(togglePanel("DatabaseRelatedModelsPanel"));
                }} />}

                {/**Database's Latest Added Models Panel*/}
                {panels["DatabaseLastestAddedModelsPanel"] && <DatabaseLastestAddedModelsPanel toggleDatabaseLastestAddedModelsPanelOpen={() => {
                    dispatch(togglePanel("DatabaseLastestAddedModelsPanel"));
                }} />}

                {/**Database's Latest Added Models Panel*/}
                {panels["DatabaseUpdateModelPanel"] && <DatabaseUpdateModelPanel toggleDatabaseUpdateModelPanelOpen={() => {
                    dispatch(togglePanel("DatabaseUpdateModelPanel"));
                }} />}

            </div>
        </>
    );
};

export default CivitaiModelScreen;

