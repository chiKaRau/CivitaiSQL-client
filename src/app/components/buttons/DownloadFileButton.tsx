import React, { useState, useRef, useEffect } from "react";

// Store
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../store/configureStore";
import { updateDownloadMethod } from "../../store/actions/chromeActions";
import { setError, clearError } from "../../store/actions/errorsActions";

// Components
import { Button, OverlayTrigger, Tooltip, Dropdown, ButtonGroup } from "react-bootstrap";
import { BsCloudDownloadFill } from "react-icons/bs";
import { FcDownload } from "react-icons/fc";
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";

// api
import {
    fetchDownloadFilesByServer,
    fetchDownloadFilesByServer_v2,
    fetchDownloadFilesByBrowser_v2,
    fetchDownloadFilesByBrowser,
    fetchCivitaiModelInfoFromCivitaiByVersionID
} from "../../api/civitaiSQL_api";

// utils
import {
    updateDownloadMethodIntoChromeStorage,
    callChromeBrowserDownload,
    callChromeBrowserDownload_v2
} from "../../utils/chromeUtils";
import {
    retrieveCivitaiFileName,
    retrieveCivitaiFilesList
} from "../../utils/objectUtils";

interface DownloadFileButtonProps {
    isDarkMode?: boolean;
    withShell?: boolean;
}

const DownloadFileButton: React.FC<DownloadFileButtonProps> = ({
    isDarkMode = true,
    withShell = true
}) => {
    const isInitialMount = useRef(true);

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl, civitaiModelID, civitaiVersionID } = civitaiModel;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadMethod, downloadFilePath } = chrome;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);

    const theme = isDarkMode ? darkTheme : lightTheme;

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            updateDownloadMethodIntoChromeStorage(downloadMethod);
        }
    }, [downloadMethod]);

    const handleDownloadFile = async () => {
        setIsLoading(true);
        dispatch(clearError());

        const civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        const filesList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID);

        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            filesList === null || !filesList.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        if (downloadMethod === "server") {
            await fetchDownloadFilesByServer(
                civitaiUrl,
                civitaiFileName,
                civitaiModelID,
                civitaiVersionID,
                downloadFilePath,
                filesList,
                dispatch
            );
        } else {
            await fetchDownloadFilesByBrowser(civitaiUrl, downloadFilePath, dispatch);
            callChromeBrowserDownload({
                name: retrieveCivitaiFileName(civitaiData, civitaiVersionID),
                modelID: civitaiModelID,
                versionID: civitaiVersionID,
                downloadFilePath: downloadFilePath,
                filesList: filesList
            });
        }

        setIsLoading(false);
    };

    const handleDownloadFile_v2 = async () => {
        setIsLoading(true);
        dispatch(clearError());

        const civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        const civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID);

        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            civitaiModelFileList === null || !civitaiModelFileList.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        const modelObject = {
            downloadFilePath,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl
        };

        if (downloadMethod === "server") {
            await fetchDownloadFilesByServer_v2(modelObject, dispatch);
        } else {
            await fetchDownloadFilesByBrowser_v2(civitaiUrl, downloadFilePath, dispatch);

            try {
                const data = await fetchCivitaiModelInfoFromCivitaiByVersionID(civitaiVersionID, dispatch);
                if (data) {
                    callChromeBrowserDownload_v2({ ...modelObject, modelVersionObject: data });
                } else {
                    throw new Error();
                }
            } catch (error) {
                console.error("Error fetching data for civitaiVersionID:", civitaiVersionID, error);
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            }
        }

        setIsLoading(false);
    };

    return (
        <div
            style={
                withShell
                    ? {
                        flexShrink: 0,
                        margin: "1px 3px",
                        padding: "5px",
                        display: "inline-block",
                        verticalAlign: "top",
                        border: "1px solid transparent",
                        borderRadius: "10px",
                        background: "transparent"
                    }
                    : {
                        display: "inline-block",
                        verticalAlign: "top"
                    }
            }
        >
            <OverlayTrigger
                placement="bottom"
                overlay={
                    <Tooltip id="tooltip">
                        {`Download By ${downloadMethod === "server" ? "server" : "browser"}`}
                    </Tooltip>
                }
            >
                <Dropdown as={ButtonGroup}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "stretch",
                            borderRadius: "8px",
                            overflow: "hidden",
                            boxShadow: isDarkMode
                                ? "0 4px 12px rgba(0,0,0,0.25)"
                                : "0 4px 12px rgba(0,0,0,0.08)"
                        }}
                    >
                        <Button
                            disabled={isLoading}
                            onClick={handleDownloadFile_v2}
                            style={{
                                backgroundColor: theme.headerBackgroundColor,
                                color: theme.headerFontColor,
                                border: `1px solid ${theme.evenRowBackgroundColor}`,
                                borderRight: `1px solid ${theme.evenRowBackgroundColor}`,
                                borderRadius: "8px 0 0 8px",
                                padding: "10px 12px",
                                minWidth: "46px",
                                minHeight: "44px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                lineHeight: 1
                            }}
                        >
                            {downloadMethod === "server" ? <BsCloudDownloadFill /> : <FcDownload />}
                        </Button>

                        <Dropdown.Toggle
                            split
                            id="dropdown-split-basic"
                            disabled={isLoading}
                            style={{
                                backgroundColor: theme.headerBackgroundColor,
                                color: theme.headerFontColor,
                                border: `1px solid ${theme.evenRowBackgroundColor}`,
                                borderLeft: "none",
                                borderRadius: "0 8px 8px 0",
                                padding: "10px 10px",
                                minHeight: "44px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                lineHeight: 1
                            }}
                        />

                        <Dropdown.Menu
                            style={{
                                backgroundColor: theme.headerBackgroundColor,
                                border: `1px solid ${theme.evenRowBackgroundColor}`,
                                borderRadius: "8px",
                                overflow: "hidden"
                            }}
                        >
                            <Dropdown.Item
                                active={downloadMethod === "server"}
                                onClick={() => dispatch(updateDownloadMethod("server"))}
                                style={{
                                    backgroundColor:
                                        downloadMethod === "server"
                                            ? theme.rowBackgroundColor
                                            : theme.headerBackgroundColor,
                                    color:
                                        downloadMethod === "server"
                                            ? theme.rowFontColor
                                            : theme.headerFontColor
                                }}
                            >
                                server
                            </Dropdown.Item>

                            <Dropdown.Item
                                active={downloadMethod === "browser"}
                                onClick={() => dispatch(updateDownloadMethod("browser"))}
                                style={{
                                    backgroundColor:
                                        downloadMethod === "browser"
                                            ? theme.rowBackgroundColor
                                            : theme.headerBackgroundColor,
                                    color:
                                        downloadMethod === "browser"
                                            ? theme.rowFontColor
                                            : theme.headerFontColor
                                }}
                            >
                                browser
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </div>
                </Dropdown>
            </OverlayTrigger>
        </div>
    );
};

export default DownloadFileButton;