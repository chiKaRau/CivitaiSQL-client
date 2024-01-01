import React, { useEffect, useState } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { Button } from 'react-bootstrap';

//Model Page
const ModelInfoPanel: React.FC = () => {
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

    const [showDatabaseSection, setShowDatabaseSection] = useState(false);

    const toggleDatabaseSection = () => {
        setShowDatabaseSection(!showDatabaseSection);
    };

    return (
        <div className="infoContainer">
            <div className="modelSection">
                <div className="modelDetails">
                    <div className="modelVersionContainer">
                        <p>mID: {civitaiModelID}</p>
                        <p>vID: {civitaiVersionID}</p>
                    </div>
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

