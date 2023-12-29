import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

//Screens
import CivitaiModelScreen from "./app/components/CivitaiModelScreen";
import CivitaiModelsListScreen from "./app/components/CivitaiModelsListScreen";

//Stores
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './app/store/configureStore';
import { AppState } from './app/store/configureStore';
import { updateCivitaiUrl, updateCivitaiModelID, updateCivitaiVersionID, updateCivitaiModelObject } from "./app/actions/civitaiModelActions"
import { setGlobalIsLoading } from "./app/actions/loadingActions"

//Components
import ErrorAlert from "./app/components/ErrorAlert";
import 'bootstrap/dist/css/bootstrap.min.css';
import Spinner from 'react-bootstrap/Spinner';

//utils
import { setupBookmark } from "./app/utils/bookmarkUtils"

//Apis
import { fetchCivitaiModelInfoFromCivitaiByModelID } from "./app/api/civitaiSQL_API"

//README
//2 Sources: Civitai (web api) and Database (local database)
//All panels are fetching record from database

const Popup = () => {
  const gloablIsLoading = useSelector((state: AppState) => state.loading.globalIsLoading);
  const dispatch = useDispatch();

  const [isModelPage, setIsModelPage] = useState(true);

  //Initialize Models Info
  useEffect(() => {

    //Turn on GlobalIsLoading
    dispatch(setGlobalIsLoading(true))

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeURL = tabs[0]?.url;

      if (activeURL) {
        const isModelPage = /\/models\/[^/]+/.test(activeURL);
        if (!isModelPage) {
          setIsModelPage(false)
        } else {
          const modelId = activeURL.match(/\/models\/(\d+)/)?.[1] || '';

          //SETUP Url and modelID
          dispatch(updateCivitaiUrl(activeURL));
          dispatch(updateCivitaiModelID(modelId));

          //SETUP the Rest
          setupCivitaiModelInfo(modelId, activeURL);
        }
      }
    });
  }, []);

  const setupCivitaiModelInfo = async (modelId: string, activeURL: string) => {
    //Fetch Civitai ModelInfo
    const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);

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
      dispatch(updateCivitaiVersionID(versionNumber));

      //Setup Bookmark
      setupBookmark(data?.type, activeURL, dispatch)
    }

    //Turn off GlobalIsLoading
    dispatch(setGlobalIsLoading(false))
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
