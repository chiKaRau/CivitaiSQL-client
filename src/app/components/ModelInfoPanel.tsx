import React, { useEffect, useState } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { Button } from 'react-bootstrap';
import { fetchFullRecordFromAllTableModelIDandVersionID } from '../api/civitaiSQL_api';

//Model Page
const ModelInfoPanel: React.FC = () => {
    //Redux Store will check which Reducer has the "state.[key]" then return appropriate value from the state
    //Any Changes and Updates in Reducer would trigger rerender
    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const { civitaiUrl, civitaiModelID, civitaiVersionID } = civitaiModel;
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelName = civitaiData?.name;
    const [isLoading, setIsLoading] = useState(false)
    const dispatch = useDispatch();

    const databaseModel = useSelector((state: AppState) => state.databaseModel);
    const { isInDatabase } = databaseModel
    const databaseData: Record<string, any> | undefined = databaseModel.databaseModelObject;
    const databaseModelsList = databaseData;

    const [showDatabaseSection, setShowDatabaseSection] = useState(false);

    const [fullRecord, setFullRecord] = useState<any | null>(null);

    const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

    const handleRetrieveFullInfoData = async () => {
        setIsLoading(true);

        console.log("calling handleRetrieveFullInfoData ")

        const data = await fetchFullRecordFromAllTableModelIDandVersionID(
            civitaiModelID,
            civitaiVersionID,
            dispatch
        );
        console.log("data : ", data)

        // expect the shape you showed: data.payload.model
        setFullRecord(data ?? null);
        setIsLoading(false);
    };

    // auto-load when IDs are available/changed (or call the handler from a button if you prefer)
    useEffect(() => {
        console.log(civitaiModelID)
        console.log(civitaiVersionID)
        if (civitaiModelID && civitaiVersionID) {
            handleRetrieveFullInfoData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [civitaiModelID, civitaiVersionID]);

    const toggleDatabaseSection = () => {
        setShowDatabaseSection(!showDatabaseSection);
    };

    return (
        <div className="infoContainer">
            <div className="modelSection">
                <div className="modelDetails">
                    <div className="modelVersionContainer">
                        <p><b>Model ID: {civitaiModelID}</b></p>
                        <p><b>Version ID: {civitaiVersionID}</b></p>
                    </div>

                    {fullRecord && (
                        <div className="modelTimestamps">
                            <div><strong>Created:</strong> {fmt(fullRecord?.model?.createdAt)}</div>
                            <div><strong>Updated:</strong> {fmt(fullRecord?.model?.updatedAt)}</div>
                        </div>
                    )}

                    {isInDatabase && (
                        <Button
                            onClick={() => toggleDatabaseSection()}
                            variant={showDatabaseSection ? 'danger' : 'primary'}
                        >
                            {databaseModelsList?.length}
                        </Button>
                    )}
                </div>

                {isInDatabase && <hr />}

                <div className="inputContainer">
                    <label className="inputLabel">Name:</label>
                    <input className="inputField" type="text" placeholder="Name" value={modelName} />
                </div>
                <div className="inputContainer">
                    <label className="inputLabel">Url:</label>
                    <input className="inputField" type="text" placeholder="Url" value={civitaiUrl} />
                </div>
                {fullRecord?.model && (<div className="inputContainer">
                    <label className="inputLabel">LocalPath:</label>
                    <input
                        type="text"
                        value={fullRecord?.model?.localPath ?? ''}
                        placeholder="Local Path"
                        readOnly
                        title={fullRecord?.model?.localPath ?? ''}
                        style={{
                            direction: 'rtl',
                            textAlign: 'left',
                            width: '100%',          // keep full width
                            boxSizing: 'border-box' // include padding/border in width
                        }}
                    />

                </div>)}
            </div>
            {isInDatabase && showDatabaseSection && (
                <div className="databaseSection">
                    {databaseModelsList?.map((element: any, index: any) => (
                        <div>
                            <div key={index} className="databaseModelRow">
                                <div className="databaseIdContainer">
                                    <p className="databaseIdText">ID: {element.id}</p>
                                </div>
                                <div className="modelVersionContainer">
                                    <p className="databaseIdText">mID: {element.modelNumber}</p>
                                    {!(civitaiVersionID === element.versionNumber) ?
                                        <p className="databaseIdText">vID: {element.versionNumber}</p>
                                        :
                                        <p className="databaseIdText">vID: <b> {element.versionNumber} </b></p>
                                    }
                                </div>
                            </div>
                            <p>{index + 1}# : {element.name}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ModelInfoPanel;

