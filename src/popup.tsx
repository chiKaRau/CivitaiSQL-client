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
import { fetchCivitaiModelInfoFromCivitaiByModelID, fetchDatabaseModelInfoByModelID } from "./app/api/civitaiSQL_api"

//README
//2 Sources: Civitai (web api) and Database (local database)
//All panels are fetching record from database

//TODO
//Tag Panel
//Custom Panel
//Cart Icon
//Error if not connect to either civitai and database at start
//UI for name and url?
//model exist in database?
//error hanlding

const Popup = () => {
  const gloablIsLoading = useSelector((state: AppState) => state.loading.globalIsLoading);
  const dispatch = useDispatch();

  const [isModelPage, setIsModelPage] = useState(true);

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
      {!gloablIsLoading ?
        <div className="container">
          <ErrorAlert />
          {isModelPage ? <CivitaiModelScreen /> : <CivitaiModelsListScreen />}
        </div>
        :
        <div className="container container-content-center">
          <Spinner animation="grow" />
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
