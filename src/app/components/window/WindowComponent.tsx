import React, { useEffect, useMemo, useRef, useState, version } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { updateDownloadFilePath } from "../../store/actions/chromeActions"

//Icons Components
import { AiFillFolderOpen, AiOutlineArrowUp, AiOutlineArrowDown } from "react-icons/ai"
import { BsDownload, BsPencilFill } from 'react-icons/bs';
import { TbDatabaseSearch, TbDatabasePlus, TbDatabaseMinus } from "react-icons/tb";
import { PiPlusMinusFill } from "react-icons/pi";
import { FaLeftLong, FaMagnifyingGlass, FaMagnifyingGlassPlus, FaRankingStar } from "react-icons/fa6";
import { MdOutlineApps, MdOutlineTipsAndUpdates, MdSkipNext, MdSkipPrevious } from "react-icons/md";
import { FcGenericSortingAsc, FcGenericSortingDesc } from "react-icons/fc";
import { PiTabsFill } from "react-icons/pi";
import { LuPanelLeftOpen, LuPanelRightOpen } from "react-icons/lu";
import { MdOutlineDownloadForOffline, MdOutlineDownload } from "react-icons/md";
import { BsReverseLayoutTextWindowReverse } from "react-icons/bs";
import { PiTabs } from "react-icons/pi";
import { IoCloseOutline, IoNavigate, IoReloadOutline } from "react-icons/io5";
import { WiCloudRefresh } from "react-icons/wi";

//components
import CategoriesListSelector from '../CategoriesListSelector';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import WindowDownloadFileButton from "./WindowDownloadFileButton"
import WindowCollapseButton from "./WindowCollapseButton"
import ButtonWrap from "../buttons/ButtonWrap";
import { Button, OverlayTrigger, Tooltip, Form, Dropdown, ButtonGroup } from 'react-bootstrap';
import ErrorAlert from '../ErrorAlert';
import URLGrid from './URLGrid';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FilesPathSettingPanel from '../FilesPathSettingPanel';
import FolderDropdown from "../FolderDropdown"

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
    fetchCheckQuantityOfOfflinedownloadList,
    fetchUpdateCreatorUrlList,
    fetchGetCreatorUrlList,
    fetchGetFoldersList,
    fetchRemoveFromCreatorUrlList
} from "../../api/civitaiSQL_api"

//utils
import { bookmarkThisUrl, updateDownloadMethodIntoChromeStorage, callChromeBrowserDownload, removeBookmarkByUrl, updateOfflineModeIntoChromeStorage, updateSelectedCategoryIntoChromeStorage, updateDownloadFilePathIntoChromeStorage } from "../../utils/chromeUtils"
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils"
import { BiSolidBarChartSquare, BiSolidHdd } from 'react-icons/bi';
import WindowFullInfoModelPanel from './WindowFullInfoModelPanel';
import SetOriginalTabButton from './SetOriginalTabButton';
import WindowShortcutPanel from './WindowShortcutPanel';

interface CreatorUrlItem {
    creatorUrl: string;
    lastChecked: boolean;
    status: string;
    rating: string;
}

const WindowComponent: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);

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
    const { downloadMethod, downloadFilePath, selectedCategory, offlineMode, selectedFilteredCategoriesList } = chromeData;

    const [sortedandFilteredfoldersList, setSortedandFilteredfoldersList] = useState<string[]>([]);
    const [foldersList, setFoldersList] = useState([])

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
        utilsButton: false,
        tabsButton: false
    });

    const [updateCount, setUpdateCount] = useState(10);
    const [checkedUpdateList, setCheckedUpdateList] = useState<string[]>([]);
    const [lastUpdateProcessedIndex, setLastUpdateProcessedIndex] = useState(0);

    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    // at the top of your component
    const ratingOrder = ["EX", "SSS", "SS", "S", "A", "B", "C", "D", "E", "F", "N/A"];
    const [selectedRating, setSelectedRating] = useState<string>("N/A");

    // after const [selectedRating,…]
    const [ratingFilters, setRatingFilters] = useState<Record<string, boolean>>(
        () => ratingOrder.reduce((acc, r) => ({ ...acc, [r]: true }), {})
    );

    const allSelected = ratingOrder.every(r => ratingFilters[r]);

    // Helper to toggle all on/off
    const toggleAllRatings = () => {
        const newVal = !allSelected;
        setRatingFilters(ratingOrder.reduce((acc, r) => ({ ...acc, [r]: newVal }), {}));
    };

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

                addCreatorUrlButton()

            } else if (message.action === "checkifmodelAvaliable") {
                // Process the new URLs (e.g., check them in the database)
                checkIfModelUpdateAvaliable(message.newUrlList)

                setCheckedUpdateList(prevCheckedUpdateList => [...prevCheckedUpdateList, ...message.newUrlList]);

                //setLastUpdateProcessedIndex(message.lastUpdateProcessedIndex)

            } else if (message.action === "addCreator") {
                handleUpdateCreatorUrlList(message.creator, sendResponse)
                return true;
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);
        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    const [creatorUrlList, setCreatorUrlList] = useState<CreatorUrlItem[]>([]);

    useEffect(() => {
        fetchCreatorUrlList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchCreatorUrlList() {
        const list = await fetchGetCreatorUrlList(dispatch);
        if (Array.isArray(list)) {
            setCreatorUrlList(
                list.map(item => ({
                    ...item,
                    rating: item.rating ?? "N/A"
                }))
            );
        }
    }


    const [selectedCreatorUrlText, setSelectedCreatorUrlText] = useState("");


    // Handler when a creator URL is selected from the dropdown
    const handleSelectCreatorUrl = (item: CreatorUrlItem) => {
        // Get the clicked item's index
        const newIndex = creatorUrlList.findIndex(
            (i) => i.creatorUrl === item.creatorUrl
        );

        // If found, update the current index
        if (newIndex !== -1) {
            setCurrentCreatorUrlIndex(newIndex);
        }

        // Also update the displayed text
        setSelectedCreatorUrlText(item.creatorUrl.split("/")[4]);
        console.log("Selected:", item);
    };


    const handleUpdateCreatorUrlList = async (creator: any, sendResponse: any) => {

        let result = null;
        if (creator !== null || creator !== "") {

            let creatorUrl = `https://civitai.com/user/${creator}/models`

            result = await fetchUpdateCreatorUrlList(creatorUrl, "new", false, "N/A", dispatch);
        }
        sendResponse(result || { status: "failure" })
    }

    // -- NEW Buttons: Refresh List & Refresh Page -----------------------
    const handleRefreshList = async () => {
        try {
            // Re-fetch the list from server / API
            await fetchCreatorUrlList();
        } catch (error) {
            console.error("Error refreshing list:", error);
        }
    };

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

    const addCreatorUrlButton = async () => {
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "display-creator-button" })
            }
        });
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
        fetchAddRecordToDatabase(selectedCategory, url, downloadFilePath, dispatch);
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

    const handleOpenCustomWindow = () => {
        console.log("open custom window")
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Store the original tab ID in local storage
            // chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openCustomWindow" });
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

        if (["/@scan@/ErrorPath/"].includes(downloadFilePath)) {
            alert("Invalid DownloadFilePath");
            return;
        }

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
        dispatch(updateDownloadFilePath("/@scan@/ACG/Pending/"));
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

    const [currentCreatorUrlIndex, setCurrentCreatorUrlIndex] = useState<number | null>(null);

    // On mount, optionally pick the first "new" item
    useEffect(() => {
        // Only set initial index if none is selected yet
        if (currentCreatorUrlIndex === null && creatorUrlList.length > 0) {
            const firstNewIndex = creatorUrlList.findIndex(item => item.status === "new");
            if (firstNewIndex !== -1) {
                setCurrentCreatorUrlIndex(firstNewIndex);
                setSelectedCreatorUrlText(creatorUrlList[firstNewIndex].creatorUrl.split('/')[4]);
            }
        }
    }, [creatorUrlList, currentCreatorUrlIndex]);

    useEffect(() => {
        if (currentCreatorUrlIndex != null) {
            const r = creatorUrlList[currentCreatorUrlIndex].rating;
            setSelectedRating(r);
        }
    }, [currentCreatorUrlIndex, creatorUrlList]);


    const handleRatingUp = () => {
        if (currentCreatorUrlIndex == null) return;
        const cur = selectedRating;
        const idx = ratingOrder.indexOf(cur);
        const next = ratingOrder[Math.max(0, idx - 1)];
        setSelectedRating(next);
        setCreatorUrlList(list =>
            list.map((it, i) =>
                i === currentCreatorUrlIndex ? { ...it, rating: next } : it
            )
        );
    };

    const handleRatingDown = () => {
        if (currentCreatorUrlIndex == null) return;
        const cur = selectedRating;
        const idx = ratingOrder.indexOf(cur);
        const next = ratingOrder[Math.min(ratingOrder.length - 1, idx + 1)];
        setSelectedRating(next);
        setCreatorUrlList(list =>
            list.map((it, i) =>
                i === currentCreatorUrlIndex ? { ...it, rating: next } : it
            )
        );
    };

    const handleApplyRating = async () => {
        if (currentCreatorUrlIndex == null) return;

        const { creatorUrl, status, lastChecked } =
            creatorUrlList[currentCreatorUrlIndex];

        // Use your updated helper:
        const result = await fetchUpdateCreatorUrlList(
            creatorUrl,
            status,
            lastChecked,
            selectedRating,   // ← pass the rating
            dispatch
        );

        if (result && result.status === "success") {
            // Refresh your list so the UI shows the saved rating
            fetchCreatorUrlList();
        }
    };



    // A helper to update the tab to the new URL
    const goToUrlInBrowserTab = async (url: string) => {
        try {
            // If you are storing the "originalTabId" in local storage:
            const { originalTabId } = await chrome.storage.local.get('originalTabId');
            if (originalTabId) {
                // Update that specific tab
                await chrome.tabs.update(originalTabId, { url });
            } else {
                // Fallback: update the active tab in the normal window
                const windows = await chrome.windows.getAll({ populate: false });
                const normalWindow = windows.find(win => win.type === 'normal');
                if (!normalWindow) return;
                const [activeTab] = await chrome.tabs.query({ active: true, windowId: normalWindow.id });
                if (!activeTab || !activeTab.id) return;
                await chrome.tabs.update(activeTab.id, { url });
            }
            await fetchUpdateCreatorUrlList(url, "checked", true, "N/A", dispatch)
            handleRefreshList();
            handleSetOriginalTab()
        } catch (error) {
            console.error("Error updating tab:", error);
        }
    };

    // Go button: Just re-navigate to the currentIndex's URL
    const handleGo = () => {
        if (currentCreatorUrlIndex == null) return;
        const url = creatorUrlList[currentCreatorUrlIndex].creatorUrl;
        setSelectedCreatorUrlText(url.split('/')[4]);
        goToUrlInBrowserTab(url);
    };

    // New “Next” logic:
    const handleNext = () => {
        if (currentCreatorUrlIndex == null) return;
        const total = creatorUrlList.length;

        for (let step = 1; step <= total; step++) {
            const candidateIdx = (currentCreatorUrlIndex + step) % total;
            const candidate = creatorUrlList[candidateIdx];

            // pick only “new” items whose rating is still allowed
            if (
                candidate.status === "new" &&
                ratingFilters[candidate.rating]
            ) {
                setCurrentCreatorUrlIndex(candidateIdx);
                setSelectedCreatorUrlText(candidate.creatorUrl.split('/')[4]);
                goToUrlInBrowserTab(candidate.creatorUrl);
                return;
            }
        }
        // If none found, do nothing.
    };

    // New “Previous” logic:
    const handlePrevious = () => {
        if (currentCreatorUrlIndex == null) return;
        const total = creatorUrlList.length;

        for (let step = 1; step <= total; step++) {
            const candidateIdx = (currentCreatorUrlIndex - step + total) % total;
            const candidate = creatorUrlList[candidateIdx];

            if (
                candidate.status === "new" &&
                ratingFilters[candidate.rating]
            ) {
                setCurrentCreatorUrlIndex(candidateIdx);
                setSelectedCreatorUrlText(candidate.creatorUrl.split('/')[4]);
                goToUrlInBrowserTab(candidate.creatorUrl);
                return;
            }
        }
        // If none found, do nothing.
    };


    // Conditionally disable buttons if no prev/next
    // That’s optional convenience
    const hasPrevNew = () => {
        if (currentCreatorUrlIndex == null) return false;
        for (let i = currentCreatorUrlIndex - 1; i >= 0; i--) {
            if (creatorUrlList[i].status === "new") return true;
        }
        return false;
    };

    const hasNextNew = () => {
        if (currentCreatorUrlIndex == null) return false;
        for (let i = currentCreatorUrlIndex + 1; i < creatorUrlList.length; i++) {
            if (creatorUrlList[i].status === "new") return true;
        }
        return false;
    };

    const hasNewItems = creatorUrlList.some(item => item.status === "new");


    const handleRefreshPage = async () => {
        // Reload the original tab if present, otherwise reload the currently active tab
        try {
            const { originalTabId } = await chrome.storage.local.get("originalTabId");
            if (originalTabId) {
                await chrome.tabs.reload(originalTabId);
            } else {
                // Fallback: reload the active tab in the normal window
                const windows = await chrome.windows.getAll({ populate: false });
                const normalWindow = windows.find(win => win.type === "normal");
                if (!normalWindow) return;
                const [activeTab] = await chrome.tabs.query({ active: true, windowId: normalWindow.id });
                if (!activeTab?.id) return;
                chrome.tabs.reload(activeTab.id);
            }
        } catch (error) {
            console.error("Error refreshing page:", error);
        }
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
                setUrlList([]);
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

    useEffect(() => {
        // Update FoldersList
        handleGetFoldersList()
    }, []);

    useEffect(() => {
        // Update FoldersList
        if (isHandleRefresh) {
            handleGetFoldersList()
        }
    }, [isHandleRefresh]);


    useEffect(() => {
        if (selectedFilteredCategoriesList) {
            handleAddFilterIntoFoldersList(JSON.parse(selectedFilteredCategoriesList))
        }
    }, [selectedFilteredCategoriesList, foldersList])


    const handleAddFilterIntoFoldersList = (selectedFilteredCategoriesList: any) => {

        const filteredFolderList = (foldersList as any[]).filter(folder => {
            const isIncluded = (selectedFilteredCategoriesList as any[]).some(item => {
                return item.display && folder.toLowerCase().includes(item.category.value.toLowerCase());
            });

            if (!isIncluded) {
                return false;
            }

            // Additional checks for specific exceptions
            const isCharactersSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.name === "Characters" && item.display);
            const isRealSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.name === "Real" && item.display);
            const isPosesSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.name === "Poses" && item.display);
            const isMalesSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.name === "Males" && item.display);
            const isSFWSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.name === "SFW" && item.display);
            const isNSFWSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.name === "NSFW" && item.display);
            const isEXSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.name === "EX" && item.display);

            // Check exceptions
            if (isCharactersSelected && !isMalesSelected && folder.toLowerCase().includes("(males)")) {
                return false;
            }

            if (isPosesSelected && !isNSFWSelected && folder.toLowerCase().includes("/nsfw/")) {
                return false;
            }

            if (isPosesSelected && !isSFWSelected && folder.toLowerCase().includes("/sfw/")) {
                return false;
            }

            if (isPosesSelected && !isRealSelected && folder.toLowerCase().includes("/real/")) {
                return false;
            }

            if (isPosesSelected && !isRealSelected && folder.toLowerCase().includes("/real/")) {
                return false;
            }

            if (isSFWSelected && !isNSFWSelected && folder.toLowerCase().includes("/nsfw/")) {
                return false;
            }


            if (!isEXSelected && folder.toLowerCase().includes("/ex/")) {
                return false;
            }



            return true;
        }).sort((a: string, b: string) => {
            // Extract the first character of each string to compare
            const firstCharA = a.charAt(0).toUpperCase();
            const firstCharB = b.charAt(0).toUpperCase();

            // Check if both characters are digits or not
            const isDigitA = /\d/.test(firstCharA);
            const isDigitB = /\d/.test(firstCharB);

            if (isDigitA && !isDigitB) {
                // If A is a digit and B is not, A should come after B
                return 1;
            } else if (!isDigitA && isDigitB) {
                // If B is a digit and A is not, A should come before B
                return -1;
            }
            // If both are digits or both are not digits, compare alphabetically/numerically
            return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
        });

        setSortedandFilteredfoldersList(filteredFolderList);

    }

    const handleGetFoldersList = async () => {
        setIsLoading(true)
        const data = await fetchGetFoldersList(dispatch);
        setFoldersList(data)
        setIsLoading(false)
    }

    const handleRemoveCreatorUrl = async (url: string) => {
        const userConfirmed = window.confirm("Are you sure you want to remove the selected Creator Url?");
        if (!userConfirmed) return;

        // if we’re deleting the currently-selected row, clear selection first
        if (
            currentCreatorUrlIndex != null &&
            creatorUrlList[currentCreatorUrlIndex] &&
            creatorUrlList[currentCreatorUrlIndex].creatorUrl === url
        ) {
            setCurrentCreatorUrlIndex(null);
            setSelectedCreatorUrlText('');
            setSelectedRating('N/A');
        }

        await fetchRemoveFromCreatorUrlList(url, dispatch);
        handleRefreshList();
    };


    const handleFoldersListOnChange = (event: any, newValue: string | null) => {
        const disallowedRegex = /[<>:"\\\|?*]/g;
        dispatch(updateDownloadFilePath(newValue?.replace(disallowedRegex, '') || ""))

    }

    // Handler for blur event
    const handleAutocompleteBlur = () => {
        // If downloadFilePath is empty
        if (!downloadFilePath) {
            dispatch(updateDownloadFilePath('/@scan@/ErrorPath/'))
        }
    };

    // For switching between dropdown and edit mode
    const [isEditingCreatorUrl, setIsEditingCreatorUrl] = useState(false);
    const [creatorUrlInputValue, setCreatorUrlInputValue] = useState("");

    // Ref to the dropdown item that has lastChecked true
    const scrollItemRef = useRef<HTMLDivElement>(null);

    const handleCreatorDropdownToggle = (isOpen: boolean) => {
        if (isOpen) {
            setTimeout(() => {
                if (scrollItemRef.current) {
                    scrollItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100); // delay for 100ms, adjust as needed
        }
    };

    // inside WindowComponent, before return(...)
    const totalCreators = creatorUrlList.length;
    const newCreatorsCount = creatorUrlList.filter(item => item.status === "new").length;

    const filteredCreatorUrlList = creatorUrlList.filter(item =>
        ratingFilters[item.rating]
    );

    const ratingCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        ratingOrder.forEach(r => counts[r] = 0);
        creatorUrlList.forEach(item => {
            if (counts[item.rating] !== undefined) {
                counts[item.rating] += 1;
            }
        });
        return counts;
    }, [creatorUrlList, ratingOrder]);

    const navigableCreators = filteredCreatorUrlList.filter(item => item.status === "new");

    const hasFilteredNewItems = filteredCreatorUrlList.some(item => item.status === "new");

    return (
        <>

            {/* Header and Buttons */}
            <ErrorAlert />

            <center>
                <h1>Model List Mode</h1>
            </center>

            {/* Main Content: Left & Right Panels */}
            <div style={{ display: 'flex' }}>

                {/* LEFT PANEL */}
                <div style={{
                    flex: 1, width: '50%', margin: '1%',
                }}>

                    {/* Sticky Header/Buttons inside Left Panel */}
                    <div
                        style={{
                            position: 'sticky',
                            top: 0,
                            background: 'white',
                            zIndex: 1000,
                            padding: '20px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}
                    >

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
                            {/* Example: WindowCollapseButton for Database Check */}
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

                                        {/**Open Custom Window */}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "Open Custom Window",
                                            variant: "warning",
                                            buttonIcon: <BsReverseLayoutTextWindowReverse />
                                            ,
                                            disabled: false,
                                        }}
                                            handleFunctionCall={() => handleOpenCustomWindow()} />
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

                                        </div>

                                    </div>
                                }
                            />

                            <WindowCollapseButton
                                panelId="tabsButton"
                                isPanelOpen={collapseButtonStates['tabsButton']}
                                handleTogglePanel={handleToggleCollapseButton}
                                icons={<PiTabs />}
                                buttons={
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                                            <span style={{ fontWeight: 'bold' }}>Total:</span>
                                            <span>{totalCreators}</span>
                                            <span style={{ fontWeight: 'bold' }}>New:</span>
                                            <span>{newCreatorsCount}</span>
                                        </div>

                                        {/* Put everything in one row (Flex Container) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', margin: '5px' }}>
                                            {isEditingCreatorUrl ? (
                                                // Edit mode: show an Autocomplete component for creator URLs.
                                                <Autocomplete
                                                    freeSolo
                                                    fullWidth
                                                    style={{ width: '150px' }} // Ensure the container is 70% width.
                                                    options={filteredCreatorUrlList.map((item) => item.creatorUrl.split('/')[4])}
                                                    inputValue={creatorUrlInputValue}
                                                    onInputChange={(event, newInputValue) => {
                                                        setCreatorUrlInputValue(newInputValue);
                                                    }}
                                                    onChange={(event, newValue) => {
                                                        if (newValue) {
                                                            const found = filteredCreatorUrlList.find(
                                                                (item) => item.creatorUrl.split('/')[4] === newValue
                                                            );
                                                            if (found) {
                                                                handleSelectCreatorUrl(found);
                                                            } else {
                                                                setSelectedCreatorUrlText(newValue);
                                                            }
                                                            setIsEditingCreatorUrl(false);
                                                        }
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            fullWidth
                                                            onBlur={() => {
                                                                setSelectedCreatorUrlText(creatorUrlInputValue);
                                                                setIsEditingCreatorUrl(false);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    setSelectedCreatorUrlText(creatorUrlInputValue);
                                                                    setIsEditingCreatorUrl(false);
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                    )}
                                                />
                                            ) : (
                                                // Normal mode: show the dropdown.
                                                <Dropdown onToggle={handleCreatorDropdownToggle} style={{ width: '70%' }}>
                                                    <Dropdown.Toggle
                                                        variant="secondary"
                                                        style={{ width: '100%' }}
                                                        onDoubleClick={() => {
                                                            // Switch to edit mode on double-click.
                                                            setCreatorUrlInputValue(selectedCreatorUrlText);
                                                            setIsEditingCreatorUrl(true);
                                                        }}
                                                    >
                                                        {selectedCreatorUrlText || "-- Creator URL List (choose one) --"}
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                        {filteredCreatorUrlList.map((item) => (
                                                            <Dropdown.Item
                                                                as="div"
                                                                key={item.creatorUrl}
                                                                // Attach the scroll ref if this is the lastChecked item.
                                                                ref={item.lastChecked ? scrollItemRef : null}
                                                                onClick={() => handleSelectCreatorUrl(item)}
                                                                style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                <span>
                                                                    {!item.lastChecked ? (
                                                                        <>
                                                                            {item.creatorUrl.split('/')[4]} <em>({item.rating})</em>
                                                                        </>
                                                                    ) : (
                                                                        <b>
                                                                            {item.creatorUrl.split('/')[4]} <em>({item.rating})</em> <FaLeftLong />
                                                                        </b>
                                                                    )}
                                                                </span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                    <span>({item.status})</span>
                                                                    <Button
                                                                        variant="link"
                                                                        style={{ color: 'red', textDecoration: 'none' }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveCreatorUrl(item.creatorUrl);
                                                                        }}
                                                                    >
                                                                        <IoCloseOutline />
                                                                    </Button>
                                                                </div>
                                                            </Dropdown.Item>
                                                        ))}
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            )}

                                            <OverlayTrigger
                                                placement={"top"}
                                                overlay={<Tooltip id="tooltip">Go to {selectedCreatorUrlText}</Tooltip>}
                                            >
                                                <Button variant="primary" onClick={handleGo} disabled={currentCreatorUrlIndex == null}>
                                                    <IoNavigate />
                                                </Button>
                                            </OverlayTrigger>

                                            <OverlayTrigger
                                                placement={"top"}
                                                overlay={<Tooltip id="tooltip">Previous Page</Tooltip>}
                                            >
                                                <Button variant="success" onClick={handlePrevious} disabled={!hasFilteredNewItems}>
                                                    <MdSkipPrevious />
                                                </Button>
                                            </OverlayTrigger>

                                            <OverlayTrigger
                                                placement={"top"}
                                                overlay={<Tooltip id="tooltip">Next Page</Tooltip>}
                                            >
                                                <Button variant="success" onClick={handleNext} disabled={!hasFilteredNewItems}>
                                                    <MdSkipNext />
                                                </Button>
                                            </OverlayTrigger>

                                            <OverlayTrigger
                                                placement={"top"}
                                                overlay={<Tooltip id="tooltip">Refresh Page</Tooltip>}
                                            >
                                                <Button variant="warning" onClick={handleRefreshPage}>
                                                    <IoReloadOutline />
                                                </Button>
                                            </OverlayTrigger>

                                            <OverlayTrigger
                                                placement={"top"}
                                                overlay={<Tooltip id="tooltip">Remove Selected Creator Url</Tooltip>}
                                            >
                                                <Button variant="danger" onClick={() => handleRemoveCreatorUrl(`https://civitai.com/user/${selectedCreatorUrlText}/models`)}>
                                                    <IoCloseOutline />
                                                </Button>
                                            </OverlayTrigger>


                                        </div>


                                        <div style={{ display: 'flex', alignItems: 'end', gap: '3px', margin: '5px', justifyContent: 'flex-end' }}>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                                <span>
                                                    <FaRankingStar /> : {currentCreatorUrlIndex !== null
                                                        ? creatorUrlList[currentCreatorUrlIndex].rating
                                                        : 'N/A'}
                                                </span>
                                                <Form.Select
                                                    size="sm"
                                                    value={selectedRating}
                                                    onChange={e => setSelectedRating(e.target.value)}
                                                    style={{
                                                        width: '10ch',         // or 'auto' / '3rem' if you prefer
                                                        minWidth: '3ch',      // ensure it never shrinks to 0
                                                        textAlign: 'center',
                                                        textAlignLast: 'center' // for most browsers to center the selected option
                                                    }}
                                                >
                                                    {ratingOrder.map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </Form.Select>
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    onClick={handleApplyRating}
                                                    disabled={currentCreatorUrlIndex == null}
                                                >
                                                    Apply
                                                </Button>

                                                <Dropdown style={{ marginRight: 12 }}>
                                                    <Dropdown.Toggle size="sm" variant="outline-secondary">
                                                        Filter Ratings
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu style={{ padding: 8, maxHeight: 240, overflowY: 'auto' }}>
                                                        <Form.Check
                                                            type="checkbox"
                                                            id="filter-all-ratings"
                                                            label={`All (${totalCreators})`}
                                                            checked={allSelected}
                                                            onChange={toggleAllRatings}
                                                        />
                                                        <hr style={{ margin: '8px 0' }} />
                                                        {ratingOrder.map(r => (
                                                            <Form.Check
                                                                key={r}
                                                                type="checkbox"
                                                                id={`filter-${r}`}
                                                                label={`${r} (${ratingCounts[r] || 0})`}
                                                                checked={ratingFilters[r]}
                                                                onChange={() =>
                                                                    setRatingFilters(prev => ({ ...prev, [r]: !prev[r] }))
                                                                }
                                                            />
                                                        ))}
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </div>

                                            <OverlayTrigger
                                                placement={"top"}
                                                overlay={<Tooltip id="tooltip">Refresh Creator Url List</Tooltip>}
                                            >
                                                <Button variant="info" onClick={handleRefreshList}>
                                                    <WiCloudRefresh />
                                                </Button>
                                            </OverlayTrigger>

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

                        {selectedUrl !== "" && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    border: '2px solid #007bff',
                                    borderRadius: '8px',
                                    padding: '10px 15px',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                    backgroundColor: '#f8f9fa',
                                    marginTop: '20px',
                                }}
                            >
                                <ButtonWrap
                                    buttonConfig={{
                                        placement: "top",
                                        tooltip: "Full Info Panel",
                                        variant: "primary",
                                        buttonIcon: isFullInfoModelPanelVisible ? <LuPanelLeftOpen /> : <LuPanelRightOpen />,
                                        disable: counting,
                                    }}
                                    handleFunctionCall={toggleFullInfoModelPanel}
                                />

                                {selectedUrl && (
                                    <WindowShortcutPanel
                                        url={selectedUrl}
                                        setSelectedUrl={setSelectedUrl}
                                        urlList={urlList}
                                        setUrlList={setUrlList}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ margin: "20px" }}>
                        <div className="autocomplete-container">
                            <div className="autocomplete-container-row">
                                <Autocomplete
                                    value={downloadFilePath}
                                    onChange={handleFoldersListOnChange}
                                    inputValue={downloadFilePath}
                                    onInputChange={handleFoldersListOnChange}
                                    key="1"
                                    id="controllable-states-demo"
                                    options={sortedandFilteredfoldersList}
                                    sx={{ width: 350 }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            inputRef={inputRef}
                                            helperText={`Folder name can't contain '"<>:/\\|?*'`}
                                            label="Folder path"
                                            onBlur={handleAutocompleteBlur}
                                            onFocus={() => {
                                                if (inputRef.current) {
                                                    inputRef.current.scrollLeft =
                                                        inputRef.current.scrollWidth - inputRef.current.offsetWidth + 100;
                                                }
                                            }}
                                        />
                                    )}
                                />

                                <div style={{ padding: "5px" }} />

                                <OverlayTrigger
                                    placement="bottom"
                                    overlay={<Tooltip id="tooltip">Save this download file path.</Tooltip>}
                                >
                                    <Button
                                        variant="light"
                                        disabled={isLoading}
                                        className="tooltip-button"
                                        onClick={() => {
                                            updateDownloadFilePathIntoChromeStorage(downloadFilePath);
                                            updateSelectedCategoryIntoChromeStorage(selectedCategory);
                                        }}
                                    >
                                        <BsPencilFill />
                                    </Button>
                                </OverlayTrigger>
                            </div>
                        </div>
                    </div>

                    <FolderDropdown />

                    {/* URLGrid (Scrolls independently of the sticky header/buttons) */}
                    <div>

                        {workingModelID !== "" && <p>Processing Model Name: {processingModelName}</p>}
                        {countdown > 0 && <p>Next request in: {countdown} seconds</p>}

                        <URLGrid
                            urlList={urlList}
                            setUrlList={setUrlList}
                            selectedUrl={selectedUrl}
                            onUrlSelect={setSelectedUrl}
                        />
                    </div>

                    <div>
                        {
                            offlineMode ? (
                                <OverlayTrigger
                                    placement={"top"}
                                    overlay={<Tooltip id="tooltip">Add file into offline download list</Tooltip>}
                                >
                                    <Button
                                        variant={"success"}
                                        onClick={handleAddOfflineDownloadFileintoOfflineDownloadList}
                                        disabled={isLoading || urlList.length === 0 || !checkboxMode}
                                        className="btn btn-primary btn-lg w-100"
                                    >
                                        Offline Download {isLoading && <span className="button-state-complete">✓</span>}
                                    </Button>
                                </OverlayTrigger>
                            ) : (
                                <OverlayTrigger
                                    placement={"top"}
                                    overlay={<Tooltip id="tooltip">Download | Bookmark | Add Record</Tooltip>}
                                >
                                    <Button
                                        variant={"primary"}
                                        onClick={handleMultipleBundle_v2}
                                        disabled={isLoading || urlList.length === 0 || !checkboxMode}
                                        className="btn btn-primary btn-lg w-100"
                                    >
                                        Bundle Action {isLoading && <span className="button-state-complete">✓</span>}
                                    </Button>
                                </OverlayTrigger>
                            )
                        }
                    </div>
                </div>

                {/* RIGHT PANEL: Sticky Sidebar */}
                <div
                    style={{
                        width: '50%',
                        position: 'sticky',
                        top: 0,
                        padding: '20px',
                        background: 'white',
                        boxShadow: '-2px 0 4px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                    }}
                >
                    <CategoriesListSelector />
                    <FilesPathSettingPanel setIsHandleRefresh={setIsHandleRefresh} isHandleRefresh={isHandleRefresh} />

                </div>
            </div >

            {/* POP OUT SECTION: These elements are rendered separately */}
            <>
                {
                    selectedUrl !== "" && isFullInfoModelPanelVisible && (
                        <WindowFullInfoModelPanel
                            url={selectedUrl}
                            urlList={urlList}
                            setUrlList={setUrlList}
                            setIsFullInfoModelPanelVisible={setIsFullInfoModelPanelVisible}
                            onClose={toggleFullInfoModelPanel}
                        />
                    )
                }
            </>
        </>

    )
};

export default WindowComponent;
