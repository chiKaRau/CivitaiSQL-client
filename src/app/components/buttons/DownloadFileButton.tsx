import React, { useState, useRef, CSSProperties, useEffect } from "react";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { updateDownloadMethod } from "../../store/actions/chromeActions"
import { setError, clearError } from '../../store/actions/errorsActions';

//Components
import { Button, OverlayTrigger, Tooltip, Dropdown, ButtonGroup } from 'react-bootstrap';
import { BsCloudDownloadFill } from 'react-icons/bs';
import { FcDownload } from "react-icons/fc";

//api
import {
    fetchDownloadFilesByServer, fetchDownloadFilesByBrowser
} from "../../api/civitaiSQL_api"

//utils
import { updateDownloadMethodIntoChromeStorage, callChromeBrowserDownload } from "../../utils/chromeUtils"
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils"


const DownloadFileButton: React.FC = (props: any) => {
    const isInitialMount = useRef(true);

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl, civitaiModelID, civitaiVersionID } = civitaiModel

    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadMethod, downloadFilePath } = chrome;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        //Preventing First time update
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            updateDownloadMethodIntoChromeStorage(downloadMethod);
        }
    }, [downloadMethod])

    // Function to handle the API call and update the button state
    const handleDownloadFile = async () => {
        setIsLoading(true);
        dispatch(clearError());

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        let filesList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID)

        //Check for null or empty
        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            filesList === null || !filesList.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        if (downloadMethod === "server") {
            //If download Method is server, the server will download the file into server's folder
            await fetchDownloadFilesByServer(civitaiUrl, civitaiFileName, civitaiModelID,
                civitaiVersionID, downloadFilePath, filesList, dispatch);
        } else {
            //if download Method is browser, the chrome browser will download the file into server's folder
            await fetchDownloadFilesByBrowser(civitaiUrl, downloadFilePath, dispatch);
            callChromeBrowserDownload({
                name: retrieveCivitaiFileName(civitaiData, civitaiVersionID), modelID: civitaiModelID,
                versionID: civitaiVersionID, downloadFilePath: downloadFilePath, filesList: filesList
            })
        }
        setIsLoading(false);
    };

    return (
        <OverlayTrigger placement={"bottom"}
            overlay={<Tooltip id="tooltip">{`Download By ${downloadMethod === "server" ? "server" : "browser"}`}</Tooltip>}>
            <Dropdown as={ButtonGroup}>
                <Button variant="success"
                    disabled={isLoading}
                    onClick={handleDownloadFile} >
                    {downloadMethod === "server" ? <BsCloudDownloadFill /> : <FcDownload />}
                </Button>
                <Dropdown.Toggle split variant="success" id="dropdown-split-basic" />
                <Dropdown.Menu>
                    <Dropdown.Item
                        active={downloadMethod === "server"}
                        onClick={() => dispatch(updateDownloadMethod("server"))} >
                        server
                    </Dropdown.Item>
                    <Dropdown.Item
                        active={downloadMethod === "browser"}
                        onClick={() => dispatch(updateDownloadMethod("browser"))} >
                        browser
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </OverlayTrigger>
    );
};

export default DownloadFileButton;

