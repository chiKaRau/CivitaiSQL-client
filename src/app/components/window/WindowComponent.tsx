import React, { useEffect, useState, version } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';

//Icons Components
import { AiFillFolderOpen } from "react-icons/ai"
import { BsDownload } from 'react-icons/bs';
import { TbDatabaseSearch, TbDatabasePlus, TbDatabaseMinus } from "react-icons/tb";
import { PiPlusMinusFill } from "react-icons/pi";
import { FaMagnifyingGlass, FaMagnifyingGlassPlus } from "react-icons/fa6";
import { MdOutlineApps, MdOutlineTipsAndUpdates } from "react-icons/md";
import { FcGenericSortingAsc, FcGenericSortingDesc } from "react-icons/fc";
import { PiTabsFill } from "react-icons/pi";
import { LuPanelLeftOpen, LuPanelRightOpen } from "react-icons/lu";
import { MdOutlineDownloadForOffline, MdOutlineDownload } from "react-icons/md";
import { BsReverseLayoutTextWindowReverse } from "react-icons/bs";

//components
import CategoriesListSelector from '../CategoriesListSelector';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import WindowDownloadFileButton from "./WindowDownloadFileButton"
import WindowCollapseButton from "./WindowCollapseButton"
import ButtonWrap from "../buttons/ButtonWrap";
import { Button, OverlayTrigger, Tooltip, Form, Dropdown, ButtonGroup } from 'react-bootstrap';
import ErrorAlert from '../ErrorAlert';
import URLGrid from './URLGrid';

interface updateAvaliable {
    url: string;
    isUpdateAvaliable: any; // Consider specifying a more accurate type instead of 'any' if possible
    isEarlyAccess: any;
}

//Apis
import {
    fetchCivitaiModelInfoFromCivitaiByModelID,
    fetchAddRecordToDatabase,
    fetchDownloadFilesByServer,
    fetchDownloadFilesByServer_v2,
    fetchDownloadFilesByBrowser,
    fetchDatabaseModelInfoByModelID,
    fetchRemoveRecordFromDatabaseByID,
    fetchOpenDownloadDirectory,
    fetchCheckIfUrlExistInDatabase,
    fetchCheckQuantityofUrlinDatabaseByUrl,
    fetchDownloadFilesByBrowser_v2,
    fetchCheckQuantityofUrlinDatabaseByModelID,
    fetchCheckIfModelUpdateAvaliable,
    fetchCivitaiModelInfoFromCivitaiByVersionID,
    fetchAddOfflineDownloadFileIntoOfflineDownloadList,
    fetchCheckQuantityOfOfflinedownloadList
} from "../../api/civitaiSQL_api"

//utils
import { bookmarkThisUrl, updateDownloadMethodIntoChromeStorage, callChromeBrowserDownload, removeBookmarkByUrl, updateOfflineModeIntoChromeStorage } from "../../utils/chromeUtils"
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils"
import { BiSolidBarChartSquare, BiSolidHdd } from 'react-icons/bi';
import WindowFullInfoModelPanel from './WindowFullInfoModelPanel';
import SetOriginalTabButton from './SetOriginalTabButton';
import WindowShortcutPanel from './WindowShortcutPanel';

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
    const { downloadMethod, downloadFilePath, selectedCategory, offlineMode } = chromeData;

    const [startModelName, setStartModelName] = useState("");
    const [processingModelName, setProcessingModelName] = useState("");
    const [endModelName, setEndModelName] = useState("");

    const [selectedUrl, setSelectedUrl] = useState("");

    const [isFullInfoModelPanelVisible, setIsFullInfoModelPanelVisible] = useState(false);

    const [isSorted, setIsSorted] = useState(true);

    const [tabCreator, setTabCreator] = useState("");

    const [collapseButtonStates, setCollapseButtonStates] = useState<{ [key: string]: boolean }>({
        checkDatabaseButton: false,
        bookmarkButton: false, // Initial value to help TypeScript infer the types
        downloadButton: false, // You can add more initial panels as needed
        utilsButtons: false
    });

    const [updateCount, setUpdateCount] = useState(10);
    const [checkedUpdateList, setCheckedUpdateList] = useState<string[]>([]);
    const [lastUpdateProcessedIndex, setLastUpdateProcessedIndex] = useState(0);

    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    useEffect(() => {
        resetCheckedUrlList();
        handleCheckSavedDatabase();
        setResetMode(false);
    }, [resetMode])

    useEffect(() => {
        handleToggleCheckBoxMode()
    }, [])

    useEffect(() => {

        if (selectedUrl && !urlList.includes(selectedUrl)) {
            setSelectedUrl("");
        }

    }, [urlList])

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

                // Process the new URLs (e.g., check them in the offlinelist)
                checkIfUrlExistInOfflineDownload(message.newUrlList)

                // Update checkedUrlList to include both the previous and new URLs
                setCheckedUrlList(prevCheckedUrlList => [...prevCheckedUrlList, ...message.newUrlList]);

            } else if (message.action === "checkifmodelAvaliable") {
                // Process the new URLs (e.g., check them in the database)
                checkIfModelUpdateAvaliable(message.newUrlList)

                setCheckedUpdateList(prevCheckedUpdateList => [...prevCheckedUpdateList, ...message.newUrlList]);

                //setLastUpdateProcessedIndex(message.lastUpdateProcessedIndex)

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
                chrome.tabs.sendMessage(result.originalTabId,
                    {
                        action: "checkUpdateAvaliableMode", updateCount: updateCount,
                        checkedUpdateList: checkedUpdateList, lastUpdateProcessedIndex: lastUpdateProcessedIndex
                    });
            }
        });
    };

    const handleSorting = () => {
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "sortingMode" });
            }
        });
        setIsSorted(!isSorted)
    }


    const resetCheckedUrlList = () => {
        setCheckedUrlList([]);
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "remove-saved" });
            }
        });
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "remove-offline" });
            }
        });
    }
    const resetCheckedUpdateList = () => {
        setCheckedUpdateList([]);
        setUpdateCount(10);
        setLastUpdateProcessedIndex(0);
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "remove-update-saved" });
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

    const checkIfUrlExistInOfflineDownload = async (newUrlList: any) => {
        let results = await Promise.all(newUrlList.map(async (url: string) => {
            const quantity = await fetchCheckQuantityOfOfflinedownloadList(url, dispatch);
            return { url, quantity };
        }));

        if (results) {
            chrome.storage.local.get('originalTabId', (result) => {
                if (result.originalTabId) {
                    chrome.tabs.sendMessage(result.originalTabId, { action: "display-offline", offlineList: results })
                }
            });
        }
    };

    const checkIfModelUpdateAvaliable = async (newUrlList: any) => {
        console.log(newUrlList)
        if (newUrlList !== null && newUrlList !== undefined && newUrlList.length > 0) {
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
                if (url !== null) {
                    const data = await fetchCheckIfModelUpdateAvaliable(url, dispatch);
                    if (data) {
                        await delay(1000);
                        results.push({ url, isUpdateAvaliable: data.isUpdateAvaliable, isEarlyAccess: data.isEarlyAccess });
                    }
                }

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
        }
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

            if (data && Array.isArray(data)) {
                for (let record of data) {
                    const id = record.id;

                    if (id !== null && id !== undefined) {
                        // Perform actions for each id
                        await fetchRemoveRecordFromDatabaseByID(id, dispatch); // Ensure asynchronous execution
                        removeBookmarkByUrl(url, dispatch, true, true); // Remove bookmark by URL

                        // Remove the processed URL from the urlList
                        setUrlList(currentUrls => currentUrls.filter(currentUrl => currentUrl !== url));

                        // Send a message to the original tab if available
                        chrome.storage.local.get('originalTabId', (result) => {
                            if (result.originalTabId) {
                                chrome.tabs.sendMessage(result.originalTabId, { action: "uncheck-url", url: url });
                            }
                        });
                    }
                }
            }
        }

        setResetMode(true);
    };

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

    // Function to handle the API call and update the button state
    const handleDownloadMultipleFile_v2 = async (civitaiData: any, civitaiUrl: string, modelId: string, versionIndex: any) => {

        let civitaiVersionID = civitaiData?.modelVersions[versionIndex]?.id.toString();
        let civitaiModelID = modelId;

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        //the fileList would contains the urls of all files such as safetensor, training data, ...
        let civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID)

        //Check for null or empty
        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            civitaiModelFileList === null || !civitaiModelFileList.length
        ) {
            console.log("fail")
            return;
        }

        let modelObject = {
            downloadFilePath, civitaiFileName, civitaiModelID,
            civitaiVersionID, civitaiModelFileList, civitaiUrl
        }

        if (downloadMethod === "server") {
            //If download Method is server, the server will download the file into server's folder
            const isDownloadSuccessful = await fetchDownloadFilesByServer_v2(modelObject, dispatch);
            return isDownloadSuccessful;
        } else {
            //if download Method is browser, the chrome browser will download the file into server's folder
            await fetchDownloadFilesByBrowser_v2(civitaiUrl, downloadFilePath, dispatch);

            const data = await fetchCivitaiModelInfoFromCivitaiByVersionID(civitaiVersionID, dispatch);
            if (data) {
                chrome.storage.local.get('originalTabId', (result) => {
                    if (result.originalTabId) {
                        chrome.tabs.sendMessage(result.originalTabId, {
                            action: "browser-download_v2", data: { ...modelObject, modelVersionObject: data }
                        });
                    }
                });
            }
            return true;
        }

    };

    const handleOpenOfflineWindow = () => {
        console.log("open offline window")
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Store the original tab ID in local storage
            // chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openOfflineWindow" });
            //window.close(); // This closes the popup window
        });
    }

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
        setResetMode(true);
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
                    //handleDownloadMultipleFile(data, url);

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

    const handleAddOfflineDownloadFileintoOfflineDownloadList = async () => {

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
                    let civitaiUrl = url;
                    let versionIndex = 0;
                    const uri = new URL(url);

                    if (uri.searchParams.has('modelVersionId')) {
                        let modelVersionId = uri.searchParams.get('modelVersionId');
                        versionIndex = data.modelVersions.findIndex((version: any) => {
                            return version.id == modelVersionId
                        });
                    }

                    if (versionIndex === -1) {
                        continue;
                    }

                    let civitaiVersionID = data?.modelVersions[versionIndex]?.id.toString();
                    let civitaiModelID = modelId;

                    let civitaiFileName = retrieveCivitaiFileName(data, civitaiVersionID);
                    //the fileList would contains the urls of all files such as safetensor, training data, ...
                    let civitaiModelFileList = retrieveCivitaiFilesList(data, civitaiVersionID)

                    let civitaiTags = data?.tags;

                    //Check for null or empty
                    if (
                        civitaiUrl === null || civitaiUrl === "" ||
                        civitaiFileName === null || civitaiFileName === "" ||
                        civitaiModelID === null || civitaiModelID === "" ||
                        civitaiVersionID === null || civitaiVersionID === "" ||
                        downloadFilePath === null || downloadFilePath === "" ||
                        selectedCategory === null || selectedCategory === "" ||
                        civitaiModelFileList === null || !civitaiModelFileList.length ||
                        civitaiTags === null
                    ) {
                        console.log("fail in handleAddOfflineDownloadFileintoOfflineDownloadList()")
                        return;
                    }

                    let modelObject = {
                        downloadFilePath, civitaiFileName, civitaiModelID,
                        civitaiVersionID, civitaiModelFileList, civitaiUrl,
                        selectedCategory, civitaiTags
                    }

                    await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, false, dispatch);

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
            await delay(1000);
        }
        setWorkingModelID("")
        setIsLoading(false)
        setResetMode(true)
    };

    // Function to handle the API call and update the button state
    const handleMultipleBundle_v2 = async () => {

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

                    let versionIndex = 0;
                    const uri = new URL(url);

                    if (uri.searchParams.has('modelVersionId')) {
                        let modelVersionId = uri.searchParams.get('modelVersionId');
                        versionIndex = data.modelVersions.findIndex((version: any) => {
                            return version.id == modelVersionId
                        });
                    }

                    if (versionIndex === -1) {
                        continue;
                    }

                    const isDownloadSuccessful = await handleDownloadMultipleFile_v2(data, url, modelId, versionIndex);

                    if (isDownloadSuccessful) {
                        //Add to database
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

                }

            } catch (error) {
                console.error(error);
                setProcessingModelName(url.split('/').pop() || "");
                break;
            }
            // Throttle requests
            await delay(2000);
        }
        setWorkingModelID("")
        setSelectedUrl("");
        setIsLoading(false)
        setResetMode(true)
    };

    const handleToggleCollapseButton = (panelId: any) => {
        setCollapseButtonStates((prevStates) => ({
            ...prevStates,
            [panelId]: !prevStates[panelId],
        }));
    };

    const handleUpdateCountInputChange = (e: any) => {
        const value = Number(e.target.value);
        if (!isNaN(value) && value > 0) {
            setUpdateCount(value);
        } else if (value <= 0) {
            setUpdateCount(1); // Set to minimum valid value if input is zero or negative
        }
    };

    const toggleFullInfoModelPanel = () => {
        setIsFullInfoModelPanelVisible(!isFullInfoModelPanelVisible);
    };

    const handleSetOriginalTab = async () => {
        try {
            // Step 1: Retrieve all windows
            const windows = await chrome.windows.getAll({ populate: false });
            console.log('Retrieved Windows:', windows);

            // Step 2: Find the first window of type 'normal' (main browser window)
            const normalWindow = windows.find(win => win.type === 'normal');
            console.log('Normal Window:', normalWindow);

            if (!normalWindow) {
                console.error('No normal window found.');
                return;
            }

            // Step 3: Query the active tab in the normal window
            const [activeTab] = await chrome.tabs.query({ active: true, windowId: normalWindow.id });
            console.log('Active Tab in Normal Window:', activeTab);

            if (activeTab && activeTab.id) {
                // Step 4: Save the active tab's ID to chrome.storage.local
                await chrome.storage.local.set({ originalTabId: activeTab.id });
                setTabCreator(activeTab?.title || "");
                setResetMode(true);
                setCheckboxMode(true); // Toggle the checkbox mode
                setIsHandleRefresh(true);
                setCheckedUpdateList([]);
                setUpdateCount(10);
                setLastUpdateProcessedIndex(0);
                chrome.storage.local.get('originalTabId', (result) => {
                    if (result.originalTabId) {
                        chrome.tabs.sendMessage(result.originalTabId, { action: "remove-update-saved" });
                    }
                });
                chrome.storage.local.get('originalTabId', (result) => {
                    if (result.originalTabId) {
                        chrome.tabs.sendMessage(result.originalTabId, { action: "display-checkboxes" });
                    }
                });
                console.log(`Original Tab ID set to: ${activeTab.id}`);
            } else {
                console.error('No active tab found in the normal window.');
            }
        } catch (error) {
            console.error('Error setting originalTabId:', error);
        }
    };

    // Define the height of the fixed header (adjust as needed)
    const fixedHeaderHeight = 300; // in pixels

    return (
        <div className="container" style={{ width: '100%', position: 'relative' }}>

            {/* Sticky Header */}
            <div
                style={{
                    position: 'sticky',
                    top: 0,
                    width: '100%',
                    backgroundColor: 'white', // Adjust as needed
                    padding: '20px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', // Optional: Adds a subtle shadow
                    zIndex: 1000, // Ensure it stays above other elements
                }}
            >
                <ErrorAlert />

                <center><h1>Model List Mode</h1></center>

                <Form>
                    <Form.Check
                        type="switch"
                        id="custom-switch"
                        label="Download Mode"
                        checked={checkboxMode}
                        onChange={handleToggleCheckBoxMode}
                    />
                </Form>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                    <WindowCollapseButton
                        panelId="checkDatabaseButton"
                        isPanelOpen={collapseButtonStates['checkDatabaseButton']}
                        handleTogglePanel={handleToggleCollapseButton}
                        icons={<TbDatabaseSearch />}
                        buttons={
                            <div>
                                {/**Checked Saved Button for User page*/}
                                <ButtonWrap buttonConfig={{
                                    placement: "top",
                                    tooltip: "Check if database has this model (User Page prefer)",
                                    variant: "primary",
                                    buttonIcon: <FaMagnifyingGlass />,
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
                                            <FaMagnifyingGlassPlus />
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
                            </div>
                        }
                    />

                    <WindowCollapseButton
                        panelId="downloadButton"
                        isPanelOpen={collapseButtonStates['downloadButton']}
                        handleTogglePanel={handleToggleCollapseButton}
                        icons={<BsDownload />}
                        buttons={
                            <div>
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

                                {/**offline mode button */}
                                <ButtonWrap buttonConfig={{
                                    placement: "bottom",
                                    tooltip: offlineMode ? "offline" : "online",
                                    variant: offlineMode ? "success" : "primary",
                                    buttonIcon: offlineMode ? <MdOutlineDownloadForOffline /> : <MdOutlineDownload />,
                                    disabled: false,
                                }}
                                    handleFunctionCall={() => updateOfflineModeIntoChromeStorage(!offlineMode, dispatch)} />

                                {/**Open Offline Window */}
                                <ButtonWrap buttonConfig={{
                                    placement: "top",
                                    tooltip: "Open Offline Window",
                                    variant: "primary",
                                    buttonIcon: <BsReverseLayoutTextWindowReverse />
                                    ,
                                    disabled: false,
                                }}
                                    handleFunctionCall={() => handleOpenOfflineWindow()} />
                            </div>
                        }
                    />

                    <WindowCollapseButton
                        panelId="bookmarkButton"
                        isPanelOpen={collapseButtonStates['bookmarkButton']}
                        handleTogglePanel={handleToggleCollapseButton}
                        icons={<PiPlusMinusFill />}
                        buttons={
                            <div>
                                {/**Bookmark and add to database Button*/}
                                <ButtonWrap buttonConfig={{
                                    placement: "top",
                                    tooltip: "Bookmark and add to database",
                                    variant: "primary",
                                    buttonIcon: <TbDatabasePlus />,
                                    disabled: (urlList.length === 0 || !checkboxMode),
                                }}
                                    handleFunctionCall={() => handleMultipleBookmarkAndAddtoDatabase()} />

                                {/**Remove bookmarks */}
                                <ButtonWrap buttonConfig={{
                                    placement: "top",
                                    tooltip: "Remove all Bookmark and database from that Model",
                                    variant: "primary",
                                    buttonIcon: <TbDatabaseMinus />,
                                    disabled: (urlList.length === 0 || !checkboxMode),
                                }}
                                    handleFunctionCall={() => handleRemoveBookmarks()} />

                            </div>
                        }
                    />

                    <WindowCollapseButton
                        panelId="utilsButton"
                        isPanelOpen={collapseButtonStates['utilsButton']}
                        handleTogglePanel={handleToggleCollapseButton}
                        icons={<MdOutlineApps />}
                        buttons={
                            <div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {counting && (
                                        <b style={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            fontSize: '10px' // Adjust font size as needed
                                        }}>
                                            Checking Model Available: {counter} / {checkingListSize}
                                        </b>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {/**Checked If update available Button for User page*/}

                                    {/**Checked Saved Button*/}
                                    <OverlayTrigger placement={"top"}
                                        overlay={<Tooltip id="tooltip">{`check if update available or early access`}</Tooltip>}>
                                        <Dropdown as={ButtonGroup}>
                                            <Button variant="primary"
                                                onClick={handleCheckUpdateAvaliable} >
                                                <MdOutlineTipsAndUpdates />
                                            </Button>
                                            <Dropdown.Toggle split variant="primary" id="dropdown-split-basic" />
                                            <Dropdown.Menu>
                                                <Dropdown.Item
                                                    onClick={resetCheckedUpdateList} >
                                                    Reset
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </OverlayTrigger>

                                    {/* <div>
                                        <input
                                            type="number"
                                            value={updateCount}
                                            onChange={handleUpdateCountInputChange}
                                            style={{ width: '50px' }} // Adjust width as needed
                                            min="1" // Prevent negative numbers and zero
                                            max="999"
                                        />
                                    </div> */}

                                    {/**Checked If update available Button for User page*/}
                                    <ButtonWrap buttonConfig={{
                                        placement: "top",
                                        tooltip: "handling Sorting",
                                        variant: "primary",
                                        buttonIcon: isSorted ? <FcGenericSortingAsc /> : <FcGenericSortingDesc />,
                                        disable: counting,
                                    }}
                                        handleFunctionCall={() => handleSorting()} />

                                    {/**Checked If update available Button for User page*/}
                                    <ButtonWrap buttonConfig={{
                                        placement: "top",
                                        tooltip: `Set to Current Tabs: ${tabCreator}`,
                                        variant: "primary",
                                        buttonIcon: <PiTabsFill />,
                                        disable: counting,
                                    }}
                                        handleFunctionCall={() => {
                                            handleSetOriginalTab()
                                        }} />
                                </div>

                            </div>
                        }
                    />
                </div>

                {selectedUrl !== "" &&
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px', // Space between the components
                            border: '2px solid #007bff', // Border color matching Bootstrap's primary color
                            borderRadius: '8px', // Rounded corners
                            padding: '10px 15px', // Inner spacing
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // Subtle shadow for depth
                            backgroundColor: '#f8f9fa', // Light background color
                            marginTop: '20px' // Optional: Space above the container
                        }}
                    >

                        <ButtonWrap
                            buttonConfig={{
                                placement: "top",
                                tooltip: "Set to Current Tabs",
                                variant: "primary",
                                buttonIcon: isFullInfoModelPanelVisible ? <LuPanelLeftOpen /> : <LuPanelRightOpen />,
                                disable: counting,
                            }}
                            handleFunctionCall={() => toggleFullInfoModelPanel()}
                        />

                        {
                            selectedUrl && <WindowShortcutPanel
                                url={selectedUrl}
                                setSelectedUrl={setSelectedUrl}
                                urlList={urlList}
                                setUrlList={setUrlList}
                            />
                        }

                    </div>
                }

            </div>


            {/* Main Content */}
            <div
                className="main-content"
                style={{
                    padding: '20px',
                }}
            >
                {/**Categories List Selector */}
                < CategoriesListSelector />

                {/**Folder Lists Option */}
                < DownloadFilePathOptionPanel setIsHandleRefresh={setIsHandleRefresh} isHandleRefresh={isHandleRefresh} />


                {workingModelID !== "" && <p>Processing Model Name: {processingModelName}</p>}
                {countdown > 0 && <p>Next request in: {countdown} seconds</p>}

                {/* Display URLs in a text area */}
                <URLGrid urlList={urlList} setUrlList={setUrlList} selectedUrl={selectedUrl} onUrlSelect={setSelectedUrl} />


                {/*
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
            */}

                {offlineMode ?
                    <OverlayTrigger placement={"top"}
                        overlay={<Tooltip id="tooltip">Add file into offline download list</Tooltip>}>
                        <Button
                            variant={"success"}
                            onClick={handleAddOfflineDownloadFileintoOfflineDownloadList}
                            disabled={isLoading || urlList.length === 0 || !checkboxMode}
                            className="btn btn-primary btn-lg w-100"
                        >
                            Offline Download
                            {isLoading && <span className="button-state-complete">✓</span>}
                        </Button>
                    </OverlayTrigger>
                    :
                    <OverlayTrigger placement={"top"}
                        overlay={<Tooltip id="tooltip">Download | Bookmark | Add Record</Tooltip>}>
                        <Button
                            variant={"primary"}
                            onClick={handleMultipleBundle_v2}
                            disabled={isLoading || urlList.length === 0 || !checkboxMode}
                            className="btn btn-primary btn-lg w-100"
                        >
                            Bundle Action
                            {isLoading && <span className="button-state-complete">✓</span>}
                        </Button>
                    </OverlayTrigger>
                }

                {selectedUrl !== "" && (isFullInfoModelPanelVisible &&
                    <WindowFullInfoModelPanel url={selectedUrl} urlList={urlList} setUrlList={setUrlList} setIsFullInfoModelPanelVisible={setIsFullInfoModelPanelVisible}
                        onClose={toggleFullInfoModelPanel} />)}

            </div>
        </div>
    );
};

export default WindowComponent;
