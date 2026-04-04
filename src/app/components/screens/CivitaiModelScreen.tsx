import React, { useState } from 'react';

// Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { togglePanel } from '../../store/actions/panelActions';

// css
import '../../../css/styles.css';

// theme
import { darkTheme, lightTheme } from '../window_offline/OfflineWindow.theme';

// components
import ButtonsGroup from "../buttons/ButtonsGroup";
import CategoriesListSelector from '../CategoriesListSelector';
import DatabaseModelInfoPanel from '../database_panels/DatabaseModelInfoPanel';
import DatabaseRelatedModelsPanel from '../database_panels/DatabaseRelatedModelsPanel';
import DatabaseLastestAddedModelsPanel from '../database_panels/DatabaseLastestAddedModelsPanel';
import DatabaseUpdateModelPanel from '../database_panels/DatabaseUpdateModelPanel';
import DatabaseCustomModelPanel from '../database_panels/DatabaseCustomModelPanel';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import BundleButton from '../buttons/BundleButton';
import ModelInfoPanel from '../ModelInfoPanel';
import FolderDropdown from "../FolderDropdown";

// Model Page
const CivitaiModelScreen: React.FC = () => {
    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const { civitaiUrl, civitaiModelID, civitaiVersionID } = civitaiModel;
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelName = civitaiData?.name;

    const databaseModel = useSelector((state: AppState) => state.databaseModel);
    const { isInDatabase } = databaseModel;
    const databaseData: Record<string, any> | undefined = databaseModel.databaseModelObject;
    const databaseModelsList = databaseData;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { bookmarkID, isBookmarked, isDarkMode } = chrome;

    const panels = useSelector((state: AppState) => state.panel.panels);
    const dispatch = useDispatch();

    const [showDatabaseSection, setShowDatabaseSection] = useState(false);
    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    const toggleDatabaseSection = () => {
        setShowDatabaseSection(!showDatabaseSection);
    };

    const theme = isDarkMode ? darkTheme : lightTheme;

    return (
        <div
            style={{
                backgroundColor: theme.pageBackground,
                color: theme.panelText,
                minHeight: '100vh',
                padding: '12px',
                width: '100%',
                maxWidth: '100%',
                overflowX: 'hidden',
                boxSizing: 'border-box',
            }}
        >
            {/** Header Buttons */}
            <div style={{ marginBottom: '12px' }}>
                <ButtonsGroup isDarkMode={isDarkMode} />
            </div>

            {/** Bundle Button */}
            <div style={{ marginBottom: '15px' }}>
                <BundleButton isDarkMode={isDarkMode} />
            </div>

            {/** Categories List Selector */}
            <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                <CategoriesListSelector />
            </div>

            {/** Folder Lists Option */}
            <div style={{ marginBottom: '15px' }}>
                <DownloadFilePathOptionPanel
                    setIsHandleRefresh={setIsHandleRefresh}
                    isHandleRefresh={isHandleRefresh}
                    isDarkMode={isDarkMode}
                />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <FolderDropdown isDarkMode={isDarkMode} />
            </div>

            {/** Model Info Panel */}
            <div style={{ marginBottom: '15px' }}>
                <ModelInfoPanel isDarkMode={isDarkMode} />
            </div>

            {/** Database Panels */}
            <div>
                {panels["DatabaseModelInfoPanel"] && (
                    <DatabaseModelInfoPanel
                        isDarkMode={isDarkMode}
                        toggleDatabaseModelInfoPanelOpen={() => {
                            dispatch(togglePanel("DatabaseModelInfoPanel"));
                        }}
                    />
                )}

                {panels["DatabaseRelatedModelsPanel"] && (
                    <DatabaseRelatedModelsPanel
                        isDarkMode={isDarkMode}
                        toggleDatabaseRelatedModelsPanelOpen={() => {
                            dispatch(togglePanel("DatabaseRelatedModelsPanel"));
                        }}
                    />
                )}

                {panels["DatabaseLastestAddedModelsPanel"] && (
                    <DatabaseLastestAddedModelsPanel
                        isDarkMode={isDarkMode}
                        toggleDatabaseLastestAddedModelsPanelOpen={() => {
                            dispatch(togglePanel("DatabaseLastestAddedModelsPanel"));
                        }}
                    />
                )}

                {panels["DatabaseUpdateModelPanel"] && (
                    <DatabaseUpdateModelPanel
                        isDarkMode={isDarkMode}
                        toggleDatabaseUpdateModelPanelOpen={() => {
                            dispatch(togglePanel("DatabaseUpdateModelPanel"));
                        }}
                    />
                )}

                {panels["DatabaseCustomModelPanel"] && (
                    <DatabaseCustomModelPanel
                        isDarkMode={isDarkMode}
                        toggleDatabaseCustomModelPanelOpen={() => {
                            dispatch(togglePanel("DatabaseCustomModelPanel"));
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default CivitaiModelScreen;