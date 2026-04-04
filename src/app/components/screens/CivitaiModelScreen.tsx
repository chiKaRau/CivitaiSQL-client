import React, { useState, useEffect, useCallback } from 'react';

// Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { togglePanel } from '../../store/actions/panelActions';

// css
import '../../../css/styles.css';

// theme
import { darkTheme, lightTheme } from '../window_offline/OfflineWindow.theme';

// api
import {
    fetchGetOfflineRecordByModelAndVersion,
    fetchCheckModelVersionFileExists
} from '../../api/civitaiSQL_api';

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
    const { civitaiModelID, civitaiVersionID } = civitaiModel;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { isDarkMode } = chrome;

    const panels = useSelector((state: AppState) => state.panel.panels);
    const dispatch = useDispatch();

    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    const [offlineRecord, setOfflineRecord] = useState<any | null>(null);
    const [isModelVersionFileExisting, setIsModelVersionFileExisting] = useState(false);
    const [isCheckingModelStatus, setIsCheckingModelStatus] = useState(false);

    const theme = isDarkMode ? darkTheme : lightTheme;

    const refreshModelStatus = useCallback(async () => {
        if (!civitaiModelID || !civitaiVersionID) {
            setOfflineRecord(null);
            setIsModelVersionFileExisting(false);
            return;
        }

        setIsCheckingModelStatus(true);

        try {
            const [offlineData, fileExistsPayload] = await Promise.all([
                fetchGetOfflineRecordByModelAndVersion(
                    civitaiModelID,
                    civitaiVersionID,
                    dispatch
                ),
                fetchCheckModelVersionFileExists(
                    dispatch,
                    civitaiModelID,
                    civitaiVersionID
                )
            ]);

            setOfflineRecord(offlineData ?? null);
            setIsModelVersionFileExisting(!!fileExistsPayload?.exists);
        } catch (error) {
            console.error("Failed to refresh model status:", error);
            setOfflineRecord(null);
            setIsModelVersionFileExisting(false);
        } finally {
            setIsCheckingModelStatus(false);
        }
    }, [civitaiModelID, civitaiVersionID, dispatch]);

    useEffect(() => {
        refreshModelStatus();
    }, [refreshModelStatus]);

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
            <div style={{ marginBottom: '12px' }}>
                <ButtonsGroup isDarkMode={isDarkMode} />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <BundleButton
                    isDarkMode={isDarkMode}
                    isOfflineRecordExisting={!!offlineRecord}
                    isCheckingOfflineRecord={isCheckingModelStatus}
                    refreshModelStatus={refreshModelStatus}
                />
            </div>

            <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                <CategoriesListSelector />
            </div>

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

            <div style={{ marginBottom: '15px' }}>
                <ModelInfoPanel
                    isDarkMode={isDarkMode}
                    offlineRecord={offlineRecord}
                    isOfflineRecordExisting={!!offlineRecord}
                    isModelVersionFileExisting={isModelVersionFileExisting}
                    isCheckingStatus={isCheckingModelStatus}
                />
            </div>

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