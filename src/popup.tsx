import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

//Stores
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './app/store/configureStore';
import { AppState } from './app/store/configureStore';
import { updateCivitaiUrl, updateCivitaiModelID, updateCivitaiVersionID, updateCivitaiModelObject } from "./app/store/actions/civitaiModelActions"
import { UpdateDatabaseModelObject, UpdateIsInDatabase } from "./app/store/actions/databaseModelAction"
import { setGlobalIsLoading } from "./app/store/actions/loadingActions"
import { setError, clearError } from './app/store/actions/errorsActions';


//library Components
import ErrorAlert from "./app/components/ErrorAlert";
import 'bootstrap/dist/css/bootstrap.min.css';
import Spinner from 'react-bootstrap/Spinner';

//component
import CivitaiModelScreen from "./app/components/screens/CivitaiModelScreen";
import CivitaiModelsListScreen from "./app/components/screens/CivitaiModelsListScreen";

//utils
import { setupBookmark } from "./app/utils/chromeUtils"

//Apis
import {
  fetchCivitaiModelInfoFromCivitaiByModelID,
  fetchDatabaseModelInfoByModelID,
  fetchVerifyConnectingDatabase
} from "./app/api/civitaiSQL_api"

//README
//2 Sources: Civitai (web api) and Database (local database)
//All panels are fetching record from database

//TODO
//Custom Panel
//nsfw
//fix added record but doesn't reflect to modeInfopanel
//prob use setState for modellist, then fetch...


const Popup = () => {
  const dispatch = useDispatch();

  const gloablIsLoading = useSelector((state: AppState) => state.loading.globalIsLoading);
  const [isModelPage, setIsModelPage] = useState(true);
  const [isConnectedToDatabase, setIsConnectedDatabase] = useState(false);

  //Initialize Models Info
  useEffect(() => {

    //Turn on GlobalIsLoading
    dispatch(setGlobalIsLoading(true))

    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      const activeURL = tabs[0]?.url;

      if (activeURL) {
        const isModelPage = /\/models\/[^/]+/.test(activeURL);
        if (!isModelPage) {
          setIsModelPage(false)
        } else {
          const modelId = activeURL.match(/\/models\/(\d+)/)?.[1] || '';

          //SETUP the CivitaiModelInfo
          await setupCivitaiModelInfo(modelId, activeURL);

          //SETUP the DatabaseModelInfo
          await setupDatabaseModelInfo(modelId, dispatch);

          //Turn off GlobalIsLoading
          dispatch(setGlobalIsLoading(false))

        }
      }
    });
  }, []);

  const setupDatabaseModelInfo = async (modelID: string, dispatch: any) => {
    dispatch(clearError());

    const connect = await fetchVerifyConnectingDatabase(dispatch);
    if (connect) {
      setIsConnectedDatabase(true)
    }

    //Check for null or empty
    if (modelID === "" || modelID === undefined || modelID === null) {
      dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
      return;
    }

    //Fetch Database ModelInfo
    const data = await fetchDatabaseModelInfoByModelID(modelID, dispatch);
    if (data) {
      dispatch(UpdateDatabaseModelObject(data));
      dispatch(UpdateIsInDatabase(true))
    }
  }

  const setupCivitaiModelInfo = async (modelID: string, activeURL: string) => {
    dispatch(clearError());

    //Check for null or empty
    if (modelID === "" || modelID === undefined || modelID === null ||
      activeURL === "" || activeURL === undefined || activeURL === null) {
      dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
      return;
    }

    //SETUP Url and modelID
    dispatch(updateCivitaiUrl(activeURL));
    dispatch(updateCivitaiModelID(modelID));

    //Fetch Civitai ModelInfo
    const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelID, dispatch);

    if (data) {
      dispatch(updateCivitaiModelObject(data))

      //Verify if concurrent url has versionId, 
      //if it does, use it, otherwise, use the first versionId the the modelVersionId
      const uri = new URL(activeURL);
      let versionNumber = uri.searchParams.get("modelVersionId") || "";
      if (!versionNumber) {
        versionNumber = data?.modelVersions[0]?.id;
      }
      //Setup VersionID
      dispatch(updateCivitaiVersionID(versionNumber.toString()));

      //Setup Bookmark
      setupBookmark(data?.type, activeURL, dispatch)
    }
  };

  return (
    <>
      {
        isModelPage ?
          (isConnectedToDatabase ?
            (
              !gloablIsLoading ?
                <div className="container">
                  <ErrorAlert />
                  <CivitaiModelScreen />
                </div>
                :
                <div className="container container-content-center">
                  <Spinner animation="grow" />
                </div>
            )
            :
            <div className="container">
              <div className="centered-container">
                <h2> Connecting to database... </h2>
              </div>
            </div>)
          :
          <div className="container">
            <ErrorAlert />
            <CivitaiModelsListScreen />
          </div>
      }

    </>
  );
};


const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <Popup />
    </Provider>
  </React.StrictMode>
);
