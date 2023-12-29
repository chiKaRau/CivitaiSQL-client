import React, { useEffect, useState } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { togglePanel } from '../actions/panelActions';

//css
import '../../css/styles.css'; // Import the CSS file

//components
import ButtonsGroup from "./ButtonsGroup"
import ModelInfoPanel from './ModelInfoPanel';
import RelatedModelsPanel from './RelatedModelsPanel';

//Model Page
const CivitaiModelScreen: React.FC = () => {
    //Redux Store will check which Reducer has the "state.[key]" then return appropriate value from the state
    //Any Changes and Updates in Reducer would trigger rerender
    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const panels = useSelector((state: AppState) => state.panel.panels);
    const dispatch = useDispatch();

    const { civitaiUrl, civitaiModelID, civitaiVersionID, bookmarkID, isBookmarked } = civitaiModel;
    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelName = data?.name;

    return (
        <>
            <ButtonsGroup />

            <div>
                <p> CivitaiModelScreen </p>
                <p> Url: {civitaiUrl}</p>
                <p> ModelID: {civitaiModelID}</p>
                <p> VersionID: {civitaiVersionID}</p>
                <p> Name: {modelName}</p>
                <p> bookmarkID: {bookmarkID}</p>
                <p> isBookmarked: {isBookmarked ? "true" : "false"}</p>
            </div>

            <div>

                {/**Database's Model Infomation Panel*/}
                {panels["ModelInfoPanel"] && <ModelInfoPanel toggleModelInfoPanelOpen={() => {
                    dispatch(togglePanel("ModelInfoPanel"));
                }} />}

                {/**Database's Related Models Panel*/}
                {panels["RelatedModelsPanel"] && <RelatedModelsPanel toggleRelatedModelsPanelOpen={() => {
                    dispatch(togglePanel("RelatedModelsPanel"));
                }} />}
            </div>
        </>
    );
};

export default CivitaiModelScreen;

