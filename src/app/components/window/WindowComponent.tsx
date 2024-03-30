import React, { useEffect, useState } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';

//Icons Components
import { AiFillFolderOpen } from "react-icons/ai"
import { BsStar, BsFillCloudArrowUpFill, BsFillCartCheckFill, Bs0Circle } from 'react-icons/bs';


//components
import CategoriesListSelector from '../CategoriesListSelector';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import WindowDownloadFileButton from "./WindowDownloadFileButton"
import ButtonWrap from "../buttons/ButtonWrap";
import { Button, OverlayTrigger, Tooltip, Form, Dropdown, ButtonGroup } from 'react-bootstrap';
import ErrorAlert from '../ErrorAlert';

interface updateAvaliable {
    url: string;
    isUpdateAvaliable: any; // Consider specifying a more accurate type instead of 'any' if possible
}

//Apis
import {
    fetchCivitaiModelInfoFromCivitaiByModelID,
    fetchAddRecordToDatabase,
    fetchDownloadFilesByServer,
    fetchDownloadFilesByBrowser,
    fetchDatabaseModelInfoByModelID,
    fetchRemoveRecordFromDatabaseByID,
    fetchOpenDownloadDirectory,
    fetchCheckIfUrlExistInDatabase,
    fetchCheckQuantityofUrlinDatabaseByUrl,
    fetchCheckQuantityofUrlinDatabaseByModelID,
    fetchCheckIfModelUpdateAvaliable
} from "../../api/civitaiSQL_api"

//utils
import { bookmarkThisUrl, updateDownloadMethodIntoChromeStorage, callChromeBrowserDownload, removeBookmarkByUrl } from "../../utils/chromeUtils"
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils"
import { BiSolidBarChartSquare, BiSolidHdd } from 'react-icons/bi';

const WindowComponent: React.FC = () => {

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false)

    const [countdown, setCountdown] = useState(0);
    const [counter, setCounter] = useState(0);
    const [counting, setCounting] = useState(false);
    const [checkingListSize, setCheckingListSize] = useState(0);

    const [checkboxMode, setCheckboxMode] = useState(false);
    const [resetMode, setResetMode] = useState(false);

    const [urlList, setUrlList] = useState<string[]>([]);
    const [checkedUrlList, setCheckedUrlList] = useState<string[]>([]);

    //const [originalTabId, setOriginalTabId] = useState(0);
    const [workingModelID, setWorkingModelID] = useState("");

    const chromeData = useSelector((state: AppState) => state.chrome);
    const { downloadMethod, downloadFilePath, selectedCategory } = chromeData;

    const [startModelName, setStartModelName] = useState("");
    const [processingModelName, setProcessingModelName] = useState("");
    const [endModelName, setEndModelName] = useState("");


    useEffect(() => {
        resetCheckedUrlList();
        handleCheckSavedDatabase();
        setResetMode(false)
    }, [resetMode])

    useEffect(() => {
        handleToggleCheckBoxMode()
    }, [])

    useEffect(() => {
        //console.log('Updated checkedUrlList:', checkedUrlList.length);
    }, [checkedUrlList]);

    //Message Listener
    useEffect(() => {
        const messageListener = (message: any, sender: any, sendResponse: any) => {
            if (message.action === "addUrl") {
                setUrlList(prevUrlList => [...prevUrlList, message.url]);
            } else if (message.action === "removeUrl") {
                setUrlList(prevUrlList => prevUrlList.filter(url => url !== message.url));
            } else if (message.action === "checkUrlsInDatabase") {

                //console.log("newUrlList: ", message.newUrlList.length)

                // Process the new URLs (e.g., check them in the database)
                checkIfUrlExistInDatabase(message.newUrlList)

                // Update checkedUrlList to include both the previous and new URLs
                setCheckedUrlList(prevCheckedUrlList => [...prevCheckedUrlList, ...message.newUrlList]);

            } else if (message.action === "checkifmodelAvaliable") {
                // Process the new URLs (e.g., check them in the database)
                checkIfModelUpdateAvaliable(message.newUrlList)
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);
        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);


    const handleCheckSavedDatabase = () => {
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "checkSavedMode", checkedUrlList: checkedUrlList });
            }
        });
    };

    const handleCheckUpdateAvaliable = () => {
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "checkUpdateAvaliableMode" });
            }
        });
    };

    const handleSorting = () => {
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "sortingMode" });
            }
        });
    }


    const resetCheckedUrlList = () => {
        setCheckedUrlList([]);
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "remove-saved" });
            }
        });
    }

    const checkIfUrlExistInDatabase = async (newUrlList: any) => {
        let results = await Promise.all(newUrlList.map(async (url: string) => {
            const quantity = await fetchCheckQuantityofUrlinDatabaseByModelID(url, dispatch);
            return { url, quantity };
        }));

        if (results) {
            chrome.storage.local.get('originalTabId', (result) => {
                if (result.originalTabId) {
                    chrome.tabs.sendMessage(result.originalTabId, { action: "display-saved", savedList: results })
                }
            });
        }
    };

    const checkIfModelUpdateAvaliable = async (newUrlList: any) => {
        setCounting(true)
        setCheckingListSize(newUrlList.length)

        // Utility function to delay execution
        const delay = async (ms: any) => {
            for (let i = ms / 1000; i > 0; i--) {
                await new Promise(res => setTimeout(res, 1000));
            }

            setCounter(prev => prev + 1);
        };

        let results: updateAvaliable[] = [];
        for (let url of newUrlList) {
            const isUpdateAvaliable = await fetchCheckIfModelUpdateAvaliable(url, dispatch);
            await delay(1000);
            results.push({ url, isUpdateAvaliable });
        }

        if (results) {
            chrome.storage.local.get('originalTabId', (result) => {
                if (result.originalTabId) {
                    chrome.tabs.sendMessage(result.originalTabId, { action: "display-update-avaliable", savedList: results })
                }
            });
        }
        setCounter(0)
        setCounting(false)
    };

    const handleToggleCheckBoxMode = () => {
        setCheckboxMode(!checkboxMode); // Toggle the checkbox mode
        if (!checkboxMode) {
            setUrlList([])
        }
        const action = checkboxMode ? "remove-checkboxes" : "display-checkboxes";
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: action });
            }
        });
    };

    const handleAddModeltoDatabase = (url: string) => {
        fetchAddRecordToDatabase(selectedCategory, url, dispatch);
    }

    const handleRemoveBookmarks = async () => {
        for (let url of urlList) {
            const modelId = url.match(/\/models\/(\d+)/)?.[1] || '';
            const data = await fetchDatabaseModelInfoByModelID(modelId, dispatch);
            if (data) {
                let id = data[0].id;
                //Check for null or empty
                if (id !== null && id !== undefined) {
                    fetchRemoveRecordFromDatabaseByID(id, dispatch)
                    removeBookmarkByUrl(url, dispatch, true)
                    // Remove the processed URL from the urlList
                    setUrlList(currentUrls => currentUrls.filter(currentUrl => currentUrl !== url));
                    chrome.storage.local.get('originalTabId', (result) => {
                        if (result.originalTabId) {
                            chrome.tabs.sendMessage(result.originalTabId, { action: "uncheck-url", url: url });

                        }
                    });

                }
            }
        }
        setResetMode(true)
    }

    // Function to handle the API call and update the button state
    const handleDownloadMultipleFile = async (civitaiData: any, civitaiUrl: string) => {
        let civitaiVersionID = civitaiData?.modelVersions[0]?.id.toString();
        let civitaiModelID = civitaiData?.id.toString();
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
            console.log("fail")
            return;
        }

        let data = null;

        if (downloadMethod === "server") {
            //If download Method is server, the server will download the file into server's folder
            await fetchDownloadFilesByServer(civitaiUrl, civitaiFileName, civitaiModelID,
                civitaiVersionID, downloadFilePath, filesList, dispatch);
        } else {
            //if download Method is browser, the chrome browser will download the file into server's folder
            await fetchDownloadFilesByBrowser(civitaiUrl, downloadFilePath, dispatch);

            chrome.storage.local.get('originalTabId', (result) => {
                if (result.originalTabId) {
                    chrome.tabs.sendMessage(result.originalTabId, {
                        action: "browser-download", data: {
                            name: retrieveCivitaiFileName(civitaiData, civitaiVersionID), modelID: civitaiModelID,
                            versionID: civitaiVersionID, downloadFilePath: downloadFilePath, filesList: filesList
                        }
                    });
                }
            });
        }

        return data;

    };

    const handleMultipleBookmarkAndAddtoDatabase = async () => {
        for (let url of urlList) {
            //Fetch Civitai ModelInfo
            const modelId = url.match(/\/models\/(\d+)/)?.[1] || '';
            setWorkingModelID(modelId)
            // Fetch data with error handling
            try {
                const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);
                if (data) {
                    // Add to database
                    handleAddModeltoDatabase(url);
                    //Bookmark this url
                    bookmarkThisUrl(data.type, url, `${data.name} - ${data.id} | Stable Diffusion LoRA | Civitai`)
                    // Remove the processed URL from the urlList
                    setUrlList(currentUrls => currentUrls.filter(currentUrl => currentUrl !== url));

                    chrome.storage.local.get('originalTabId', (result) => {
                        if (result.originalTabId) {
                            chrome.tabs.sendMessage(result.originalTabId, { action: "uncheck-url", url: url });
                        }
                    });


                }
            } catch (error) {
                console.error('Error fetching data for modelId:', modelId, error);
            }
        }
        setWorkingModelID("")
    }

    const handleMultipleBundle = async () => {

        setStartModelName(urlList[0].split('/').pop() || "");
        setProcessingModelName("");
        setEndModelName(urlList[urlList.length - 1].split('/').pop() || "");

        setIsLoading(true)
        // Utility function to delay execution
        const delay = async (ms: any) => {
            for (let i = ms / 1000; i > 0; i--) {
                setCountdown(i);
                await new Promise(res => setTimeout(res, 1000));
            }
            setCountdown(0);
        };
        for (let url of urlList) {
            //Fetch Civitai ModelInfo
            const modelId = url.match(/\/models\/(\d+)/)?.[1] || '';
            setWorkingModelID(modelId)
            setProcessingModelName(url.split('/').pop() || "");
            // Fetch data with error handling
            try {
                const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);
                if (data) {
                    //Download File
                    handleDownloadMultipleFile(data, url);

                    // Add to database
                    handleAddModeltoDatabase(url);
                    //Bookmark this url
                    bookmarkThisUrl(data.type, url, `${data.name} - ${data.id} | Stable Diffusion LoRA | Civitai`)

                    // Remove the processed URL from the urlList
                    setUrlList(currentUrls => currentUrls.filter(currentUrl => currentUrl !== url));
                    chrome.storage.local.get('originalTabId', (result) => {
                        if (result.originalTabId) {
                            chrome.tabs.sendMessage(result.originalTabId, { action: "uncheck-url", url: url });
                        }
                    });
                }

            } catch (error) {
                console.error(error);
                setProcessingModelName(url.split('/').pop() || "");
                break;
            }
            // Throttle requests
            await delay(3000);
        }
        setWorkingModelID("")
        setIsLoading(false)
        setResetMode(true)
    };

    return (
        <div className="container">
            <ErrorAlert />

            <center><h1>Model List Mode</h1></center>

            <Form>
                <Form.Check
                    type="switch"
                    id="custom-switch"
                    label="CheckBox Mode"
                    checked={checkboxMode}
                    onChange={handleToggleCheckBoxMode}
                />
            </Form>

            {/**Checked Saved Button for User page*/}
            <ButtonWrap buttonConfig={{
                placement: "top",
                tooltip: "Check if database has this model (User Page prefer)",
                variant: "primary",
                buttonIcon: <BsFillCloudArrowUpFill />,
                disable: urlList.length === 0 || !(checkboxMode),
            }}
                handleFunctionCall={() => {
                    setResetMode(true)
                }} />

            {/**Checked Saved Button*/}
            <OverlayTrigger placement={"top"}
                overlay={<Tooltip id="tooltip">{`Check if database has this model`}</Tooltip>}>
                <Dropdown as={ButtonGroup}>
                    <Button variant="success"
                        onClick={handleCheckSavedDatabase} >
                        <BsFillCloudArrowUpFill />
                    </Button>
                    <Dropdown.Toggle split variant="success" id="dropdown-split-basic" />
                    <Dropdown.Menu>
                        <Dropdown.Item
                            onClick={resetCheckedUrlList} >
                            Reset
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </OverlayTrigger>

            {/**Bookmark and add to database Button*/}
            <ButtonWrap buttonConfig={{
                placement: "top",
                tooltip: "Bookmark and add to database",
                variant: "primary",
                buttonIcon: <BsFillCartCheckFill />,
                disabled: (urlList.length === 0 || !checkboxMode),
            }}
                handleFunctionCall={() => handleMultipleBookmarkAndAddtoDatabase()} />

            {/**Switch Download Method Button*/}
            <WindowDownloadFileButton />

            {/**Open Download Button */}
            <ButtonWrap buttonConfig={{
                placement: "top",
                tooltip: "Open Download Directory",
                variant: "primary",
                buttonIcon: <AiFillFolderOpen />,
                disabled: false,
            }}
                handleFunctionCall={() => fetchOpenDownloadDirectory(dispatch)} />

            {/**Remove bookmarks */}
            <ButtonWrap buttonConfig={{
                placement: "top",
                tooltip: "Remove Urls' bookmark",
                variant: "primary",
                buttonIcon: <BsStar />,
                disabled: (urlList.length === 0 || !checkboxMode),
            }}
                handleFunctionCall={() => handleRemoveBookmarks()} />


            {/**Checked If update avaliable Button for User page*/}
            <ButtonWrap buttonConfig={{
                placement: "top",
                tooltip: "check if update avaliable by compare db",
                variant: "primary",
                buttonIcon: <BiSolidHdd />,
                disable: counting,
            }}
                handleFunctionCall={() => handleCheckUpdateAvaliable()} />

            {/**Checked If update avaliable Button for User page*/}
            <ButtonWrap buttonConfig={{
                placement: "top",
                tooltip: "handling Sorting",
                variant: "primary",
                buttonIcon: <BiSolidBarChartSquare />,
                disable: counting,
            }}
                handleFunctionCall={() => handleSorting()} />

            {/**Categories List Selector */}
            < CategoriesListSelector />

            {/**Folder Lists Option */}
            < DownloadFilePathOptionPanel />


            {workingModelID !== "" && <p>Processing Model Name: {processingModelName}</p>}
            {countdown > 0 && <p>Next request in: {countdown} seconds</p>}
            {counting && <p>Checking Model Avaliable: {counter} / {checkingListSize} </p>}

            <>
                <span>Start : {startModelName}</span>
                <br />
                <span>End : {endModelName}</span>
                <br />
            </>

            {/* Display URLs in a text area */}
            <textarea
                value={urlList.join('\n')}
                readOnly
                style={{ width: '100%', height: '200px' }}
            />

            <OverlayTrigger placement={"top"}
                overlay={<Tooltip id="tooltip">Download | Bookmark | Add Record</Tooltip>}>
                <Button
                    variant={"primary"}
                    onClick={handleMultipleBundle}
                    disabled={isLoading || urlList.length === 0 || !checkboxMode}
                    className="btn btn-primary btn-lg w-100"
                >
                    Bundle Action
                    {isLoading && <span className="button-state-complete">✓</span>}
                </Button>
            </OverlayTrigger>

        </div>
    );
};

export default WindowComponent;
