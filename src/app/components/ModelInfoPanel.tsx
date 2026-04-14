import React, { useEffect, useState } from 'react';

// Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
    fetchFullRecordFromAllTableModelIDandVersionID
} from '../api/civitaiSQL_api';

// icons
import {
    AiFillCheckCircle,
    AiFillCloseCircle,
    AiFillDatabase,
    AiFillFile,
    AiOutlineQuestionCircle
} from 'react-icons/ai';

// theme
import { darkTheme, lightTheme } from './window_offline/OfflineWindow.theme';
import ModelVersionFileExistsBadge from './ModelVersionFileExistsBadge';

// Interface
interface ModelInfoPanelProps {
    isDarkMode?: boolean;
    offlineRecord?: any | null;
    isOfflineRecordExisting?: boolean;
    isCheckingStatus?: boolean;
}

// Model Page
const ModelInfoPanel: React.FC<ModelInfoPanelProps> = ({
    isDarkMode = true,
    offlineRecord = null,
    isOfflineRecordExisting = false,
    isCheckingStatus = false
}) => {
    const theme = isDarkMode ? darkTheme : lightTheme;

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const { civitaiUrl, civitaiModelID, civitaiVersionID } = civitaiModel;
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelName = civitaiData?.name;

    const [isLoading, setIsLoading] = useState(false);
    const dispatch = useDispatch();

    const databaseModel = useSelector((state: AppState) => state.databaseModel);
    const { isInDatabase } = databaseModel;
    const databaseData: Record<string, any> | undefined = databaseModel.databaseModelObject;
    const databaseModelsList = databaseData;

    const [showDatabaseSection, setShowDatabaseSection] = useState(false);
    const [fullRecord, setFullRecord] = useState<any | null>(null);

    const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

    const handleRetrieveFullInfoData = async () => {
        setIsLoading(true);

        try {
            const data = await fetchFullRecordFromAllTableModelIDandVersionID(
                civitaiModelID,
                civitaiVersionID,
                dispatch
            );
            setFullRecord(data ?? null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (civitaiModelID && civitaiVersionID) {
            handleRetrieveFullInfoData();
        } else {
            setFullRecord(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [civitaiModelID, civitaiVersionID]);

    const toggleDatabaseSection = () => {
        setShowDatabaseSection(!showDatabaseSection);
    };

    const panelStyle: React.CSSProperties = {
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: '10px',
        padding: '14px',
        boxShadow: isDarkMode
            ? '0 6px 18px rgba(0,0,0,0.35)'
            : '0 6px 18px rgba(0,0,0,0.10)',
    };

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px',
        flexWrap: 'wrap',
    };

    const labelStyle: React.CSSProperties = {
        minWidth: '150px',
        fontWeight: 600,
        color: theme.panelText,
    };

    const inputStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,
        backgroundColor: theme.rowBackgroundColor,
        color: theme.rowFontColor,
        border: `1px solid ${theme.evenRowBackgroundColor}`,
        borderRadius: '8px',
        padding: '8px 10px',
        outline: 'none',
    };

    const readOnlyPathStyle: React.CSSProperties = {
        ...inputStyle,
        direction: 'rtl',
        textAlign: 'left',
        width: '100%',
        boxSizing: 'border-box',
    };

    return (
        <div style={panelStyle}>
            <div style={{ marginBottom: '12px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                    }}
                >
                    <div>
                        <div style={{ fontWeight: 700, color: theme.panelText }}>
                            Model ID: {civitaiModelID || '—'}
                        </div>
                        <div style={{ fontWeight: 700, color: theme.panelText }}>
                            Version ID: {civitaiVersionID || '—'}
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginLeft: 'auto',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: theme.subText,
                                fontWeight: 600,
                            }}
                        >
                            {isOfflineRecordExisting && (
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip id="tooltip-offline-record">Exists in Offline List</Tooltip>}
                                >
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <AiFillDatabase size={20} color="#22c55e" />
                                    </span>
                                </OverlayTrigger>
                            )}

                            <ModelVersionFileExistsBadge
                                modelID={civitaiModelID}
                                versionID={civitaiVersionID}
                            />
                        </div>

                        {isInDatabase && (
                            <Button
                                onClick={toggleDatabaseSection}
                                disabled={isLoading}
                                style={{
                                    backgroundColor: theme.headerBackgroundColor,
                                    color: theme.headerFontColor,
                                    border: `1px solid ${theme.evenRowBackgroundColor}`,
                                    borderRadius: '8px',
                                    minHeight: '40px',
                                    minWidth: '46px',
                                    boxShadow: isDarkMode
                                        ? '0 4px 12px rgba(0,0,0,0.25)'
                                        : '0 4px 12px rgba(0,0,0,0.08)',
                                }}
                            >
                                {databaseModelsList?.length ?? 0}
                            </Button>
                        )}
                    </div>
                </div>

                {fullRecord && (
                    <div
                        style={{
                            marginTop: '10px',
                            color: theme.subText,
                            fontSize: '0.95rem',
                        }}
                    >
                        <div><strong>Created:</strong> {fmt(fullRecord?.model?.createdAt)}</div>
                        <div><strong>Updated:</strong> {fmt(fullRecord?.model?.updatedAt)}</div>
                    </div>
                )}
            </div>

            {isInDatabase && (
                <hr
                    style={{
                        border: 0,
                        borderTop: `1px solid ${theme.panelBorder}`,
                        margin: '12px 0',
                    }}
                />
            )}

            <div style={rowStyle}>
                <label style={labelStyle}>Name:</label>
                <input
                    style={inputStyle}
                    type="text"
                    placeholder="Name"
                    value={modelName ?? ''}
                    readOnly
                />
            </div>

            <div style={rowStyle}>
                <label style={labelStyle}>Url:</label>
                <input
                    style={inputStyle}
                    type="text"
                    placeholder="Url"
                    value={civitaiUrl ?? ''}
                    readOnly
                />
            </div>

            {fullRecord?.model && (
                <div style={rowStyle}>
                    <label style={labelStyle}>LocalPath:</label>
                    <input
                        type="text"
                        value={fullRecord?.model?.localPath ?? ''}
                        placeholder="Local Path"
                        readOnly
                        title={fullRecord?.model?.localPath ?? ''}
                        style={readOnlyPathStyle}
                    />
                </div>
            )}

            {offlineRecord?.downloadFilePath && (
                <div style={rowStyle}>
                    <label style={labelStyle}>Offline DownloadPath:</label>
                    <input
                        type="text"
                        value={offlineRecord?.downloadFilePath ?? ''}
                        placeholder="Offline DownloadPath"
                        readOnly
                        title={offlineRecord?.downloadFilePath ?? ''}
                        style={readOnlyPathStyle}
                    />
                </div>
            )}

            {isInDatabase && showDatabaseSection && (
                <div
                    style={{
                        marginTop: '14px',
                        padding: '12px',
                        backgroundColor: theme.headerBackgroundColor,
                        color: theme.headerFontColor,
                        border: `1px solid ${theme.evenRowBackgroundColor}`,
                        borderRadius: '8px',
                        boxShadow: isDarkMode
                            ? '0 6px 18px rgba(0,0,0,0.35)'
                            : '0 6px 18px rgba(0,0,0,0.10)',
                    }}
                >
                    {databaseModelsList?.map((element: any, index: number) => (
                        <div
                            key={element.id ?? index}
                            style={{
                                padding: '10px 0',
                                borderBottom:
                                    index !== databaseModelsList.length - 1
                                        ? `1px solid ${theme.panelBorder}`
                                        : 'none',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '14px',
                                    marginBottom: '6px',
                                    color: theme.subText,
                                }}
                            >
                                <span>ID: {element.id}</span>
                                <span>mID: {element.modelNumber}</span>
                                <span>
                                    vID:{' '}
                                    {civitaiVersionID === element.versionNumber
                                        ? <b>{element.versionNumber}</b>
                                        : element.versionNumber}
                                </span>
                            </div>

                            <div style={{ color: theme.panelText }}>
                                {index + 1}# : {element.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ModelInfoPanel;