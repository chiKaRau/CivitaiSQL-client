import React, { useEffect, useMemo, useRef, useState, version } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { updateDownloadFilePath, updateDownloadPriority, updateIsDarkMode } from "../../store/actions/chromeActions"

//Icons Components
import { AiFillFolderOpen, AiOutlineArrowUp, AiOutlineArrowDown } from "react-icons/ai"
import { BsDownload, BsPencilFill } from 'react-icons/bs';
import { TbDatabaseSearch, TbDatabasePlus, TbDatabaseMinus } from "react-icons/tb";
import { PiLockKeyBold, PiLockKeyOpenBold, PiPlusMinusFill } from "react-icons/pi";
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
import { Button, OverlayTrigger, Tooltip, Form, Dropdown, ButtonGroup, Collapse } from 'react-bootstrap';
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

type Category = {
    id: number;
    prefixName: string;
    downloadFilePath: string;
    downloadPriority: number;
    createdAt?: string;
    updatedAt?: string;
};
type SelectedItem = { category: Category; display: boolean };

type StagedItem = {
    id: string;
    url: string;
    modelId: string;
    versionId: string;
    versionManuallyEdited?: boolean;
    imgSrc?: string;

    isPrimary?: boolean;
    badge?: string;
    modelVersionDisplay?: string;

    downloadFilePath: string;
    selectedCategory: string;
    downloadMethod: string;
    hold: boolean;
    downloadPriority: number;

    action: "offline" | "bundle";
    stagedAt: number;
    status: "staged" | "running" | "done" | "failed";
    error?: string;
};

type RatingCfg = { rating: string; expectedMax: number };

type DownloadPathRoot = "ACG" | "R";

const DOWNLOAD_PATH_ROOT_OPTIONS: DownloadPathRoot[] = ["ACG", "R"];

const DOWNLOAD_PATH_ROOT_FOLDER = {
    ACG: "ACG",
    R: "Real",
} as const;
const WINDOW_RECENT_CREATOR_STORAGE_KEY = "windowRecentCreatorUrls";

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
    fetchRemoveFromCreatorUrlList,
    fetchGetRatingList,
    fetchRemoveOfflineDownloadFileIntoOfflineDownloadList,
    fetchFindVersionNumbersForOfflineDownloadList,
    fetchAddOfflineDownloadFileIntoOfflineDownloadListByVersionAPI
} from "../../api/civitaiSQL_api"

//utils
import { bookmarkThisUrl, updateDownloadMethodIntoChromeStorage, callChromeBrowserDownload, removeBookmarkByUrl, updateOfflineModeIntoChromeStorage, updateSelectedCategoryIntoChromeStorage, updateDownloadFilePathIntoChromeStorage, addRecentDownloadFilePath } from "../../utils/chromeUtils"
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils"
import { BiSolidBarChartSquare, BiSolidHdd } from 'react-icons/bi';
import WindowFullInfoModelPanel from './WindowFullInfoModelPanel';
import SetOriginalTabButton from './SetOriginalTabButton';
import WindowShortcutPanel from './WindowShortcutPanel';
import { FaEdit, FaExternalLinkAlt, FaMoon, FaSun, FaTrashAlt } from 'react-icons/fa';
import { CellStyle, ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { SelectEditor } from './SelectEditor';
import { PathAutocompleteEditor } from './PathAutocompleteEditor';
import { HoldEditor } from './HoldEditor';
import { darkTheme, getOfflineWindowStyles, lightTheme } from '../window_offline/OfflineWindow.theme';
import { HoverImagePreview } from './HoverImagePreview';
import { TrashButton } from './TrashButton';
import SmartImage from '../window_offline/SmartImage';
import EarlyAccessAutoWatchButton from '../window_offline/EarlyAccessAutoWatchButton';
import ModelVersionFileExistsBadge from '../ModelVersionFileExistsBadge';

interface CreatorUrlItem {
    creatorUrl: string;
    lastChecked: boolean;
    status: string;
    rating: string;
    lastCheckedDate?: string | null;
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
    const [urlImgSrcMap, setUrlImgSrcMap] = useState<Record<string, string>>({});
    const [urlVersionIdMap, setUrlVersionIdMap] = useState<Record<string, string>>({});
    const [urlBadgeMap, setUrlBadgeMap] = useState<Record<string, string>>({});

    const [checkedUrlList, setCheckedUrlList] = useState<string[]>([]);

    const [offlineUrlMap, setOfflineUrlMap] = useState<Record<string, boolean>>({});

    //const [originalTabId, setOriginalTabId] = useState(0);
    const [workingModelID, setWorkingModelID] = useState("");

    const chromeData = useSelector((state: AppState) => state.chrome);
    const { downloadMethod, downloadFilePath, selectedCategory, offlineMode,
        selectedFilteredCategoriesList, downloadPriority: storeDownloadPriority, isDarkMode } = chromeData;

    const [sortedandFilteredfoldersList, setSortedandFilteredfoldersList] = useState<string[]>([]);
    const [foldersList, setFoldersList] = useState([])

    const [processingModelName, setProcessingModelName] = useState("");

    const [selectedUrl, setSelectedUrl] = useState("");

    const [isFullInfoModelPanelVisible, setIsFullInfoModelPanelVisible] = useState(false);

    const [isSorted, setIsSorted] = useState(true);

    const [tabCreator, setTabCreator] = useState("");

    const [useAgeNav, setUseAgeNav] = useState(true);

    const URLGRID_STORAGE_KEY = "windowUrlGridState";

    const [currentTabUrl, setCurrentTabUrl] = useState("");
    const [currentTabCreator, setCurrentTabCreator] = useState("");
    const [isCurrentCreatorInList, setIsCurrentCreatorInList] = useState(false);

    const [modelPrimaryVersionIdMap, setModelPrimaryVersionIdMap] =
        useState<Record<string, string>>({});

    const [collapseButtonStates, setCollapseButtonStates] = useState<{ [key: string]: boolean }>({
        checkDatabaseButton: false,
        bookmarkButton: false, // Initial value to help TypeScript infer the types
        downloadButton: true, // You can add more initial panels as needed
        utilsButton: false,
        tabsButton: true
    });

    const [updateCount, setUpdateCount] = useState(10);
    const [checkedUpdateList, setCheckedUpdateList] = useState<string[]>([]);
    const [lastUpdateProcessedIndex, setLastUpdateProcessedIndex] = useState(0);

    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    const [lockedUrl, setLockedUrl] = useState<string>("");
    const [neighborCount, setNeighborCount] = useState<number>(5);

    const [downloadPathRoot, setDownloadPathRoot] = useState<DownloadPathRoot>("ACG");

    const hasInitializedDownloadPathRootRef = useRef(false);
    const hasUserSelectedDownloadPathRootRef = useRef(false);

    const [recentCreatorUrls, setRecentCreatorUrls] = useState<string[]>([]);
    const recentCreatorUrlsLoadedRef = useRef(false);

    // Optional fallback so UI doesn't go blank if API fails.
    // If you truly want zero hardcode, set this to [] and handle empty UI states.
    const DEFAULT_RATING_CFG: RatingCfg[] = [
        { rating: "EX", expectedMax: 10 },
        { rating: "SSS", expectedMax: 25 },
        { rating: "SS", expectedMax: 50 },
        { rating: "S", expectedMax: 100 },
        { rating: "A", expectedMax: 150 },
        { rating: "B", expectedMax: 200 },
        { rating: "C", expectedMax: 500 },
        { rating: "D", expectedMax: 500 },
        { rating: "E", expectedMax: 500 },
        { rating: "F", expectedMax: 500 },
        { rating: "N/A", expectedMax: 500 },
    ];

    const theme = isDarkMode ? darkTheme : lightTheme;

    const {
        themedSelectStyle,
        themedDropdownToggleStyle,
        themedDropdownMenuStyle,
        themedCheckLabelStyle,
        themedButtonStyle,
        themedPanelStyle,
        themedSubtlePanelStyle,
        agGridThemeStyle,
    } = getOfflineWindowStyles(theme, isDarkMode);

    const creatorNavButtonSlotStyle: React.CSSProperties = {
        width: "44px",
        minWidth: "44px",
        height: "38px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    };

    const creatorNavButtonStyle: React.CSSProperties = {
        width: "44px",
        minWidth: "44px",
        height: "38px",
        padding: "6px 0",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    };

    const invisibleCreatorNavButtonStyle: React.CSSProperties = {
        ...creatorNavButtonStyle,
        visibility: "hidden",
        pointerEvents: "none",
    };

    const folderActionButtonStyle: React.CSSProperties = {
        backgroundColor: theme.buttonBackground,
        color: theme.buttonText,
        border: `1px solid ${theme.buttonBorder}`,
        boxShadow: theme.buttonShadow,
        alignSelf: "flex-start",
        flexShrink: 0,
        marginTop: "0px",
        height: "56px",
        minWidth: "64px",
        padding: "0 10px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    };

    const [ratingConfigList, setRatingConfigList] = useState<RatingCfg[]>(DEFAULT_RATING_CFG);

    const ratingOrder = useMemo(
        () => ratingConfigList.map(x => x.rating),
        [ratingConfigList]
    );

    const expectedMaxByRating = useMemo(() => {
        const m: Record<string, number> = {};
        for (const x of ratingConfigList) m[x.rating] = x.expectedMax;
        return m;
    }, [ratingConfigList]);

    const [isPendingLockEnabled, setIsPendingLockEnabled] = useState<boolean>(true);

    const handleClearUrlGrid = () => {
        if (urlList.length === 0) return;

        const userConfirmed = window.confirm("Are you sure you want to clear all rows in URLGrid?");
        if (!userConfirmed) return;

        const urlsToClear = [...urlList];

        setUrlList([]);
        setSelectedUrl("");
        setLockedUrl("");

        chrome.storage.local.get("originalTabId", (result) => {
            if (result.originalTabId) {
                for (const url of urlsToClear) {
                    chrome.tabs.sendMessage(result.originalTabId, {
                        action: "uncheck-url",
                        url,
                    });
                }
            }
        });
    };

    const handleClearStagingQueue = () => {
        if (stagedItems.length === 0) return;

        const userConfirmed = window.confirm("Are you sure you want to clear all rows in the Staging Queue?");
        if (!userConfirmed) return;

        setStagedItems([]);
    };

    const toggleTheme = () => {
        dispatch(updateIsDarkMode(!isDarkMode));
    };

    const hasPendingPathInInbox = useMemo(() => {
        return urlList.length > 0 && downloadFilePath.toLowerCase().includes("pending");
    }, [urlList, downloadFilePath]);

    const isStageBlockedByPendingLock = isPendingLockEnabled && hasPendingPathInInbox;

    useEffect(() => {
        (async () => {
            const list = await fetchGetRatingList(dispatch);

            if (Array.isArray(list) && list.length > 0) {
                const normalized: RatingCfg[] = list
                    .filter((x: any) => x && typeof x.rating === "string")
                    .map((x: any) => ({
                        rating: String(x.rating),
                        expectedMax: Number(x.expectedMax) || 0,
                    }));

                setRatingConfigList(normalized);
            }
        })();
    }, [dispatch]);


    const [selectedRating, setSelectedRating] = useState<string>("N/A");

    // after const [selectedRating,…]
    const [ratingFilters, setRatingFilters] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!ratingOrder.length) return;

        setRatingFilters(prev => {
            const next: Record<string, boolean> = {};
            for (const r of ratingOrder) {
                next[r] = prev[r] ?? true; // keep old choice, default true for new ratings
            }
            return next;
        });
    }, [ratingOrder]);

    useEffect(() => {
        if (typeof storeDownloadPriority === "number") {
            setDownloadPriority(storeDownloadPriority);
        }
    }, [storeDownloadPriority]);

    const allSelected = ratingOrder.length > 0 && ratingOrder.every(r => ratingFilters[r]);

    const [hold, setHold] = useState<boolean>(false);
    const [downloadPriority, setDownloadPriority] = useState<number>(5);

    const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);

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
        if (!selectedUrl) return;
        if (!lockedUrl) return;
        if (lockedUrl !== selectedUrl) {
            setLockedUrl("");
        }
    }, [selectedUrl]);

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
                const url = message.url as string;

                setUrlList(prev => (prev.includes(url) ? prev : [...prev, url]));

                // NEW: store DOM thumbnail immediately if provided
                if (message.imgSrc) {
                    setUrlImgSrcMap(prev => ({ ...prev, [url]: message.imgSrc }));
                }

            } else if (message.action === "removeUrl") {
                const url = message.url as string;

                setUrlList(prev => prev.filter(u => u !== url));

                // NEW: cleanup maps
                setUrlImgSrcMap(prev => {
                    const next = { ...prev };
                    delete next[url];
                    return next;
                });
                setUrlVersionIdMap(prev => {
                    const next = { ...prev };
                    delete next[url];
                    return next;
                });
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
            const normalized = list.map(item => ({
                ...item,
                rating: item.rating ?? "N/A",
                lastCheckedDate: item.lastCheckedDate ?? null
            }));
            setCreatorUrlList(normalized);
            return normalized; // <-- NEW
        }
        return []; // <-- NEW
    }

    const timeAgo = (input: string | Date | null | undefined) => {
        if (!input) return "";
        const d = typeof input === "string" ? new Date(input) : input;
        const s = Math.floor((Date.now() - d.getTime()) / 1000);
        if (Number.isNaN(s)) return "";
        if (s < 60) return `${s}s ago`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const day = Math.floor(h / 24);
        if (day < 7) return `${day}d ago`;
        const w = Math.floor(day / 7);
        if (w < 5) return `${w}w ago`;
        const mo = Math.floor(day / 30);
        if (mo < 12) return `${mo}mo ago`;
        const y = Math.floor(day / 365);
        return `${y}y ago`;
    };

    const [selectedCreatorUrlText, setSelectedCreatorUrlText] = useState("");

    const nullNewIndices = useMemo(() => {
        return creatorUrlList
            .map((item, i) => ({ i, item }))
            .filter(({ item }) => item.status === "new" && ratingFilters[item.rating] && !item.lastCheckedDate)
            .map(({ i }) => i); // keep original index order
    }, [creatorUrlList, ratingFilters]);

    const datedNewIndices = useMemo(() => {
        return creatorUrlList
            .map((item, i) => ({ i, item }))
            .filter(({ item }) => item.status === "new" && ratingFilters[item.rating] && !!item.lastCheckedDate)
            .sort((a, b) => new Date(a.item.lastCheckedDate!).getTime() - new Date(b.item.lastCheckedDate!).getTime()) // oldest→newest
            .map(({ i }) => i);
    }, [creatorUrlList, ratingFilters]);

    const reverseByModelGroup = <T extends { modelId: string; isPrimary?: boolean }>(rows: T[]) => {
        const groups: T[][] = [];
        const groupIndexMap = new Map<string, number>();

        rows.forEach((row) => {
            const existingIndex = groupIndexMap.get(row.modelId);

            if (existingIndex === undefined) {
                groupIndexMap.set(row.modelId, groups.length);
                groups.push([row]);
            } else {
                groups[existingIndex].push(row);
            }
        });

        return groups
            .reverse()
            .flatMap((group) => {
                const mainRows = group.filter((row) => row.isPrimary);
                const otherRows = group.filter((row) => !row.isPrimary);

                return [...mainRows, ...otherRows];
            });
    };

    const stagedRowData = useMemo(() => {
        const rawRows = stagedItems.map((it) => ({
            ...it,
            isPrimary: !!it.isPrimary,
            modelVersionDisplay:
                it.modelVersionDisplay ||
                (it.versionId && it.versionId !== "Selecting"
                    ? `${it.modelId}_${it.versionId}`
                    : `${it.modelId}`),
            imgSrc: it.imgSrc || "",
        }));

        return reverseByModelGroup(rawRows).map((row, index) => ({
            ...row,
            idx: index + 1,
        }));
    }, [stagedItems]);

    const pickByNullThenAge = (direction: 1 | -1): number | null => {
        const cur = currentCreatorUrlIndex ?? -1;

        // If any nulls exist, navigate among nulls ONLY.
        if (nullNewIndices.length > 0) {
            const pos = nullNewIndices.indexOf(cur);
            if (pos !== -1) {
                // currently on a null → move to next/prev null
                return direction === 1
                    ? nullNewIndices[(pos + 1) % nullNewIndices.length]
                    : nullNewIndices[(pos - 1 + nullNewIndices.length) % nullNewIndices.length];
            } else {
                // currently not on a null → jump to the nearest null in the chosen direction
                if (direction === 1) {
                    const ahead = nullNewIndices.find(idx => idx > cur);
                    return ahead ?? nullNewIndices[0]; // wrap
                } else {
                    const behind = [...nullNewIndices].reverse().find(idx => idx < cur);
                    return behind ?? nullNewIndices[nullNewIndices.length - 1]; // wrap
                }
            }
        }

        // No nulls → use dated (age-ordered).
        if (datedNewIndices.length === 0) return null;

        const posD = datedNewIndices.indexOf(cur);
        if (posD !== -1) {
            return direction === 1
                ? datedNewIndices[(posD + 1) % datedNewIndices.length]
                : datedNewIndices[(posD - 1 + datedNewIndices.length) % datedNewIndices.length];
        } else {
            // not on any dated item yet → start at oldest/newest depending on direction
            return direction === 1 ? datedNewIndices[0] : datedNewIndices[datedNewIndices.length - 1];
        }
    };

    const handleNextByAge = () => {
        const override = jumpToExtremeIfNeeded(1);
        const targetIdx = override ?? pickByNullThenAge(1);
        if (targetIdx == null) return;
        setCurrentCreatorUrlIndex(targetIdx);
        setSelectedCreatorUrlText(creatorUrlList[targetIdx].creatorUrl.split('/')[4]);
        goToUrlInBrowserTab(creatorUrlList[targetIdx].creatorUrl);
    };

    const handlePreviousByAge = () => {
        const override = jumpToExtremeIfNeeded(-1);
        const targetIdx = override ?? pickByNullThenAge(-1);
        if (targetIdx == null) return;
        setCurrentCreatorUrlIndex(targetIdx);
        setSelectedCreatorUrlText(creatorUrlList[targetIdx].creatorUrl.split('/')[4]);
        goToUrlInBrowserTab(creatorUrlList[targetIdx].creatorUrl);
    };

    // Make BOTH Next and Prev jump to OLDEST first when there are no nulls
    const jumpToExtremeIfNeeded = (direction: 1 | -1): number | null => {
        if (nullNewIndices.length > 0) return null;
        if (datedNewIndices.length === 0) return null;

        const cur = currentCreatorUrlIndex ?? -1;
        const oldest = datedNewIndices[0];

        // If we're not on the oldest yet, first hop goes to oldest (for BOTH directions)
        if (cur !== oldest) return oldest;

        // Otherwise, no override—let pickByNullThenAge do normal cycling
        return null;
    };

    // Normalize URLs for safe comparison
    const normalizeUrl = (u: string) => (u || "").replace(/\/+$/, "").toLowerCase();

    // Find the original tab (if set) or fall back to the active tab in a normal window
    const getActiveOrOriginalTab = async (): Promise<chrome.tabs.Tab | null> => {
        const { originalTabId } = await chrome.storage.local.get("originalTabId");
        if (originalTabId) {
            try {
                const t = await chrome.tabs.get(originalTabId);
                if (t?.url) return t;
            } catch { }
        }
        const windows = await chrome.windows.getAll({ populate: false });
        const normalWindow = windows.find(w => w.type === "normal");
        if (!normalWindow) return null;
        const [activeTab] = await chrome.tabs.query({ active: true, windowId: normalWindow.id });
        return activeTab || null;
    };

    const patchStagedById = (id: string, patch: Partial<StagedItem>) => {
        setStagedItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
    };

    const updateStagedVersionId = React.useCallback(
        (item: StagedItem, rawVersionId: string) => {
            // Only allow digits.
            const versionId = rawVersionId.replace(/\D/g, "");

            // Keep the existing model ID unchanged.
            const modelId = item.modelId;

            const isPrimary =
                !!versionId &&
                modelPrimaryVersionIdMap[modelId] === versionId;

            const nextUrl = versionId
                ? `https://civitai.red/models/${modelId}?modelVersionId=${versionId}`
                : `https://civitai.red/models/${modelId}`;

            const nextModelVersionDisplay = versionId
                ? `${modelId}_${versionId}${isPrimary ? " (main)" : ""}`
                : modelId;

            setStagedItems(prev =>
                prev.map(row =>
                    row.id === item.id
                        ? {
                            ...row,

                            // modelId is intentionally not changed.
                            versionId,
                            url: nextUrl,
                            modelVersionDisplay: nextModelVersionDisplay,
                            isPrimary,
                            versionManuallyEdited: true,
                        }
                        : row
                )
            );
        },
        [modelPrimaryVersionIdMap]
    );

    const handleUnstageItem = React.useCallback((item: StagedItem) => {
        setUrlList(prev => {
            if (prev.includes(item.url)) return prev;
            return [...prev, item.url];
        });

        const restoredImgSrc = item.imgSrc || "";
        if (restoredImgSrc) {
            setUrlImgSrcMap(prev => ({
                ...prev,
                [item.url]: restoredImgSrc,
            }));
        }

        const restoredVersionId = item.versionId || "";

        if (restoredVersionId && restoredVersionId !== "Selecting") {
            setUrlVersionIdMap(prev => ({
                ...prev,
                [item.url]: restoredVersionId,
            }));
        } else {
            // Prevent an old mapped version from reappearing
            // when the edited staged version is empty.
            setUrlVersionIdMap(prev => {
                const next = { ...prev };
                delete next[item.url];
                return next;
            });
        }

        setStagedItems(prev => prev.filter(x => x.id !== item.id));
    }, []);

    const toRedCreatorUrl = (url: string) => {
        try {
            const creator = extractCreatorFromUserModelsUrl(url);

            if (creator) {
                return `https://civitai.red/user/${encodeURIComponent(creator)}/models`;
            }

            return url;
        } catch {
            return url;
        }
    };

    // Read current tab, extract creator if URL matches /user/<creator>/models
    const refreshCurrentTabCreator = async () => {
        const tab = await getActiveOrOriginalTab();
        const url = tab?.url || "";
        setCurrentTabUrl(url);

        const creator = extractCreatorFromUserModelsUrl(url);
        setCurrentTabCreator(creator);

        const inList =
            !!creator &&
            creatorUrlList.some(
                (item) => getCreatorKey(item.creatorUrl) === creator.toLowerCase()
            );

        setIsCurrentCreatorInList(inList);
    };

    // Add the current tab's creator to list, then auto-select it in the dropdown
    const handleAddCurrentTabCreator = async () => {
        await refreshCurrentTabCreator();

        if (!currentTabCreator) {
            alert("Current tab is not a creator page.");
            return;
        }

        const creatorUrl = buildCanonicalCreatorUrl(currentTabCreator);

        await fetchUpdateCreatorUrlList(creatorUrl, "new", false, "N/A", dispatch);

        const newList = await fetchCreatorUrlList();
        const idx = newList.findIndex(
            (it) => getCreatorKey(it.creatorUrl) === currentTabCreator.toLowerCase()
        );

        if (idx !== -1) {
            setCurrentCreatorUrlIndex(idx);
            setSelectedCreatorUrlText(currentTabCreator);
        }

        await refreshCurrentTabCreator();
    };


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


    const syncLockedUrlToOriginalTab = (url: string) => {
        chrome.storage.local.get("originalTabId", (r) => {
            const tabId = r?.originalTabId;
            if (!tabId) return;

            chrome.tabs.sendMessage(
                tabId,
                { action: "set-locked-url", url },
                () => {
                    const err = chrome.runtime.lastError;
                    if (err) console.debug("[set-locked-url] sendMessage:", err.message);
                }
            );
        });
    };

    const clearLockedUrlFromOriginalTab = () => {
        chrome.storage.local.get("originalTabId", (r) => {
            const tabId = r?.originalTabId;
            if (!tabId) return;

            chrome.tabs.sendMessage(
                tabId,
                { action: "clear-locked-url" },
                () => {
                    const err = chrome.runtime.lastError;
                    if (err) console.debug("[clear-locked-url] sendMessage:", err.message);
                }
            );
        });
    };

    const handleAddAroundLocked = (direction: "prev" | "next") => {
        if (!lockedUrl) return;

        chrome.storage.local.get("originalTabId", (r) => {
            const tabId = r?.originalTabId;
            if (!tabId) return;

            chrome.tabs.sendMessage(
                tabId,
                {
                    action: "add-around-locked",
                    lockedUrl,
                    direction,
                    count: neighborCount,
                },
                () => {
                    const err = chrome.runtime.lastError;
                    if (err) console.debug("[add-around-locked] sendMessage:", err.message);
                }
            );
        });
    };

    useEffect(() => {
        if (lockedUrl) {
            syncLockedUrlToOriginalTab(lockedUrl);
        } else {
            clearLockedUrlFromOriginalTab();
        }
    }, [lockedUrl]);

    useEffect(() => {
        if (!selectedUrl && lockedUrl) {
            setLockedUrl("");
        }
    }, [selectedUrl, lockedUrl]);


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

    const extractCreatorFromUserModelsUrl = (url: string) => {
        try {
            const u = new URL(url);

            // Accept both:
            // https://civitai.com/user/81188
            // https://civitai.com/user/81188/models
            // https://civitai.red/user/81188
            // https://civitai.red/user/81188/models
            const match = u.pathname.match(/^\/user\/([^/]+)(?:\/models)?\/?$/i);

            return match ? decodeURIComponent(match[1]) : "";
        } catch {
            return "";
        }
    };

    const buildCanonicalCreatorUrl = (creator: string) => {
        return creator
            ? `https://civitai.com/user/${encodeURIComponent(creator)}/models`
            : "";
    };

    const getCreatorKey = (url: string) => {
        return extractCreatorFromUserModelsUrl(url).toLowerCase();
    };

    const getDownloadPriorityWithCreatorBonus = async (basePriority: number) => {
        const tab = await getActiveOrOriginalTab();
        const currentUrl = tab?.url || "";

        try {
            const parsedUrl = new URL(currentUrl);

            const hostname = parsedUrl.hostname
                .replace(/^www\./i, "")
                .toLowerCase();

            const pathname = parsedUrl.pathname
                .replace(/\/+$/, "")
                .toLowerCase();

            const isMainModelsPage =
                ["civitai.com", "civitai.red"].includes(hostname) &&
                pathname === "/models";

            // Main models page always uses priority 6.
            if (isMainModelsPage) {
                return basePriority === 5 ? 6 : basePriority;
            }
        } catch {
            // Invalid or unavailable URL. Continue with creator-rating check.
        }

        const creator = extractCreatorFromUserModelsUrl(currentUrl);

        // Not on a creator page.
        if (!creator) return basePriority;

        const creatorItem = creatorUrlList.find(
            (item) =>
                getCreatorKey(item.creatorUrl) === creator.toLowerCase()
        );

        // Creator is not in the creator list.
        if (!creatorItem) return basePriority;

        const rating = (creatorItem.rating || "")
            .trim()
            .toUpperCase();

        // S or above gets +1, capped at 10.
        if (["S", "SS", "SSS", "EX"].includes(rating)) {
            return Math.min(basePriority + 1, 10);
        }

        return basePriority;
    };

    useEffect(() => {
        chrome.storage.local.get(WINDOW_RECENT_CREATOR_STORAGE_KEY, (result) => {
            const saved = result?.[WINDOW_RECENT_CREATOR_STORAGE_KEY];

            if (Array.isArray(saved)) {
                setRecentCreatorUrls(
                    saved
                        .filter((x) => typeof x === "string")
                        .slice(0, 3)
                );
            }

            recentCreatorUrlsLoadedRef.current = true;
        });
    }, []);

    useEffect(() => {
        if (!recentCreatorUrlsLoadedRef.current) return;

        chrome.storage.local.set({
            [WINDOW_RECENT_CREATOR_STORAGE_KEY]: recentCreatorUrls.slice(0, 3),
        });
    }, [recentCreatorUrls]);

    const getCreatorDisplayNameFromUrl = (url: string) => {
        return extractCreatorFromUserModelsUrl(url) || url.split("/")[4] || url;
    };

    const rememberRecentCreatorUrl = (url: string) => {
        const creator = extractCreatorFromUserModelsUrl(url);
        const storedUrl = creator ? buildCanonicalCreatorUrl(creator) : url;
        const storedKey = getCreatorKey(storedUrl) || normalizeUrl(storedUrl);

        setRecentCreatorUrls((prev) => {
            const next = [
                storedUrl,
                ...prev.filter((x) => {
                    const key = getCreatorKey(x) || normalizeUrl(x);
                    return key !== storedKey;
                }),
            ];

            return next.slice(0, 3);
        });
    };

    const handleSelectRecentCreatorUrl = (url: string) => {
        const recentKey = getCreatorKey(url) || normalizeUrl(url);

        const foundIndex = creatorUrlList.findIndex((item) => {
            const itemKey = getCreatorKey(item.creatorUrl) || normalizeUrl(item.creatorUrl);
            return itemKey === recentKey;
        });

        if (foundIndex !== -1) {
            setCurrentCreatorUrlIndex(foundIndex);
            setSelectedCreatorUrlText(getCreatorDisplayNameFromUrl(creatorUrlList[foundIndex].creatorUrl));
            return;
        }

        setCurrentCreatorUrlIndex(null);
        setSelectedCreatorUrlText(getCreatorDisplayNameFromUrl(url));
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

            setOfflineUrlMap(prev => {
                const next = { ...prev };
                for (const item of results) {
                    next[item.url] = Number(item.quantity) > 0;
                }
                return next;
            });

            chrome.storage.local.get('originalTabId', (result) => {
                if (result.originalTabId) {
                    chrome.tabs.sendMessage(result.originalTabId, { action: "display-offline", offlineList: results })
                }
            });
        }
    };

    const resolveModelAndVersionFromUrl = async (url: string) => {
        let modelId = "";
        let versionId = "";

        try {
            const uri = new URL(url);
            modelId = uri.pathname.match(/\/models\/(\d+)/)?.[1] || "";
            versionId = uri.searchParams.get("modelVersionId") || urlVersionIdMap[url] || "";

            if (!versionId && modelId) {
                const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);
                const firstVersionId = data?.modelVersions?.[0]?.id
                    ? String(data.modelVersions[0].id)
                    : "";

                if (firstVersionId) {
                    versionId = firstVersionId;

                    setUrlVersionIdMap(prev => {
                        if (prev[url] === firstVersionId) return prev;
                        return { ...prev, [url]: firstVersionId };
                    });

                    setModelPrimaryVersionIdMap(prev => {
                        if (prev[modelId] === firstVersionId) return prev;
                        return { ...prev, [modelId]: firstVersionId };
                    });
                }
            }
        } catch {
            // ignore bad URL
        }

        return { url, modelId, versionId };
    };

    const handleRemoveOfflineFromAllUrlGridRows = async () => {
        if (urlList.length === 0) return;

        const uniqueModelIds = Array.from(
            new Set(
                urlList
                    .map((url) => {
                        try {
                            const uri = new URL(url);
                            return uri.pathname.match(/\/models\/(\d+)/)?.[1] || "";
                        } catch {
                            return "";
                        }
                    })
                    .filter(Boolean)
            )
        );

        if (uniqueModelIds.length === 0) {
            alert("No valid model IDs found in URLGrid.");
            return;
        }

        setIsLoading(true);

        try {
            const removeTargets: Array<{ civitaiModelID: string; civitaiVersionID: string }> = [];

            for (const modelId of uniqueModelIds) {
                const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);
                if (!data?.modelVersions?.length) continue;

                const versionIds = data.modelVersions.map((v: any) => String(v.id));

                const offlineSet = await fetchFindVersionNumbersForOfflineDownloadList(
                    modelId,
                    versionIds,
                    dispatch
                );

                const offlineIdsInThisModel = Array.from(offlineSet || []).map(String);

                for (const civitaiVersionID of offlineIdsInThisModel) {
                    removeTargets.push({
                        civitaiModelID: modelId,
                        civitaiVersionID,
                    });
                }
            }

            if (removeTargets.length === 0) {
                alert("No versions from the models in URLGrid are in the Offline List.");
                return;
            }

            const userConfirmed = window.confirm(
                `Remove ${removeTargets.length} offline item(s) across ${uniqueModelIds.length} model(s)?`
            );
            if (!userConfirmed) return;

            for (const target of removeTargets) {
                await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(target, dispatch);
            }

            // refresh visible row markers
            await checkIfUrlExistInOfflineDownload(urlList);

            // optional: strip ^ from visible rows immediately
            setUrlBadgeMap((prev) => {
                const next = { ...prev };

                for (const url of urlList) {
                    next[url] = (next[url] || "").replace(/\s*\^/g, "");
                }

                return next;
            });

            setSelectedUrl("");
        } catch (error: any) {
            console.error("Failed to remove offline entries for URLGrid models:", error?.message || error);
            alert("Failed to remove some offline entries. Check console.");
        } finally {
            setIsLoading(false);
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
    const handleDownloadMultipleFile_v2 = async (
        civitaiData: any,
        civitaiUrl: string,
        modelId: string,
        versionIndex: any,
        overrides?: { downloadFilePath?: string; downloadMethod?: string }
    ) => {
        const downloadFilePathToUse = overrides?.downloadFilePath ?? downloadFilePath;
        const downloadMethodToUse = overrides?.downloadMethod ?? downloadMethod;

        let civitaiVersionID = civitaiData?.modelVersions[versionIndex]?.id.toString();
        let civitaiModelID = modelId;

        let civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        let civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID);

        if (
            !civitaiUrl ||
            !civitaiFileName ||
            !civitaiModelID ||
            !civitaiVersionID ||
            !downloadFilePathToUse ||
            !civitaiModelFileList?.length
        ) {
            console.log("fail");
            return;
        }

        //FIX HERE
        if (["/Pending/"].includes(downloadFilePathToUse)) {
            alert("DownloadFilePath cannot be Pending");
            return;
        }

        let modelObject = {
            downloadFilePath: downloadFilePathToUse,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl
        };

        if (downloadMethodToUse === "server") {
            const isDownloadSuccessful = await fetchDownloadFilesByServer_v2(modelObject, dispatch);
            return isDownloadSuccessful;
        } else {
            await fetchDownloadFilesByBrowser_v2(civitaiUrl, downloadFilePathToUse, dispatch);

            const data = await fetchCivitaiModelInfoFromCivitaiByVersionID(civitaiVersionID, dispatch);
            if (data) {
                chrome.storage.local.get("originalTabId", (result) => {
                    if (result.originalTabId) {
                        chrome.tabs.sendMessage(result.originalTabId, {
                            action: "browser-download_v2",
                            data: { ...modelObject, modelVersionObject: data }
                        });
                    }
                });
            }
            return true;
        }
    };

    const findVersionIndexFromStaged = (data: any, staged: StagedItem) => {
        if (!staged.versionId || staged.versionId === "Selecting") return 0;
        return data.modelVersions.findIndex((v: any) => String(v.id) === String(staged.versionId));
    };

    const runOneStagedOffline = async (item: StagedItem) => {
        if (["/@scan@/ErrorPath/"].includes(item.downloadFilePath)) {
            throw new Error("Invalid DownloadFilePath (staged)");
        }

        // Track which Civitai API supplied the data.
        let usedVersionApiFallback = false;

        let data = await fetchCivitaiModelInfoFromCivitaiByModelID(
            item.modelId,
            dispatch
        );

        // If the model ID API fails, only allow the version API
        // when the staged version was manually edited.
        if (!data) {
            if (!item.versionManuallyEdited) {
                throw new Error(
                    "Model API failed. Manually edit the version ID in the staging grid to allow version API fallback."
                );
            }

            const versionId =
                item.versionId && item.versionId !== "Selecting"
                    ? String(item.versionId)
                    : "";

            if (!versionId) {
                throw new Error(
                    "Model API failed and no version ID is available for fallback"
                );
            }

            const versionData =
                await fetchCivitaiModelInfoFromCivitaiByVersionID(
                    versionId,
                    dispatch
                );

            if (!versionData) {
                throw new Error(
                    "Failed to retrieve data from both model API and version API"
                );
            }

            // Remember that the version API was used successfully.
            usedVersionApiFallback = true;

            /*
             * Convert the version API response to the same structure
             * expected by the existing helper functions.
             */
            data = Array.isArray(versionData.modelVersions)
                ? {
                    ...versionData,
                    tags: versionData.tags ?? [],
                }
                : {
                    ...versionData,
                    tags: versionData.tags ?? [],
                    modelVersions: [versionData],
                };
        }

        const versionIndex = findVersionIndexFromStaged(data, item);

        if (versionIndex === -1) {
            throw new Error("Version not found in modelVersions");
        }

        const civitaiVersionID =
            data?.modelVersions?.[versionIndex]?.id?.toString();

        const civitaiFileName =
            retrieveCivitaiFileName(data, civitaiVersionID);

        const civitaiModelFileList =
            retrieveCivitaiFilesList(data, civitaiVersionID);

        // Tags are optional.
        const civitaiTags = data?.tags ?? [];

        if (
            !civitaiVersionID ||
            !civitaiFileName ||
            !civitaiModelFileList?.length
        ) {
            throw new Error("Missing required fields for offline");
        }

        const normalizedCivitaiUrl =
            `https://civitai.red/models/${item.modelId}` +
            `?modelVersionId=${civitaiVersionID}`;

        const modelObject = {
            downloadFilePath: item.downloadFilePath,
            civitaiFileName,
            civitaiModelID: item.modelId,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl: normalizedCivitaiUrl,
            selectedCategory: item.selectedCategory,
            civitaiTags,
            hold: item.hold,
            downloadPriority: item.downloadPriority,
        };

        if (usedVersionApiFallback) {
            // Model API failed, so use the new version-based backend endpoint.
            await fetchAddOfflineDownloadFileIntoOfflineDownloadListByVersionAPI(
                modelObject,
                false,
                dispatch
            );
        } else {
            // Normal flow: model API succeeded.
            await fetchAddOfflineDownloadFileIntoOfflineDownloadList(
                modelObject,
                false,
                dispatch
            );
        }
    };

    const runOneStagedBundle = async (item: StagedItem) => {
        const data = await fetchCivitaiModelInfoFromCivitaiByModelID(item.modelId, dispatch);
        if (!data) throw new Error("Failed to fetch model info");

        const versionIndex = findVersionIndexFromStaged(data, item);
        if (versionIndex === -1) throw new Error("Version not found in modelVersions");

        const ok = await handleDownloadMultipleFile_v2(
            data,
            item.url,
            item.modelId,
            versionIndex,
            { downloadFilePath: item.downloadFilePath, downloadMethod: item.downloadMethod }
        );

        if (!ok) throw new Error("Download failed");

        // IMPORTANT: use staged snapshot here too
        await fetchAddRecordToDatabase(item.selectedCategory, item.url, item.downloadFilePath, dispatch);

        bookmarkThisUrl(
            data.type,
            item.url,
            `${data.name} - ${data.id} | Stable Diffusion LoRA | Civitai`
        );
    };

    const handleRunStagedQueue = async () => {
        if (isLoading) return;
        if (!stagedItems.length) return;

        setIsLoading(true);

        const items = [...stagedItems];
        const succeededBundleUrls: string[] = [];
        const succeededOfflineUrls: string[] = [];

        try {
            for (const item of items) {
                setWorkingModelID(item.modelId);

                try {
                    setStagedItems(prev =>
                        prev.map(x => x.id === item.id ? { ...x, status: "running", error: "" } : x)
                    );

                    if (item.action === "offline") {
                        await runOneStagedOffline(item);
                        succeededOfflineUrls.push(item.url);
                        await addRecentDownloadFilePath(item.downloadFilePath);
                    } else {
                        await runOneStagedBundle(item);
                        succeededBundleUrls.push(item.url);
                        await addRecentDownloadFilePath(item.downloadFilePath);
                    }

                    setStagedItems(prev => prev.filter(x => x.id !== item.id));
                } catch (e: any) {
                    setStagedItems(prev =>
                        prev.map(x =>
                            x.id === item.id
                                ? { ...x, status: "failed", error: String(e?.message || e) }
                                : x
                        )
                    );
                }
            }

            setWorkingModelID("");

            if (succeededBundleUrls.length > 0) {
                await checkIfUrlExistInDatabase(succeededBundleUrls);
            }
            if (succeededOfflineUrls.length > 0) {
                await checkIfUrlExistInOfflineDownload(succeededOfflineUrls);
            }

            addCreatorUrlButton();
        } catch (err) {
            console.error("Post-run refresh failed:", err);
        } finally {
            setWorkingModelID("");
            setIsLoading(false);
        }
    };

    const ImageTooltip: React.FC<any> = (props) => {
        const src: string = props?.value || "";
        if (!src) return null;

        return (
            <div
                style={{
                    padding: 6,
                    backgroundColor: theme.panelBackground,
                    color: theme.panelText,
                    border: `1px solid ${theme.panelBorder}`,
                    borderRadius: 8,
                    boxShadow: theme.buttonShadow,
                    maxWidth: 340,
                }}
            >
                <SmartImage
                    src={src}
                    alt="preview"
                    isDarkMode={isDarkMode}
                    maxHeight={420}
                    borderRadius={6}
                    loading="lazy"
                    showRetryButton={false}
                    allowVideo={true}
                    mediaType="auto"
                />
            </div>
        );
    };

    const applyDownloadPathRoot = React.useCallback(
        (path: string, root: DownloadPathRoot) => {
            const rootFolderName = DOWNLOAD_PATH_ROOT_FOLDER[root];

            return (path || "").replace(
                /((?:^|[/\\])@scan@[/\\])(?:ACG|Real)(?=[/\\]|$)/i,
                (_match: string, prefix: string) => `${prefix}${rootFolderName}`
            );
        },
        []
    );

    const detectDownloadPathRoot = React.useCallback((path: string): DownloadPathRoot | null => {
        const match = (path || "").match(/(?:^|[/\\])@scan@[/\\](ACG|Real)(?=[/\\]|$)/i);

        if (!match) return null;

        return match[1].toLowerCase() === "real" ? "R" : "ACG";
    }, []);

    /**
     * First path load:
     * - detect ACG/Real from existing downloadFilePath.
     *
     * After that:
     * - keep the current ACG/R button as the source of truth.
     * - if another feature writes /@scan@/ACG/... while button is R,
     *   automatically convert it to /@scan@/Real/...
     */
    useEffect(() => {
        const currentPath = downloadFilePath || "";
        if (!currentPath) return;

        if (!hasInitializedDownloadPathRootRef.current) {
            hasInitializedDownloadPathRootRef.current = true;

            if (!hasUserSelectedDownloadPathRootRef.current) {
                const detectedRoot = detectDownloadPathRoot(currentPath);

                if (detectedRoot) {
                    setDownloadPathRoot(detectedRoot);
                    return;
                }
            }
        }

        const rootedValue = applyDownloadPathRoot(currentPath, downloadPathRoot);

        if (rootedValue !== currentPath) {
            dispatch(updateDownloadFilePath(rootedValue));
        }
    }, [
        downloadFilePath,
        downloadPathRoot,
        applyDownloadPathRoot,
        detectDownloadPathRoot,
        dispatch
    ]);

    const handleDownloadPathRootChange = (nextRoot: DownloadPathRoot) => {
        hasUserSelectedDownloadPathRootRef.current = true;

        setDownloadPathRoot(nextRoot);

        const rootedValue = applyDownloadPathRoot(downloadFilePath, nextRoot);

        if (rootedValue !== downloadFilePath) {
            dispatch(updateDownloadFilePath(rootedValue));
        }
    };

    const downloadPathOptions = useMemo(() => {
        const convertedList = sortedandFilteredfoldersList.map((path) =>
            applyDownloadPathRoot(path, downloadPathRoot)
        );

        return Array.from(new Set(convertedList));
    }, [sortedandFilteredfoldersList, applyDownloadPathRoot, downloadPathRoot]);

    const handleFoldersListOnChange = (event: any, newValue: string | null) => {
        const disallowedRegex = /[<>:"\\|?*]/g;

        const cleanedValue = newValue?.replace(disallowedRegex, "") || "";
        const rootedValue = applyDownloadPathRoot(cleanedValue, downloadPathRoot);

        dispatch(updateDownloadFilePath(rootedValue));
    };

    const actionButtonBaseStyle = useMemo<React.CSSProperties>(() => ({
        cursor: "pointer",
        border: "none",
        padding: 6,
        borderRadius: 6,
        lineHeight: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    }), []);

    const unstageButtonStyle = useMemo<React.CSSProperties>(() => ({
        ...actionButtonBaseStyle,
        background: isDarkMode ? "rgba(120, 190, 255, 0.10)" : "rgba(25, 118, 210, 0.08)",
        color: isDarkMode ? "#9fd0ff" : "#1565c0",
        border: isDarkMode
            ? "1px solid rgba(159, 208, 255, 0.22)"
            : "1px solid rgba(21, 101, 192, 0.18)",
    }), [actionButtonBaseStyle, isDarkMode]);

    const deleteButtonStyle: React.CSSProperties = {
        ...actionButtonBaseStyle,
        background: isDarkMode ? "rgba(255, 154, 154, 0.08)" : "rgba(198, 40, 40, 0.06)",
        color: isDarkMode ? "#ff9a9a" : "#c62828",
        border: isDarkMode
            ? "1px solid rgba(255, 154, 154, 0.18)"
            : "1px solid rgba(198, 40, 40, 0.18)",
    };

    const stagingComponents = useMemo(() => ({ imageTooltip: ImageTooltip }), [theme]);

    const priorityOptions = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], []);

    const stagingDefaultColDef = useMemo<ColDef>(() => ({
        sortable: true,
        resizable: true,
    }), []);

    const stagingColumnDefs = useMemo<ColDef[]>(() => [
        {
            headerName: "#",
            width: 50,
            minWidth: 50,
            maxWidth: 50,
            sortable: true,
            filter: false,
            editable: false,
            pinned: "left",
            lockPinned: true,
            suppressMovable: true,
            valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
            cellStyle: {
                textAlign: "center",
                fontWeight: 600,
            } as CellStyle,
        },
        {
            headerName: "Pri",
            field: "downloadPriority",
            width: 55,
            editable: true,
            cellEditor: SelectEditor,
            cellEditorPopup: true,
            cellEditorParams: () => ({ options: priorityOptions })
        },
        {
            headerName: "Model & Version",
            field: "modelVersionDisplay",
            width: 225,
            minWidth: 215,
            wrapText: false,
            autoHeight: false,
            editable: false,

            cellStyle: {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "left",
                padding: "5px",
            } as CellStyle,

            cellRenderer: (params: any) => {
                const item = params.data as StagedItem;

                const modelId = String(item?.modelId || "");

                const currentVersionId =
                    item?.versionId && item.versionId !== "Selecting"
                        ? String(item.versionId)
                        : "";

                return (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            width: "100%",
                            minWidth: 0,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {/* Fixed model ID — user cannot edit this */}
                        <span
                            style={{
                                flexShrink: 0,
                                fontWeight: item.isPrimary ? 800 : 600,
                            }}
                        >
                            {modelId}_
                        </span>

                        {/* Only the version ID is editable */}
                        <input
                            key={`${item.id}_${currentVersionId}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            defaultValue={currentVersionId}
                            placeholder="version ID"
                            aria-label={`Version ID for model ${modelId}`}

                            onMouseDown={(event) => {
                                event.stopPropagation();
                            }}

                            onClick={(event) => {
                                event.stopPropagation();
                            }}

                            onInput={(event) => {
                                // Remove anything that is not a digit.
                                event.currentTarget.value =
                                    event.currentTarget.value.replace(/\D/g, "");
                            }}

                            onBlur={(event) => {
                                const nextVersionId =
                                    event.currentTarget.value.replace(/\D/g, "");

                                if (nextVersionId !== currentVersionId) {
                                    updateStagedVersionId(item, nextVersionId);
                                }
                            }}

                            onKeyDown={(event) => {
                                event.stopPropagation();

                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                }

                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    event.currentTarget.value = currentVersionId;
                                    event.currentTarget.blur();
                                }
                            }}

                            style={{
                                width: 95,
                                minWidth: 0,
                                height: 30,
                                padding: "3px 6px",
                                borderRadius: 5,
                                border: `1px solid ${theme.buttonBorder}`,
                                backgroundColor: theme.buttonBackground,
                                color: theme.buttonText,
                                outline: "none",
                            }}
                        />

                        {!!currentVersionId && (
                            <ModelVersionFileExistsBadge
                                modelID={modelId}
                                versionID={currentVersionId}
                            />
                        )}
                    </div>
                );
            },
        },
        {
            headerName: "Image",
            field: "imgSrc",
            width: 95,
            sortable: false,
            resizable: false,
            cellStyle: {
                padding: "5px",
                textAlign: "center",
            } as CellStyle,
            cellRenderer: (params: any) => {
                const src = params.value as string;
                if (!src) {
                    return <span style={{ opacity: 0.5, color: theme.subText }}>—</span>;
                }

                return <HoverImagePreview src={src} theme={theme} isDarkMode={isDarkMode} />;
            },
        },
        {
            headerName: "Path",
            field: "downloadFilePath",
            flex: 1,
            minWidth: 230,
            wrapText: true,
            autoHeight: true,
            cellStyle: {
                whiteSpace: "normal",
                lineHeight: "1.25",
                paddingTop: "8px",
                paddingBottom: "8px",
                userSelect: "text",
            } as CellStyle,
            tooltipField: "downloadFilePath",
            editable: true,
            cellEditor: PathAutocompleteEditor,
            cellEditorPopup: true,
            cellEditorParams: () => ({ options: downloadPathOptions })
        },
        {
            headerName: "URL",
            field: "url",
            width: 110,
            minWidth: 100,
            editable: false,
            sortable: false,
            cellStyle: {
                padding: "5px",
                textAlign: "center",
            } as CellStyle,
            cellRenderer: (params: any) => {
                const url = String(params.value || "");

                if (!url) {
                    return <span style={{ opacity: 0.5, color: theme.subText }}>—</span>;
                }

                return (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        title={url}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            color: theme.rowFontColor,
                            textDecoration: "underline",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Visit URL
                    </a>
                );
            },
        },
        {
            headerName: "Cat",
            field: "selectedCategory",
            width: 90
        },
        {
            headerName: "Hold",
            field: "hold",
            width: 70,
            valueFormatter: (p) => (p.value ? "Y" : ""),
            editable: true,
            cellEditor: HoldEditor,
            cellEditorPopup: true,
        },
        {
            headerName: "Links",
            field: "externalLinks",
            width: 105,
            minWidth: 105,
            maxWidth: 105,
            sortable: false,
            filter: false,
            editable: false,
            resizable: false,
            suppressMovable: true,

            cellStyle: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 6px",
            } as CellStyle,

            cellRenderer: (params: any) => {
                const modelId = String(params.data?.modelId || "");

                const versionId =
                    params.data?.versionId &&
                        params.data.versionId !== "Selecting"
                        ? String(params.data.versionId)
                        : "";

                const modelApiUrl =
                    `https://civitai.red/api/v1/models/${modelId}`;

                const versionApiUrl =
                    versionId
                        ? `https://civitai.red/api/v1/model-versions/${versionId}`
                        : "";

                const archiveUrl =
                    `https://civitaiarchive.com/models/${modelId}`;

                const linkStyle: React.CSSProperties = {
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                    fontSize: 16,
                    textDecoration: "none",
                    cursor: "pointer",
                };

                return (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            width: "100%",
                            height: "100%",
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* Civitai model-ID API */}
                        <a
                            href={modelApiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Open model API: ${modelId}`}
                            style={{
                                ...linkStyle,
                                color: "#2196f3",
                            }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <FaExternalLinkAlt />
                        </a>

                        {/* Civitai version-ID API */}
                        {versionId ? (
                            <a
                                href={versionApiUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Open version API: ${versionId}`}
                                style={{
                                    ...linkStyle,
                                    color: "#4caf50",
                                }}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <FaExternalLinkAlt />
                            </a>
                        ) : (
                            <span
                                title="No version ID"
                                style={{
                                    ...linkStyle,
                                    color: "#888888",
                                    cursor: "not-allowed",
                                    opacity: 0.45,
                                }}
                            >
                                <FaExternalLinkAlt />
                            </span>
                        )}

                        {/* Civitai Archive model page */}
                        <a
                            href={archiveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Open Civitai Archive: ${modelId}`}
                            style={{
                                ...linkStyle,
                                color: "#ff9800",
                            }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <FaExternalLinkAlt />
                        </a>
                    </div>
                );
            },
        },
        {
            headerName: "",
            field: "unstageAction",
            width: 54,
            minWidth: 54,
            maxWidth: 54,
            sortable: false,
            filter: false,
            editable: false,
            resizable: false,
            pinned: "right",
            lockPinned: true,
            suppressMovable: true,
            headerTooltip: "Unstage",
            cellStyle: {
                textAlign: "center",
                padding: "2px",
            } as CellStyle,
            cellRenderer: (p: any) => (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUnstageItem(p.data);
                    }}
                    title="Unstage"
                    style={{
                        ...unstageButtonStyle,
                        padding: 4,
                        borderRadius: 5,
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M15 6l-6 6 6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            ),
        },
        {
            headerName: "",
            field: "deleteAction",
            width: 54,
            minWidth: 54,
            maxWidth: 54,
            sortable: false,
            filter: false,
            editable: false,
            resizable: false,
            pinned: "right",
            lockPinned: true,
            suppressMovable: true,
            headerTooltip: "Remove",
            cellStyle: {
                textAlign: "center",
                padding: "2px",
            } as CellStyle,
            cellRenderer: (p: any) => (
                <TrashButton
                    onClick={(e) => {
                        e.stopPropagation();
                        setStagedItems(prev => prev.filter(x => x.id !== p.data.id));
                    }}
                    isDarkMode={isDarkMode}
                    compact
                />
            ),
        },
    ], [
        theme,
        isDarkMode,
        downloadPathOptions,
        priorityOptions,
        unstageButtonStyle,
        handleUnstageItem,
        updateStagedVersionId
    ]);

    // which rating checkboxes are currently ON?
    const selectedRatings = useMemo(
        () => ratingOrder.filter(r => ratingFilters[r]),
        [ratingOrder, ratingFilters]
    );

    // label text: only “(New) XX:” when exactly one rating is selected
    const newLabel = selectedRatings.length === 1
        ? `(New) ${selectedRatings[0]}:`
        : `(New):`;

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

    const handleOpenGrouppingWindow = () => {
        console.log("open custom window")
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Store the original tab ID in local storage
            // chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openGrouppingWindow" });
            //window.close(); // This closes the popup window
        });
    }


    const handleOpenEditWindow = () => {
        console.log("open edit window")
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
            // Store the original tab ID in local storage
            // chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openEditWindow" });
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

    const handleToggleCollapseButton = (panelId: any) => {
        setCollapseButtonStates((prevStates) => ({
            ...prevStates,
            [panelId]: !prevStates[panelId],
        }));
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

    useEffect(() => {
        chrome.storage.local.get(URLGRID_STORAGE_KEY, (result) => {
            const saved = result?.[URLGRID_STORAGE_KEY];
            if (!saved) return;

            setUrlList(Array.isArray(saved.urlList) ? saved.urlList : []);
            setUrlImgSrcMap(saved.urlImgSrcMap || {});
            setUrlVersionIdMap(saved.urlVersionIdMap || {});
            setUrlBadgeMap(saved.urlBadgeMap || {});
            setModelPrimaryVersionIdMap(saved.modelPrimaryVersionIdMap || {});
        });
    }, []);

    useEffect(() => {
        chrome.storage.local.set({
            [URLGRID_STORAGE_KEY]: {
                urlList,
                urlImgSrcMap,
                urlVersionIdMap,
                urlBadgeMap,
                modelPrimaryVersionIdMap,
            }
        });
    }, [
        urlList,
        urlImgSrcMap,
        urlVersionIdMap,
        urlBadgeMap,
        modelPrimaryVersionIdMap
    ]);


    useEffect(() => {
        const keepUrls = new Set(urlList);
        const keepModelIds = new Set(
            urlList
                .map((url) => {
                    try {
                        const u = new URL(url);
                        return u.pathname.match(/\/models\/(\d+)/)?.[1] || "";
                    } catch {
                        return url.match(/\/models\/(\d+)/)?.[1] || "";
                    }
                })
                .filter(Boolean)
        );

        setUrlImgSrcMap(prev => {
            const next: Record<string, string> = {};
            for (const k of Object.keys(prev)) {
                if (keepUrls.has(k)) next[k] = prev[k];
            }
            return next;
        });

        setUrlVersionIdMap(prev => {
            const next: Record<string, string> = {};
            for (const k of Object.keys(prev)) {
                if (keepUrls.has(k)) next[k] = prev[k];
            }
            return next;
        });

        setUrlBadgeMap(prev => {
            const next: Record<string, string> = {};
            for (const k of Object.keys(prev)) {
                if (keepUrls.has(k)) next[k] = prev[k];
            }
            return next;
        });

        setModelPrimaryVersionIdMap(prev => {
            const next: Record<string, string> = {};
            for (const k of Object.keys(prev)) {
                if (keepModelIds.has(k)) next[k] = prev[k];
            }
            return next;
        });
    }, [urlList]);

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
        // Store Recent immediately when user chooses Go / Prev / Next.
        // This way, even if tab update fails or returns early, Recent is still updated.
        rememberRecentCreatorUrl(url);

        try {
            const finalUrl = toRedCreatorUrl(url);

            const { originalTabId } = await chrome.storage.local.get("originalTabId");
            if (originalTabId) {
                await chrome.tabs.update(originalTabId, { url: finalUrl });
            } else {
                const windows = await chrome.windows.getAll({ populate: false });
                const normalWindow = windows.find(win => win.type === "normal");
                if (!normalWindow) return;

                const [activeTab] = await chrome.tabs.query({
                    active: true,
                    windowId: normalWindow.id,
                });
                if (!activeTab || !activeTab.id) return;

                await chrome.tabs.update(activeTab.id, { url: finalUrl });
            }

            await fetchUpdateCreatorUrlList(url, "checked", true, "N/A", dispatch);
            handleRefreshList();
            setTimeout(() => {
                refreshCurrentTabCreator();
            }, 200);
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

    useEffect(() => {
        const nextAction: StagedItem["action"] = offlineMode ? "offline" : "bundle";

        // Convert queued items to current mode (skip ones currently running)
        setStagedItems(prev =>
            prev.map(it =>
                it.status === "running"
                    ? it
                    : { ...it, action: nextAction, status: it.status === "done" ? "done" : "staged" }
            )
        );
    }, [offlineMode]);



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
                sendStagedToTab(activeTab.id, stagedItems);
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
                await refreshCurrentTabCreator();

                // Auto-select the current tab's creator in the dropdown
                const urlStr = activeTab.url ?? "";
                const creator = extractCreatorFromUserModelsUrl(urlStr);

                if (creator) {
                    setSelectedCreatorUrlText(creator);

                    const idx = creatorUrlList.findIndex(
                        (it) => getCreatorKey(it.creatorUrl) === creator.toLowerCase()
                    );

                    if (idx !== -1) {
                        setCurrentCreatorUrlIndex(idx);
                    }
                }

                console.log(`Original Tab ID set to: ${activeTab.id}`);

                if (lockedUrl) {
                    syncLockedUrlToOriginalTab(lockedUrl);
                }

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

    // On mount, read the current tab
    useEffect(() => {
        refreshCurrentTabCreator();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Whenever the list changes, re-check if current tab creator is in it
    useEffect(() => {
        refreshCurrentTabCreator();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [creatorUrlList]);


    useEffect(() => {
        if (selectedFilteredCategoriesList) {
            console.log("selectedFilteredCategoriesList: ");
            console.log(selectedFilteredCategoriesList);
            handleAddFilterIntoFoldersList(JSON.parse(selectedFilteredCategoriesList))
        }
    }, [selectedFilteredCategoriesList, foldersList])


    const handleAddFilterIntoFoldersList = (selected: SelectedItem[]) => {
        const lc = (s: string) => s.toLowerCase();

        // Prefix-style categories (the path-like ones)
        const allowPrefixes = selected
            .filter(i => i.display && i.category.downloadFilePath.startsWith("/@scan@/"))
            .map(i => lc(i.category.downloadFilePath));

        const denyPrefixes = selected
            .filter(i => !i.display && i.category.downloadFilePath.startsWith("/@scan@/"))
            .map(i => lc(i.category.downloadFilePath));

        // Toggle-style flags (not path prefixes)
        const isCharactersSelected = selected.some(i => i.category.prefixName === "Characters" && i.display);
        const isRealSelected = selected.some(i => i.category.prefixName === "Real" && i.display);
        const isPosesSelected = selected.some(i => i.category.prefixName === "Poses" && i.display);
        const isMalesSelected = selected.some(i => i.category.prefixName === "Males" && i.display);
        const isSFWSelected = selected.some(i => i.category.prefixName === "SFW" && i.display);
        const isNSFWSelected = selected.some(i => i.category.prefixName === "NSFW" && i.display);
        const isEXSelected = selected.some(i => i.category.prefixName === "EX" && i.display);

        const filteredFolderList = (foldersList as string[])
            .filter(raw => {
                const folder = lc(raw);

                // Must match at least one allowed prefix (if any are defined)
                const allowed =
                    allowPrefixes.length === 0 ? true : allowPrefixes.some(p => folder.startsWith(p));
                if (!allowed) return false;

                // Any deny prefix blocks it (this fixes the Creature case)
                if (denyPrefixes.some(p => folder.startsWith(p))) return false;

                // Extra exception logic
                // if (isCharactersSelected && !isMalesSelected && folder.includes("(males)")) return false;

                // if (isPosesSelected && !isNSFWSelected && folder.includes("/nsfw/")) return false;
                // if (isPosesSelected && !isSFWSelected && folder.includes("/sfw/")) return false;
                // if (isPosesSelected && !isRealSelected && folder.includes("/real/")) return false;

                // if (isSFWSelected && !isNSFWSelected && folder.includes("/nsfw/")) return false;

                // if (!isEXSelected && folder.includes("/ex/")) return false;

                return true;
            })
            .sort((a: string, b: string) => {
                const firstCharA = a.charAt(0).toUpperCase();
                const firstCharB = b.charAt(0).toUpperCase();
                const isDigitA = /\d/.test(firstCharA);
                const isDigitB = /\d/.test(firstCharB);
                if (isDigitA && !isDigitB) return 1;
                if (!isDigitA && isDigitB) return -1;
                return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
            });

        setSortedandFilteredfoldersList(filteredFolderList);
    };

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

    // --- NEW: Creator dropdown summary (NEW only, respects rating filters)
    const creatorAgeHints = useMemo(() => {
        const inScope = filteredCreatorUrlList;
        if (!inScope || inScope.length === 0) {
            return {
                nullNewCount: 0,
                newCount: 0,
                oldestNewLine: 'Oldest last-checked (new only): -',
            };
        }

        // Only NEW items within the rating-filtered list
        const newOnly = inScope.filter(it => it.status === 'new');
        const newCount = newOnly.length;

        // Among NEW ONLY, how many have null/absent lastCheckedDate?
        const nullNewCount = newOnly.filter(it => !it.lastCheckedDate).length;

        // Among NEW ONLY, find oldest lastCheckedDate (if any present)
        const datedNew = newOnly
            .filter(it => !!it.lastCheckedDate)
            .sort(
                (a, b) =>
                    new Date(a.lastCheckedDate as string).getTime() -
                    new Date(b.lastCheckedDate as string).getTime()
            );

        const oldestNew = datedNew.length ? (datedNew[0].lastCheckedDate as string) : null;

        return {
            nullNewCount,
            newCount,
            oldestNewLine: oldestNew
                ? `Oldest last-checked (new only): ${new Date(oldestNew).toLocaleString()} - ${timeAgo(oldestNew)}`
                : 'Oldest last-checked (new only): -',
        };
    }, [filteredCreatorUrlList, timeAgo]);

    const selectedOne = selectedRatings.length === 1 ? selectedRatings[0] : null;
    const expectedMax = selectedOne ? expectedMaxByRating[selectedOne] : undefined;

    const showRatio = selectedOne && typeof expectedMax === "number" && expectedMax > 0;
    const overExpected = showRatio && creatorAgeHints.newCount > (expectedMax as number);

    const newCountText = showRatio
        ? `${creatorAgeHints.newCount}/${expectedMax}`
        : `${creatorAgeHints.newCount}`;

    useEffect(() => {
        chrome.storage.local.get("stagedItems", (r) => {
            if (Array.isArray(r.stagedItems)) setStagedItems(r.stagedItems);
        });
    }, []);

    useEffect(() => {
        chrome.storage.local.set({ stagedItems });
    }, [stagedItems]);

    useEffect(() => {
        syncStagedToOriginalTab(stagedItems);
    }, [stagedItems]);


    const parseModelAndVersion = (url: string) => {
        const uri = new URL(url);
        const modelId = uri.pathname.match(/\/models\/(\d+)/)?.[1] || "Unknown";

        const versionFromUrl = uri.searchParams.get("modelVersionId") || "";
        const versionFromMap = urlVersionIdMap[url] || "";
        const versionId = versionFromUrl || versionFromMap || "Selecting";

        const imgSrc = urlImgSrcMap[url] || "";

        const primaryVid = modelPrimaryVersionIdMap[modelId] || "";
        const isPrimary =
            !!primaryVid &&
            !!versionId &&
            versionId !== "Selecting" &&
            versionId === primaryVid;

        const badge = urlBadgeMap[url] || "";

        const modelVersionDisplay =
            versionId && versionId !== "Selecting"
                ? `${modelId}_${versionId}${isPrimary ? " (main)" : ""}${badge}`
                : `${modelId}${isPrimary ? " (main)" : ""}${badge}`;

        return {
            modelId,
            versionId,
            imgSrc,
            isPrimary,
            badge,
            modelVersionDisplay,
        };
    };

    const makeStageId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const handleStageAllFromInbox = async () => {
        if (!urlList.length) return;

        if (isPendingLockEnabled) {
            const hasPendingInCurrentPath = downloadFilePath.toLowerCase().includes("pending");

            if (hasPendingInCurrentPath) {
                alert("Pending Lock is enabled. You cannot stage rows while the current download path contains 'Pending'.");
                return;
            }
        }

        const now = Date.now();
        const action = offlineMode ? "offline" : "bundle";
        const downloadPriorityToUse = await getDownloadPriorityWithCreatorBonus(downloadPriority);

        const pathsToSave = new Set<string>();

        setStagedItems((prev) => {
            const existingUrls = new Set(prev.map(x => x.url));
            const additions: StagedItem[] = [];

            for (const url of urlList) {
                if (existingUrls.has(url)) continue;

                const { modelId, versionId, imgSrc, isPrimary, badge, modelVersionDisplay } = parseModelAndVersion(url);

                additions.push({
                    id: makeStageId(),
                    url,
                    modelId,
                    versionId,
                    imgSrc,
                    isPrimary,
                    badge,
                    modelVersionDisplay,
                    downloadFilePath,
                    selectedCategory,
                    downloadMethod,
                    hold,
                    downloadPriority: downloadPriorityToUse,
                    action,
                    stagedAt: now,
                    status: "staged",
                });

                if (downloadFilePath?.trim()) {
                    pathsToSave.add(downloadFilePath.trim());
                }
            }

            return [...prev, ...additions];
        });

        for (const path of pathsToSave) {
            await addRecentDownloadFilePath(path);
        }

        chrome.storage.local.get("originalTabId", (result) => {
            if (result.originalTabId) {
                for (const url of urlList) {
                    chrome.tabs.sendMessage(result.originalTabId, { action: "uncheck-url", url });
                }
            }
        });

        setUrlList([]);
        setSelectedUrl("");
        dispatch(
            updateDownloadFilePath(
                applyDownloadPathRoot("/@scan@/ACG/Pending/", downloadPathRoot)
            )
        );
        setIsLoading(false);
        setHold(false);
        setDownloadPriority(5);
        dispatch(updateDownloadPriority(5));

        setIsHandleRefresh(false);
        setTimeout(() => {
            setIsHandleRefresh(true);
        }, 50);
    };

    const sendStagedToTab = (tabId: number, list: StagedItem[]) => {
        chrome.tabs.sendMessage(
            tabId,
            {
                action: "display-staged",
                stagedList: list.map(x => ({
                    url: x.url,
                    modelId: x.modelId,
                    versionId: x.versionId && x.versionId !== "Selecting" ? x.versionId : "",
                    action: x.action,
                })),
            },
            () => {
                const err = chrome.runtime.lastError;
                if (err) console.debug("[display-staged] sendMessage:", err.message);
            }
        );
    };

    const syncStagedToOriginalTab = (list: StagedItem[]) => {
        chrome.storage.local.get("originalTabId", (r) => {
            const tabId = r?.originalTabId;
            if (!tabId) return;
            sendStagedToTab(tabId, list);
        });
    };

    return (
        <div
            style={{
                backgroundColor: theme.pageBackground,
                color: theme.panelText,
                minHeight: "100vh",
                padding: "12px",
            }}
        >
            <ErrorAlert />
            <center>
                <h1>Multiple Model Mode</h1>
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
                            background: theme.panelBackground,
                            color: theme.panelText,
                            zIndex: 1000,
                            padding: '20px',
                            boxShadow: theme.buttonShadow,
                            border: `1px solid ${theme.panelBorder}`,
                            borderRadius: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            {/* Example: WindowCollapseButton for Database Check */}
                            <WindowCollapseButton
                                panelId="checkDatabaseButton"
                                isPanelOpen={collapseButtonStates['checkDatabaseButton']}
                                handleTogglePanel={handleToggleCollapseButton}
                                icons={<TbDatabaseSearch />}
                                isDarkMode={isDarkMode}
                                buttons={
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        {/**Checked Saved Button for User page*/}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "Check if database has this model (User Page prefer)",
                                            variant: "primary",
                                            buttonIcon: <FaMagnifyingGlass />,
                                            disabled: urlList.length === 0 || !(checkboxMode),
                                        }}
                                            handleFunctionCall={() => {
                                                setResetMode(true)
                                            }}
                                            isDarkMode={isDarkMode}
                                        />

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
                                isDarkMode={isDarkMode}
                                buttons={
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
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
                                            handleFunctionCall={() => fetchOpenDownloadDirectory(dispatch)}
                                            isDarkMode={isDarkMode}
                                        />

                                        {/**offline mode button */}
                                        <ButtonWrap buttonConfig={{
                                            placement: "bottom",
                                            tooltip: offlineMode ? "offline" : "online",
                                            variant: offlineMode ? "success" : "primary",
                                            buttonIcon: offlineMode ? <MdOutlineDownloadForOffline /> : <MdOutlineDownload />,
                                            disabled: false,
                                        }}
                                            handleFunctionCall={() => updateOfflineModeIntoChromeStorage(!offlineMode, dispatch)}
                                            isDarkMode={isDarkMode}
                                        />

                                        {/**Open Offline Window */}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "Open Offline Window",
                                            variant: "primary",
                                            buttonIcon: <BsReverseLayoutTextWindowReverse />
                                            ,
                                            disabled: false,
                                        }}
                                            handleFunctionCall={() => handleOpenOfflineWindow()}
                                            isDarkMode={isDarkMode}
                                        />

                                        {/**Open Custom Window */}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "Open Custom Window",
                                            variant: "warning",
                                            buttonIcon: <BsReverseLayoutTextWindowReverse />
                                            ,
                                            disabled: false,
                                        }}
                                            handleFunctionCall={() => handleOpenCustomWindow()}
                                            isDarkMode={isDarkMode}
                                        />


                                        {/**Open Groupping Window */}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "Open Groupping Window",
                                            variant: "warning",
                                            buttonIcon: <BsReverseLayoutTextWindowReverse />
                                            ,
                                            disabled: false,
                                        }}
                                            handleFunctionCall={() => handleOpenGrouppingWindow()}
                                            isDarkMode={isDarkMode}
                                        />

                                        {/**Open Edit Window */}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "Open Edit Window",
                                            variant: "warning",
                                            buttonIcon: <FaEdit />
                                            ,
                                            disabled: false,
                                        }}
                                            handleFunctionCall={() => handleOpenEditWindow()}
                                            isDarkMode={isDarkMode}
                                        />

                                        <EarlyAccessAutoWatchButton />

                                        <Button
                                            onClick={toggleTheme}
                                            aria-label="Toggle Theme"
                                            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 42,
                                                height: 42,
                                                borderRadius: 10,
                                                backgroundColor: theme.rowBackgroundColor,
                                                border: `1px solid ${theme.evenRowBackgroundColor}`,
                                                color: theme.rowFontColor,
                                                boxShadow: theme.buttonShadow,
                                                padding: 0,
                                            }}
                                        >
                                            {isDarkMode ? <FaSun color="#fbbf24" /> : <FaMoon color="#6366f1" />}
                                        </Button>
                                    </div>
                                }
                            />

                            <WindowCollapseButton
                                panelId="bookmarkButton"
                                isPanelOpen={collapseButtonStates['bookmarkButton']}
                                handleTogglePanel={handleToggleCollapseButton}
                                icons={<PiPlusMinusFill />}
                                isDarkMode={isDarkMode}
                                buttons={
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        {/**Bookmark and add to database Button*/}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "Bookmark and add to database",
                                            variant: "primary",
                                            buttonIcon: <TbDatabasePlus />,
                                            disabled: (urlList.length === 0 || !checkboxMode),
                                        }}
                                            handleFunctionCall={() => handleMultipleBookmarkAndAddtoDatabase()}
                                            isDarkMode={isDarkMode}
                                        />

                                        {/**Remove bookmarks */}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "Remove all Bookmark and database from that Model",
                                            variant: "primary",
                                            buttonIcon: <TbDatabaseMinus />,
                                            disabled: (urlList.length === 0 || !checkboxMode),
                                        }}
                                            handleFunctionCall={() => handleRemoveBookmarks()}
                                            isDarkMode={isDarkMode}
                                        />

                                    </div>
                                }
                            />

                            <WindowCollapseButton
                                panelId="utilsButton"
                                isPanelOpen={collapseButtonStates['utilsButton']}
                                handleTogglePanel={handleToggleCollapseButton}
                                icons={<MdOutlineApps />}
                                isDarkMode={isDarkMode}
                                buttons={
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                        }}
                                    >

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

                                        {/**Checked If update available Button for User page*/}
                                        <ButtonWrap buttonConfig={{
                                            placement: "top",
                                            tooltip: "handling Sorting",
                                            variant: "primary",
                                            buttonIcon: isSorted ? <FcGenericSortingAsc /> : <FcGenericSortingDesc />,
                                            disabled: counting,
                                        }}
                                            handleFunctionCall={() => handleSorting()}
                                            isDarkMode={isDarkMode}
                                        />

                                    </div>
                                }
                            />

                            <WindowCollapseButton
                                panelId="tabsButton"
                                isPanelOpen={collapseButtonStates['tabsButton']}
                                handleTogglePanel={handleToggleCollapseButton}
                                icons={<PiTabs />}
                                isDarkMode={isDarkMode}
                                hideInlinePanel
                            />
                        </div>

                        <div
                            style={{
                                width: '100%',
                                marginTop: collapseButtonStates['tabsButton'] ? '12px' : '0',
                                padding: collapseButtonStates['tabsButton'] ? '10px' : '0',
                                borderRadius: '8px',
                                background: collapseButtonStates['tabsButton']
                                    ? theme.headerBackgroundColor
                                    : 'transparent',
                                color: theme.headerFontColor,
                                border: collapseButtonStates['tabsButton']
                                    ? `1px solid ${theme.evenRowBackgroundColor}`
                                    : 'none',
                                boxShadow: 'none',
                                boxSizing: 'border-box',
                            }}
                        >
                            <Collapse in={collapseButtonStates['tabsButton']}>
                                <div
                                    style={{
                                        width: '100%',
                                        marginTop: collapseButtonStates['tabsButton'] ? '12px' : '0',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            background: theme.headerBackgroundColor,
                                            color: theme.headerFontColor,
                                            border: `1px solid ${theme.evenRowBackgroundColor}`,
                                            boxShadow: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <div style={{ width: "100%" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "16px",
                                                    marginTop: "8px",
                                                    width: "100%",
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <span style={{ fontWeight: 'bold' }}>Total:</span>
                                                <span>{totalCreators}</span>
                                                <span style={{ fontWeight: 'bold' }}>New:</span>
                                                <span>{newCreatorsCount}</span>
                                                <Form.Check
                                                    type="checkbox"
                                                    id="nav-by-age"
                                                    label="By last-checked age"
                                                    checked={useAgeNav}
                                                    onChange={(e) => setUseAgeNav(e.target.checked)}
                                                />
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
                                                        sx={{
                                                            width: 350,
                                                            "& .MuiOutlinedInput-root": {
                                                                color: theme.panelText,
                                                                backgroundColor: theme.panelBackground,
                                                                "& fieldset": {
                                                                    borderColor: theme.panelBorder,
                                                                },
                                                                "&:hover fieldset": {
                                                                    borderColor: theme.buttonBorder,
                                                                },
                                                                "&.Mui-focused fieldset": {
                                                                    borderColor: theme.buttonBorder,
                                                                },
                                                            },
                                                            "& .MuiInputLabel-root": {
                                                                color: theme.subText,
                                                            },
                                                            "& .MuiInputLabel-root.Mui-focused": {
                                                                color: theme.panelText,
                                                            },
                                                            "& .MuiFormHelperText-root": {
                                                                color: theme.subText,
                                                            },
                                                            "& .MuiSvgIcon-root": {
                                                                color: theme.panelText,
                                                            },
                                                            "& .MuiAutocomplete-popupIndicator": {
                                                                color: theme.panelText,
                                                            },
                                                            "& .MuiAutocomplete-clearIndicator": {
                                                                color: theme.panelText,
                                                            },
                                                        }}
                                                        slotProps={{
                                                            paper: {
                                                                sx: {
                                                                    backgroundColor: theme.panelBackground,
                                                                    color: theme.panelText,
                                                                    border: `1px solid ${theme.panelBorder}`,
                                                                    boxShadow: theme.buttonShadow,
                                                                },
                                                            },
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
                                                    <Dropdown onToggle={handleCreatorDropdownToggle} style={{ width: '100%' }}>
                                                        <Dropdown.Toggle
                                                            variant="secondary"
                                                            style={{
                                                                width: '100%',
                                                                backgroundColor: theme.buttonBackground,
                                                                color: theme.buttonText,
                                                                border: `1px solid ${theme.buttonBorder}`,
                                                                boxShadow: theme.buttonShadow,
                                                            }}
                                                            onDoubleClick={() => {
                                                                setCreatorUrlInputValue(selectedCreatorUrlText);
                                                                setIsEditingCreatorUrl(true);
                                                            }}
                                                        >
                                                            {selectedCreatorUrlText || "-- Creator URL List (choose one) --"}
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu
                                                            style={{
                                                                maxHeight: '400px',
                                                                overflowY: 'auto',
                                                                backgroundColor: theme.panelBackground,
                                                                color: theme.panelText,
                                                                border: `1px solid ${theme.panelBorder}`,
                                                                boxShadow: theme.buttonShadow,
                                                                width: '100%',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    position: 'sticky',
                                                                    top: 0,
                                                                    zIndex: 2,
                                                                    padding: 8,
                                                                    backgroundColor: theme.panelBackground,
                                                                    borderBottom: `1px solid ${theme.panelBorder}`,
                                                                    fontSize: 12,
                                                                    color: theme.subText,
                                                                    lineHeight: 1.4,
                                                                    boxShadow: theme.buttonShadow,
                                                                }}
                                                            >
                                                                <div>
                                                                    <strong>{newLabel}</strong>{" "}
                                                                    <span
                                                                        style={
                                                                            overExpected
                                                                                ? { color: '#dc3545', fontWeight: 700 }
                                                                                : { color: theme.panelText }
                                                                        }
                                                                    >
                                                                        {newCountText}
                                                                    </span>
                                                                </div>

                                                                <div><strong>(New) - Null:</strong> {creatorAgeHints.nullNewCount}</div>
                                                                <div>{creatorAgeHints.oldestNewLine}</div>
                                                            </div>

                                                            {filteredCreatorUrlList.map((item) => (
                                                                <Dropdown.Item
                                                                    as="div"
                                                                    key={item.creatorUrl}
                                                                    ref={item.lastChecked ? scrollItemRef : null}
                                                                    onClick={() => handleSelectCreatorUrl(item)}
                                                                    style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        cursor: 'pointer',
                                                                        backgroundColor: item.lastChecked
                                                                            ? theme.rowBackgroundColor
                                                                            : theme.panelBackground,
                                                                        color: theme.panelText,
                                                                        padding: '8px 12px',
                                                                        borderRadius: 6,
                                                                    }}
                                                                >
                                                                    <span style={{ color: theme.panelText }}>
                                                                        {!item.lastChecked ? (
                                                                            <>
                                                                                {item.creatorUrl.split('/')[4]} <em>({item.rating})</em>
                                                                                {item.lastCheckedDate && (
                                                                                    <small style={{ color: theme.subText }}>
                                                                                        {" "}({timeAgo(item.lastCheckedDate)})
                                                                                    </small>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <b style={{ color: theme.panelText }}>
                                                                                {item.creatorUrl.split('/')[4]} <em>({item.rating})</em> <FaLeftLong />
                                                                                <small style={{ color: theme.subText }}>
                                                                                    {" "}(lastchecked{item.lastCheckedDate ? ` - ${timeAgo(item.lastCheckedDate)}` : ""})
                                                                                </small>
                                                                            </b>
                                                                        )}
                                                                    </span>

                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                        <span style={{ color: theme.subText }}>({item.status})</span>
                                                                        <Button
                                                                            variant="link"
                                                                            style={{
                                                                                color: '#dc3545',
                                                                                textDecoration: 'none',
                                                                                padding: 0,
                                                                                marginLeft: 6,
                                                                            }}
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

                                                <div style={creatorNavButtonSlotStyle}>
                                                    <OverlayTrigger
                                                        placement="top"
                                                        overlay={<Tooltip id="tooltip">Go to {selectedCreatorUrlText}</Tooltip>}
                                                    >
                                                        <Button
                                                            variant="primary"
                                                            onClick={handleGo}
                                                            disabled={currentCreatorUrlIndex == null}
                                                            style={creatorNavButtonStyle}
                                                        >
                                                            <IoNavigate />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </div>

                                                {useAgeNav ? (
                                                    <>
                                                        <div style={creatorNavButtonSlotStyle}>
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip id="tooltip">Previous by last-checked age</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="primary"
                                                                    onClick={handlePreviousByAge}
                                                                    disabled={!hasFilteredNewItems}
                                                                    style={creatorNavButtonStyle}
                                                                >
                                                                    <MdSkipPrevious />
                                                                </Button>
                                                            </OverlayTrigger>
                                                        </div>

                                                        <div style={creatorNavButtonSlotStyle}>
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip id="tooltip">Next by last-checked age</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="primary"
                                                                    onClick={handleNextByAge}
                                                                    disabled={!hasFilteredNewItems}
                                                                    style={creatorNavButtonStyle}
                                                                >
                                                                    <MdSkipNext />
                                                                </Button>
                                                            </OverlayTrigger>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div style={creatorNavButtonSlotStyle}>
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip id="tooltip">Previous Page</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="secondary"
                                                                    onClick={handlePrevious}
                                                                    disabled={!hasFilteredNewItems}
                                                                    style={creatorNavButtonStyle}
                                                                >
                                                                    <MdSkipPrevious />
                                                                </Button>
                                                            </OverlayTrigger>
                                                        </div>

                                                        <div style={creatorNavButtonSlotStyle}>
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip id="tooltip">Next Page</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="secondary"
                                                                    onClick={handleNext}
                                                                    disabled={!hasFilteredNewItems}
                                                                    style={creatorNavButtonStyle}
                                                                >
                                                                    <MdSkipNext />
                                                                </Button>
                                                            </OverlayTrigger>
                                                        </div>
                                                    </>
                                                )}

                                                <div style={creatorNavButtonSlotStyle}>
                                                    <OverlayTrigger
                                                        placement="top"
                                                        overlay={<Tooltip id="tooltip">Refresh Page</Tooltip>}
                                                    >
                                                        <Button
                                                            variant="warning"
                                                            onClick={handleRefreshPage}
                                                            style={creatorNavButtonStyle}
                                                        >
                                                            <IoReloadOutline />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </div>

                                                <div style={creatorNavButtonSlotStyle}>
                                                    {currentTabCreator ? (
                                                        isCurrentCreatorInList ? (
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={
                                                                    <Tooltip id="tooltip">
                                                                        Remove Current Tab Creator Url ({currentTabCreator})
                                                                    </Tooltip>
                                                                }
                                                            >
                                                                <Button
                                                                    variant="danger"
                                                                    style={creatorNavButtonStyle}
                                                                    onClick={async () => {
                                                                        await handleRemoveCreatorUrl(
                                                                            `https://civitai.com/user/${currentTabCreator}/models`
                                                                        );
                                                                        await refreshCurrentTabCreator();
                                                                    }}
                                                                >
                                                                    <IoCloseOutline />
                                                                </Button>
                                                            </OverlayTrigger>
                                                        ) : (
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={
                                                                    <Tooltip id="tooltip">
                                                                        Add current Tab Creator ({currentTabCreator})
                                                                    </Tooltip>
                                                                }
                                                            >
                                                                <Button
                                                                    variant="success"
                                                                    onClick={handleAddCurrentTabCreator}
                                                                    style={creatorNavButtonStyle}
                                                                >
                                                                    +
                                                                </Button>
                                                            </OverlayTrigger>
                                                        )
                                                    ) : (
                                                        <Button
                                                            variant="danger"
                                                            disabled
                                                            tabIndex={-1}
                                                            aria-hidden="true"
                                                            style={invisibleCreatorNavButtonStyle}
                                                        >
                                                            <IoCloseOutline />
                                                        </Button>
                                                    )}
                                                </div>

                                            </div>


                                            <div style={{ display: 'flex', alignItems: 'end', gap: '3px', margin: '5px', justifyContent: 'flex-end' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                                    <Dropdown>
                                                        <Dropdown.Toggle
                                                            size="sm"
                                                            disabled={recentCreatorUrls.length === 0}
                                                            style={{
                                                                ...themedDropdownToggleStyle,
                                                                width: "12ch",
                                                                maxWidth: "12ch",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            Recent
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu style={themedDropdownMenuStyle}>
                                                            {recentCreatorUrls.map((url) => (
                                                                <Dropdown.Item
                                                                    key={url}
                                                                    as="button"
                                                                    onClick={() => handleSelectRecentCreatorUrl(url)}
                                                                    style={{
                                                                        backgroundColor: theme.panelBackground,
                                                                        color: theme.panelText,
                                                                    }}
                                                                    title={getCreatorDisplayNameFromUrl(url)}
                                                                >
                                                                    {getCreatorDisplayNameFromUrl(url)}
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown>

                                                    <span style={{ color: theme.panelText }}>
                                                        <FaRankingStar /> : {currentCreatorUrlIndex !== null
                                                            ? creatorUrlList[currentCreatorUrlIndex].rating
                                                            : 'N/A'}
                                                    </span>

                                                    <Form.Select
                                                        size="sm"
                                                        value={selectedRating}
                                                        onChange={e => setSelectedRating(e.target.value)}
                                                        style={{
                                                            ...themedSelectStyle,
                                                            width: '10ch',
                                                            minWidth: '3ch',
                                                            textAlign: 'center',
                                                            textAlignLast: 'center',
                                                        }}
                                                    >
                                                        {ratingOrder.map(r => (
                                                            <option
                                                                key={r}
                                                                value={r}
                                                                style={{
                                                                    backgroundColor: theme.panelBackground,
                                                                    color: theme.panelText,
                                                                }}
                                                            >
                                                                {r}
                                                            </option>
                                                        ))}
                                                    </Form.Select>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleApplyRating}
                                                        disabled={currentCreatorUrlIndex == null}
                                                        style={themedButtonStyle}
                                                    >
                                                        Apply
                                                    </Button>

                                                    <Dropdown style={{ marginRight: 12 }}>
                                                        <Dropdown.Toggle
                                                            size="sm"
                                                            style={themedDropdownToggleStyle}
                                                        >
                                                            Filter Ratings
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu style={themedDropdownMenuStyle}>
                                                            <Form.Check
                                                                type="checkbox"
                                                                id="filter-all-ratings"
                                                                label={`All (${totalCreators})`}
                                                                checked={allSelected}
                                                                onChange={toggleAllRatings}
                                                                style={themedCheckLabelStyle}
                                                            />

                                                            <hr style={{ margin: '8px 0', borderColor: theme.panelBorder, opacity: 1 }} />

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
                                                                    style={themedCheckLabelStyle}
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

                                                <SetOriginalTabButton
                                                    handleSetOriginalTab={handleSetOriginalTab}
                                                    isDarkMode={isDarkMode}
                                                    disabled={false}
                                                    tabCreator={tabCreator}
                                                />
                                            </div>

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end',   // ⭐ push content to the right
                                                    gap: '12px',
                                                    margin: '10px 0',
                                                    width: '100%',                // ⭐ make the row span full width
                                                }}
                                            >
                                                {/* Hold checkbox */}
                                                <Form.Check
                                                    type="checkbox"
                                                    id="offline-hold-flag"
                                                    label="Hold"
                                                    checked={hold}
                                                    onChange={(e) => setHold(e.target.checked)}
                                                />

                                                {/* Download priority dropdown (1..10) */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '.9rem', color: theme.panelText }}>Priority</span>

                                                    <Form.Select
                                                        size="sm"
                                                        value={downloadPriority}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            if (!Number.isNaN(val)) {
                                                                setDownloadPriority(val);
                                                                dispatch(updateDownloadPriority(val));
                                                            }
                                                        }}
                                                        style={{
                                                            ...themedSelectStyle,
                                                            width: 80,
                                                        }}
                                                    >
                                                        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                                                            <option
                                                                key={v}
                                                                value={v}
                                                                style={{
                                                                    backgroundColor: theme.panelBackground,
                                                                    color: theme.panelText,
                                                                }}
                                                            >
                                                                {v}
                                                            </option>
                                                        ))}
                                                    </Form.Select>
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',   // ✅ each item on its own line
                                                    alignItems: 'flex-start',
                                                    gap: '8px',
                                                    margin: '10px 0',
                                                    width: '100%',
                                                }}
                                            >
                                                {workingModelID !== "" && (
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            width: '100%',
                                                            whiteSpace: 'normal',
                                                            overflowWrap: 'anywhere', // ✅ wrap long strings/paths
                                                            wordBreak: 'break-word',
                                                        }}
                                                    >
                                                        <b>Processing Queue Model Name: </b> {processingModelName}
                                                    </p>
                                                )}

                                                <div style={{ width: '400px' }}>
                                                    <p style={{ margin: 0, width: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                        <b>Staging DownloadFilePath: </b> {downloadFilePath}
                                                    </p>
                                                </div>

                                                {countdown > 0 && (
                                                    <p style={{ margin: 0, width: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                        <b>Next request in: </b> {countdown} seconds
                                                    </p>
                                                )}

                                                {stagedItems.length > 0 && (
                                                    <p style={{ margin: 0, width: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                        <b>Total Staging Queue Item: </b> {stagedItems.length}
                                                    </p>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </Collapse>
                        </div>

                        {selectedUrl !== "" && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'stretch',
                                    gap: '15px',
                                    width: '100%',
                                    border: `1px solid ${theme.panelBorder}`,
                                    borderRadius: '8px',
                                    padding: '10px 15px',
                                    boxShadow: theme.buttonShadow,
                                    backgroundColor: theme.rowBackgroundColor,
                                    color: theme.panelText,
                                    marginTop: '20px',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {selectedUrl && (
                                    <WindowShortcutPanel
                                        url={selectedUrl}
                                        setSelectedUrl={setSelectedUrl}
                                        setUrlList={setUrlList}
                                        urlList={urlList}
                                        setUrlImgSrcMap={setUrlImgSrcMap}
                                        setUrlVersionIdMap={setUrlVersionIdMap}
                                        setModelPrimaryVersionIdMap={setModelPrimaryVersionIdMap}
                                        setUrlBadgeMap={setUrlBadgeMap}
                                        lockedUrl={lockedUrl}
                                        setLockedUrl={setLockedUrl}
                                        neighborCount={neighborCount}
                                        setNeighborCount={setNeighborCount}
                                        handleAddAroundLocked={handleAddAroundLocked}
                                        onToggleFullInfoPanel={toggleFullInfoModelPanel}
                                        isFullInfoModelPanelVisible={isFullInfoModelPanelVisible}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ margin: "16px 5% 12px 5%" }}>
                        <div
                            className="autocomplete-container"
                            style={{ width: "100%" }}
                        >
                            <div
                                className="autocomplete-container-row"
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "8px",
                                    width: "100%",
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Autocomplete
                                        value={downloadFilePath}
                                        onChange={handleFoldersListOnChange}
                                        inputValue={downloadFilePath}
                                        onInputChange={handleFoldersListOnChange}
                                        key="1"
                                        id="controllable-states-demo"
                                        options={downloadPathOptions}
                                        sx={{
                                            width: "100%",
                                            "& .MuiOutlinedInput-root": {
                                                color: theme.panelText,
                                                backgroundColor: theme.panelBackground,
                                                "& fieldset": {
                                                    borderColor: theme.panelBorder,
                                                },
                                                "&:hover fieldset": {
                                                    borderColor: theme.buttonBorder,
                                                },
                                                "&.Mui-focused fieldset": {
                                                    borderColor: theme.buttonBorder,
                                                },
                                            },
                                            "& .MuiInputLabel-root": {
                                                color: theme.subText,
                                            },
                                            "& .MuiInputLabel-root.Mui-focused": {
                                                color: theme.panelText,
                                            },
                                            "& .MuiFormHelperText-root": {
                                                color: theme.subText,
                                            },
                                            "& .MuiSvgIcon-root": {
                                                color: theme.panelText,
                                            },
                                            "& .MuiAutocomplete-popupIndicator": {
                                                color: theme.panelText,
                                            },
                                            "& .MuiAutocomplete-clearIndicator": {
                                                color: theme.panelText,
                                            },
                                        }}
                                        slotProps={{
                                            paper: {
                                                sx: {
                                                    backgroundColor: theme.panelBackground,
                                                    color: theme.panelText,
                                                    border: `1px solid ${theme.panelBorder}`,
                                                    boxShadow: theme.buttonShadow,
                                                },
                                            },
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                fullWidth
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
                                </div>

                                <Dropdown style={{ alignSelf: "flex-start", flexShrink: 0 }}>
                                    <Dropdown.Toggle
                                        disabled={isLoading}
                                        style={folderActionButtonStyle}
                                    >
                                        {downloadPathRoot}
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu style={themedDropdownMenuStyle}>
                                        {DOWNLOAD_PATH_ROOT_OPTIONS.map((option) => (
                                            <Dropdown.Item
                                                key={option}
                                                as="button"
                                                active={downloadPathRoot === option}
                                                onClick={() => handleDownloadPathRootChange(option)}
                                                style={{
                                                    backgroundColor:
                                                        downloadPathRoot === option
                                                            ? theme.rowBackgroundColor
                                                            : theme.panelBackground,
                                                    color: theme.panelText,
                                                }}
                                            >
                                                {option}
                                            </Dropdown.Item>
                                        ))}
                                    </Dropdown.Menu>
                                </Dropdown>

                                <OverlayTrigger
                                    placement="bottom"
                                    overlay={
                                        <Tooltip
                                            id="tooltip"
                                            style={{
                                                backgroundColor: theme.panelBackground,
                                                color: theme.panelText,
                                                border: `1px solid ${theme.panelBorder}`,
                                                boxShadow: theme.buttonShadow,
                                            }}
                                        >
                                            Save this download file path.
                                        </Tooltip>
                                    }
                                >
                                    <Button
                                        disabled={isLoading}
                                        className="tooltip-button"
                                        style={folderActionButtonStyle}
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

                    <div style={{ "margin": "0% 5% 5% 5%" }}>
                        <FolderDropdown
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* URLGrid (Scrolls independently of the sticky header/buttons) */}
                    <div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "center",
                                gap: "6px",
                                marginBottom: "4px",
                            }}
                        >
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id="tooltip-remove-offline-all">Remove offline from all URLGrid rows</Tooltip>}
                            >
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={handleRemoveOfflineFromAllUrlGridRows}
                                    disabled={
                                        isLoading ||
                                        urlList.length === 0 ||
                                        !urlList.some(url => offlineUrlMap[url])
                                    }
                                    style={{
                                        padding: "4px 8px",
                                        lineHeight: 1,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: theme.buttonBackground,
                                        color: theme.buttonText,
                                        border: `1px solid ${theme.buttonBorder}`,
                                        boxShadow: theme.buttonShadow,
                                    }}
                                >
                                    <TbDatabaseMinus />
                                </Button>
                            </OverlayTrigger>

                            <OverlayTrigger
                                placement="top"
                                overlay={
                                    <Tooltip id="tooltip">
                                        {isPendingLockEnabled ? "Pending Lock enabled" : "Pending Lock disabled"}
                                    </Tooltip>
                                }
                            >
                                <Button
                                    variant={isPendingLockEnabled ? "warning" : "outline-secondary"}
                                    size="sm"
                                    onClick={() => setIsPendingLockEnabled(prev => !prev)}
                                    style={{
                                        padding: "4px 8px",
                                        lineHeight: 1,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: theme.buttonBackground,
                                        color: theme.buttonText,
                                        border: `1px solid ${theme.buttonBorder}`,
                                        boxShadow: theme.buttonShadow,
                                    }}
                                >
                                    {isPendingLockEnabled ? <PiLockKeyBold /> : <PiLockKeyOpenBold />}
                                </Button>
                            </OverlayTrigger>

                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id="tooltip">Clear all rows in URLGrid</Tooltip>}
                            >
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={handleClearUrlGrid}
                                    disabled={urlList.length === 0}
                                    style={{
                                        padding: "4px 8px",
                                        lineHeight: 1,
                                        backgroundColor: theme.buttonBackground,
                                        color: theme.buttonText,
                                        border: `1px solid ${theme.buttonBorder}`,
                                        boxShadow: theme.buttonShadow,
                                    }}
                                >
                                    <FaTrashAlt />
                                </Button>
                            </OverlayTrigger>
                        </div>

                        <URLGrid
                            urlList={urlList}
                            setUrlList={setUrlList}
                            selectedUrl={selectedUrl}
                            onUrlSelect={setSelectedUrl}
                            isDarkMode={isDarkMode}
                            urlImgSrcMap={urlImgSrcMap}
                            urlVersionIdMap={urlVersionIdMap}
                            modelPrimaryVersionIdMap={modelPrimaryVersionIdMap}
                            urlBadgeMap={urlBadgeMap}
                        />

                        <OverlayTrigger
                            placement={"top"}
                            overlay={<Tooltip id="tooltip">Stage current inbox URLs into the Staging Queue (snapshot path/category/etc.)</Tooltip>}
                        >
                            <Button
                                variant={"success"}
                                onClick={handleStageAllFromInbox}
                                disabled={urlList.length === 0 || !checkboxMode || isStageBlockedByPendingLock}
                                className="btn btn-success btn-lg w-100"
                            >
                                Stage Items
                            </Button>
                        </OverlayTrigger>

                        {isStageBlockedByPendingLock && (
                            <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                                Pending Lock is enabled. Staging is blocked because current download path contains "Pending".
                            </div>
                        )}

                        <div style={{ marginTop: 10 }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "4px",
                                }}
                            >
                                <h5 style={{ margin: 0 }}>Staging Queue</h5>

                                <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip id="tooltip">Clear all rows in Staging Queue</Tooltip>}
                                >
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={handleClearStagingQueue}
                                        disabled={stagedItems.length === 0}
                                        style={{
                                            padding: "4px 8px",
                                            lineHeight: 1,
                                            backgroundColor: theme.buttonBackground,
                                            color: theme.buttonText,
                                            border: `1px solid ${theme.buttonBorder}`,
                                            boxShadow: theme.buttonShadow,
                                        }}
                                    >
                                        <FaTrashAlt />
                                    </Button>
                                </OverlayTrigger>
                            </div>


                            <div
                                className="staging-queue-grid"
                                style={
                                    {
                                        width: '100%',
                                        ['--grid-scroll-track' as any]: isDarkMode ? '#2f2f2f' : '#f1f1f1',
                                        ['--grid-scroll-thumb' as any]: isDarkMode ? '#6a6a6a' : '#b5b5b5',
                                        ['--grid-scroll-thumb-hover' as any]: isDarkMode ? '#8a8a8a' : '#999999',
                                    } as React.CSSProperties
                                }
                            >
                                <style>
                                    {`
                                    .staging-queue-grid .ag-body-viewport,
                                    .staging-queue-grid .ag-center-cols-viewport,
                                    .staging-queue-grid .ag-body-horizontal-scroll-viewport,
                                    .staging-queue-grid .ag-body-vertical-scroll-viewport {
                                        scrollbar-color: var(--grid-scroll-thumb) var(--grid-scroll-track);
                                        scrollbar-width: auto;
                                    }

                                    .staging-queue-grid .ag-body-viewport::-webkit-scrollbar,
                                    .staging-queue-grid .ag-center-cols-viewport::-webkit-scrollbar,
                                    .staging-queue-grid .ag-body-horizontal-scroll-viewport::-webkit-scrollbar,
                                    .staging-queue-grid .ag-body-vertical-scroll-viewport::-webkit-scrollbar {
                                        width: 12px;
                                        height: 12px;
                                    }

                                    .staging-queue-grid .ag-body-viewport::-webkit-scrollbar-track,
                                    .staging-queue-grid .ag-center-cols-viewport::-webkit-scrollbar-track,
                                    .staging-queue-grid .ag-body-horizontal-scroll-viewport::-webkit-scrollbar-track,
                                    .staging-queue-grid .ag-body-vertical-scroll-viewport::-webkit-scrollbar-track {
                                        background: var(--grid-scroll-track);
                                        border-radius: 8px;
                                    }

                                    .staging-queue-grid .ag-body-viewport::-webkit-scrollbar-thumb,
                                    .staging-queue-grid .ag-center-cols-viewport::-webkit-scrollbar-thumb,
                                    .staging-queue-grid .ag-body-horizontal-scroll-viewport::-webkit-scrollbar-thumb,
                                    .staging-queue-grid .ag-body-vertical-scroll-viewport::-webkit-scrollbar-thumb {
                                        background: var(--grid-scroll-thumb);
                                        border-radius: 8px;
                                        border: 2px solid var(--grid-scroll-track);
                                    }

                                    .staging-queue-grid .ag-body-viewport::-webkit-scrollbar-thumb:hover,
                                    .staging-queue-grid .ag-center-cols-viewport::-webkit-scrollbar-thumb:hover,
                                    .staging-queue-grid .ag-body-horizontal-scroll-viewport::-webkit-scrollbar-thumb:hover,
                                    .staging-queue-grid .ag-body-vertical-scroll-viewport::-webkit-scrollbar-thumb:hover {
                                        background: var(--grid-scroll-thumb-hover);
                                    }
                                `}
                                </style>
                                <div
                                    className={isDarkMode ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}
                                    style={{
                                        width: '100%',
                                        height: '400px',
                                        backgroundColor: theme.gridBackgroundColor,
                                        color: theme.rowFontColor,
                                    }}
                                >
                                    <AgGridReact
                                        rowData={stagedRowData}
                                        columnDefs={stagingColumnDefs}
                                        components={stagingComponents}
                                        rowHeight={64}
                                        suppressRowTransform={true}
                                        defaultColDef={stagingDefaultColDef}
                                        stopEditingWhenCellsLoseFocus={true}
                                        singleClickEdit={false}
                                        context={{ patchStagedById }}
                                        getRowId={(p) => p.data.id}
                                        onCellValueChanged={(e: any) => {
                                            const id = e?.data?.id;
                                            const field = e?.colDef?.field;
                                            console.log("CHANGED", field, "old=", e.oldValue, "new=", e.newValue, "dataFieldNow=", e.data?.[field]);
                                            if (!id || !field) return;

                                            if (field === "downloadFilePath") {
                                                const rootedValue = applyDownloadPathRoot(
                                                    String(e.newValue ?? ""),
                                                    downloadPathRoot
                                                );

                                                patchStagedById(id, { downloadFilePath: rootedValue });
                                                return;
                                            }
                                            if (field === "hold") {
                                                patchStagedById(id, { hold: !!e.newValue });
                                                return;
                                            }
                                            if (field === "downloadPriority") {
                                                const n = Number(e.newValue);
                                                patchStagedById(id, { downloadPriority: Number.isFinite(n) ? n : 0 });
                                                return;
                                            }
                                        }}

                                        tooltipShowDelay={250}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <Button
                                    variant={offlineMode ? "success" : "primary"}
                                    onClick={handleRunStagedQueue}
                                    disabled={isLoading || stagedItems.length === 0}
                                    className="w-100"
                                >
                                    {`Processes Staged Queue (${offlineMode ? "offline" : "online"})`}
                                </Button>
                            </div>
                        </div>


                    </div>

                </div>

                {/* RIGHT PANEL: Sticky Sidebar */}
                <div
                    style={{
                        width: '50%',
                        position: 'sticky',
                        top: 0,
                        padding: '20px',
                        backgroundColor: theme.panelBackground,
                        color: theme.panelText,
                        border: `1px solid ${theme.panelBorder}`,
                        boxShadow: theme.buttonShadow,
                        borderRadius: '12px',
                        zIndex: 1000,
                    }}
                >

                    <div
                        style={{
                            padding: '15px',
                            boxShadow: theme.buttonShadow,
                            margin: '10px',
                        }}
                    >
                        <CategoriesListSelector />
                    </div>


                    <FilesPathSettingPanel setIsHandleRefresh={setIsHandleRefresh} isHandleRefresh={isHandleRefresh} />

                </div>
            </div >

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
        </div>

    )
};

export default WindowComponent;
