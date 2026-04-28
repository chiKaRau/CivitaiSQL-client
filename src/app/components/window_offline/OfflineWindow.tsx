// OfflineWindow.tsx

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';

// Store
import { useDispatch, useSelector } from 'react-redux';
import { updateDownloadFilePath, updateIsDarkMode } from '../../store/actions/chromeActions';

// Icons Components
import { AiFillFolderOpen, AiOutlineClose } from "react-icons/ai";
import { BsCloudDownloadFill, BsDownload, BsPencilFill } from 'react-icons/bs';
import { FaMagnifyingGlass, FaMagnifyingGlassPlus, FaSun, FaMoon, FaArrowRight, FaCheck } from "react-icons/fa6"; // Added FaSun and FaMoon
import { MdOutlineApps, MdOutlineTipsAndUpdates, MdOutlineDownloadForOffline, MdOutlineDownload, MdOutlinePendingActions, MdRefresh } from "react-icons/md";
import { FcDownload, FcGenericSortingAsc, FcGenericSortingDesc } from "react-icons/fc";
import { TfiCheckBox } from "react-icons/tfi";
import { LuPanelLeftOpen, LuPanelRightOpen } from "react-icons/lu";
import { FaArrowUp, FaTrashAlt } from 'react-icons/fa';
import { FaTimes } from 'react-icons/fa'; // Import the '×' icon
import { FaAngleDoubleLeft, FaAngleLeft, FaAngleRight, FaAngleDoubleRight } from 'react-icons/fa';
import { IoCloseOutline } from "react-icons/io5";

// Components
import CategoriesListSelector from '../CategoriesListSelector';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import ButtonWrap from "../buttons/ButtonWrap";
import { InputGroup, FormControl, Button, Spinner, OverlayTrigger, Tooltip, Form, Dropdown, ButtonGroup, Carousel, Card, Pagination, Accordion, Badge } from 'react-bootstrap';
import ErrorAlert from '../ErrorAlert';
import FolderDropdown from "../FolderDropdown"

// APIs
import {
    fetchAddRecordToDatabase,
    fetchDownloadFilesByServer_v2,
    fetchRemoveOfflineDownloadFileIntoOfflineDownloadList,
    fetchGetPendingRemoveTagsList,
    fetchGetCategoryPrefixesList,
    fetchOpenDownloadDirectory,
    fetchOpenModelDownloadDirectory,
    fetchOfflineDownloadListPage,
    TagCountDTO,
    fetchUpdateHoldFromOfflineDownloadList,
    fetchUpdateDownloadPriorityFromOfflineDownloadList,
    fetchOfflineDownloadListHold,
    fetchOfflineDownloadListEarlyAccessActive,
    fetchUpdateDownloadFilePathFromOfflineDownloadList,
    fetchGetErrorModelList,
    fetchCivitaiModelInfoFromCivitaiByVersionID,
    fetchBulkPatchOfflineDownloadList,
    fetchRunPendingFromOfflineDownloadListAiSuggestion,
    fetchBulkUpdateDownloadFilePath,
    fetchRefreshOfflineDownloadRecord,
    fetchAddRecordToDatabaseInCustom,
    fetchDownloadFilesByServer_v2ForCustom,
    fetchModelOfflineDownloadHistoryList,
    fetchModelOfflineDownloadHistoryAvailableDates,
    fetchUpdateOfflineDownloadVersionId,
    fetchRefreshModelVersionObjectFromOfflineTable,
    fetchCheckModelVersionFileExists,
    fetchHistoryModelVersionDbDetails,
    fetchDeleteModelOfflineDownloadHistoryRecord
} from "../../api/civitaiSQL_api"

import { makeOfflineWindowStyles } from "./OfflineWindow.styles";

import {
    bookmarkThisUrl,
} from "../../utils/chromeUtils"

// Ag-Grid Imports
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AppState } from '../../store/configureStore';
import TopTagsDropdown from './TopTagsDropdown';
import SimilarSearchPanel from './SimilarSearchPanel';
import { setError } from '../../store/actions/errorsActions';
import { darkTheme, lightTheme } from './OfflineWindow.theme';
import HistoryTableMode from './Mode/HistoryTableMode';
import TableMode from './Mode/TableMode';
import BigCardMode from './Mode/BigCardMode';
import SmallCardMode from './Mode/SmallCardMode';
import PreviewCard from './Mode/PreviewCard';

import type {
    DownloadMethod,
    DisplayMode,
    BatchStatus,
    BatchResult,
    StatusFilter,
    CivitaiModelFile,
    ModelVersionObject,
    OfflineDownloadEntry,
    ModelOfflineDownloadHistoryEntry,
} from './OfflineWindow.types';
import HistoryDatePicker from '../window/HistoryDatePicker';
import HistoryStatusSummary from './HistoryStatusSummary';

const PENDING_PATH_RE = /[/\\]@scan@[/\\]acg[/\\]pending([/\\]|$)/i;

function isPendingEntry(entry: OfflineDownloadEntry): boolean {
    const p = (entry.downloadFilePath || '').trim();
    return PENDING_PATH_RE.test(p);
}

// Semaphore class to control concurrency
class Semaphore {
    private tasks: (() => Promise<void>)[] = [];
    private activeCount = 0;
    private readonly concurrency: number;

    constructor(concurrency: number) {
        this.concurrency = concurrency;
    }

    public acquire(task: () => Promise<void>): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const runTask = async () => {
                this.activeCount++;
                try {
                    await task();
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    this.activeCount--;
                    if (this.tasks.length > 0) {
                        const nextTask = this.tasks.shift();
                        if (nextTask) {
                            this.acquire(nextTask);
                        }
                    }
                }
            };

            if (this.activeCount < this.concurrency) {
                runTask();
            } else {
                this.tasks.push(runTask);
            }
        });
    }
}

// Bulk modify controls (for Modify Mode)
const ALL_PATCH_FIELDS = [
    { key: "downloadFilePath", label: "Modify downloadFilePath" },
    { key: "hold", label: "Hold" },
    { key: "downloadPriority", label: "Download Priority" },
    { key: "isError", label: "Is Error" },
    { key: "refreshRecord", label: "Refresh Record" },
];

const AI_BATCH_SIZE = 10;
const AI_COOLDOWN_SECONDS = 90;
const DEFAULT_AI_SUGGEST_COUNT = 20;

type HistoryFetchStatus = "notStarted" | "loading" | "success" | "fail";

type CartDownloadStatus = "queued" | "downloading" | "success" | "fail";

type HistoryFetchStatusKey =
    | "historyList"
    | "dbDetails"
    | "localFileCheck";

type HistoryFetchStatusState = Record<HistoryFetchStatusKey, HistoryFetchStatus>;

const HISTORY_FETCH_STATUS_LABELS: Record<HistoryFetchStatusKey, string> = {
    historyList: "History list fetch",
    dbDetails: "DB details fetch",
    localFileCheck: "Local file check",
};

const OfflineWindow: React.FC = () => {

    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const leftOverlayDrawerRef = useRef<HTMLDivElement>(null);
    const rightInnerRef = useRef<HTMLDivElement>(null);
    const eaRefreshedVidSetRef = useRef<Set<string>>(new Set());

    const chromeData = useSelector((state: AppState) => state.chrome);

    const modify_downloadFilePath = chromeData.downloadFilePath;
    const modify_selectedCategory = chromeData.selectedCategory;
    const isDarkMode = chromeData.isDarkMode;

    const theme = isDarkMode ? darkTheme : lightTheme;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [offlineDownloadList, setOfflineDownloadList] = useState<OfflineDownloadEntry[]>([]);
    const [displayMode, setDisplayMode] = useState<DisplayMode>('bigCard');

    const [filtersReady, setFiltersReady] = useState(false);

    // This is the ONLY thing your backend fetch should use.
    const [appliedQuery, setAppliedQuery] = useState(() => ({
        filterText: "",
        filterCondition: "contains",
        showPending: true,
        showNonPending: true,
        showHoldEntries: false,
        showEarlyAccess: true,
        showErrorEntries: true,
        sortBy: "priority" as "priority" | "id",
        sortDir: "desc" as "asc" | "desc",
        aiSuggestedOnly: false,
        selectedPrefixes: [] as string[],
        excludedPrefixes: [] as string[],
    }));

    // States for filtering
    const [filterText, setFilterText] = useState('');
    const [filterCondition, setFilterCondition] = useState<'contains' | 'does not contain' | 'equals' | 'does not equal' | 'begins with' | 'ends with'>('contains');

    // State for selected IDs
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [cartEntryByVid, setCartEntryByVid] = useState<Record<string, OfflineDownloadEntry>>({});

    const [cartDownloadStatusByVid, setCartDownloadStatusByVid] =
        useState<Record<string, CartDownloadStatus>>({});

    // Modify Mode state
    const [isModifyMode, setIsModifyMode] = useState(false); // Modify mode is off by default

    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    const [selectedPatchFields, setSelectedPatchFields] = useState(new Set());
    const [bulkHold, setBulkHold] = useState(true);
    const [bulkDownloadPriority, setBulkDownloadPriority] = useState(5); // default 5 (1~10)
    const [bulkIsError, setBulkIsError] = useState(true);

    const [batchResults, setBatchResults] = React.useState<BatchResult[]>([]);

    // **Add Pagination State and Logic**
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100); // Default to 100 as in table mode

    const [serverTotalItems, setServerTotalItems] = useState(0);
    const [serverTotalPages, setServerTotalPages] = useState(1);
    const [uiMode, setUiMode] = useState<'idle' | 'paging' | 'downloading' | 'modifying' | 'removing'>('idle');

    const [showGalleries, setShowGalleries] = useState(false);

    const [recentlyDownloaded, setRecentlyDownloaded] = useState<OfflineDownloadEntry[]>([]);
    const [holdEntries, setHoldEntries] = useState<OfflineDownloadEntry[]>([]);
    const [earlyAccessEntries, setEarlyAccessEntries] = useState<OfflineDownloadEntry[]>([]);
    const [errorEntries, setErrorEntries] = useState<OfflineDownloadEntry[]>([]);

    // force reload for special card lists (hold/earlyAccess/error)
    const [specialReloadToken, setSpecialReloadToken] = useState(0);

    // Add this in your component's top-level state:
    const [showPending, setShowPending] = useState(true);
    const [showNonPending, setShowNonPending] = useState(true);

    // NEW: show / hide “hold” entries
    const [showHoldEntries, setShowHoldEntries] = useState(false);

    const [showEarlyAccess, setShowEarlyAccess] = useState(true);

    const [showErrorEntries, setShowErrorEntries] = useState(true);

    // progress just for AI runs
    const [aiSuggestProgress, setAiSuggestProgress] = useState({ completed: 0, total: 0 });
    const [aiSuggestCountInput, setAiSuggestCountInput] = React.useState<string>(
        String(DEFAULT_AI_SUGGEST_COUNT)
    );
    const [aiSuggestRunStatus, setAiSuggestRunStatus] = useState<null | "running" | "success" | "fail">(null);
    const [aiSuggestRunMsg, setAiSuggestRunMsg] = useState("");

    const [modelOfflineDownloadHistoryList, setModelOfflineDownloadHistoryList] = useState<ModelOfflineDownloadHistoryEntry[]>([]);
    const historyFileExistsCacheRef = useRef<Record<string, {
        checkedFilePath: string;
        hasExistingLocalFile: boolean;
    }>>({});
    const [deletingHistoryId, setDeletingHistoryId] = useState<number | null>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyItemsPerPage, setHistoryItemsPerPage] = useState(100);
    const [historyTotalItems, setHistoryTotalItems] = useState(0);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [historyReloadToken, setHistoryReloadToken] = useState(0);

    const [historyStatusSummaryReloadToken, setHistoryStatusSummaryReloadToken] = useState(0);

    const [historyFetchStatus, setHistoryFetchStatus] = useState<HistoryFetchStatusState>({
        historyList: "notStarted",
        dbDetails: "notStarted",
        localFileCheck: "notStarted",
    });

    const setOneHistoryFetchStatus = (
        key: HistoryFetchStatusKey,
        status: HistoryFetchStatus
    ) => {
        setHistoryFetchStatus((prev) => ({
            ...prev,
            [key]: status,
        }));
    };

    const resetHistoryFetchStatus = () => {
        setHistoryFetchStatus({
            historyList: "notStarted",
            dbDetails: "notStarted",
            localFileCheck: "notStarted",
        });
    };

    const renderHistoryStatusIcon = (status: HistoryFetchStatus) => {
        if (status === "loading") {
            return <Spinner animation="border" size="sm" />;
        }

        if (status === "success") {
            return <FaCheck />;
        }

        if (status === "fail") {
            return <FaTimes />;
        }

        return <MdOutlinePendingActions />;
    };

    const getHistoryStatusColor = (status: HistoryFetchStatus) => {
        if (status === "loading") return isDarkMode ? "#93c5fd" : "#2563eb";
        if (status === "success") return isDarkMode ? "#86efac" : "#16a34a";
        if (status === "fail") return isDarkMode ? "#fca5a5" : "#dc2626";
        return isDarkMode ? "#9ca3af" : "#6b7280";
    };

    const renderHistoryFetchStatusItem = (key: HistoryFetchStatusKey) => {
        const status = historyFetchStatus[key];
        const color = getHistoryStatusColor(status);

        return (
            <OverlayTrigger
                key={key}
                placement="top"
                overlay={
                    <Tooltip>
                        {HISTORY_FETCH_STATUS_LABELS[key]}: {status}
                    </Tooltip>
                }
            >
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        minWidth: "38px",
                        padding: "5px 8px",
                        borderRadius: "999px",
                        border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
                        backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                        color,
                        fontSize: "13px",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                    }}
                >
                    {key === "historyList" && <BsCloudDownloadFill />}
                    {key === "dbDetails" && <MdOutlineTipsAndUpdates />}
                    {key === "localFileCheck" && <AiFillFolderOpen />}

                    {renderHistoryStatusIcon(status)}
                </span>
            </OverlayTrigger>
        );
    };

    // NEW: sort direction for date (server-side)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc'); // if you hate the type, you can drop it
    const [sortBy, setSortBy] = useState<'priority' | 'id'>('priority');
    const [idSortDir, setIdSortDir] = useState<'asc' | 'desc'>('desc');

    const [categoriesPrefixsList, setCategoriesPrefixsList] = useState<{
        id: number;
        prefixName: string;
        downloadFilePath: string;
        downloadPriority: number;
        createdAt?: string;
        updatedAt?: string;
    }[]>([]);
    const [selectedPrefixes, setSelectedPrefixes] = useState<Set<string>>(new Set());

    const [allowTryEarlyAccess, setAllowTryEarlyAccess] = useState(false);

    const [editingPathId, setEditingPathId] = useState<string | null>(null);

    // "Selected for patch" tracking (no new interfaces/files)
    const [isPatching, setIsPatching] = React.useState(false);

    // Additional states for progress and failed downloads
    const [downloadProgress, setDownloadProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
    const [failedEntries, setFailedEntries] = useState<OfflineDownloadEntry[]>([]);

    // State for tracking the 60s cooldown between batches
    const [batchCooldown, setBatchCooldown] = useState<number | null>(null);

    // In your OfflineWindow component
    const [isPaused, setIsPaused] = useState(false);

    const [selectCount, setSelectCount] = useState(20);

    const [currentBatchRange, setCurrentBatchRange] = useState<string | null>(null);

    // Add this alongside your existing useState hooks
    const [initiationDelay, setInitiationDelay] = useState<number | null>(null);

    // New state for selecting the tag source (defaulting to 'all')
    const [tagSource, setTagSource] = useState<'all' | 'tags' | 'fileName' | 'titles' | 'other'>('all');

    // Recompute mostFrequentPendingTags when offlineDownloadList, excludedTags, or tagSource changes
    const [allTags, setAllTags] = useState<string[]>([]);

    // current page index, 0-based
    const [tagPage, setTagPage] = useState(0);

    const defaultPrefixesRef = React.useRef<string[]>([]);

    const [excludedTags, setExcludedTags] = useState<string[]>([]);

    const [isCancelled, setIsCancelled] = useState(false);

    const [preventPendingPaths, setPreventPendingPaths] = useState(true);

    // LEFT OVERLAY (preview) state
    const [leftOverlayEntry, setLeftOverlayEntry] = useState<OfflineDownloadEntry | null>(null);

    const [goToPageInput, setGoToPageInput] = useState<string>('');


    // NEW: keep what the user clicked in the AI suggestion list (per versionID)
    const [selectedSuggestedPathByVid, setSelectedSuggestedPathByVid] = useState({} as Record<string, string>);

    const [aiSuggestedOnly, setAiSuggestedOnly] = useState(false);

    const [isBulkUpdatingDownloadPaths, setIsBulkUpdatingDownloadPaths] = React.useState(false);

    const [historySelectedDate, setHistorySelectedDate] = useState<string>(() =>
        toLocalYmd(new Date())
    );

    const [editingVersionId, setEditingVersionId] = useState<string | null>(null);

    // optional: dates that have records, for calendar highlight
    const [historyAvailableDates, setHistoryAvailableDates] = useState<string[]>([]);

    const [historyCalendarMonth, setHistoryCalendarMonth] = useState<Date>(() => new Date());

    const [aiEntries, setAiEntries] = useState<OfflineDownloadEntry[]>([]);
    const [aiPage, setAiPage] = useState(1);
    const [aiItemsPerPage, setAiItemsPerPage] = useState(100);
    const [aiTotalItems, setAiTotalItems] = useState(0);
    const [aiTotalPages, setAiTotalPages] = useState(1);
    const [aiReloadToken, setAiReloadToken] = useState(0);

    // PERMISSION
    const DEFAULT_MODE_PERMISSION = {
        canSelect: false,
        canWriteCart: false,

        selectAllNormal: false,
        selectAllModify: false,

        selectFirstNormal: false,
        selectFirstModify: false,

        downloadNow: false,
        switchWhileDownloading: false,
    };

    const modePermission = (
        override: Partial<typeof DEFAULT_MODE_PERMISSION> = {}
    ) => ({
        ...DEFAULT_MODE_PERMISSION,
        ...override,
    });

    const MODE_PERMISSION: Partial<Record<DisplayMode, typeof DEFAULT_MODE_PERMISSION>> = {
        table: modePermission({
            canSelect: true,
            canWriteCart: true,
            selectAllNormal: true,
            selectAllModify: true,
            selectFirstNormal: true,
            selectFirstModify: true,
            switchWhileDownloading: true,
        }),

        bigCard: modePermission({
            canSelect: true,
            canWriteCart: true,
            selectAllNormal: true,
            selectAllModify: true,
            selectFirstNormal: true,
            selectFirstModify: true,
            switchWhileDownloading: true,
        }),

        smallCard: modePermission({
            canSelect: true,
            canWriteCart: true,
            selectAllNormal: true,
            selectAllModify: true,
            selectFirstNormal: true,
            selectFirstModify: true,
            switchWhileDownloading: true,
        }),

        cartCard: modePermission({
            canSelect: true,
            canWriteCart: true,
            selectAllNormal: true,
            selectAllModify: true,

            // Cart is already cart-only, so no "Select First" cart creation.
            selectFirstNormal: false,
            selectFirstModify: false,

            downloadNow: true,
            switchWhileDownloading: true,
        }),

        holdCard: modePermission({
            canSelect: true,
            canWriteCart: false,

            // Your requested behavior:
            // normal mode = no Select All
            // modify mode = yes Select All
            selectAllNormal: false,
            selectAllModify: true,

            selectFirstNormal: false,
            selectFirstModify: true,
        }),

        earlyAccessCard: modePermission({
            canSelect: true,
            canWriteCart: false,

            selectAllNormal: true,
            selectAllModify: true,

            selectFirstNormal: false,
            selectFirstModify: true,
        }),

        errorCard: modePermission({
            canSelect: true,
            canWriteCart: false,

            // Your requested behavior:
            // normal mode = no Select All
            // modify mode = yes Select All
            selectAllNormal: false,
            selectAllModify: true,

            selectFirstNormal: false,
            selectFirstModify: true,
        }),

        failedCard: modePermission({
            canSelect: false,
            canWriteCart: false,
            switchWhileDownloading: true,
        }),

        recentCard: modePermission({
            canSelect: false,
            canWriteCart: false,
            switchWhileDownloading: true,
        }),

        historyTable: modePermission({
            canSelect: false,
            canWriteCart: false,
            switchWhileDownloading: true,
        }),

        aiCard: modePermission({
            canSelect: true,
            canWriteCart: false,

            selectAllNormal: true,
            selectAllModify: true,

            selectFirstNormal: false,
            selectFirstModify: true,
        }),
    };

    const getModePermission = (mode: DisplayMode) =>
        MODE_PERMISSION[mode] ?? DEFAULT_MODE_PERMISSION;

    const currentModePermission = getModePermission(displayMode);

    const isPagedMode =
        displayMode === "bigCard" ||
        displayMode === "smallCard" ||
        displayMode === "table";

    const canModeSelect = (mode: DisplayMode) =>
        getModePermission(mode).canSelect;

    const canModeWriteCart = (mode: DisplayMode) =>
        getModePermission(mode).canWriteCart;

    const canSwitchModeWhileDownloading = (mode: DisplayMode) =>
        getModePermission(mode).switchWhileDownloading;

    const canUseDownloadNow =
        !isModifyMode &&
        currentModePermission.downloadNow;

    const canCurrentModeSelect = currentModePermission.canSelect;

    const canCurrentModeWriteCart = currentModePermission.canWriteCart;

    const prevDisplayModeRef = useRef<DisplayMode>(displayMode);

    const canChangeSelection =
        uiMode === "idle" &&
        !isLoading &&
        canCurrentModeSelect;

    const canUseSelectAll =
        canChangeSelection &&
        (
            isModifyMode
                ? currentModePermission.selectAllModify
                : currentModePermission.selectAllNormal
        );

    const canUseSelectFirstNormal =
        !isModifyMode &&
        canChangeSelection &&
        currentModePermission.selectFirstNormal &&
        currentModePermission.canWriteCart;

    const canUseSelectFirstModify =
        isModifyMode &&
        canChangeSelection &&
        currentModePermission.selectFirstModify;

    const DUMMY_DOWNLOAD_URL =
        "https://huggingface.co/Ukado/Cream/resolve/main/easynegative.safetensors";

    const [dummyCreateStatusByVid, setDummyCreateStatusByVid] = useState({} as Record<
        string,
        {
            phase: "idle" | "downloading" | "inserting" | "success" | "fail";
            text: string;
            msg?: string;
            running?: boolean;
            completedDownloadPath?: string;
            completedDownloadFileName?: string;
        }
    >);

    const cartEntryKey = useCallback((versionId: string | number | null | undefined) => {
        return `v_${String(versionId ?? "")}`;
    }, []);

    const clearCartSelection = useCallback(() => {
        setSelectedIds(new Set());
        setCartEntryByVid({});
        setCartDownloadStatusByVid({});
        setSelectedSuggestedPathByVid({});
    }, []);

    const replaceSelectionOnly = useCallback((entries: OfflineDownloadEntry[]) => {
        const nextIds = new Set<string>();

        entries.forEach((entry) => {
            const versionId = String(entry.civitaiVersionID ?? "").trim();
            if (!versionId) return;

            nextIds.add(versionId);
        });

        setSelectedIds(nextIds);
    }, []);

    const replaceCartSelection = useCallback((entries: OfflineDownloadEntry[]) => {
        const nextIds = new Set<string>();
        const nextCart: Record<string, OfflineDownloadEntry> = {};

        entries.forEach((entry) => {
            const versionId = String(entry.civitaiVersionID ?? "").trim();

            if (!versionId) return;

            nextIds.add(versionId);
            nextCart[cartEntryKey(versionId)] = entry;
        });

        setSelectedIds(nextIds);
        setCartEntryByVid(nextCart);

        // avoid showing old download status when user creates a new cart
        setCartDownloadStatusByVid({});
    }, [cartEntryKey]);

    const getCartSelectedIds = useCallback(() => {
        const nextIds = new Set<string>();

        Object.values(cartEntryByVid).forEach((entry) => {
            const versionId = String(entry.civitaiVersionID ?? "").trim();
            if (!versionId) return;

            nextIds.add(versionId);
        });

        return nextIds;
    }, [cartEntryByVid]);

    const handleBulkPatchSelected = async () => {
        const selectedEntries = visibleEntries.filter((entry) =>
            selectedIds.has(String(entry.civitaiVersionID ?? "").trim())
        );
        const modelObjects = selectedEntries.map((entry) => ({
            civitaiModelID: entry.civitaiModelID,
            civitaiVersionID: entry.civitaiVersionID,
        }));

        if (!modelObjects.length) return;

        const patch = {} as Parameters<typeof fetchBulkPatchOfflineDownloadList>[1] & {
            errorMessage?: string | null;
        };
        const shouldRefresh = selectedPatchFields.has("refreshRecord");

        if (selectedPatchFields.has("hold")) {
            patch.hold = bulkHold;
        }
        if (selectedPatchFields.has("downloadPriority")) {
            patch.downloadPriority = bulkDownloadPriority;
        }
        if (selectedPatchFields.has("downloadFilePath")) {
            const v = (modify_downloadFilePath || "").trim();
            if (!v) {
                dispatch(setError({ hasError: true, errorMessage: "downloadFilePath is empty." }));
                return;
            }
            patch.downloadFilePath = v;
        }
        if (selectedPatchFields.has("isError")) {
            patch.isError = bulkIsError;

            // when clearing error, also clear errorMessage/errorAt on backend
            if (!bulkIsError) {
                patch.errorMessage = null;
            } else {
                patch.errorMessage = "Manually marked as error";
            }
        }

        setIsPatching(true);
        setUiMode("modifying");

        try {
            const hasPatchFields =
                selectedPatchFields.has("hold") ||
                selectedPatchFields.has("downloadPriority") ||
                selectedPatchFields.has("downloadFilePath") ||
                selectedPatchFields.has("isError");

            if (hasPatchFields) {
                await fetchBulkPatchOfflineDownloadList(modelObjects, patch, dispatch);
            }

            if (shouldRefresh) {
                for (let i = 0; i < selectedEntries.length; i++) {
                    const entry = selectedEntries[i];

                    if (i > 0) await sleep(1000);

                    await fetchRefreshOfflineDownloadRecord(
                        {
                            civitaiModelID: entry.civitaiModelID,
                            civitaiVersionID: entry.civitaiVersionID,
                        },
                        dispatch
                    );
                }
            }

            setBulkHold(true);
            setBulkDownloadPriority(5);
            setBulkIsError(true);
            dispatch(updateDownloadFilePath("/@scan@/ACG/Pending/"));
            setSelectedPatchFields(new Set());
            clearCartSelection();

            await handleRefreshList();
        } catch (err: any) {
            console.error("Bulk patch failed:", err?.message || err);
            dispatch(setError({
                hasError: true,
                errorMessage: `Bulk patch failed: ${err?.message || "Unknown error"}`
            }));
        } finally {
            setIsPatching(false);
            setIsLoading(false);
            setUiMode("idle");
        }
    };


    const addPatchField = (key: any) => {
        setSelectedPatchFields((prev) => new Set([...prev, key]));
    };

    const handleVersionIdSave = async (
        entry: OfflineDownloadEntry,
        nextVersionIdRaw: string
    ) => {
        const nextVersionId = String(nextVersionIdRaw ?? "").trim();
        const currentVersionId = String(entry.civitaiVersionID ?? "").trim();

        if (!nextVersionId || nextVersionId === currentVersionId) {
            setEditingVersionId(null);
            return;
        }

        if (!/^\d+$/.test(nextVersionId)) {
            alert("Version ID must be numeric.");
            return;
        }

        try {
            await fetchUpdateOfflineDownloadVersionId(
                {
                    civitaiModelID: entry.civitaiModelID,
                    civitaiVersionID: entry.civitaiVersionID,
                },
                nextVersionId,
                dispatch
            );

            // old selected version key may now be stale
            clearCartSelection();

            if (
                displayMode === "holdCard" ||
                displayMode === "earlyAccessCard" ||
                displayMode === "errorCard"
            ) {
                setSpecialReloadToken((t) => t + 1);
            } else {
                await refreshCurrentPage();
            }
        } catch (err: any) {
            alert(`Failed to update version ID: ${err?.message || "Unknown error"}`);
        } finally {
            setEditingVersionId(null);
        }
    };

    const removePatchField = (key: any) => {
        setSelectedPatchFields((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    };

    const uiModeRef = useRef(uiMode);

    useEffect(() => {
        uiModeRef.current = uiMode;
    }, [uiMode]);

    useEffect(() => {
        let cancelled = false;

        type HistoryApiRow = {
            id?: number | string | null;
            _id?: number | string | null;

            civitaiModelID?: number | string | null;
            civitai_model_id?: number | string | null;

            civitaiVersionID?: number | string | null;
            civitai_version_id?: number | string | null;

            imageUrlList?: unknown;
            image_url_list?: unknown;

            localPath?: string | null;
            local_path?: string | null;

            creatorName?: string | null;
            creator_name?: string | null;

            isError?: boolean | number | string | null;
            is_error?: boolean | number | string | null;

            errorMessage?: string | null;
            error_message?: string | null;

            errorAt?: string | null;
            error_at?: string | null;

            createdAt?: string | null;
            created_at?: string | null;

            updatedAt?: string | null;
            updated_at?: string | null;
        };

        type HistoryPayload = {
            content?: HistoryApiRow[];
            totalElements?: number;
            totalPages?: number;
        };

        type HistoryDbDetail = {
            modelTableId?: number | string | null;
            model_table_id?: number | string | null;

            modelRecordExists?: boolean | number | string | null;
            model_record_exists?: boolean | number | string | null;

            offlineRecordExists?: boolean | number | string | null;
            offline_record_exists?: boolean | number | string | null;

            localPath?: string | null;
            local_path?: string | null;

            creatorName?: string | null;
            creator_name?: string | null;

            isError?: boolean | number | string | null;
            is_error?: boolean | number | string | null;

            errorMessage?: string | null;
            error_message?: string | null;

            errorAt?: string | null;
            error_at?: string | null;
        };

        type HistoryDbDetailsMap = Record<string, HistoryDbDetail>;

        const toOptionalNumber = (value: unknown): number | undefined => {
            if (value === undefined || value === null || value === "") {
                return undefined;
            }

            const num = Number(value);
            return Number.isFinite(num) ? num : undefined;
        };

        const toNumber = (value: unknown): number => {
            const num = Number(value);
            return Number.isFinite(num) ? num : 0;
        };

        const toStringValue = (value: unknown): string => {
            if (typeof value === "string") {
                return value;
            }

            if (value === undefined || value === null) {
                return "";
            }

            return String(value);
        };

        const toNullableString = (value: unknown): string | null => {
            if (typeof value === "string" && value.trim() !== "") {
                return value;
            }

            return null;
        };

        const toBooleanValue = (value: unknown): boolean => {
            return value === true || value === 1 || value === "1" || value === "true";
        };

        const toImageUrlList = (value: unknown): string[] => {
            if (Array.isArray(value)) {
                return value.filter(
                    (x): x is string => typeof x === "string" && x.trim() !== ""
                );
            }

            if (typeof value === "string" && value.trim() !== "") {
                try {
                    const parsed = JSON.parse(value);

                    if (Array.isArray(parsed)) {
                        return parsed.filter(
                            (x): x is string => typeof x === "string" && x.trim() !== ""
                        );
                    }
                } catch {
                    return [];
                }
            }

            return [];
        };

        const getHistoryKey = (
            modelID: string | number,
            versionID: string | number
        ): string => {
            return `${String(modelID)}_${String(versionID)}`;
        };

        const getRowKey = (row: ModelOfflineDownloadHistoryEntry): string => {
            return getHistoryKey(row.civitaiModelID, row.civitaiVersionID);
        };

        const normalizeHistoryRow = (row: HistoryApiRow): ModelOfflineDownloadHistoryEntry => {
            return {
                id: toOptionalNumber(row.id ?? row._id),

                civitaiModelID: toNumber(row.civitaiModelID ?? row.civitai_model_id),
                civitaiVersionID: toNumber(row.civitaiVersionID ?? row.civitai_version_id),

                imageUrlList: toImageUrlList(row.imageUrlList ?? row.image_url_list),

                localPath: toStringValue(row.localPath ?? row.local_path),
                hasExistingLocalFile: false,

                creatorName: toNullableString(row.creatorName ?? row.creator_name),
                isError: toBooleanValue(row.isError ?? row.is_error),
                errorMessage: toNullableString(row.errorMessage ?? row.error_message),
                errorAt: toNullableString(row.errorAt ?? row.error_at),

                createdAt: toStringValue(row.createdAt ?? row.created_at),
                updatedAt: toStringValue(row.updatedAt ?? row.updated_at),
            };
        };

        const getCheckedFilePath = (filePayload: any): string => {
            const payload = filePayload?.payload ?? filePayload;

            const filePath =
                payload?.filePath ??
                payload?.localPath ??
                payload?.path ??
                payload?.modelDownloadPath ??
                payload?.downloadFilePath;

            return typeof filePath === "string" ? filePath.trim() : "";
        };

        const mergeDbDetailsInBackground = async (
            rows: ModelOfflineDownloadHistoryEntry[]
        ) => {
            setOneHistoryFetchStatus("dbDetails", "loading");

            const uniqueItems = Array.from(
                new Map(
                    rows
                        .filter((row) => row.civitaiModelID && row.civitaiVersionID)
                        .map((row) => [
                            getRowKey(row),
                            {
                                civitaiModelID: row.civitaiModelID,
                                civitaiVersionID: row.civitaiVersionID,
                            },
                        ])
                ).values()
            );

            if (uniqueItems.length === 0) {
                setOneHistoryFetchStatus("dbDetails", "success");
                return;
            }

            try {
                const details = await fetchHistoryModelVersionDbDetails(
                    uniqueItems,
                    dispatch
                ) as HistoryDbDetailsMap | null | undefined;

                if (cancelled) return;

                if (!details) {
                    setOneHistoryFetchStatus("dbDetails", "fail");
                    return;
                }

                setModelOfflineDownloadHistoryList((prevRows: ModelOfflineDownloadHistoryEntry[]) =>
                    prevRows.map((row: ModelOfflineDownloadHistoryEntry) => {
                        const detail = details[getRowKey(row)];

                        if (!detail) {
                            return row;
                        }

                        const dbDetail = detail as any;

                        const modelTableId =
                            dbDetail.modelTableId !== undefined
                                ? dbDetail.modelTableId
                                : dbDetail.model_table_id;

                        const modelRecordExistsRaw =
                            dbDetail.modelRecordExists !== undefined
                                ? dbDetail.modelRecordExists
                                : dbDetail.model_record_exists;

                        const offlineRecordExistsRaw =
                            dbDetail.offlineRecordExists !== undefined
                                ? dbDetail.offlineRecordExists
                                : dbDetail.offline_record_exists;

                        const nextModelRecordExists =
                            modelRecordExistsRaw !== undefined && modelRecordExistsRaw !== null
                                ? toBooleanValue(modelRecordExistsRaw)
                                : modelTableId !== undefined &&
                                modelTableId !== null &&
                                String(modelTableId).trim() !== "";

                        const nextOfflineRecordExists =
                            offlineRecordExistsRaw !== undefined && offlineRecordExistsRaw !== null
                                ? toBooleanValue(offlineRecordExistsRaw)
                                : row.offlineRecordExists === true;

                        const nextIsErrorRaw =
                            dbDetail.isError !== undefined
                                ? dbDetail.isError
                                : dbDetail.is_error;

                        const nextLocalPath =
                            typeof (dbDetail.localPath ?? dbDetail.local_path) === "string"
                                ? String(dbDetail.localPath ?? dbDetail.local_path)
                                : row.localPath;

                        const nextCreatorName =
                            toNullableString(dbDetail.creatorName ?? dbDetail.creator_name) ??
                            row.creatorName;

                        const nextIsError =
                            nextIsErrorRaw === undefined || nextIsErrorRaw === null
                                ? row.isError
                                : toBooleanValue(nextIsErrorRaw);

                        const nextErrorMessage =
                            toNullableString(dbDetail.errorMessage ?? dbDetail.error_message) ??
                            row.errorMessage;

                        const nextErrorAt =
                            toNullableString(dbDetail.errorAt ?? dbDetail.error_at) ??
                            row.errorAt;

                        return {
                            ...row,

                            modelTableId:
                                modelTableId === undefined
                                    ? row.modelTableId
                                    : modelTableId,

                            modelRecordExists: nextModelRecordExists,
                            offlineRecordExists: nextOfflineRecordExists,

                            localPath: nextLocalPath,
                            creatorName: nextCreatorName,
                            isError: nextIsError,
                            errorMessage: nextErrorMessage,
                            errorAt: nextErrorAt,
                        };
                    })
                );

                setOneHistoryFetchStatus("dbDetails", "success");
            } catch (error) {
                console.error("History DB details fetch failed:", error);

                if (!cancelled) {
                    setOneHistoryFetchStatus("dbDetails", "fail");
                }
            }
        };

        const checkLocalFilesInBackground = async (
            rows: ModelOfflineDownloadHistoryEntry[]
        ) => {
            setOneHistoryFetchStatus("localFileCheck", "loading");

            const resultsByKey: Record<string, {
                checkedFilePath: string;
                hasExistingLocalFile: boolean;
            }> = {};

            try {
                for (const row of rows) {
                    if (cancelled) return;

                    const modelID = String(row.civitaiModelID ?? "").trim();
                    const versionID = String(row.civitaiVersionID ?? "").trim();

                    if (!modelID || !versionID) continue;

                    const key = getHistoryKey(modelID, versionID);

                    const cachedResult = historyFileExistsCacheRef.current[key];
                    if (cachedResult) {
                        resultsByKey[key] = cachedResult;
                        continue;
                    }

                    try {
                        const filePayload = await fetchCheckModelVersionFileExists(
                            dispatch,
                            modelID,
                            versionID
                        );

                        if (cancelled) return;

                        const checkedFilePath = getCheckedFilePath(filePayload);

                        const result = {
                            checkedFilePath,
                            hasExistingLocalFile: checkedFilePath !== "",
                        };

                        historyFileExistsCacheRef.current[key] = result;
                        resultsByKey[key] = result;
                    } catch (error) {
                        // One row failed. Keep going for the other rows.
                    }
                }

                if (cancelled) return;

                const resultKeys = Object.keys(resultsByKey);

                if (resultKeys.length > 0) {
                    setModelOfflineDownloadHistoryList((prevRows) =>
                        prevRows.map((currentRow) => {
                            const currentKey = getHistoryKey(
                                currentRow.civitaiModelID,
                                currentRow.civitaiVersionID
                            );

                            const result = resultsByKey[currentKey];
                            if (!result) return currentRow;

                            const nextCheckedFilePath = result.checkedFilePath;
                            const nextHasExistingLocalFile = result.hasExistingLocalFile;

                            if (
                                (currentRow as any).checkedFilePath === nextCheckedFilePath &&
                                currentRow.hasExistingLocalFile === nextHasExistingLocalFile
                            ) {
                                return currentRow;
                            }

                            return {
                                ...currentRow,

                                // Keep DB path unchanged
                                localPath: currentRow.localPath,

                                // Store local file check result separately
                                checkedFilePath: nextCheckedFilePath,

                                hasExistingLocalFile: nextHasExistingLocalFile,
                            };
                        })
                    );
                }

                setOneHistoryFetchStatus("localFileCheck", "success");
            } catch (error) {
                console.error("History local file check failed:", error);
                if (!cancelled) {
                    setOneHistoryFetchStatus("localFileCheck", "fail");
                }
            }
        };

        const enrichHistoryRowsInBackground = async (
            rows: ModelOfflineDownloadHistoryEntry[]
        ) => {
            // Step 2: DB details first.
            await mergeDbDetailsInBackground(rows);

            // Step 3: local file check second.
            // If found, this overrides localPath.
            await checkLocalFilesInBackground(rows);
        };

        const loadHistoryList = async () => {
            if (displayMode !== "historyTable") return;

            resetHistoryFetchStatus();
            setOneHistoryFetchStatus("historyList", "loading");

            const shouldControlBusyAtStart = uiModeRef.current !== "downloading";

            try {
                if (shouldControlBusyAtStart) {
                    setUiMode("paging");
                    setIsLoading(true);
                }

                const payload = await fetchModelOfflineDownloadHistoryList(
                    dispatch,
                    historyPage - 1,
                    historyItemsPerPage,
                    historySelectedDate
                ) as HistoryPayload | null | undefined;

                if (cancelled) return;

                const content = payload?.content;

                const rows: HistoryApiRow[] = Array.isArray(content)
                    ? content
                    : [];

                const normalizedRows: ModelOfflineDownloadHistoryEntry[] =
                    rows.map((row: HistoryApiRow) => normalizeHistoryRow(row));

                // Step 1:
                // Show rows/images immediately.
                setModelOfflineDownloadHistoryList(normalizedRows);
                setHistoryTotalItems(payload?.totalElements ?? 0);
                setHistoryTotalPages(payload?.totalPages ?? 1);
                setOneHistoryFetchStatus("historyList", "success");

                // Step 2 + Step 3:
                // Do extra DB details and local file check after table is already displayed.
                void enrichHistoryRowsInBackground(normalizedRows);
            } catch (err: any) {
                console.error("History list fetch failed:", err?.message || err);

                if (!cancelled) {
                    setOneHistoryFetchStatus("historyList", "fail");
                    setOneHistoryFetchStatus("dbDetails", "notStarted");
                    setOneHistoryFetchStatus("localFileCheck", "notStarted");

                    setModelOfflineDownloadHistoryList([]);
                    setHistoryTotalItems(0);
                    setHistoryTotalPages(1);
                }
            } finally {
                if (!cancelled && shouldControlBusyAtStart && uiModeRef.current !== "downloading") {
                    setIsLoading(false);
                    setUiMode("idle");
                }
            }
        };

        loadHistoryList();

        return () => {
            cancelled = true;
        };
    }, [
        displayMode,
        historyPage,
        historyItemsPerPage,
        historyReloadToken,
        historySelectedDate,
        dispatch,
    ]);

    useEffect(() => {
        setHistoryPage(1);
    }, [historySelectedDate]);

    useEffect(() => {
        const loadHistoryAvailableDates = async () => {
            if (displayMode !== "historyTable") return;

            const year = historyCalendarMonth.getFullYear();
            const month = historyCalendarMonth.getMonth() + 1;

            const dates = await fetchModelOfflineDownloadHistoryAvailableDates(
                dispatch,
                year,
                month
            );

            setHistoryAvailableDates(Array.isArray(dates) ? dates : []);
        };

        loadHistoryAvailableDates();
    }, [displayMode, historyCalendarMonth, dispatch]);

    function toLocalYmd(d: Date) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    useEffect(() => {
        let cancelled = false;

        const loadAiList = async () => {
            if (displayMode !== "aiCard") return;

            try {
                setUiMode("paging");
                setIsLoading(true);

                const page0 = Math.max(0, aiPage - 1);

                const aiPrefixes = getActivePrefixes();

                const excludedPrefixes = getActiveExcludedPrefixes();

                const p = await fetchOfflineDownloadListPage(
                    dispatch,
                    page0,
                    aiItemsPerPage,
                    false,
                    aiPrefixes,
                    excludedPrefixes,
                    "",
                    "contains",
                    "pending",
                    true,
                    true,
                    'priority',
                    "desc",
                    true,
                    true
                );

                if (!cancelled) {
                    setAiEntries(Array.isArray(p?.content) ? p.content : []);
                    setAiTotalItems(p?.totalElements ?? 0);
                    setAiTotalPages(p?.totalPages ?? 1);
                }
            } catch (err: any) {
                console.error("AI list fetch failed:", err?.message || err);
                if (!cancelled) {
                    setAiEntries([]);
                    setAiTotalItems(0);
                    setAiTotalPages(1);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                    setUiMode("idle");
                }
            }
        };

        loadAiList();

        return () => {
            cancelled = true;
        };
    }, [displayMode, aiPage, aiItemsPerPage, aiReloadToken, dispatch]);

    const availablePatchFields = ALL_PATCH_FIELDS.filter(f => !selectedPatchFields.has(f.key));

    const getAiSuggestCount = () => {
        const n = parseInt(aiSuggestCountInput, 10);
        if (Number.isNaN(n)) return DEFAULT_AI_SUGGEST_COUNT;
        return Math.max(10, Math.min(100, n));
    };

    const handleRunPendingAiSuggestions = async () => {
        if (isLoading) return;

        setAiSuggestRunStatus("running");
        setAiSuggestRunMsg("");

        setBatchResults([]);

        const total = getAiSuggestCount(); // your clamp 10~25
        setAiSuggestProgress({ completed: 0, total });

        setIsLoading(true);
        setUiMode("modifying");

        try {
            let remaining = total;
            let processed = 0;
            let batchIndex = 0;

            while (remaining > 0) {
                const size = Math.min(AI_BATCH_SIZE, remaining);

                const start = processed + 1;
                const end = processed + size;

                const batchNo = batchIndex + 1;

                setCurrentBatchRange(
                    `Now processing ${start} ~ ${end} (batch ${batchIndex + 1})`
                );

                setBatchResults(prev => [
                    ...prev,
                    { batchNo, start, end, status: "running" },
                ]);

                try {
                    // IMPORTANT:
                    // Use page: 0 each time so after the server updates items (no longer "pending"),
                    // the next call grabs the next pending ones.
                    const resp = await fetchRunPendingFromOfflineDownloadListAiSuggestion(
                        { page: 0, size },
                        dispatch
                    );

                    // If your helper returns a number of updated rows, you can stop early:
                    // (safe optional handling)
                    const updatedRows =
                        typeof resp === "number"
                            ? resp
                            : (resp && typeof resp.updatedRows === "number" ? resp.updatedRows : null);

                    setBatchResults(prev =>
                        prev.map(b =>
                            b.batchNo === batchNo
                                ? { ...b, status: "success", msg: updatedRows !== null ? `updatedRows=${updatedRows}` : undefined }
                                : b
                        )
                    );

                    processed += size;
                    remaining -= size;
                    batchIndex += 1;

                    setAiSuggestProgress({ completed: processed, total });

                    // Refresh so you can immediately see updated suggestions
                    await refreshCurrentPage();

                    // If server says "nothing updated", break (optional, only if you actually get that signal)
                    if (updatedRows !== null && updatedRows <= 0) {
                        setAiSuggestRunMsg("No more pending items to process.");
                        break;
                    }

                    // cooldown after EVERY batch (including last), as you requested
                    setBatchCooldown(AI_COOLDOWN_SECONDS);
                    await sleep(AI_COOLDOWN_SECONDS * 1000);
                    setBatchCooldown(null);

                } catch (err: any) {
                    // ✅ NEW: mark THIS batch fail + store message
                    const msg = err?.response?.data?.message || err?.message || "Unknown error";

                    setBatchResults(prev =>
                        prev.map(b => (b.batchNo === batchNo ? { ...b, status: "fail", msg } : b))
                    );

                    // ✅ keep your overall fail handling
                    throw err;
                }
            }

            setAiSuggestRunStatus("success");
        } catch (err: any) {
            console.error("Run AI suggestion failed:", err?.message || err);
            setAiSuggestRunStatus("fail");
            setAiSuggestRunMsg(err?.response?.data?.message || err?.message || "Unknown error");
            dispatch(
                setError({
                    hasError: true,
                    errorMessage: `Run AI suggestion failed: ${err?.message || "Unknown error"}`,
                })
            );
        } finally {
            setCurrentBatchRange(null);
            setBatchCooldown(null);
            setIsLoading(false);
            setUiMode("idle");
        }
    };


    const onChangeAiSuggestCount = (e: any) => {
        setAiSuggestCountInput(e.target.value);
        setAiSuggestRunStatus(null);
        setAiSuggestRunMsg("");
    };


    // Replace /width=###/ in Civitai URLs; if missing, insert it before the filename.
    const IMG_WIDTH_RE = /\/width=\d+\//;
    function withWidth(url: string, w: number) {
        return IMG_WIDTH_RE.test(url)
            ? url.replace(IMG_WIDTH_RE, `/width=${w}/`)
            : url.replace(/\/([^\/?#]+)([?#]|$)/, `/width=${w}/$1$2`);
    }

    // Build a responsive srcset so the browser picks the smallest adequate size.
    function buildSrcSet(url: string, widths: number[]) {
        return widths.map(w => `${withWidth(url, w)} ${w}w`).join(', ');
    }

    // Helpers for AI suggestions display
    const normalizePathKey = (p: string) =>
        (p || "")
            .trim()
            .replace(/\\/g, "/")
            .replace(/\/+/g, "/")
            .replace(/^\/+/, "")
            .replace(/\/+$/, "")
            .toLowerCase();

    const isCharactersPath = (p: string) => normalizePathKey(p).includes("/acg/characters");

    // Merge + dedupe suggested paths, while:
    // 1) keeping AI suggestions first,
    // 2) prioritizing any "/ACG/Characters" paths to the top within each source list.
    const mergeSuggestedPathsForEntry = (entry: OfflineDownloadEntry): string[] => {
        const cleanArr = (arr?: string[] | null) =>
            (Array.isArray(arr) ? arr : [])
                .map((x) => (x ?? "").trim())
                .filter(Boolean);

        const prioritize = (arr: string[]) => {
            const pri: string[] = [];
            const rest: string[] = [];
            for (const p of arr) (isCharactersPath(p) ? pri : rest).push(p);
            return [...pri, ...rest];
        };

        const sources = [
            prioritize(cleanArr(entry.aiSuggestedDownloadFilePath)),
            prioritize(cleanArr(entry.jikanSuggestedDownloadFilePath)),
            prioritize(cleanArr(entry.localSuggestedDownloadFilePath)),
        ];

        const seen = new Set<string>();
        const out: string[] = [];

        for (const src of sources) {
            for (const p of src) {
                const key = normalizePathKey(p);
                if (!key) continue;
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(p);
            }
        }
        return out;
    };

    // Accept either a string URL or an {url,width,height} object.
    function normalizeImg(img: string | { url: string; width?: number; height?: number }) {
        return typeof img === 'string'
            ? { url: img, width: undefined, height: undefined }
            : { url: img.url, width: img.width, height: img.height };
    }

    const isInteractiveClickTarget = (target: any) => {
        if (!(target instanceof HTMLElement)) return false;

        return Boolean(
            target.closest(
                'a,button,input,select,textarea,label,[data-no-select="true"]'
            )
        );
    };

    // 1) On mount, fetch the initial list of excluded tags from the server
    useEffect(() => {
        fetchExcludedTags();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // leaving early access mode -> reset
        if (displayMode !== "earlyAccessCard") {
            eaRefreshedVidSetRef.current = new Set();
        }
    }, [displayMode]);

    useEffect(() => {
        let cancelled = false;

        const loadSpecialList = async () => {
            if (
                displayMode !== 'holdCard' &&
                displayMode !== 'earlyAccessCard' &&
                displayMode !== 'errorCard'
            ) {
                return;
            }

            try {
                setUiMode('paging');
                setIsLoading(true);

                if (displayMode === 'holdCard') {
                    const payload = await fetchOfflineDownloadListHold(dispatch);
                    if (!cancelled) {
                        setHoldEntries(Array.isArray(payload) ? payload as OfflineDownloadEntry[] : []);
                    }
                } else if (displayMode === 'earlyAccessCard') {
                    const payload = await fetchOfflineDownloadListEarlyAccessActive(dispatch);
                    if (!cancelled) {
                        setEarlyAccessEntries(Array.isArray(payload) ? payload as OfflineDownloadEntry[] : []);
                    }
                } else if (displayMode === 'errorCard') {
                    const payload = await fetchGetErrorModelList(dispatch);
                    if (!cancelled) {
                        setErrorEntries(Array.isArray(payload) ? payload as OfflineDownloadEntry[] : []);
                    }
                }
            } catch (err: any) {
                console.error('Special list fetch failed:', err?.message || err);
                if (!cancelled) {
                    if (displayMode === 'holdCard') setHoldEntries([]);
                    else if (displayMode === 'earlyAccessCard') setEarlyAccessEntries([]);
                    else if (displayMode === 'errorCard') setErrorEntries([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                    setUiMode('idle');
                }
            }
        };

        loadSpecialList();
        return () => { cancelled = true; };
    }, [displayMode, dispatch, specialReloadToken]);


    async function fetchExcludedTags() {
        const serverTags = await fetchGetPendingRemoveTagsList(dispatch);
        if (serverTags && Array.isArray(serverTags)) {
            setExcludedTags(serverTags);
        }
    }

    function deriveStatus(showPending: boolean, showNonPending: boolean): StatusFilter {
        if (showPending && showNonPending) return 'both';
        if (showPending) return 'pending';
        if (showNonPending) return 'non-pending';
        return 'both'; // won't be used if you early-return when both are false
    }

    // 1) Keep your excluded tags in lowercase
    // Updated computeTopTagsFromPending: now accepts a third parameter "source"
    const computeTopTagsFromPending = (
        data: OfflineDownloadEntry[],
        excluded: string[],
        source: 'all' | 'tags' | 'fileName' | 'titles' | 'other'
    ): string[] => {
        // If the source is 'other' (or "Entries"), use the passed-in data as is
        // Otherwise, filter for pending entries only.
        const entriesForTag =
            source === 'other'
                ? data
                : data.filter((entry) => isPendingEntry(entry));   // <- use helper


        const freqMap = new Map<string, number>();

        // Helper: split strings by special characters (supports Unicode)
        const splitBySpecialChars = (input: string): string[] =>
            input.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 0);

        entriesForTag.forEach((entry) => {
            let potentialTags: string[] = [];

            if (source === 'all') {
                // 'all' collects from civitaiTags, fileName, and model title
                if (Array.isArray(entry.civitaiTags)) {
                    potentialTags.push(...entry.civitaiTags);
                }
                if (entry.civitaiFileName) {
                    potentialTags.push(...splitBySpecialChars(entry.civitaiFileName));
                }
                if (entry.modelVersionObject?.model?.name) {
                    potentialTags.push(...splitBySpecialChars(entry.modelVersionObject.model.name));
                }
            } else if (source === 'tags') {
                if (Array.isArray(entry.civitaiTags)) {
                    potentialTags.push(...entry.civitaiTags);
                }
            } else if (source === 'fileName') {
                if (entry.civitaiFileName) {
                    potentialTags.push(...splitBySpecialChars(entry.civitaiFileName));
                }
            } else if (source === 'titles') {
                if (entry.modelVersionObject?.model?.name) {
                    potentialTags.push(...splitBySpecialChars(entry.modelVersionObject.model.name));
                }
            } else if (source === 'other') {
                // "Other" collects from all four fields:
                if (entry.civitaiFileName) {
                    potentialTags.push(...splitBySpecialChars(entry.civitaiFileName));
                }
                if (entry.modelVersionObject?.name) {
                    potentialTags.push(...splitBySpecialChars(entry.modelVersionObject.name));
                }
                if (entry.modelVersionObject?.model?.name) {
                    potentialTags.push(...splitBySpecialChars(entry.modelVersionObject.model.name));
                }
                if (Array.isArray(entry.civitaiTags)) {
                    potentialTags.push(...entry.civitaiTags);
                }
            }

            potentialTags.forEach((rawTag) => {
                const tag = rawTag.toLowerCase();
                if (excluded.includes(tag)) return;
                freqMap.set(tag, (freqMap.get(tag) || 0) + 1);
            });
        });

        const sorted = [...freqMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .filter(([tag]) => tag.length >= 3 && !/^\d+$/.test(tag));

        return sorted.map(([tag]) => tag);
    };

    const SENTINELS = {
        NONE: "__NONE__",                 // means “no results” (service already supports this one)
        EXCLUDE_PENDING: "__EXCLUDE_PENDING__" // new: means “everything except Pending”
    };

    const PENDING_PATHS = ["/@scan@/ACG/Pending", "/@scan@/ACG/Pending/"];

    const getActivePrefixes = useCallback(() => {
        const selected = appliedQuery.selectedPrefixes ?? [];

        const isPendingPrefix = (p: string) =>
            PENDING_PATHS.includes(p) || /\/@scan@\/ACG\/Pending\/?$/.test(p);

        const onlyPending = selected.filter(isPendingPrefix);
        const onlyNonPending = selected.filter(p => !isPendingPrefix(p));

        if (appliedQuery.showPending && appliedQuery.showNonPending) {
            return selected;
        }

        if (appliedQuery.showPending && !appliedQuery.showNonPending) {
            return onlyPending.length ? onlyPending : PENDING_PATHS;
        }

        if (!appliedQuery.showPending && appliedQuery.showNonPending) {
            return onlyNonPending;
        }

        return [];
    }, [appliedQuery]);

    const getActiveExcludedPrefixes = useCallback(() => {
        const excluded = appliedQuery.excludedPrefixes ?? [];

        const isPendingPrefix = (p: string) =>
            PENDING_PATHS.includes(p) || /\/@scan@\/ACG\/Pending\/?$/.test(p);

        const onlyPending = excluded.filter(isPendingPrefix);
        const onlyNonPending = excluded.filter(p => !isPendingPrefix(p));

        if (appliedQuery.showPending && appliedQuery.showNonPending) {
            return excluded;
        }

        if (appliedQuery.showPending && !appliedQuery.showNonPending) {
            return onlyPending;
        }

        if (!appliedQuery.showPending && appliedQuery.showNonPending) {
            return onlyNonPending;
        }

        return [];
    }, [appliedQuery]);

    useEffect(() => {
        const loadPrefixes = async () => {
            const list = await fetchGetCategoryPrefixesList(dispatch);

            if (Array.isArray(list)) {
                // remove any empty-path entries (if any exist)
                const filtered: {
                    id: number;
                    prefixName: string;
                    downloadFilePath: string;
                    downloadPriority: number;
                    createdAt?: string;
                    updatedAt?: string;
                }[] = list.filter(
                    (p: {
                        id: number;
                        prefixName: string;
                        downloadFilePath: string;
                        downloadPriority: number;
                        createdAt?: string;
                        updatedAt?: string;
                    }) => (p.downloadFilePath ?? "").trim() !== ""
                );

                // Add a virtual “Updates” option that matches ANY path containing /@scan@/Update/
                const enhanced: {
                    id: number;
                    prefixName: string;
                    downloadFilePath: string;
                    downloadPriority: number;
                    createdAt?: string;
                    updatedAt?: string;
                }[] = [
                        ...filtered,
                        {
                            id: -1,
                            prefixName: "Updates (any folder)",
                            downloadFilePath: "/@scan@/Update/",
                            downloadPriority: 10,
                        },
                    ];

                setCategoriesPrefixsList(enhanced);

                // Start with everything selected EXCEPT '/@scan@/' and the virtual Updates option
                const DEFAULT_UNCHECKED = new Set<string>(["/@scan@/Update/"]);
                const initialChecked = enhanced
                    .filter((p) => !DEFAULT_UNCHECKED.has(p.downloadFilePath))
                    .map((p) => p.downloadFilePath);

                defaultPrefixesRef.current = initialChecked;

                setSelectedPrefixes(new Set(initialChecked));

                // ✅ set initial applied query to match defaults
                const initialExcluded = enhanced
                    .map((p) => p.downloadFilePath)
                    .filter((p) => !initialChecked.includes(p));

                setAppliedQuery((q) => ({
                    ...q,
                    selectedPrefixes: initialChecked,
                    excludedPrefixes: initialExcluded,
                }));

                setFiltersReady(true);
            }
        };

        loadPrefixes();
    }, [dispatch]);

    // At the top of your component:
    const selectAllRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectAllRef.current) {
            const total = categoriesPrefixsList.length;
            const sel = selectedPrefixes.size;
            // indeterminate if some but not all
            selectAllRef.current.indeterminate = sel > 0 && sel < total;
        }
    }, [selectedPrefixes, categoriesPrefixsList]);



    const handlePauseToggle = () => {
        setIsPaused((prev) => !prev);
    };

    const isPausedRef = useRef(isPaused);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const isCancelledRef = useRef(isCancelled);
    useEffect(() => {
        isCancelledRef.current = isCancelled;
    }, [isCancelled]);

    // Toggle functions
    const toggleTheme = () => {
        dispatch(updateIsDarkMode(!isDarkMode));
    };

    const resetDraftFilters = () => {
        setFilterText("");
        setFilterCondition("contains");

        setShowPending(true);
        setShowNonPending(true);

        setShowHoldEntries(false);
        setShowErrorEntries(true);
        setShowEarlyAccess(true);

        setSortBy("priority");
        setSortDir("desc");
        setIdSortDir("desc");
        setAiSuggestedOnly(false);

        setSelectedSuggestedPathByVid({});
        setGoToPageInput("");

        const defaults = defaultPrefixesRef.current;
        if (defaults && defaults.length) {
            setSelectedPrefixes(new Set(defaults));
        }
    };

    type ModifySnapshot = {
        draft: {
            filterText: string;
            filterCondition: typeof filterCondition;
            showPending: boolean;
            showNonPending: boolean;
            showHoldEntries: boolean;
            showEarlyAccess: boolean;
            showErrorEntries: boolean;
            sortBy: typeof sortBy;
            sortDir: typeof sortDir;
            idSortDir: typeof idSortDir;
            aiSuggestedOnly: boolean;
            selectedPrefixes: string[];
            goToPageInput: string;
        };
        appliedQuery: typeof appliedQuery;
        currentPage: number;
    };

    const preModifyRef = useRef<ModifySnapshot | null>(null);

    const toggleModifyMode = () => {
        if (isLoading) return;

        const nextIsModify = !isModifyMode;

        // always clear selection when switching modes
        clearCartSelection();
        setSelectedSuggestedPathByVid({});

        if (nextIsModify) {
            // ✅ ENTER Modify Mode: snapshot current condition FIRST
            preModifyRef.current = {
                draft: {
                    filterText,
                    filterCondition,
                    showPending,
                    showNonPending,
                    showHoldEntries,
                    showEarlyAccess,
                    showErrorEntries,
                    sortBy,
                    sortDir,
                    idSortDir,
                    aiSuggestedOnly,
                    selectedPrefixes: Array.from(selectedPrefixes),
                    goToPageInput,
                },
                appliedQuery,
                currentPage,
            };

            // draft UI for modify mode (your preference)
            setIsModifyMode(true);
            setShowPending(true);
            setShowNonPending(false);

            setShowHoldEntries(true);
            setShowEarlyAccess(true);

            setAiSuggestedOnly(false);
            setFilterText("");

            // ✅ trigger backend fetch immediately (based on current appliedQuery, but pending-only)
            setAppliedQuery((q) => ({
                ...q,
                showPending: true,
                showNonPending: false,
                showHoldEntries: true,
                showEarlyAccess: true,
                aiSuggestedOnly: false,
            }));
            setCurrentPage(1);
            return;
        }

        // ✅ EXIT Modify Mode: restore snapshot
        setIsModifyMode(false);

        const snap = preModifyRef.current;
        preModifyRef.current = null;

        if (snap) {
            // restore draft UI
            setFilterText(snap.draft.filterText);
            setFilterCondition(snap.draft.filterCondition);

            setShowPending(snap.draft.showPending);
            setShowNonPending(snap.draft.showNonPending);
            setShowHoldEntries(snap.draft.showHoldEntries);
            setShowEarlyAccess(snap.draft.showEarlyAccess);
            setShowErrorEntries(snap.draft.showErrorEntries);
            setSortBy(snap.draft.sortBy);
            setSortDir(snap.draft.sortDir);
            setIdSortDir(snap.draft.idSortDir);

            setAiSuggestedOnly(snap.draft.aiSuggestedOnly);
            setGoToPageInput(snap.draft.goToPageInput);

            setSelectedPrefixes(new Set(snap.draft.selectedPrefixes));

            // restore backend fetch condition (this will trigger your paging useEffect)
            setAppliedQuery(snap.appliedQuery);
            setCurrentPage(snap.currentPage);
        } else {
            // fallback if snapshot missing
            setShowPending(true);
            setShowNonPending(true);
            setAppliedQuery((q) => ({ ...q, showPending: true, showNonPending: true }));
            setCurrentPage(1);
        }
    };

    // Utility function to pause execution for a given number of milliseconds
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (initiationDelay !== null && initiationDelay > 0) {
            timer = setInterval(() => {
                setInitiationDelay(prev => {
                    if (prev === null || prev <= 1) {
                        clearInterval(timer);
                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [initiationDelay]);


    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (batchCooldown !== null && batchCooldown > 0) {
            timer = setInterval(() => {
                setBatchCooldown(prev => {
                    if (prev === null || prev <= 1) {
                        clearInterval(timer);
                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [batchCooldown]);

    useEffect(() => {
        if (!filtersReady) return;

        let cancelled = false;

        const timer = setTimeout(async () => {
            if (cancelled) return;

            if (!appliedQuery.showPending && !appliedQuery.showNonPending) {
                if (uiModeRef.current !== "downloading") {
                    setUiMode("idle");
                    setIsLoading(false);
                }
                setOfflineDownloadList([]);
                setServerTotalItems(0);
                setServerTotalPages(1);
                return;
            }

            const status: StatusFilter = deriveStatus(
                appliedQuery.showPending,
                appliedQuery.showNonPending
            );

            const shouldControlBusyAtStart = uiModeRef.current !== "downloading";

            if (shouldControlBusyAtStart) {
                setUiMode("paging");
                setIsLoading(true);
            }

            try {
                const page0 = Math.max(0, currentPage - 1);
                const prefixes = getActivePrefixes();
                const excludedPrefixes = getActiveExcludedPrefixes();

                const p = await fetchOfflineDownloadListPage(
                    dispatch,
                    page0,
                    itemsPerPage,
                    false,
                    prefixes,
                    excludedPrefixes,
                    appliedQuery.filterText.trim(),
                    appliedQuery.filterCondition as any,
                    status,
                    appliedQuery.showHoldEntries,
                    appliedQuery.showEarlyAccess,
                    appliedQuery.sortBy as any,
                    appliedQuery.sortDir as any,
                    appliedQuery.showErrorEntries,
                    appliedQuery.aiSuggestedOnly
                );

                if (!cancelled) {
                    setOfflineDownloadList(Array.isArray(p?.content) ? p.content : []);
                    setServerTotalItems(p?.totalElements ?? 0);
                    setServerTotalPages(p?.totalPages ?? 1);
                }
            } catch (e: any) {
                if (!cancelled) {
                    console.error("Paged fetch failed:", e?.message || e);
                    setOfflineDownloadList([]);
                    setServerTotalItems(0);
                    setServerTotalPages(1);
                }
            } finally {
                if (!cancelled && shouldControlBusyAtStart && uiModeRef.current !== "downloading") {
                    setIsLoading(false);
                    setUiMode("idle");
                }
            }
        }, 200);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        dispatch,
        currentPage,
        itemsPerPage,
        appliedQuery,
        getActivePrefixes,
        getActiveExcludedPrefixes,
        filtersReady
    ]);

    const isPendingPathValue = (path: string) =>
        PENDING_PATH_RE.test((path || "").trim());

    const shouldLeaveCurrentPagedList = (path: string) => {
        const pending = isPendingPathValue(path);

        if (appliedQuery.showPending && !appliedQuery.showNonPending) {
            return !pending;
        }

        if (!appliedQuery.showPending && appliedQuery.showNonPending) {
            return pending;
        }

        return false;
    };

    const handleDownloadPathSave = async (
        entry: OfflineDownloadEntry,
        nextPath: string
    ) => {
        const trimmed = nextPath.trim();
        const prevPath = entry.downloadFilePath ?? "";

        if (!trimmed || trimmed === prevPath.trim()) {
            setEditingPathId(null);
            return;
        }

        const matcher = (e: OfflineDownloadEntry) =>
            e.civitaiModelID === entry.civitaiModelID &&
            e.civitaiVersionID === entry.civitaiVersionID;

        const prevWasPending = isPendingPathValue(prevPath);
        const nextIsPending = isPendingPathValue(trimmed);

        // optimistic text update
        updateEntryLocal(matcher, { downloadFilePath: trimmed });

        try {
            await fetchUpdateDownloadFilePathFromOfflineDownloadList(
                {
                    civitaiModelID: entry.civitaiModelID,
                    civitaiVersionID: entry.civitaiVersionID,
                },
                trimmed,
                dispatch
            );

            // paged modes: if current server query would no longer include this item, refresh page
            if (shouldLeaveCurrentPagedList(trimmed)) {
                await refreshCurrentPage();
            }

            // AI mode/list is always pending-only
            if (prevWasPending !== nextIsPending) {
                setAiReloadToken((t) => t + 1);
            }
        } catch (err: any) {
            updateEntryLocal(matcher, { downloadFilePath: prevPath });
            alert(`Failed to update download path: ${err?.message || "Unknown error"}`);
        } finally {
            setEditingPathId(null);
        }
    };

    const filteredDownloadList = useMemo(() => offlineDownloadList, [offlineDownloadList]);

    useEffect(() => {
        if (uiMode !== "idle") return;
        if (isLoading) return;

        const prev = prevDisplayModeRef.current;
        const next = displayMode;

        prevDisplayModeRef.current = next;

        if (prev === next) return;

        setSelectedSuggestedPathByVid({});

        // Separate selection-only modes from cart modes.
        // hold/earlyAccess/error should not carry selected IDs into cart.
        if (!canModeSelect(next) || !canModeWriteCart(next)) {
            setSelectedIds(new Set());
            return;
        }

        // For table/big/small/cart, keep only real cart-selected IDs.
        setSelectedIds(getCartSelectedIds());
    }, [displayMode, uiMode, isLoading, getCartSelectedIds]);

    useEffect(() => {
        const data = tagSource === 'other'
            ? filteredDownloadList
            : offlineDownloadList;

        const tags = computeTopTagsFromPending(data, excludedTags, tagSource);
        setAllTags(tags);
        setTagPage(0);  // reset to page 1 on source change
    }, [offlineDownloadList, filteredDownloadList, excludedTags, tagSource]);


    // server-driven totals
    const totalItems = serverTotalItems;
    const totalPages = serverTotalPages;

    // one page already comes from the server
    const paginatedDownloadList = filteredDownloadList;

    // range text
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);


    // **New: Separate useEffect for itemsPerPage changes**
    useEffect(() => {
        setCurrentPage(1);
        console.log(`Items per page changed to ${itemsPerPage}. Resetting to page 1.`);
    }, [itemsPerPage]);

    useEffect(() => {
        if (currentPage > serverTotalPages) {
            setCurrentPage(serverTotalPages || 1);
        }
    }, [serverTotalPages, currentPage]);


    // Toggle: click the same card again to close; different card swaps the content
    const toggleLeftOverlay = useCallback((entry: OfflineDownloadEntry) => {
        setLeftOverlayEntry(prev => {
            const nextEntry =
                prev?.civitaiVersionID === entry.civitaiVersionID ? null : entry;

            // if opening/swapping preview, reset left panel scroll
            if (nextEntry) {
                requestAnimationFrame(() => {
                    if (leftPanelRef.current) {
                        leftPanelRef.current.scrollTo({
                            top: 0,
                            behavior: 'auto',
                        });
                    }
                });
            }

            return nextEntry;
        });
    }, []);

    const closeLeftOverlay = useCallback(() => setLeftOverlayEntry(null), []);

    const handleDeleteHistoryRecord = useCallback(async (historyId: number) => {
        if (!historyId || deletingHistoryId !== null) {
            return;
        }

        setDeletingHistoryId(historyId);

        try {
            const success = await fetchDeleteModelOfflineDownloadHistoryRecord(
                historyId,
                dispatch
            );

            if (!success) {
                return;
            }

            setModelOfflineDownloadHistoryList((prevRows) =>
                prevRows.filter((row) => Number(row.id) !== Number(historyId))
            );

            const nextTotalItems = Math.max(0, historyTotalItems - 1);
            const nextTotalPages = Math.max(
                1,
                Math.ceil(nextTotalItems / historyItemsPerPage)
            );

            setHistoryTotalItems(nextTotalItems);
            setHistoryTotalPages(nextTotalPages);
            setHistoryStatusSummaryReloadToken((prev) => prev + 1);

            const rowsAfterDelete = modelOfflineDownloadHistoryList.filter(
                (row) => Number(row.id) !== Number(historyId)
            );

            if (rowsAfterDelete.length === 0 && historyPage > 1) {
                setHistoryPage(historyPage - 1);
            }
        } finally {
            setDeletingHistoryId(null);
        }
    }, [
        deletingHistoryId,
        dispatch,
        historyTotalItems,
        historyItemsPerPage,
        historyPage,
        modelOfflineDownloadHistoryList,
    ]);

    const handleOpenDownloadPath = useCallback(async (downloadPath: string) => {
        const trimmed = (downloadPath || '').trim();

        if (!trimmed) {
            alert('Download path is empty.');
            return;
        }

        await fetchOpenModelDownloadDirectory(trimmed, dispatch);
    }, [dispatch]);

    // ESC to close
    useEffect(() => {
        if (!leftOverlayEntry) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLeftOverlay(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [leftOverlayEntry, closeLeftOverlay]);

    const cartEntries = useMemo(() => {
        return Object.values(cartEntryByVid);
    }, [cartEntryByVid]);

    const cartCount = cartEntries.length;

    const visibleEntries = React.useMemo(() => {
        switch (displayMode) {
            case "cartCard":
                return cartEntries;
            case "failedCard":
                return failedEntries;
            case "recentCard":
                return recentlyDownloaded;
            case "holdCard":
                return holdEntries;
            case "earlyAccessCard":
                return earlyAccessEntries;
            case "errorCard":
                return errorEntries;
            case "aiCard":
                return aiEntries;
            default:
                return filteredDownloadList;
        }
    }, [
        displayMode,
        cartEntries,
        failedEntries,
        recentlyDownloaded,
        holdEntries,
        earlyAccessEntries,
        errorEntries,
        aiEntries,
        filteredDownloadList,
    ]);


    // **2. Compute Select All Checkbox State**
    const visibleSelectedCount = React.useMemo(() => {
        return visibleEntries.reduce((count, entry) => {
            const versionId = String(entry.civitaiVersionID ?? "").trim();
            return versionId && selectedIds.has(versionId) ? count + 1 : count;
        }, 0);
    }, [visibleEntries, selectedIds]);

    const isAllSelected =
        canUseSelectAll &&
        visibleEntries.length > 0 &&
        visibleEntries.every((e) =>
            selectedIds.has(String(e.civitaiVersionID ?? "").trim())
        );

    const isIndeterminate =
        canUseSelectAll &&
        visibleEntries.some((e) =>
            selectedIds.has(String(e.civitaiVersionID ?? "").trim())
        ) &&
        !isAllSelected;

    const currentTheme = React.useMemo(
        () => (isDarkMode ? darkTheme : lightTheme),
        [isDarkMode]
    );

    const styles = React.useMemo(
        () => makeOfflineWindowStyles({ isDarkMode, currentTheme, leftOverlayEntry }),
        [isDarkMode, currentTheme, leftOverlayEntry]
    );


    const badgeCount = (n: number) => (String(n));

    // Function to toggle selection
    const toggleSelect = useCallback((entryOrId: OfflineDownloadEntry | string) => {
        if (!canChangeSelection) return;

        const entry =
            typeof entryOrId === "string"
                ? visibleEntries.find((e) => String(e.civitaiVersionID) === String(entryOrId))
                : entryOrId;

        const versionId =
            typeof entryOrId === "string"
                ? String(entryOrId).trim()
                : String(entryOrId.civitaiVersionID ?? "").trim();

        if (!versionId) return;

        setSelectedIds((prev) => {
            const next = new Set(prev);
            const alreadySelected = next.has(versionId);

            if (alreadySelected) {
                next.delete(versionId);

                if (canCurrentModeWriteCart) {
                    setCartEntryByVid((prevCart) => {
                        const nextCart = { ...prevCart };
                        delete nextCart[cartEntryKey(versionId)];
                        return nextCart;
                    });

                    setCartDownloadStatusByVid((prevStatus) => {
                        const nextStatus = { ...prevStatus };
                        delete nextStatus[versionId];
                        return nextStatus;
                    });
                }
            } else {
                next.add(versionId);

                if (canCurrentModeWriteCart && entry) {
                    setCartEntryByVid((prevCart) => ({
                        ...prevCart,
                        [cartEntryKey(versionId)]: entry,
                    }));

                    setCartDownloadStatusByVid((prevStatus) => {
                        const nextStatus = { ...prevStatus };
                        delete nextStatus[versionId];
                        return nextStatus;
                    });
                }
            }

            return next;
        });
    }, [
        canChangeSelection,
        visibleEntries,
        cartEntryKey,
        canCurrentModeWriteCart,
    ]);

    const handleRefreshList = async () => {
        if (isLoading) return;

        if (
            displayMode === "holdCard" ||
            displayMode === "earlyAccessCard" ||
            displayMode === "errorCard"
        ) {
            setSpecialReloadToken((t) => t + 1);
            return;
        }

        if (displayMode === "historyTable") {
            setHistoryReloadToken((t) => t + 1);
            return;
        }

        if (displayMode === "recentCard") {
            setRecentlyDownloaded(prev => [...prev]);
            return;
        }

        if (displayMode === "failedCard") {
            setFailedEntries(prev => [...prev]);
            return;
        }

        if (displayMode === "aiCard") {
            setAiReloadToken((t) => t + 1);
            return;
        }

        try {
            setIsLoading(true);
            const p = await fetchPageWithApplied(currentPage);
            applyPagedResultToState(p);

            try {
                await fetchExcludedTags();
            } catch (error: any) {
                console.error("Failed to refresh pending remove tag list:", error.message);
            }
        } catch (error: any) {
            console.error("Failed to refresh the download list:", error.message);
            alert("Failed to refresh the download list. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    // Refresh helper: re-fetch the current page from the server
    const refreshCurrentPage = async () => {
        try {
            const p = await fetchPageWithApplied(currentPage);
            applyPagedResultToState(p);
        } catch (error: any) {
            console.error("Failed to fetch updated download list:", error.message);
            setOfflineDownloadList([]);
            setServerTotalItems(0);
            setServerTotalPages(1);
            clearCartSelection();
        }
    };

    // Function to handle "Download Now" button click
    const handleDownloadNow = async () => {
        console.log("Download Now button clicked");

        if (!canUseDownloadNow) {
            alert(`Download Now is disabled in this mode: ${displayMode}`);
            return;
        }

        if (displayMode !== "cartCard") {
            alert("Please open Cart Mode to download selected models.");
            return;
        }

        if (cartCount === 0) {
            alert("Your cart is empty.");
            return;
        }

        const userConfirmed = window.confirm(
            `Are you sure you want to download ${cartCount} cart entr${cartCount === 1 ? "y" : "ies"}?`
        );

        if (!userConfirmed) {
            console.log("User canceled the download operation.");
            return;
        }

        // Collect selected entries from the filtered list
        const entriesToDownload = cartEntries.filter((entry) => {
            const isEarly = isEarlyAccessActive(entry);

            const downloadFilePath = entry.downloadFilePath ?? "";

            const isPendingPath =
                downloadFilePath === "/@scan@/ACG/Pending" ||
                downloadFilePath === "/@scan@/ACG/Pending/";

            const shouldExclude = (!allowTryEarlyAccess && isEarly) || isPendingPath;

            return !shouldExclude;
        });

        if (entriesToDownload.length === 0) {
            alert(
                allowTryEarlyAccess
                    ? "No valid entries to download. They may be pointing to /@scan@/ACG/Pending."
                    : "No valid entries to download. Either they're Early Access or pointing to /@scan@/ACG/Pending."
            );
            return;
        }

        setCartDownloadStatusByVid((prevStatus) => {
            const nextStatus = { ...prevStatus };

            entriesToDownload.forEach((entry) => {
                const versionId = String(entry.civitaiVersionID ?? "").trim();
                if (!versionId) return;

                nextStatus[versionId] = "queued";
            });

            return nextStatus;
        });


        setDownloadProgress({ completed: 0, total: entriesToDownload.length });
        setFailedEntries([]);
        // setCompletedCount(0);
        setIsCancelled(false);

        const handleEachDownloadStart = (entry: OfflineDownloadEntry) => {
            const versionId = String(entry.civitaiVersionID ?? "").trim();
            if (!versionId) return;

            setCartDownloadStatusByVid((prevStatus) => ({
                ...prevStatus,
                [versionId]: "downloading",
            }));
        };

        // Called after each file completes
        const handleEachDownloadComplete = async (
            success: boolean,
            entry: OfflineDownloadEntry
        ) => {
            const versionId = String(entry.civitaiVersionID ?? "").trim();

            if (versionId) {
                setCartDownloadStatusByVid((prevStatus) => ({
                    ...prevStatus,
                    [versionId]: success ? "success" : "fail",
                }));
            }

            if (!success) {
                setFailedEntries(prev => {
                    const key = `${entry.civitaiModelID}|${entry.civitaiVersionID}`;

                    const dedup = prev.filter(
                        e => `${e.civitaiModelID}|${e.civitaiVersionID}` !== key
                    );

                    return [
                        {
                            ...entry,
                            isError: true,
                            errorMessage: entry.errorMessage || "Download failed",
                            errorAt: entry.errorAt || new Date().toISOString(),
                        },
                        ...dedup,
                    ];
                });
            }

            setDownloadProgress(prev => ({
                completed: prev.completed + 1,
                total: prev.total,
            }));

            await refreshCurrentPage();
        };

        try {
            setIsLoading(true);
            setUiMode('downloading');

            await downloadSelectedEntries(
                entriesToDownload,
                dispatch,
                handleEachDownloadComplete,
                isPausedRef,
                isCancelledRef,
                handleEachDownloadStart
            );
        } catch (error: any) {
            console.error("Download failed:", error.message);
        } finally {
            setIsLoading(false);
            setUiMode('idle');
        }
    };

    // Helper function to chunk an array into smaller arrays (batches)
    function chunkArray<T>(arr: T[], size: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    }

    const buildOtherTagCounts = React.useCallback((
        data: OfflineDownloadEntry[],
        excluded: string[]
    ): TagCountDTO[] => {
        const freq = new Map<string, number>();
        const split = (s: string) => s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

        for (const entry of data) {
            const potential: string[] = [];
            if (entry.civitaiFileName) potential.push(...split(entry.civitaiFileName));
            if (entry.modelVersionObject?.name) potential.push(...split(entry.modelVersionObject.name));
            if (entry.modelVersionObject?.model?.name) potential.push(...split(entry.modelVersionObject.model.name));
            if (Array.isArray(entry.civitaiTags)) potential.push(...entry.civitaiTags);

            for (const raw of potential) {
                const tag = raw.toLowerCase();
                if (excluded.includes(tag)) continue;
                if (tag.length < 3) continue;
                if (/^\d+$/.test(tag)) continue;
                freq.set(tag, (freq.get(tag) || 0) + 1);
            }
        }

        return [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => ({ tag, count }));
    }, []);

    const clientOtherTags = React.useMemo(
        () => buildOtherTagCounts(filteredDownloadList, excludedTags.map(s => s.toLowerCase())),
        [filteredDownloadList, excludedTags, buildOtherTagCounts]
    );

    const handleErrorCardDownload = React.useCallback(
        async (entry: any, method: DownloadMethod) => {
            const modelID = entry.civitaiModelID;
            const versionID = entry.civitaiVersionID;

            console.log(`ErrorCard download clicked. modelID=${modelID}, versionID=${versionID}, method=${method}`);

            const civitaiUrl = `https://civitai.red/models/${modelID}?modelVersionId=${versionID}`;

            let modelVersionObject = (entry as any).modelVersionObject;
            if (!modelVersionObject) {
                modelVersionObject = await fetchCivitaiModelInfoFromCivitaiByVersionID(
                    String(versionID),
                    dispatch
                );
            }

            if (!modelVersionObject) {
                alert("Failed to load model information for this error entry.");
                return;
            }

            const civitaiFileName =
                modelVersionObject?.files?.find(
                    (file: any) =>
                        typeof file.name === "string" &&
                        file.name.toLowerCase().endsWith(".safetensors")
                )?.name || "";

            const civitaiModelFileList =
                modelVersionObject?.files?.map((file: any) => ({
                    name: file.name,
                    downloadUrl: file.downloadUrl,
                })) || [];

            const offlinePath =
                entry.downloadFilePath && entry.downloadFilePath !== "N/A"
                    ? entry.downloadFilePath
                    : "";

            const downloadFilePath = offlinePath || modify_downloadFilePath;

            if (downloadFilePath === "/@scan@/ACG/Pending/") {
                alert("Invalid download path: Pending entries cannot be downloaded");
                return;
            }

            if (
                !civitaiUrl ||
                !civitaiFileName ||
                !downloadFilePath ||
                !civitaiModelFileList.length
            ) {
                alert("Some required data is missing. Please check the model information and try again.");
                return;
            }

            const civitaiModelID = modelID;
            const civitaiVersionID = versionID;

            const modelObject = {
                downloadFilePath,
                civitaiFileName,
                civitaiModelID,
                civitaiVersionID,
                civitaiModelFileList,
                civitaiUrl,
            };

            const updateErrorEntryLocal = (errorMessage: string) => {
                setErrorEntries(prev =>
                    prev.map(e =>
                        String(e.civitaiModelID) === String(civitaiModelID) &&
                            String(e.civitaiVersionID) === String(civitaiVersionID)
                            ? {
                                ...e,
                                isError: true,
                                errorMessage,
                                errorAt: new Date().toISOString(),
                            }
                            : e
                    )
                );
            };

            try {
                if (method === "server") {
                    const downloadResult = await fetchDownloadFilesByServer_v2(
                        {
                            civitaiUrl,
                            civitaiFileName,
                            civitaiModelID,
                            civitaiVersionID,
                            downloadFilePath,
                            civitaiModelFileList,
                        },
                        dispatch
                    );

                    if (downloadResult.success) {
                        const isAddRecordSuccessful = await fetchAddRecordToDatabase(
                            modify_selectedCategory,
                            civitaiUrl,
                            downloadFilePath,
                            dispatch
                        );

                        if (isAddRecordSuccessful) {
                            await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                                {
                                    civitaiModelID,
                                    civitaiVersionID,
                                },
                                dispatch
                            );

                            setErrorEntries(prev =>
                                prev.filter(e =>
                                    !(
                                        String(e.civitaiModelID) === String(civitaiModelID) &&
                                        String(e.civitaiVersionID) === String(civitaiVersionID)
                                    )
                                )
                            );

                            bookmarkThisUrl(
                                modelVersionObject?.model?.type ?? "N/A",
                                civitaiUrl,
                                `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                            );
                        } else {
                            const errorMessage =
                                `Add record failed for ${civitaiModelID}_${civitaiVersionID}`;

                            await fetchBulkPatchOfflineDownloadList(
                                [{ civitaiModelID, civitaiVersionID }],
                                {
                                    isError: true,
                                    errorMessage,
                                } as any,
                                dispatch
                            );

                            updateErrorEntryLocal(errorMessage);
                        }
                    } else {
                        const errorMessage = downloadResult.message || "Download failed";

                        await fetchBulkPatchOfflineDownloadList(
                            [{ civitaiModelID, civitaiVersionID }],
                            {
                                isError: true,
                                errorMessage,
                            } as any,
                            dispatch
                        );

                        updateErrorEntryLocal(errorMessage);
                    }
                } else {
                    const data = modelVersionObject;

                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.runtime.sendMessage({
                            action: "browser-download_v2_background",
                            data: { ...modelObject, modelVersionObject: data },
                        });
                    });

                    const isAddRecordSuccessful = await fetchAddRecordToDatabase(
                        modify_selectedCategory,
                        civitaiUrl,
                        downloadFilePath,
                        dispatch
                    );

                    if (isAddRecordSuccessful) {
                        await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                            {
                                civitaiModelID,
                                civitaiVersionID,
                            },
                            dispatch
                        );

                        setErrorEntries(prev =>
                            prev.filter(e =>
                                !(
                                    String(e.civitaiModelID) === String(civitaiModelID) &&
                                    String(e.civitaiVersionID) === String(civitaiVersionID)
                                )
                            )
                        );

                        bookmarkThisUrl(
                            modelVersionObject?.model?.type ?? "N/A",
                            civitaiUrl,
                            `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                        );
                    } else {
                        const errorMessage =
                            `Add record failed for ${civitaiModelID}_${civitaiVersionID}`;

                        await fetchBulkPatchOfflineDownloadList(
                            [{ civitaiModelID, civitaiVersionID }],
                            {
                                isError: true,
                                errorMessage,
                            } as any,
                            dispatch
                        );

                        updateErrorEntryLocal(errorMessage);
                    }
                }

                console.log("ErrorCard model download handled.");
            } catch (error: any) {
                const errorMessage =
                    error?.response?.data?.message ||
                    error?.message ||
                    "Failed to initiate download.";

                await fetchBulkPatchOfflineDownloadList(
                    [{ civitaiModelID, civitaiVersionID }],
                    {
                        isError: true,
                        errorMessage,
                    } as any,
                    dispatch
                );

                updateErrorEntryLocal(errorMessage);

                console.error("Error during ErrorCard download:", error);
                alert(errorMessage);
            }
        },
        [dispatch, modify_downloadFilePath, modify_selectedCategory]
    );

    const normalizePrefix = (p: string) => {
        const s = (p || "").trim().replace(/\\/g, "/").toLowerCase();
        return s.endsWith("/") ? s : s + "/";
    };

    const buildExcludedPrefixes = (
        allPrefixes: string[],
        selected: Set<string>
    ): string[] => {
        const selectedArr = Array.from(selected).map(normalizePrefix);

        return allPrefixes
            .filter(p => !selected.has(p))
            .filter(unchecked => {
                const uncheckedNorm = normalizePrefix(unchecked);

                // Do NOT exclude this unchecked prefix if it is a parent
                // of any selected child.
                const isAncestorOfSelectedChild = selectedArr.some(sel =>
                    sel.startsWith(uncheckedNorm) && sel !== uncheckedNorm
                );

                return !isAncestorOfSelectedChild;
            });
    };

    /**
 * Download selected entries in batches of 10.
 * Wait for all entries in one batch to finish before moving to the next batch.
 */
    const downloadSelectedEntries = async (
        entriesToDownload: OfflineDownloadEntry[],
        dispatch: any,
        onDownloadComplete: (success: boolean, entry: OfflineDownloadEntry) => void,
        isPausedRef: React.MutableRefObject<boolean>,
        isCancelledRef: React.MutableRefObject<boolean>,
        onDownloadStart?: (entry: OfflineDownloadEntry) => void
    ) => {
        const CONCURRENCY_LIMIT = 5;
        const BATCH_SIZE = 10;
        const semaphore = new Semaphore(CONCURRENCY_LIMIT);

        const batches = chunkArray(entriesToDownload, BATCH_SIZE);

        let batchIndex = 0;

        for (const batch of batches) {
            if (isCancelledRef.current) {
                console.log("Download process cancelled before batch:", batchIndex);
                break;
            }

            const start = batchIndex * BATCH_SIZE + 1;
            const end = Math.min((batchIndex + 1) * BATCH_SIZE, entriesToDownload.length);

            setCurrentBatchRange(
                `Now processing ${start} ~ ${end}, please wait until processing next ${BATCH_SIZE}.`
            );

            console.log(`Processing batch #${batchIndex + 1} (size: ${batch.length})`);

            const tasks: Promise<void>[] = [];

            for (const entry of batch) {
                while (isPausedRef.current) {
                    console.log("Download paused. Waiting to resume...");
                    await sleep(500);

                    if (isCancelledRef.current) {
                        console.log("Download cancelled during pause.");
                        break;
                    }
                }

                if (isCancelledRef.current) break;

                const delayMilliseconds = 5000 + Math.random() * 10000;
                const delaySeconds = Math.ceil(delayMilliseconds / 1000);

                setInitiationDelay(delaySeconds);
                console.log(`Waiting ${delaySeconds}s before starting ${entry.civitaiFileName}...`);
                await sleep(delayMilliseconds);
                setInitiationDelay(null);

                const task = semaphore.acquire(async () => {
                    onDownloadStart?.(entry);

                    let success = true;
                    let completedEntry: OfflineDownloadEntry = entry;

                    try {
                        const {
                            civitaiUrl,
                            civitaiFileName,
                            civitaiModelID,
                            civitaiVersionID,
                            downloadFilePath,
                            civitaiModelFileList,
                            selectedCategory,
                            modelVersionObject,
                        } = entry;

                        const downloadResult = await fetchDownloadFilesByServer_v2(
                            {
                                civitaiUrl,
                                civitaiFileName,
                                civitaiModelID,
                                civitaiVersionID,
                                downloadFilePath,
                                civitaiModelFileList,
                            },
                            dispatch
                        );

                        if (downloadResult.success) {
                            let isAddRecordSuccessful = true;

                            if (!entry.downloadFilePath.includes("/@scan@/Update/")) {
                                isAddRecordSuccessful = await fetchAddRecordToDatabase(
                                    selectedCategory,
                                    civitaiUrl,
                                    downloadFilePath,
                                    dispatch
                                );
                            }

                            if (!isAddRecordSuccessful) {
                                success = false;

                                const errorMessage =
                                    `Add record failed for ${civitaiModelID}_${civitaiVersionID}`;

                                completedEntry = {
                                    ...entry,
                                    isError: true,
                                    errorMessage,
                                    errorAt: new Date().toISOString(),
                                };

                                await fetchBulkPatchOfflineDownloadList(
                                    [{ civitaiModelID, civitaiVersionID }],
                                    {
                                        isError: true,
                                        errorMessage,
                                    } as any,
                                    dispatch
                                );

                                console.error(errorMessage);
                                return;
                            }

                            await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                                {
                                    civitaiModelID,
                                    civitaiVersionID,
                                },
                                dispatch
                            );

                            setRecentlyDownloaded(prev => {
                                const key = `${entry.civitaiModelID}|${entry.civitaiVersionID}`;
                                const dedup = prev.filter(
                                    e => `${e.civitaiModelID}|${e.civitaiVersionID}` !== key
                                );

                                const snap = JSON.parse(JSON.stringify(entry));
                                return [snap, ...dedup];
                            });

                            bookmarkThisUrl(
                                modelVersionObject?.model?.type ?? "N/A",
                                civitaiUrl,
                                `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                            );
                        } else {
                            success = false;

                            completedEntry = {
                                ...entry,
                                isError: true,
                                errorMessage: downloadResult.message || "Download failed",
                                errorAt: new Date().toISOString(),
                            };
                        }
                    } catch (err: any) {
                        console.error("Download failed for", entry.civitaiFileName, err);

                        success = false;

                        const errorMessage =
                            err?.response?.data?.message ||
                            err?.message ||
                            "Download failed";

                        completedEntry = {
                            ...entry,
                            isError: true,
                            errorMessage,
                            errorAt: new Date().toISOString(),
                        };
                    } finally {
                        onDownloadComplete(success, completedEntry);
                    }
                });

                tasks.push(task);

                if (isCancelledRef.current) {
                    console.log("Download cancelled after initiating some tasks in batch.");
                    break;
                }
            }

            await Promise.allSettled(tasks);

            console.log(`Batch #${batchIndex + 1} completed.`);

            if (isCancelledRef.current) {
                console.log("Download process cancelled after completing a batch.");
                break;
            }

            const isLastBatch = batchIndex >= batches.length - 1;

            if (!isLastBatch) {
                console.log("Starting 60-second cooldown before next batch...");
                setBatchCooldown(60);
                await sleep(60000);
                setBatchCooldown(null);
            }

            batchIndex++;
        }

        while ((semaphore as any).activeCount > 0) {
            await sleep(500);
        }

        console.log("All batches processed or cancelled.");

        setCurrentBatchRange(null);
        setBatchCooldown(null);
        setInitiationDelay(null);

        try {
            const p = await fetchPageWithApplied(currentPage);
            applyPagedResultToState(p);
        } catch (error: any) {
            console.error("Failed to refresh page after download:", error?.message || error);
        } finally {
            clearCartSelection();
        }
    };

    const handleApplySelectedAiPathsToDownloadFilePath = async () => {
        // selectedIds contains civitaiVersionID keys in your app :contentReference[oaicite:6]{index=6}
        const sourceEntries = displayMode === "aiCard" ? aiEntries : filteredDownloadList;

        const selectedEntries = sourceEntries.filter((e) =>
            selectedIds.has(String(e.civitaiVersionID ?? "").trim())
        );

        // Build payload:
        // - pick user's clicked path first (selectedSuggestedPathByVid)
        // - else default to top suggestion from mergeSuggestedPathsForEntry()
        // - skip null/empty/"UNKNOWN"
        const items = selectedEntries
            .map((entry) => {
                const vidKey = entry.civitaiVersionID;

                const suggestedPaths = mergeSuggestedPathsForEntry(entry); // :contentReference[oaicite:7]{index=7}
                const picked = (selectedSuggestedPathByVid[vidKey] || "").trim(); // :contentReference[oaicite:8]{index=8}
                const top = (suggestedPaths[0] || "").trim();

                const selectedPath = (picked || top).trim();

                if (!selectedPath) return null;
                if (selectedPath.toUpperCase() === "UNKNOWN") return null;

                return {
                    civitaiModelID: entry.civitaiModelID,
                    civitaiVersionID: entry.civitaiVersionID,
                    selectedPath,
                };
            })
            .filter(Boolean) as { civitaiModelID: string; civitaiVersionID: string; selectedPath: string }[];

        if (!items.length) {
            dispatch(
                setError({
                    hasError: true,
                    errorMessage:
                        "No valid selectedPath to apply. (Empty / null / UNKNOWN were skipped.)",
                })
            );
            return;
        }

        const ok = window.confirm(
            `Apply selectedPath to downloadFilePath for ${items.length} selected entr${items.length === 1 ? "y" : "ies"}?`
        );
        if (!ok) return;

        setIsBulkUpdatingDownloadPaths(true);
        setUiMode("modifying");

        try {
            const resp = await fetchBulkUpdateDownloadFilePath(items, dispatch);

            if (displayMode === "aiCard") {
                setAiReloadToken((t) => t + 1);
            } else {
                await refreshCurrentPage();
            }

            // optional: show some feedback in your existing AI msg line
            const updatedPairs = resp?.updatedPairs ?? resp?.savedEntities ?? null;
            setAiSuggestRunMsg(
                updatedPairs !== null
                    ? `Applied downloadFilePath for ${updatedPairs} item(s).`
                    : "Applied downloadFilePath."
            );
        } catch (err: any) {
            dispatch(
                setError({
                    hasError: true,
                    errorMessage: `Bulk update downloadFilePath failed: ${err?.response?.data?.message || err?.message || "Unknown error"
                        }`,
                })
            );
        } finally {
            setIsBulkUpdatingDownloadPaths(false);
            setUiMode("idle");
        }
    };

    const getSortToggleStyle = (active: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontWeight: 600,
        borderWidth: active ? 2 : 1,
        borderStyle: 'solid',
        borderColor: active
            ? (isDarkMode ? '#66b2ff' : '#0d6efd')
            : (isDarkMode ? '#777' : '#ccc'),
        backgroundColor: active
            ? (isDarkMode ? '#0d3b66' : '#e7f1ff')
            : (isDarkMode ? '#2b2b2b' : '#fff'),
        color: active
            ? (isDarkMode ? '#fff' : '#0b3d91')
            : (isDarkMode ? '#fff' : '#000'),
        boxShadow: active
            ? (isDarkMode
                ? '0 0 0 1px rgba(102,178,255,0.35)'
                : '0 0 0 1px rgba(13,110,253,0.2)')
            : 'none',
    });

    const fetchPageWithApplied = React.useCallback(
        async (page1Based?: number) => {
            const page0 = Math.max(0, (page1Based ?? currentPage) - 1);
            const prefixes = getActivePrefixes(); // <-- your refactored one uses appliedQuery
            const excludedPrefixes = getActiveExcludedPrefixes();

            const status: StatusFilter = deriveStatus(appliedQuery.showPending, appliedQuery.showNonPending);

            return await fetchOfflineDownloadListPage(
                dispatch,
                page0,
                itemsPerPage,
            /* filterEmptyBaseModel */ false,
                prefixes,
                excludedPrefixes,
                appliedQuery.filterText.trim(),
                appliedQuery.filterCondition as any,
                status,
                appliedQuery.showHoldEntries,
                appliedQuery.showEarlyAccess,
                appliedQuery.sortBy as any,
                appliedQuery.sortDir as any,
                appliedQuery.showErrorEntries,
                appliedQuery.aiSuggestedOnly
            );
        },
        [dispatch, currentPage, itemsPerPage, appliedQuery, getActivePrefixes, getActiveExcludedPrefixes]
    );

    const applyPagedResultToState = (p: any) => {
        setOfflineDownloadList(Array.isArray(p?.content) ? p.content : []);
        setServerTotalItems(p?.totalElements ?? 0);
        setServerTotalPages(p?.totalPages ?? 1);
    };

    // ---- Early Access helpers ----
    function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

    function formatLocalDateTime(isoOrDate: string | Date): string {
        const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
        if (Number.isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    }

    function getEarlyAccessEndsAt(entry: OfflineDownloadEntry): Date | null {
        const s = entry.earlyAccessEndsAt?.trim();
        if (!s) return null;

        // Has timezone info -> safe to let Date parse it
        if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
            const d = new Date(s);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        // No timezone info -> FORCE UTC parsing
        // Supports "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD HH:mm:ss" and optional .fraction
        const m = s.match(
            /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/
        );
        if (!m) return null;

        const [, y, mo, d, h, mi, se, frac] = m;

        // take first 3 digits as milliseconds
        const ms = frac ? Number(frac.padEnd(3, "0").slice(0, 3)) : 0;

        const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se, ms));
        return Number.isNaN(dt.getTime()) ? null : dt;
    }

    function isEarlyAccessActive(entry: OfflineDownloadEntry): boolean {
        const ends = getEarlyAccessEndsAt(entry);
        return !!ends && ends.getTime() > Date.now();
    }


    /** Label for grids/cards:
     *  - future endsAt  -> "YYYY-MM-DD HH:MM:SS"
     *  - no endsAt but EarlyAccess -> "Early Access Only"
     *  - otherwise -> "Public"
     */
    function earlyAccessLabel(entry: OfflineDownloadEntry): string {
        if (!isEarlyAccessActive(entry)) return 'Public';
        const ends = getEarlyAccessEndsAt(entry);
        return ends ? formatLocalDateTime(ends) : 'Early Access Only';
    }

    function isEntryEarlyAccess(entry: OfflineDownloadEntry): boolean {
        return isEarlyAccessActive(entry);
    };

    const [eaRefreshProgress, setEaRefreshProgress] = useState({
        running: false,
        completed: 0,
        total: 0,
        msg: "",
    });

    const handleRefreshSelectedEarlyAccess = async () => {
        if (isLoading) return;
        if (displayMode !== "earlyAccessCard") return;

        const selected = earlyAccessEntries.filter((e) =>
            selectedIds.has(String(e.civitaiVersionID ?? "").trim())
        );

        const targets = selected.filter(
            (e) => !eaRefreshedVidSetRef.current.has(e.civitaiVersionID)
        );

        if (!selected.length) {
            alert("No Early Access entries selected.");
            return;
        }

        if (!targets.length) {
            alert("All selected entries have already been refreshed (in this Early Access session).");
            return;
        }

        setIsLoading(true);
        setUiMode("modifying");
        setEaRefreshProgress({ running: true, completed: 0, total: targets.length, msg: "" });

        try {
            const refreshedVidSet = new Set<string>();

            for (let i = 0; i < targets.length; i++) {
                const entry = targets[i];

                if (i > 0) await sleep(1000);

                await fetchRefreshOfflineDownloadRecord(
                    {
                        civitaiModelID: entry.civitaiModelID,
                        civitaiVersionID: entry.civitaiVersionID,
                    },
                    dispatch
                );

                eaRefreshedVidSetRef.current.add(entry.civitaiVersionID);
                refreshedVidSet.add(entry.civitaiVersionID);

                setEaRefreshProgress((p) => ({
                    ...p,
                    completed: i + 1,
                    msg: `Refreshed ${i + 1}/${targets.length}`,
                }));
            }

            // reload actual Early Access list from server
            const payload = await fetchOfflineDownloadListEarlyAccessActive(dispatch);
            setEarlyAccessEntries(Array.isArray(payload) ? payload as OfflineDownloadEntry[] : []);

            // deselect refreshed ones
            setSelectedIds((prev) => {
                const next = new Set(prev);
                refreshedVidSet.forEach((vid) => next.delete(vid));
                return next;
            });

        } catch (err: any) {
            setEaRefreshProgress((p) => ({
                ...p,
                msg: `Failed: ${err?.message || "Unknown error"}`,
            }));
        } finally {
            setEaRefreshProgress((p) => ({ ...p, running: false }));
            setIsLoading(false);
            setUiMode("idle");
        }
    };

    const isAiBusy = aiSuggestRunStatus === "running";
    const isDownloadBusyOrCooldown = uiMode === "downloading";

    const isModeButtonDisabled = (mode: DisplayMode) => {
        // lock all mode buttons while AI run/cooldown is active
        if (isAiBusy) {
            return true;
        }

        // lock everything during refresh / modify / remove
        if (uiMode === "paging" || uiMode === "modifying" || uiMode === "removing") {
            return true;
        }

        // during downloading, only allow paged modes
        if (isDownloadBusyOrCooldown && !canSwitchModeWhileDownloading(mode)) {
            return true;
        }

        return false;
    };
    const handleSelectNextN_EarlyAccess = () => {
        if (!canChangeSelection) return;
        if (displayMode !== "earlyAccessCard") return;

        const nRaw = Number(selectCount) || 0;
        const n = Math.max(5, Math.floor(nRaw / 5) * 5); // keep it in 5s

        // Only depends on "refreshed set", not current selection
        const remaining = earlyAccessEntries.filter((e) => {
            const vid = e.civitaiVersionID;
            return vid && !eaRefreshedVidSetRef.current.has(vid);
        });

        const firstN = remaining.slice(0, n);

        if (!firstN.length) {
            alert("No more unrefreshed Early Access entries to select.");
            return;
        }

        // Early Access selection should not write into cart.
        replaceSelectionOnly(firstN);
    };

    useEffect(() => {
        if (!leftOverlayEntry) return;

        const onDocClick = (ev: MouseEvent) => {
            const leftEl = leftPanelRef.current;
            // ignore clicks inside the left panel (overlay/backdrop already handle their own close)
            if (leftEl && leftEl.contains(ev.target as Node)) return;
            closeLeftOverlay();
        };

        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, [leftOverlayEntry, closeLeftOverlay]);

    useEffect(() => {
        if (!leftOverlayEntry) return;

        leftOverlayDrawerRef.current?.scrollTo({
            top: 0,
            behavior: 'auto',
        });
    }, [leftOverlayEntry]);

    const toImgUrls = (arr: OfflineDownloadEntry["imageUrlsArray"]) =>
        (Array.isArray(arr) ? arr : [])
            .map((x: any) => (typeof x === "string" ? x : x?.url))
            .filter(Boolean);

    const handleCreateAddDummyFromError = async (entry: OfflineDownloadEntry) => {
        const vid = entry?.civitaiVersionID;
        if (!vid) return;

        // prevent double-click spam
        if (dummyCreateStatusByVid[vid]?.running) return;

        const setStatus = (patch: any) =>
            setDummyCreateStatusByVid((prev) => ({
                ...prev,
                [vid]: {
                    ...(prev[vid] || { phase: "idle", text: "" }),
                    ...patch,
                },
            }));

        const completedDownloadFileName = [
            entry.civitaiModelID ?? "",
            entry.civitaiVersionID ?? "",
            entry.civitaiBaseModel || entry.modelVersionObject?.baseModel || "",
            entry.civitaiFileName || "",
        ].join("_");

        try {
            setStatus({
                phase: "downloading",
                text: "Downloading (custom)...",
                running: true,
                msg: "",
                completedDownloadPath: "",
                completedDownloadFileName: "",
            });

            const downloadOk = await fetchDownloadFilesByServer_v2ForCustom({
                downloadFilePath: entry.downloadFilePath,
                civitaiFileName: entry.civitaiFileName,
                civitaiModelID: entry.civitaiModelID,
                civitaiVersionID: entry.civitaiVersionID,
                civitaiUrl: entry.civitaiUrl,
                baseModel: entry.civitaiBaseModel || entry.modelVersionObject?.baseModel || "",
                downloadUrl: DUMMY_DOWNLOAD_URL,
                imageUrls: toImgUrls(entry.imageUrlsArray),
                modelVersionObject: entry.modelVersionObject ?? null, // add this
            });

            if (!downloadOk) {
                setStatus({
                    phase: "fail",
                    text: "Download failed (custom).",
                    running: false,
                    completedDownloadPath: "",
                    completedDownloadFileName: "",
                });
                return;
            }

            setStatus({
                phase: "inserting",
                text: "Download OK !  Inserting DB...",
                running: true,
                completedDownloadPath: "",
                completedDownloadFileName: "",
            });

            const dto: any = {
                name: entry.civitaiFileName || "",
                mainModelName: entry.modelVersionObject?.model?.name || "",
                url: entry.civitaiUrl || "",
                category: entry.selectedCategory || "",
                versionNumber: entry.civitaiVersionID || "",
                modelNumber: entry.civitaiModelID || "",
                type: entry.modelVersionObject?.model?.type || "",
                baseModel: entry.civitaiBaseModel || entry.modelVersionObject?.baseModel || "",
                imageUrls: toImgUrls(entry.imageUrlsArray).map((u) => ({ url: u })),
                tags: Array.isArray(entry.civitaiTags) ? entry.civitaiTags : [],
                localTags: [],
                aliases: [],
                triggerWords: Array.isArray(entry.modelVersionObject?.trainedWords)
                    ? entry.modelVersionObject.trainedWords
                    : [],
                description: entry.modelVersionObject?.description || null,
                stats: entry.modelVersionObject?.stats
                    ? JSON.stringify(entry.modelVersionObject.stats)
                    : null,
                localPath: entry.downloadFilePath || "",
                uploaded: null,
                hash: null,
                usageTips: null,
                creatorName: entry.modelVersionObject?.creator?.username || null,
                nsfw: Boolean(entry.modelVersionObject?.model?.nsfw),
                flag: false,
                urlAccessable: true,
            };

            await fetchAddRecordToDatabaseInCustom(dto);

            setStatus({
                phase: "success",
                text: "Done ! (download + insert)",
                running: false,
                msg: "",
                completedDownloadPath: entry.downloadFilePath || "",
                completedDownloadFileName,
            });

            // Optional refresh if needed
            // setSpecialReloadToken((t) => t + 1);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Unknown error";
            setStatus({
                phase: "fail",
                text: "Failed.",
                msg,
                running: false,
                completedDownloadPath: "",
                completedDownloadFileName: "",
            });
        }
    };

    const handleRefreshOneRecord = async (entry: OfflineDownloadEntry) => {
        if (isLoading) return;

        const ok = window.confirm("Do you want to refresh/update this record?");
        if (!ok) return;

        setIsLoading(true);
        setUiMode("modifying");

        try {
            await fetchRefreshOfflineDownloadRecord(
                {
                    civitaiModelID: entry.civitaiModelID,
                    civitaiVersionID: entry.civitaiVersionID,
                },
                dispatch
            );

            // ✅ Refresh what the user is currently looking at
            if (displayMode === "holdCard" || displayMode === "earlyAccessCard" || displayMode === "errorCard") {
                setSpecialReloadToken((t) => t + 1); // triggers special-list reload effect
            } else {
                await refreshCurrentPage();          // re-fetch current server page
            }
        } catch (err: any) {
            console.error("Refresh record failed:", err?.message || err);
            // fetchRefreshOfflineDownloadRecord already dispatches setError, so this is optional:
            dispatch(setError({
                hasError: true,
                errorMessage: `Refresh record failed: ${err?.message || "Unknown error"}`
            }));
        } finally {
            setIsLoading(false);
            setUiMode("idle");
        }
    };

    const handleRefreshModelVersionObjectOneRecord = async (entry: OfflineDownloadEntry) => {
        if (isLoading) return;

        const ok = window.confirm("Do you want to refresh/update ModelVersionObject from Version API?");
        if (!ok) return;

        setIsLoading(true);
        setUiMode("modifying");

        try {
            await fetchRefreshModelVersionObjectFromOfflineTable(
                Number(entry.civitaiModelID),
                Number(entry.civitaiVersionID),
                dispatch
            );

            if (displayMode === "holdCard" || displayMode === "earlyAccessCard" || displayMode === "errorCard") {
                setSpecialReloadToken((t) => t + 1);
            } else {
                await refreshCurrentPage();
            }
        } catch (err: any) {
            console.error("Refresh modelVersionObject failed:", err?.message || err);
            dispatch(setError({
                hasError: true,
                errorMessage: `Refresh modelVersionObject failed: ${err?.message || "Unknown error"}`
            }));
        } finally {
            setIsLoading(false);
            setUiMode("idle");
        }
    };

    const handleDisplayModeClick = (mode: DisplayMode) => {
        const isAiBusy = aiSuggestRunStatus === "running";
        const isDownloadBusyOrCooldown = uiMode === "downloading";

        if (isAiBusy) {
            return;
        }

        if (uiMode === "paging" || uiMode === "modifying" || uiMode === "removing") {
            return;
        }

        if (isDownloadBusyOrCooldown && !canSwitchModeWhileDownloading(mode)) {
            alert("Can't switch to this mode while downloading or during download cooldown.");
            return;
        }

        if (displayMode === mode) {
            if (
                mode === "holdCard" ||
                mode === "earlyAccessCard" ||
                mode === "errorCard"
            ) {
                setSpecialReloadToken((t) => t + 1);
            } else if (mode === "historyTable") {
                setHistoryReloadToken((t) => t + 1);
            } else if (mode === "aiCard") {
                setAiReloadToken((t) => t + 1);
            } else {
                void handleRefreshList();
            }
        } else {
            setDisplayMode(mode);
        }
    };

    const handleRemoveSelected = async () => {
        const userConfirmed = window.confirm("Are you sure you want to remove the selected items?");
        if (!userConfirmed) {
            console.log("User canceled the removal operation.");
            return;
        }

        if (selectedIds.size === 0) {
            alert("No items selected to remove.");
            return;
        }

        setIsLoading(true);
        setUiMode('removing');
        try {
            // Use what the user is currently seeing (respects filters & server paging)
            const selectedEntries = visibleEntries.filter(entry =>
                selectedIds.has(String(entry.civitaiVersionID ?? "").trim())
            );
            for (const entry of selectedEntries) {
                await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                    {
                        civitaiModelID: entry.civitaiModelID,
                        civitaiVersionID: entry.civitaiVersionID,
                    },
                    dispatch
                );
            }

            // Refresh current page
            const page0 = Math.max(0, currentPage - 1);
            const prefixes = getActivePrefixes();
            const excludedPrefixes = getActiveExcludedPrefixes();
            const status: StatusFilter = deriveStatus(showPending, showNonPending);

            const p = await fetchPageWithApplied(currentPage);

            // If current page empty and there are items, move to last page
            const newTotalPages = Math.max(1, p?.totalPages || 1);
            if ((p?.content?.length ?? 0) === 0 && (p?.totalElements ?? 0) > 0 && currentPage > newTotalPages) {
                setCurrentPage(newTotalPages); // this will trigger fetch effect (or you can fetch again)
            } else {
                applyPagedResultToState(p);
            }
            clearCartSelection();

        } catch (error: any) {
            console.error("Failed to remove selected entries:", error.message);
        } finally {
            setIsLoading(false);
            setUiMode('idle');
        }
    };

    const handleRemoveOne = async (entry: OfflineDownloadEntry) => {
        if (!entry?.civitaiModelID || !entry?.civitaiVersionID) return;

        const ok = window.confirm(
            `Remove "${entry.modelVersionObject?.model?.name ?? entry.civitaiFileName}" from the list?`
        );
        if (!ok) return;

        const match = (e: OfflineDownloadEntry) =>
            e.civitaiModelID === entry.civitaiModelID &&
            e.civitaiVersionID === entry.civitaiVersionID;

        const snapshot = {
            offlineDownloadList,
            aiEntries,
            errorEntries,
            recentlyDownloaded,
            holdEntries,
            earlyAccessEntries,
            failedEntries,
        };

        setUiMode("removing");
        setIsLoading(true);

        // optimistic remove from every mode list
        removeEntryLocal(match);

        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.civitaiVersionID);
            return next;
        });

        try {
            await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                {
                    civitaiModelID: entry.civitaiModelID,
                    civitaiVersionID: entry.civitaiVersionID,
                },
                dispatch
            );

            // keep server-backed modes in sync
            if (
                displayMode === "holdCard" ||
                displayMode === "earlyAccessCard" ||
                displayMode === "errorCard"
            ) {
                setSpecialReloadToken((t) => t + 1);
            } else if (displayMode === "aiCard") {
                setAiReloadToken((t) => t + 1);
            } else if (
                displayMode === "table" ||
                displayMode === "bigCard" ||
                displayMode === "smallCard"
            ) {
                const p = await fetchPageWithApplied(currentPage);
                const newTotalPages = Math.max(1, p?.totalPages || 1);

                if (
                    (p?.content?.length ?? 0) === 0 &&
                    (p?.totalElements ?? 0) > 0 &&
                    currentPage > newTotalPages
                ) {
                    setCurrentPage(newTotalPages);
                } else {
                    applyPagedResultToState(p);
                }
            }

        } catch (err: any) {
            setOfflineDownloadList(snapshot.offlineDownloadList);
            setAiEntries(snapshot.aiEntries);
            setErrorEntries(snapshot.errorEntries);
            setRecentlyDownloaded(snapshot.recentlyDownloaded);
            setHoldEntries(snapshot.holdEntries);
            setEarlyAccessEntries(snapshot.earlyAccessEntries);
            setFailedEntries(snapshot.failedEntries);

            alert(`Failed to remove: ${err?.message || "Unknown error"}`);
        } finally {
            setIsLoading(false);
            setUiMode("idle");
        }
    };

    const handleSelectFirstN = () => {
        if (!canUseSelectFirstNormal) return;

        const failedIds = new Set(
            failedEntries.map(e => `${e.civitaiVersionID}|${e.civitaiModelID}`)
        );

        const eligible = visibleEntries.filter((entry) => {
            const key = `${entry.civitaiVersionID}|${entry.civitaiModelID}`;
            const isPending = isPendingEntry(entry);
            const isEarlyActive = isEarlyAccessActive(entry);

            return !isPending && !isEarlyActive && !failedIds.has(key);
        });

        const firstN = eligible.slice(0, selectCount);
        replaceCartSelection(firstN);
    };

    const handleSelectFirstN_Modify = () => {
        if (!canUseSelectFirstModify) return;

        const n = Math.max(0, Number(selectCount) || 0);
        const firstN = visibleEntries.slice(0, n);

        replaceSelectionOnly(firstN);
    };


    const handleCancelDownload = () => {
        // Unpause (so we don't get stuck in a paused loop)
        setIsPaused(false);

        // Toggle our cancel flag on
        setIsCancelled(true);

        // Reset the UI to default states
        setIsLoading(false);
        setDownloadProgress({ completed: 0, total: 0 });
        setFailedEntries([]);
        // setCompletedCount(0);
        // setDelayTime(0);
    };

    useEffect(() => {
        setTagPage(0);
    }, [tagSource, filteredDownloadList]);

    const handleGoToPage = () => {
        const n = Math.floor(Number(goToPageInput));
        if (!Number.isFinite(n)) return; // ignore non-numbers
        // clamp to valid range (fallback to 1 if totalPages is 0)
        const clamped = Math.min(Math.max(1, n), totalPages || 1);
        setCurrentPage(clamped);
    };

    const handleSelectAll = () => {
        if (!canUseSelectAll) return;

        const visibleIds = visibleEntries
            .map((e) => String(e.civitaiVersionID ?? "").trim())
            .filter(Boolean);

        if (visibleIds.length === 0) return;

        if (isAllSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                visibleIds.forEach((id) => next.delete(id));
                return next;
            });

            if (canCurrentModeWriteCart) {
                setCartEntryByVid((prevCart) => {
                    const nextCart = { ...prevCart };

                    visibleIds.forEach((id) => {
                        delete nextCart[cartEntryKey(id)];
                    });

                    return nextCart;
                });

                setCartDownloadStatusByVid((prevStatus) => {
                    const nextStatus = { ...prevStatus };

                    visibleIds.forEach((id) => {
                        delete nextStatus[id];
                    });

                    return nextStatus;
                });
            }

            return;
        }

        setSelectedIds((prev) => {
            const next = new Set(prev);
            visibleIds.forEach((id) => next.add(id));
            return next;
        });

        if (!canCurrentModeWriteCart) {
            return;
        }

        setCartEntryByVid((prevCart) => {
            const nextCart = { ...prevCart };

            visibleEntries.forEach((entry) => {
                const versionId = String(entry.civitaiVersionID ?? "").trim();
                if (!versionId) return;

                nextCart[cartEntryKey(versionId)] = entry;
            });

            return nextCart;
        });

        setCartDownloadStatusByVid((prevStatus) => {
            const nextStatus = { ...prevStatus };

            visibleIds.forEach((id) => {
                delete nextStatus[id];
            });

            return nextStatus;
        });
    };

    const removeEntryLocal = (
        matcher: (e: OfflineDownloadEntry) => boolean
    ) => {
        const applyRemove = (list: OfflineDownloadEntry[]) =>
            list.filter((e) => !matcher(e));

        setOfflineDownloadList((prev) => applyRemove(prev));
        setAiEntries((prev) => applyRemove(prev));
        setErrorEntries((prev) => applyRemove(prev));
        setRecentlyDownloaded((prev) => applyRemove(prev));
        setHoldEntries((prev) => applyRemove(prev));
        setEarlyAccessEntries((prev) => applyRemove(prev));
        setFailedEntries((prev) => applyRemove(prev));
    };

    const updateEntryLocal = (
        matcher: (e: OfflineDownloadEntry) => boolean,
        patch: Partial<OfflineDownloadEntry>
    ) => {
        const applyPatch = (list: OfflineDownloadEntry[]) =>
            list.map((e) => (matcher(e) ? { ...e, ...patch } : e));

        setOfflineDownloadList((prev) => applyPatch(prev));
        setAiEntries((prev) => applyPatch(prev));
        setErrorEntries((prev) => applyPatch(prev));
        setRecentlyDownloaded((prev) => applyPatch(prev));
        setHoldEntries((prev) => applyPatch(prev));
        setEarlyAccessEntries((prev) => applyPatch(prev));
        setFailedEntries((prev) => applyPatch(prev));
    };

    const handleHoldChange = async (entry: OfflineDownloadEntry, nextHold: boolean) => {
        const match = (e: OfflineDownloadEntry) =>
            e.civitaiVersionID === entry.civitaiVersionID &&
            e.civitaiModelID === entry.civitaiModelID;

        const prevHold = entry.hold ?? false;

        updateEntryLocal(match, { hold: nextHold });

        // remove immediately from hold mode if it no longer belongs there
        if (displayMode === "holdCard" && !nextHold) {
            setHoldEntries((prev) => prev.filter((e) => !match(e)));
        }

        try {
            await fetchUpdateHoldFromOfflineDownloadList(
                {
                    civitaiModelID: entry.civitaiModelID,
                    civitaiVersionID: entry.civitaiVersionID,
                },
                nextHold,
                dispatch
            );
        } catch (err: any) {
            updateEntryLocal(match, { hold: prevHold });
            if (displayMode === "holdCard" && !nextHold) {
                setSpecialReloadToken((t) => t + 1);
            }
            alert(`Failed to update hold: ${err?.message || "Unknown error"}`);
        }
    };

    const handleToggleIsError = async (entry: OfflineDownloadEntry) => {
        const nextIsError = !Boolean(entry.isError);

        const matcher = (e: OfflineDownloadEntry) =>
            e.civitaiModelID === entry.civitaiModelID &&
            e.civitaiVersionID === entry.civitaiVersionID;

        // optimistic update
        updateEntryLocal(matcher, {
            isError: nextIsError,
            errorMessage: nextIsError ? "Manually marked as error" : null,
            errorAt: nextIsError ? new Date().toISOString() : null,
        } as any);

        try {
            await fetchBulkPatchOfflineDownloadList(
                [
                    {
                        civitaiModelID: entry.civitaiModelID,
                        civitaiVersionID: entry.civitaiVersionID,
                    },
                ],
                {
                    isError: nextIsError,
                    errorMessage: nextIsError ? "Manually marked as error" : null,
                } as any,
                dispatch
            );

            if (displayMode === "errorCard" && !nextIsError) {
                setErrorEntries(prev =>
                    prev.filter(e =>
                        !(
                            e.civitaiModelID === entry.civitaiModelID &&
                            e.civitaiVersionID === entry.civitaiVersionID
                        )
                    )
                );
            }
        } catch (err: any) {
            // rollback
            updateEntryLocal(matcher, {
                isError: entry.isError,
                errorMessage: entry.errorMessage,
                errorAt: entry.errorAt,
            } as any);

            dispatch(setError({
                hasError: true,
                errorMessage: `Failed to update isError: ${err?.message || "Unknown error"}`
            }));
        }
    };

    const handlePriorityChange = async (entry: OfflineDownloadEntry, nextPriority: number) => {
        const clamped = Math.max(1, Math.min(10, nextPriority | 0));
        const match = (e: OfflineDownloadEntry) =>
            e.civitaiVersionID === entry.civitaiVersionID && e.civitaiModelID === entry.civitaiModelID;
        const prev = entry.downloadPriority ?? 10;

        // optimistic
        updateEntryLocal(match, { downloadPriority: clamped });
        try {
            await fetchUpdateDownloadPriorityFromOfflineDownloadList(
                { civitaiModelID: entry.civitaiModelID, civitaiVersionID: entry.civitaiVersionID },
                clamped,
                dispatch
            );

        } catch (err: any) {
            // revert on failure
            updateEntryLocal(match, { downloadPriority: prev });
            alert(`Failed to update download priority: ${err?.message || 'Unknown error'}`);
        }
    };


    const getSelectableEntries = (): OfflineDownloadEntry[] => {
        if (displayMode === 'failedCard') {
            return failedEntries;
        }
        // Add other modes if needed
        // For example, in 'bigCard' and 'smallCard' modes, return `paginatedDownloadList`
        if (displayMode === 'bigCard' || displayMode === 'smallCard') {
            return filteredDownloadList;
        }
        // Default to all filtered entries
        return filteredDownloadList;
    };

    return (
        <div style={styles.containerStyle}>
            {/* Scrollable Content Area */}
            <>
                <div style={styles.leftPanelComputedStyle} ref={leftPanelRef}>
                    <div style={styles.headerStyleContainer}>
                        <h3 style={{ color: isDarkMode ? '#fff' : '#000' }}>Offline Download Mode</h3>

                        <div style={styles.buttonGroupStyle}>
                            {/* Refresh List Button */}
                            <Button
                                onClick={handleRefreshList}
                                style={{
                                    ...styles.responsiveButtonStyle,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#17a2b8', // Bootstrap Info color
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    marginRight: '10px',
                                    color: '#fff',
                                }}
                                disabled={isLoading} // Disable while loading
                                aria-label="Refresh Download List"
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner
                                            as="span"
                                            animation="border"
                                            size="sm"
                                            role="status"
                                            aria-hidden="true"
                                            style={{ marginRight: '5px' }}
                                        />
                                        Refreshing...
                                    </>
                                ) : (
                                    'Refresh List'
                                )}
                            </Button>

                            {/* Existing Display Mode Buttons */}

                            <Button
                                style={{
                                    ...styles.responsiveButtonStyle,
                                    position: "relative",
                                    overflow: "visible",
                                }}
                                variant={displayMode === "cartCard" ? "primary" : "secondary"}
                                onClick={() => handleDisplayModeClick("cartCard")}
                                disabled={isModeButtonDisabled("cartCard")}
                                aria-label={`Cart entries (${cartCount})`}
                            >
                                Cart Mode

                                {cartCount > 0 && (
                                    <span
                                        style={{
                                            ...styles.badgeStyle,
                                            background: "#0d6efd",
                                        }}
                                    >
                                        {badgeCount(cartCount)}
                                    </span>
                                )}
                            </Button>

                            <Button
                                style={{
                                    ...styles.responsiveButtonStyle
                                }}
                                variant={displayMode === 'table' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('table')}
                                disabled={isModeButtonDisabled("table")}
                            >
                                Table Mode
                            </Button>
                            <Button
                                style={{
                                    ...styles.responsiveButtonStyle
                                }}
                                variant={displayMode === 'bigCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('bigCard')}
                                disabled={isModeButtonDisabled("bigCard")}
                            >
                                Big Card Mode
                            </Button>
                            <Button
                                style={{
                                    ...styles.responsiveButtonStyle
                                }}
                                variant={displayMode === 'smallCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('smallCard')}
                                disabled={isModeButtonDisabled("smallCard")}
                            >
                                Small Card Mode
                            </Button>

                            <Button
                                style={{ ...styles.responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                variant={displayMode === 'recentCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('recentCard')}
                                aria-label={`Recently Downloaded (${recentlyDownloaded.length})`}
                                disabled={isModeButtonDisabled("recentCard")}
                            >
                                Recently Downloaded
                                {recentlyDownloaded.length > 0 && (
                                    <span
                                        style={{
                                            ...styles.badgeStyle,
                                            background: '#28a745' // green for "recent/success"
                                        }}
                                    >
                                        {badgeCount(recentlyDownloaded.length)}
                                    </span>
                                )}
                            </Button>

                            <Button
                                style={{ ...styles.responsiveButtonStyle }}
                                variant={displayMode === 'historyTable' ? 'primary' : 'secondary'}
                                disabled={isModeButtonDisabled("historyTable")}
                                onClick={() => handleDisplayModeClick('historyTable')}
                            >
                                History Table
                            </Button>

                            {/* NEW: Hold list mode */}
                            <Button
                                style={{ ...styles.responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                variant={displayMode === 'holdCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('holdCard')}
                                disabled={isModeButtonDisabled("holdCard")}
                                aria-label={`Hold entries (${holdEntries.length})`}
                            >
                                Hold
                                {holdEntries.length > 0 && (
                                    <span
                                        style={{
                                            ...styles.badgeStyle,
                                            background: '#f97316', // orange-ish
                                        }}
                                    >
                                        {badgeCount(holdEntries.length)}
                                    </span>
                                )}
                            </Button>

                            {/* NEW: Early Access mode */}
                            <Button
                                style={{ ...styles.responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                variant={displayMode === 'earlyAccessCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('earlyAccessCard')}
                                disabled={isModeButtonDisabled("earlyAccessCard")}
                                title={uiMode === "downloading" ? "Disabled while downloading" : undefined}
                            >
                                Early Access
                                {earlyAccessEntries.length > 0 && (
                                    <span
                                        style={{
                                            ...styles.badgeStyle,
                                            background: '#000080', // red-ish
                                        }}
                                    >
                                        {badgeCount(earlyAccessEntries.length)}
                                    </span>
                                )}
                            </Button>

                            <Button
                                variant={displayMode === 'failedCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('failedCard')}
                                disabled={isModeButtonDisabled("failedCard")}
                                style={{ ...styles.responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                            >
                                Failed Card Mode
                                {failedEntries.length > 0 && (
                                    <span style={styles.badgeStyle}>{badgeCount(failedEntries.length)}</span>
                                )}
                            </Button>

                            <Button
                                variant={displayMode === 'errorCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('errorCard')}
                                disabled={isModeButtonDisabled("errorCard")}
                                style={{ ...styles.responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                aria-label={`Error entries (${errorEntries.length})`}
                            >
                                Error Card Mode
                                {errorEntries.length > 0 && (
                                    <span
                                        style={{
                                            ...styles.badgeStyle,
                                            background: '#ef4444',  // red badge for errors
                                        }}
                                    >
                                        {badgeCount(errorEntries.length)}
                                    </span>
                                )}
                            </Button>

                            <Button
                                style={{ ...styles.responsiveButtonStyle }}
                                variant={displayMode === 'aiCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('aiCard')}
                                disabled={isModeButtonDisabled("aiCard")}
                            >
                                AI Mode
                            </Button>


                            {/* Modify Mode Toggle Button */}
                            <Button
                                onClick={toggleModifyMode}
                                style={{
                                    ...styles.responsiveButtonStyle,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: isModifyMode ? '#dc3545' : '#17a2b8',
                                    cursor: 'pointer',
                                    marginLeft: '10px',
                                    color: '#fff',
                                }}
                                disabled={isLoading}
                                aria-label="Toggle Modify Mode"
                            >
                                {isModifyMode ? 'Exit Modify Mode' : 'Enter Modify Mode'}
                            </Button>
                            {/* Theme Toggle Button */}
                            <Button
                                onClick={toggleTheme}
                                style={{
                                    ...styles.responsiveButtonStyle,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    marginLeft: '10px',
                                }}
                                aria-label="Toggle Theme"
                            >
                                {isDarkMode ? <FaSun color="#FFA500" /> : <FaMoon color="#4B0082" />}
                            </Button>

                            {/* Theme Toggle Button */}
                            <Button
                                onClick={() => fetchOpenDownloadDirectory(dispatch)}
                                aria-label="Open Download Directory"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: isDarkMode ? '#0B1220' : '#FFF7ED',   // subtle amber surface
                                    color: isDarkMode ? '#FFD166' : '#9A6700',    // readable icon/text
                                    border: '1px solid',
                                    borderColor: isDarkMode ? '#2A3344' : '#F4E5C2',
                                    boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,.45)' : '0 2px 8px rgba(0,0,0,.08)',
                                    transition: 'transform .06s ease-out, box-shadow .2s ease'
                                }}
                                onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
                                onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
                                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                {/* Icon inherits currentColor (no explicit color prop needed) */}
                                <AiFillFolderOpen size={20} />
                            </Button>

                            <Button
                                style={styles.responsiveButtonStyle}
                                variant={showGalleries ? 'primary' : 'secondary'}
                                onClick={() => setShowGalleries(v => !v)}
                            >
                                {showGalleries ? 'Galleries: On' : 'Galleries: Off'}
                            </Button>


                        </div>
                    </div>

                    {(isModifyMode || displayMode === 'errorCard') && (
                        <>
                            {/** Categories List Selector */}
                            <CategoriesListSelector />

                            {/** Folder Lists Option */}
                            <div
                                style={{
                                    backgroundColor: theme.panelBackground,
                                    color: theme.panelText,
                                    padding: '15px',
                                    borderRadius: '8px',
                                    border: `1px solid ${theme.panelBorder}`,
                                    boxShadow: theme.buttonShadow,
                                    margin: '10px',
                                }}
                            >
                                <DownloadFilePathOptionPanel
                                    setIsHandleRefresh={setIsHandleRefresh}
                                    isHandleRefresh={isHandleRefresh}
                                    isDarkMode={isDarkMode}
                                />
                            </div>

                            <FolderDropdown
                                filterText={filterText}
                                isDarkMode={isDarkMode}
                            />
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '10px', margin: '10px 0', width: '100%' }}>
                        <TopTagsDropdown
                            isDarkMode={isDarkMode}
                            filterText={filterText}
                            setFilterText={setFilterText}
                            tagSource={tagSource}
                            setTagSource={setTagSource}
                            pageSize={100}
                            minLen={3}
                            allowNumbers={false}
                            disabled={!isPagedMode || isLoading}
                            clientOtherTags={tagSource === 'other' ? clientOtherTags : undefined}
                        />

                    </div>

                    {/* Filter Section */}
                    <div style={styles.filterContainerStyle}>

                        <div
                            style={{
                                width: '100%',
                                margin: '10px',
                                display: 'flex',               // Enable Flexbox
                                alignItems: 'center',         // Vertically center the items
                                gap: '10px',                   // Space between items
                                flexWrap: 'wrap',             // Allow wrapping on smaller screens
                            }}
                        >
                            {/* Filter Text Input with Clear Button */}
                            < InputGroup style={{ flex: '1', minWidth: '200px' }}>
                                <FormControl
                                    placeholder="Filter..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    disabled={!isPagedMode || isLoading}
                                    style={{
                                        backgroundColor: isDarkMode ? '#555' : '#fff',
                                        color: isDarkMode ? '#fff' : '#000',
                                        border: '1px solid',
                                        borderColor: isDarkMode ? '#777' : '#ccc',
                                    }}
                                />
                                {filterText && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setFilterText('')}
                                        aria-label="Clear filter"
                                        disabled={!isPagedMode || isLoading}
                                        style={{
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            padding: '0 5px',
                                        }}
                                    >
                                        <FaTimes size={12} /> {/* Adjust the size as needed */}
                                    </Button>
                                )}
                            </InputGroup>

                            <select
                                value={filterCondition}
                                disabled={!isPagedMode || isLoading}
                                onChange={(e) => setFilterCondition(e.target.value as any)}
                                style={{
                                    ...styles.filterSelectStyle,
                                    backgroundColor: isDarkMode ? '#555' : '#fff',
                                    color: isDarkMode ? '#fff' : '#000',
                                    border: '1px solid',
                                    borderColor: isDarkMode ? '#777' : '#ccc',
                                }}
                            >
                                <option value="contains">Contains</option>
                                <option value="does not contain">Does not contain</option>
                                <option value="equals">Equals</option>
                                <option value="does not equal">Does not equal</option>
                                <option value="begins with">Begins with</option>
                                <option value="ends with">Ends with</option>
                            </select>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 10,
                                    width: "100%",
                                    alignItems: "stretch",
                                }}
                            >
                                <Button
                                    variant="primary"
                                    disabled={!isPagedMode || isLoading}
                                    onClick={() => {
                                        setSelectedSuggestedPathByVid({});

                                        const selected = Array.from(selectedPrefixes);

                                        const excluded = buildExcludedPrefixes(
                                            categoriesPrefixsList.map(p => p.downloadFilePath),
                                            selectedPrefixes
                                        );

                                        setAppliedQuery({
                                            filterText: filterText.trim(),
                                            filterCondition,
                                            showPending,
                                            showNonPending,
                                            showHoldEntries,
                                            showEarlyAccess,
                                            showErrorEntries,
                                            sortBy,
                                            sortDir: sortBy === "priority" ? sortDir : idSortDir,
                                            aiSuggestedOnly,
                                            selectedPrefixes: selected,
                                            excludedPrefixes: excluded,
                                        });

                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        flex: 1,
                                        minHeight: 44,
                                        fontSize: "1rem",
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: 8,
                                        boxShadow: isDarkMode
                                            ? "0 2px 8px rgba(0,0,0,0.35)"
                                            : "0 2px 8px rgba(0,0,0,0.12)",
                                    }}
                                >
                                    Apply Filters
                                </Button>

                                <Button
                                    variant="outline-secondary"
                                    disabled={!isPagedMode || isLoading}
                                    onClick={resetDraftFilters}
                                    title="Reset Draft Filters"
                                    aria-label="Reset Draft Filters"
                                    style={{
                                        width: 44,
                                        minWidth: 44,
                                        height: 44,
                                        padding: 0,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: 8,
                                        flexShrink: 0,
                                    }}
                                >
                                    <MdRefresh size={18} />
                                </Button>
                            </div>

                            <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Pending */}
                                <Form.Check
                                    type="checkbox"
                                    id="show-pending-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Show Pending</span>}
                                    checked={showPending}
                                    disabled={!isPagedMode || isLoading}
                                    onChange={e => setShowPending(e.target.checked)}
                                    title="Show items whose download path is a Pending folder"
                                />

                                {/* Non-Pending */}
                                <Form.Check
                                    type="checkbox"
                                    id="show-non-pending-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Show Non-Pending</span>}
                                    checked={showNonPending}
                                    disabled={!isPagedMode || isLoading}
                                    onChange={e => setShowNonPending(e.target.checked)}
                                    title="Show items not in Pending folders"
                                />

                                <Form.Check
                                    type="checkbox"
                                    id="show-hold-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Includes Hold</span>}
                                    checked={showHoldEntries}
                                    disabled={!isPagedMode || isLoading}
                                    onChange={e => setShowHoldEntries(e.target.checked)}
                                />

                                <Form.Check
                                    type="checkbox"
                                    id="show-error-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Includes Errors</span>}
                                    checked={showErrorEntries}
                                    disabled={!isPagedMode || isLoading}
                                    onChange={e => setShowErrorEntries(e.target.checked)}
                                />

                                {/* NEW: EarlyAccessEndsAt filter */}
                                <Form.Check
                                    type="checkbox"
                                    id="show-earlyaccess-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Includes Early Access</span>}
                                    checked={showEarlyAccess}
                                    disabled={!isPagedMode || isLoading}
                                    onChange={e => setShowEarlyAccess(e.target.checked)}
                                />

                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    disabled={!isPagedMode || isLoading}
                                    onClick={() => {
                                        setSortBy("priority");
                                        setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
                                    }}
                                    style={getSortToggleStyle(sortBy === "priority")}
                                    title="Sort by download priority"
                                >
                                    {sortDir === 'desc' ? (
                                        <>
                                            <FcGenericSortingDesc />
                                            <span>Priority: High to Low</span>
                                        </>
                                    ) : (
                                        <>
                                            <FcGenericSortingAsc />
                                            <span>Priority: Low to High</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    disabled={!isPagedMode || isLoading}
                                    onClick={() => {
                                        setSortBy("id");
                                        setIdSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
                                    }}
                                    style={getSortToggleStyle(sortBy === "id")}
                                    title="Sort by ID"
                                >
                                    {idSortDir === 'desc' ? (
                                        <>
                                            <FcGenericSortingDesc />
                                            <span>ID: New to Old</span>
                                        </>
                                    ) : (
                                        <>
                                            <FcGenericSortingAsc />
                                            <span>ID: Old to New</span>
                                        </>
                                    )}
                                </button>

                                {/* (keep your existing “Prevent Pending Paths” toggle) */}
                                <Form.Check
                                    type="checkbox"
                                    id="prevent-pending-paths"
                                    disabled={isLoading}
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Block Pending path edits</span>}
                                    checked={preventPendingPaths}
                                    onChange={e => setPreventPendingPaths(e.target.checked)}
                                    title="Disallow setting the downloadFilePath to a Pending folder"
                                />


                                {/*
                                <Form.Check
                                    type="checkbox"
                                    id="allow-try-early-access"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>
                                        Allow try to download Early Access
                                    </span>}
                                    checked={allowTryEarlyAccess}
                                    disabled={isLoading}
                                    onChange={e => setAllowTryEarlyAccess(e.target.checked)}
                                    title="If enabled, Download Now will include entries still in Early Access."
                                />
                                */}


                            </div>


                        </div>


                        {canUseSelectFirstNormal && <>
                            {/* "Select First N" Button */}
                            <Button
                                onClick={handleSelectFirstN}
                                style={{
                                    ...styles.downloadButtonStyle,
                                    backgroundColor: '#007bff',
                                    color: '#fff',
                                }}
                                disabled={!canUseSelectFirstNormal}
                            >
                                Select First (Not Pending)
                            </Button>

                            {/* Select Count UI */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    id="selectCountInput"
                                    type="number"
                                    min={5}
                                    step={5}
                                    value={selectCount}
                                    onChange={(e) => {
                                        // Make sure we parse the value as a number
                                        const newVal = parseInt(e.target.value, 10);
                                        if (!isNaN(newVal)) {
                                            setSelectCount(newVal);
                                        }
                                    }}
                                    disabled={!canUseSelectFirstNormal}
                                    style={{
                                        width: '100px',
                                        padding: '5px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        backgroundColor: isDarkMode ? '#555' : '#fff',
                                        color: isDarkMode ? '#fff' : '#000',
                                    }}
                                />
                            </div>
                        </>}

                        {canUseSelectFirstModify && (
                            <>
                                <Button
                                    onClick={handleSelectFirstN_Modify}
                                    style={{
                                        ...styles.downloadButtonStyle,
                                        backgroundColor: '#6f42c1', // purple-ish so you can tell it’s Modify-only
                                        color: '#fff',
                                    }}
                                    disabled={!canUseSelectFirstModify}
                                    title="Select first N entries (no restrictions)"
                                >
                                    Select First (Modify)
                                </Button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input
                                        id="selectCountInputModify"
                                        type="number"
                                        min={5}
                                        step={5}
                                        value={selectCount}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            if (!Number.isNaN(v)) setSelectCount(v);
                                        }}
                                        onBlur={() => {
                                            setSelectCount((prev) => Math.max(5, Math.floor((Number(prev) || 0) / 5) * 5));
                                        }}
                                        disabled={!canUseSelectFirstModify}
                                        style={{
                                            width: '100px',
                                            padding: '5px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            backgroundColor: isDarkMode ? '#555' : '#fff',
                                            color: isDarkMode ? '#fff' : '#000',
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {displayMode === "earlyAccessCard" && (
                            <>
                                <Button
                                    onClick={handleSelectNextN_EarlyAccess}
                                    style={{
                                        ...styles.downloadButtonStyle,
                                        backgroundColor: "#f59e0b",
                                        color: "#fff",
                                    }}
                                    disabled={isLoading || !canChangeSelection}
                                    title="Select the next N Early Access entries that haven't been refreshed yet"
                                >
                                    Select Next (Unrefreshed)
                                </Button>

                                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                    <input
                                        id="selectCountInputEarlyAccess"
                                        type="number"
                                        min={5}
                                        step={5}                 // ✅ arrows move by 5
                                        value={selectCount}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            if (!Number.isNaN(v)) setSelectCount(v);
                                        }}
                                        onBlur={() => {
                                            // ✅ snap typed values to multiples of 5
                                            setSelectCount((prev) => Math.max(5, Math.floor((Number(prev) || 0) / 5) * 5));
                                        }}
                                        disabled={isLoading}
                                        style={{
                                            width: "100px",
                                            padding: "5px",
                                            borderRadius: "4px",
                                            border: "1px solid #ccc",
                                            backgroundColor: isDarkMode ? "#555" : "#fff",
                                            color: isDarkMode ? "#fff" : "#000",
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {displayMode === "earlyAccessCard" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <Button
                                    size="sm"
                                    variant="warning"
                                    onClick={handleRefreshSelectedEarlyAccess}
                                    disabled={isLoading || eaRefreshProgress.running || selectedIds.size === 0}
                                    title="Refresh selected early access entries (1s delay between each)"
                                >
                                    Refresh Selected (Early Access)
                                </Button>

                                <span
                                    style={{
                                        fontSize: 12,
                                        opacity: 0.9,
                                        color: isDarkMode ? "#fff" : "#000",
                                    }}
                                >
                                    {eaRefreshProgress.running
                                        ? `Refreshing ${eaRefreshProgress.completed}/${eaRefreshProgress.total}...`
                                        : eaRefreshProgress.msg}
                                </span>
                            </div>
                        )}

                        {/* Action Button for Modify Mode */}
                        {isModifyMode && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                                {/* Existing: update path + remove */}



                                <div style={{ display: "flex", gap: 12, marginTop: 10, marginBottom: 10 }}>
                                    {/* Block 1: Available options */}
                                    <div
                                        style={{
                                            flex: 1,
                                            border: `1px solid ${isDarkMode ? "#3a3a3a" : "#ccc"}`,
                                            borderRadius: 8,
                                            padding: 10,
                                            backgroundColor: isDarkMode ? "#1f1f1f" : "#fff",
                                            color: isDarkMode ? "#fff" : "#000",
                                            minWidth: 0,
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, marginBottom: 8, color: isDarkMode ? "#fff" : "#111" }}>
                                            Available updates
                                        </div>

                                        {availablePatchFields.map((f) => (
                                            <div
                                                key={f.key}
                                                onClick={() => addPatchField(f.key)}
                                                style={{
                                                    cursor: "pointer",
                                                    border: `1px dashed ${isDarkMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}`,
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    marginBottom: 8,
                                                    userSelect: "none",
                                                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                                    color: isDarkMode ? "#fff" : "#000",
                                                }}
                                            >
                                                <div style={{ fontWeight: 600, color: isDarkMode ? "#fff" : "#111" }}>+ {f.label}</div>

                                                {f.key === "downloadFilePath" && (
                                                    <div style={{ fontSize: 12, opacity: isDarkMode ? 0.8 : 0.75, marginTop: 4 }}>
                                                        Current: {modify_downloadFilePath || "(empty)"}
                                                    </div>
                                                )}

                                                {f.key === "downloadPriority" && (
                                                    <div style={{ fontSize: 12, opacity: isDarkMode ? 0.8 : 0.75, marginTop: 4 }}>
                                                        Range: 1 ~ 10 (default 5)
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {!availablePatchFields.length && (
                                            <div style={{ fontSize: 12, opacity: isDarkMode ? 0.75 : 0.7 }}>No more fields.</div>
                                        )}
                                    </div>

                                    {/* Block 2: Selected options */}
                                    <div
                                        style={{
                                            flex: 1,
                                            border: `1px solid ${isDarkMode ? "#3a3a3a" : "#ccc"}`,
                                            borderRadius: 8,
                                            padding: 10,
                                            backgroundColor: isDarkMode ? "#1f1f1f" : "#fff",
                                            color: isDarkMode ? "#fff" : "#000",
                                            minWidth: 0,
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, marginBottom: 8, color: isDarkMode ? "#fff" : "#111" }}>
                                            Selected updates
                                        </div>

                                        {!selectedPatchFields.size && (
                                            <div style={{ fontSize: 12, opacity: isDarkMode ? 0.75 : 0.7 }}>
                                                Click an option on the left to add it here.
                                            </div>
                                        )}

                                        {/* downloadFilePath */}
                                        {selectedPatchFields.has("downloadFilePath") && (
                                            <div
                                                style={{
                                                    border: `1px solid ${isDarkMode ? "#444" : "#ddd"}`,
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    marginBottom: 8,
                                                    backgroundColor: isDarkMode ? "#2a2a2a" : "#fafafa",
                                                    color: isDarkMode ? "#fff" : "#000",
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                                    <div style={{ fontWeight: 600 }}>Modify downloadFilePath</div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removePatchField("downloadFilePath")}
                                                        style={{
                                                            cursor: "pointer",
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            border: `1px solid ${isDarkMode ? "#555" : "#ccc"}`,
                                                            backgroundColor: isDarkMode ? "#333" : "#f6f6f6",
                                                            color: isDarkMode ? "#fff" : "#111",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: 0,
                                                        }}
                                                        aria-label="Remove downloadFilePath"
                                                        title="Remove"
                                                    >
                                                        <AiOutlineClose />
                                                    </button>
                                                </div>

                                                <div style={{ fontSize: 12, opacity: isDarkMode ? 0.8 : 0.75, marginTop: 4 }}>
                                                    Will set to: {modify_downloadFilePath || "(empty)"}
                                                </div>
                                            </div>
                                        )}

                                        {/* downloadPriority */}
                                        {selectedPatchFields.has("downloadPriority") && (
                                            <div
                                                style={{
                                                    border: `1px solid ${isDarkMode ? "#444" : "#ddd"}`,
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    marginBottom: 8,
                                                    backgroundColor: isDarkMode ? "#2a2a2a" : "#fafafa",
                                                    color: isDarkMode ? "#fff" : "#000",
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                                    <div style={{ fontWeight: 600 }}>Download Priority</div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removePatchField("downloadPriority")}
                                                        style={{
                                                            cursor: "pointer",
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            border: `1px solid ${isDarkMode ? "#555" : "#ccc"}`,
                                                            backgroundColor: isDarkMode ? "#333" : "#f6f6f6",
                                                            color: isDarkMode ? "#fff" : "#111",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: 0,
                                                        }}
                                                        aria-label="Remove downloadPriority"
                                                        title="Remove"
                                                    >
                                                        <AiOutlineClose />
                                                    </button>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                                    <span style={{ opacity: isDarkMode ? 0.9 : 0.85 }}>Set to:</span>
                                                    <select
                                                        value={String(bulkDownloadPriority)}
                                                        onChange={(e) => setBulkDownloadPriority(parseInt(e.target.value, 10))}
                                                        style={{
                                                            backgroundColor: isDarkMode ? "#2a2a2a" : "#fff",
                                                            color: isDarkMode ? "#fff" : "#000",
                                                            border: `1px solid ${isDarkMode ? "#555" : "#ccc"}`,
                                                            borderRadius: 8,
                                                            padding: "6px 8px",
                                                            outline: "none",
                                                        }}
                                                    >
                                                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                                            <option key={n} value={String(n)}>
                                                                {n}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* hold */}
                                        {selectedPatchFields.has("hold") && (
                                            <div
                                                style={{
                                                    border: `1px solid ${isDarkMode ? "#444" : "#ddd"}`,
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    marginBottom: 8,
                                                    backgroundColor: isDarkMode ? "#2a2a2a" : "#fafafa",
                                                    color: isDarkMode ? "#fff" : "#000",
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                                    <div style={{ fontWeight: 600 }}>Hold</div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removePatchField("hold")}
                                                        style={{
                                                            cursor: "pointer",
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            border: `1px solid ${isDarkMode ? "#555" : "#ccc"}`,
                                                            backgroundColor: isDarkMode ? "#333" : "#f6f6f6",
                                                            color: isDarkMode ? "#fff" : "#111",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: 0,
                                                        }}
                                                        aria-label="Remove hold"
                                                        title="Remove"
                                                    >
                                                        <AiOutlineClose />
                                                    </button>
                                                </div>

                                                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={bulkHold}
                                                        onChange={(e) => setBulkHold(e.target.checked)}
                                                    />
                                                    <span style={{ opacity: isDarkMode ? 0.9 : 0.85 }}>
                                                        Set hold = <b>{bulkHold ? "true" : "false"}</b>
                                                    </span>
                                                </label>
                                            </div>
                                        )}


                                        {selectedPatchFields.has("isError") && (
                                            <div
                                                style={{
                                                    border: `1px solid ${isDarkMode ? "#444" : "#ddd"}`,
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    marginBottom: 8,
                                                    backgroundColor: isDarkMode ? "#2a2a2a" : "#fafafa",
                                                    color: isDarkMode ? "#fff" : "#000",
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                                    <div style={{ fontWeight: 600 }}>Is Error</div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removePatchField("isError")}
                                                        style={{
                                                            cursor: "pointer",
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            border: `1px solid ${isDarkMode ? "#555" : "#ccc"}`,
                                                            backgroundColor: isDarkMode ? "#333" : "#f6f6f6",
                                                            color: isDarkMode ? "#fff" : "#111",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: 0,
                                                        }}
                                                        aria-label="Remove isError"
                                                        title="Remove"
                                                    >
                                                        <AiOutlineClose />
                                                    </button>
                                                </div>

                                                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={bulkIsError}
                                                        onChange={(e) => setBulkIsError(e.target.checked)}
                                                    />
                                                    <span style={{ opacity: isDarkMode ? 0.9 : 0.85 }}>
                                                        Set isError = <b>{bulkIsError ? "true" : "false"}</b>
                                                    </span>
                                                </label>
                                            </div>
                                        )}

                                        {selectedPatchFields.has("refreshRecord") && (
                                            <div
                                                style={{
                                                    border: `1px solid ${isDarkMode ? "#444" : "#ddd"}`,
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    marginBottom: 8,
                                                    backgroundColor: isDarkMode ? "#2a2a2a" : "#fafafa",
                                                    color: isDarkMode ? "#fff" : "#000",
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                                    <div style={{ fontWeight: 600 }}>Refresh Record</div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removePatchField("refreshRecord")}
                                                        style={{
                                                            cursor: "pointer",
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            border: `1px solid ${isDarkMode ? "#555" : "#ccc"}`,
                                                            backgroundColor: isDarkMode ? "#333" : "#f6f6f6",
                                                            color: isDarkMode ? "#fff" : "#111",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: 0,
                                                        }}
                                                        aria-label="Remove refreshRecord"
                                                        title="Remove"
                                                    >
                                                        <AiOutlineClose />
                                                    </button>
                                                </div>

                                                <div style={{ fontSize: 12, opacity: isDarkMode ? 0.8 : 0.75, marginTop: 4 }}>
                                                    Re-fetch selected records from source.
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleBulkPatchSelected}
                                            disabled={isPatching || selectedIds.size === 0 || selectedPatchFields.size === 0}
                                            style={{
                                                marginTop: 6,
                                                padding: "10px 12px",
                                                width: "100%",
                                                borderRadius: 10,
                                                cursor: "pointer",
                                                border: `1px solid ${isDarkMode ? "#555" : "#ccc"}`,
                                                backgroundColor: isDarkMode ? "#0d6efd" : "#0d6efd",
                                                color: "#fff",
                                                fontWeight: 700,
                                                opacity: isPatching || selectedIds.size === 0 || selectedPatchFields.size === 0 ? 0.6 : 1,
                                            }}
                                        >
                                            {isPatching ? "Updating..." : `Update selected models (${selectedIds.size})`}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Button
                                        onClick={handleRemoveSelected}
                                        style={{
                                            ...styles.downloadButtonStyle,
                                            backgroundColor: '#dc3545',
                                            color: '#fff',
                                        }}
                                        disabled={selectedIds.size === 0 || isLoading}
                                    >
                                        Remove Selected
                                    </Button>
                                </div>

                            </div>
                        )}

                        {displayMode === "aiCard" && (
                            <div
                                style={{
                                    borderRadius: 10,
                                    padding: 10,
                                    background: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    border: isDarkMode ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
                                    marginTop: 10,
                                }}
                            >
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                    <Button
                                        variant="warning"
                                        onClick={handleRunPendingAiSuggestions}
                                        disabled={isLoading || aiSuggestRunStatus === "running"}
                                    >
                                        Run AI Suggestion for downloadFilePath
                                    </Button>

                                    <Form.Control
                                        as="select"
                                        value={aiSuggestCountInput}
                                        onChange={onChangeAiSuggestCount}
                                        onBlur={() => setAiSuggestCountInput(String(getAiSuggestCount()))}
                                        disabled={isLoading || aiSuggestRunStatus === "running"}
                                        style={{ width: 90 }}
                                    >
                                        {Array.from({ length: 10 }, (_, i) => 100 - i * 10).map((n) => (
                                            <option key={n} value={String(n)}>
                                                {n}
                                            </option>
                                        ))}
                                    </Form.Control>

                                    <Button
                                        variant="primary"
                                        onClick={handleApplySelectedAiPathsToDownloadFilePath}
                                        disabled={
                                            isLoading ||
                                            isBulkUpdatingDownloadPaths ||
                                            aiSuggestRunStatus === "running" ||
                                            selectedIds.size === 0
                                        }
                                    >
                                        {isBulkUpdatingDownloadPaths
                                            ? "Updating downloadFilePath..."
                                            : `Apply selectedPath -> downloadFilePath (${selectedIds.size})`}
                                    </Button>
                                </div>

                                {(aiSuggestRunStatus === "running" || aiSuggestRunMsg) && (
                                    <div
                                        style={{
                                            marginTop: 12,
                                            padding: "10px 12px",
                                            borderRadius: 8,
                                            background: isDarkMode ? "rgba(59,130,246,0.12)" : "rgba(13,110,253,0.08)",
                                            border: isDarkMode
                                                ? "1px solid rgba(96,165,250,0.25)"
                                                : "1px solid rgba(13,110,253,0.18)",
                                            color: isDarkMode ? "#f3f4f6" : "#0f172a",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {aiSuggestRunStatus === "running" && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                {currentBatchRange && (
                                                    <div style={{ color: isDarkMode ? "#dbeafe" : "#0b3d91" }}>
                                                        {currentBatchRange}
                                                    </div>
                                                )}

                                                <div style={{ color: isDarkMode ? "#f8fafc" : "#111827" }}>
                                                    Progress: {aiSuggestProgress.completed}/{aiSuggestProgress.total}
                                                </div>

                                                {batchCooldown !== null && (
                                                    <div style={{ color: isDarkMode ? "#fde68a" : "#92400e" }}>
                                                        Cooldown: <strong>{batchCooldown}s</strong>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {aiSuggestRunMsg && (
                                            <div
                                                style={{
                                                    marginTop: aiSuggestRunStatus === "running" ? 8 : 0,
                                                    color:
                                                        aiSuggestRunStatus === "fail"
                                                            ? (isDarkMode ? "#fecaca" : "#991b1b")
                                                            : (isDarkMode ? "#bbf7d0" : "#166534"),
                                                }}
                                            >
                                                {aiSuggestRunMsg}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {batchResults.length > 0 && (
                                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                        {batchResults.map((b) => (
                                            <div key={b.batchNo} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <span style={{ color: isDarkMode ? "#f3f4f6" : "#111827" }}>
                                                    <strong>Batch #{b.batchNo}</strong> ({b.start} ~ {b.end})
                                                </span>

                                                {b.status === "success" && <Badge bg="success">Success</Badge>}
                                                {b.status === "fail" && <Badge bg="danger">Fail</Badge>}
                                                {b.status === "running" && (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: isDarkMode ? "#f9fafb" : "#111827" }}>
                                                        <Spinner animation="border" size="sm" variant={isDarkMode ? "light" : "dark"} />
                                                        Processing...
                                                    </span>
                                                )}

                                                {!!b.msg && b.status !== "running" && (
                                                    <small
                                                        style={{
                                                            opacity: 1,
                                                            color:
                                                                b.status === "fail"
                                                                    ? (isDarkMode ? "#fecaca" : "#991b1b")
                                                                    : (isDarkMode ? "#e5e7eb" : "#374151"),
                                                            maxWidth: 520,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title={b.msg}
                                                    >
                                                        {b.msg}
                                                    </small>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {!isModifyMode &&
                        <div
                            style={{
                                width: '100%',
                                margin: '10px',
                                display: 'flex',               // Enable Flexbox
                                alignItems: 'center',         // Vertically center the items
                                gap: '10px',                   // Space between items
                                flexWrap: 'wrap',             // Allow wrapping on smaller screens
                            }}>
                            <Button
                                onClick={handleDownloadNow}
                                style={
                                    cartCount > 0 && canUseDownloadNow && !isLoading
                                        ? styles.downloadButtonStyle
                                        : styles.downloadButtonDisabledStyle
                                }
                                disabled={cartCount === 0 || isLoading || !canUseDownloadNow}
                                title={
                                    canUseDownloadNow
                                        ? "Download selected cart items"
                                        : "Open Cart Mode to download selected models"
                                }
                            >
                                {isLoading ? "Downloading..." : `Download Cart (${cartCount})`}
                            </Button>

                            <Button
                                onClick={handlePauseToggle}
                                disabled={uiMode !== 'downloading'}
                            >
                                {isPaused ? "Resume" : "Pause"}
                            </Button>

                            <Button
                                onClick={handleCancelDownload}
                                disabled={uiMode !== 'downloading' || !isPaused}
                            >
                                Cancel
                            </Button>


                        </div>
                    }

                    {(batchCooldown !== null && batchCooldown > 0) || currentBatchRange ? (
                        <div
                            style={{
                                marginBottom: '5px',
                                fontWeight: 'bold',
                                color: '#FFA500',
                                backgroundColor: isDarkMode ? '#555' : '#f8f9fa',
                                padding: '10px',
                                borderRadius: '4px',
                                textAlign: 'center'
                            }}
                        >
                            {/* Render the cooldown message if it’s active */}
                            {batchCooldown !== null && batchCooldown > 0 && (
                                <p style={{ margin: 0 }}>
                                    Cooling down: {batchCooldown} second
                                    {batchCooldown !== 1 ? 's' : ''} left before the next batch...
                                </p>
                            )}

                            {/* Render the current batch range if defined */}
                            {currentBatchRange && (
                                <p style={{ margin: 0 }}>
                                    {currentBatchRange}
                                </p>
                            )}
                        </div>
                    ) : null}

                    {initiationDelay !== null && initiationDelay > 0 && (
                        <div style={{
                            marginBottom: '5px',
                            fontWeight: 'bold',
                            color: '#FFA500', // Orange color for visibility
                            backgroundColor: isDarkMode ? '#555' : '#f8f9fa',
                            padding: '10px',
                            borderRadius: '4px',
                            textAlign: 'center'
                        }}>
                            Next download will start in {initiationDelay} second{initiationDelay !== 1 ? 's' : ''}.
                        </div>
                    )}

                    {leftOverlayEntry && (
                        <div style={styles.leftOverlayBackdropStyle} onClick={closeLeftOverlay}>
                            <div
                                ref={leftOverlayDrawerRef}
                                style={styles.leftOverlayDrawerStyle}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button onClick={closeLeftOverlay} style={styles.closeBtnStyle} aria-label="Close overlay">
                                    <IoCloseOutline size={22} />
                                </button>

                                <PreviewCard
                                    entry={leftOverlayEntry}
                                    isDarkMode={isDarkMode}
                                    isEntryEarlyAccess={isEntryEarlyAccess}
                                    getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                    formatLocalDateTime={formatLocalDateTime}
                                    normalizeImg={normalizeImg}
                                    withWidth={withWidth}
                                    buildSrcSet={buildSrcSet}
                                />

                                {leftOverlayEntry && (
                                    <SimilarSearchPanel entry={leftOverlayEntry} isDarkMode={isDarkMode} />
                                )}

                            </div>
                            {/* The remaining ~5% area is the dimmed backdrop; clicking it closes the overlay */}
                        </div>
                    )}


                </div>


                {/* Main Content */}
                <div style={styles.rightContentStyle}>
                    {/* Header within Right Panel */}
                    <div style={{
                        marginBottom: '5px',
                        fontWeight: 'bold',
                        fontSize: '24px',
                        color: '#FFFFFF', // White text for high contrast
                        backgroundColor: isDarkMode ? '#0056b3' : '#007BFF', // Darker blue for dark mode, standard blue for light mode
                        padding: '10px',
                        borderRadius: '4px',
                        textAlign: 'center'
                    }}>
                        {isModifyMode ? "Modify Mode" : `Download Mode (${displayMode})`}
                    </div>

                    <Accordion
                        style={{
                            width: '100%',
                            margin: '10px 0',
                            padding: '8px',
                            backgroundColor: isDarkMode ? '#2b2b2b' : '#f8f9fa',
                            border: `1px solid ${isDarkMode ? '#444' : '#ccc'}`,
                            borderRadius: '4px',
                            color: isDarkMode ? '#fff' : '#000',
                        }}
                    >
                        <Accordion.Item
                            eventKey="0"
                            style={{ backgroundColor: 'transparent', color: isDarkMode ? '#fff' : '#000' }}
                        >
                            <Accordion.Header>Folder Prefixes</Accordion.Header>
                            <Accordion.Body style={{ maxHeight: '180px', overflowY: 'auto', padding: '8px' }}>
                                {/* ── SELECT ALL ── */}
                                <Form.Check
                                    type="checkbox"
                                    id="prefix-select-all"
                                    label="Select All in This Page"
                                    ref={selectAllRef}
                                    checked={selectedPrefixes.size === categoriesPrefixsList.length}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelectedPrefixes(new Set(categoriesPrefixsList.map(p => p.downloadFilePath)));
                                        } else {
                                            setSelectedPrefixes(new Set());
                                        }
                                    }}
                                    disabled={isLoading || (showPending && !showNonPending) || !isPagedMode}
                                    style={{
                                        marginBottom: '8px',
                                        fontWeight: 'bold',
                                        color: isDarkMode ? '#fff' : '#000',
                                    }}
                                />

                                {/* ── INDIVIDUAL PREFIXES ── */}
                                {categoriesPrefixsList.map(prefix => (
                                    <Form.Check
                                        key={prefix.downloadFilePath}
                                        type="checkbox"
                                        id={`prefix-${prefix.downloadFilePath}`}
                                        label={prefix.downloadFilePath}
                                        checked={selectedPrefixes.has(prefix.downloadFilePath)}
                                        onChange={e =>
                                            setSelectedPrefixes(prev => {
                                                const next = new Set(prev);
                                                if (e.target.checked) next.add(prefix.downloadFilePath);
                                                else next.delete(prefix.downloadFilePath);
                                                return next;
                                            })
                                        }
                                        disabled={isLoading || (showPending && !showNonPending) || !isPagedMode}
                                        style={{
                                            marginBottom: '4px',
                                            color: isDarkMode ? '#fff' : '#000',
                                        }}
                                    />
                                ))}
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '5px',
                            gap: '10px',
                            width: '100%',
                        }}
                    >
                        {/* Select All Button */}
                        {canUseSelectAll &&
                            <>
                                <Button
                                    onClick={handleSelectAll}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        backgroundColor: '#007bff',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: canUseSelectAll ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                    }}
                                    disabled={!canUseSelectAll}
                                    aria-label={isAllSelected ? 'Deselect All' : 'Select All'}
                                >
                                    {isAllSelected ? 'Deselect All' : 'Select All'}
                                </Button>


                                {/* Selection Count Display */}
                                <div
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        backgroundColor: isDarkMode ? '#444' : '#e0e0e0',
                                        color: isDarkMode ? '#fff' : '#000',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        whiteSpace: 'normal',    // allow wrapping onto next line
                                    }}
                                >
                                    {(isModifyMode) ? (
                                        <>
                                            {visibleSelectedCount} {visibleSelectedCount === 1 ? 'entry' : 'entries'} selected                                            "<span
                                                style={{
                                                    display: 'inline-block',
                                                    maxWidth: '100%',
                                                    whiteSpace: 'normal',    // allow this span to wrap
                                                    wordBreak: 'break-all',  // break long paths anywhere
                                                }}
                                                title={modify_downloadFilePath} // When hovered, show full text
                                            >
                                                {modify_downloadFilePath}
                                            </span>"
                                        </>
                                    ) : (
                                        <>
                                            {visibleSelectedCount} {visibleSelectedCount === 1 ? 'entry' : 'entries'} selected                                        </>
                                    )}
                                </div>

                            </>
                        }
                    </div>

                    {displayMode === "historyTable" && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "12px",
                            }}
                        >
                            <HistoryDatePicker
                                selectedDate={historySelectedDate}
                                onChangeDate={setHistorySelectedDate}
                                availableDates={historyAvailableDates}
                                isDarkMode={isDarkMode}
                                onMonthChange={setHistoryCalendarMonth}
                            />

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                    padding: "4px 0",
                                }}
                            >
                                {renderHistoryFetchStatusItem("historyList")}
                                {renderHistoryFetchStatusItem("dbDetails")}
                                {renderHistoryFetchStatusItem("localFileCheck")}
                            </div>

                            <HistoryStatusSummary
                                selectedDate={historySelectedDate}
                                isDarkMode={isDarkMode}
                                reloadToken={historyStatusSummaryReloadToken}
                            />

                        </div>
                    )}

                    {/* Download or Modify Progress Indicators */}
                    {uiMode !== 'idle' && (
                        <div
                            style={{
                                marginBottom: '20px',
                                fontWeight: 'bold',
                                color: isDarkMode ? '#fff' : '#000',
                                backgroundColor: isDarkMode ? '#555' : '#f8f9fa',
                                padding: '10px',
                                borderRadius: '4px',
                                textAlign: 'center',
                            }}
                        >
                            {uiMode === 'paging' && <>Refreshing page...</>}
                            {uiMode === 'downloading' && <>Processing downloads... ({downloadProgress.completed}/{downloadProgress.total})</>}
                            {uiMode === 'modifying' && <>Modifying entries... ({selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'})</>}
                            {uiMode === 'removing' && <>Removing entries...</>}
                        </div>
                    )}


                    {/* Main Content Area */}
                    <div ref={rightInnerRef} style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoading && uiMode !== "downloading" && visibleEntries.length === 0 ? (
                            <div style={{ color: isDarkMode ? '#fff' : '#000' }}>Loading...</div>
                        ) : (
                            <>
                                {displayMode === 'table' && (
                                    <TableMode
                                        entries={paginatedDownloadList}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={isModifyMode}
                                        selectedIds={selectedIds}
                                        visibleEntries={visibleEntries}
                                        isAllSelected={isAllSelected}
                                        isIndeterminate={isIndeterminate}
                                        canChangeSelection={canChangeSelection}
                                        agGridStyle={styles.agGridStyle}
                                        currentTheme={currentTheme}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                    />
                                )}

                                {displayMode === 'historyTable' && (
                                    <HistoryTableMode
                                        entries={modelOfflineDownloadHistoryList}
                                        isDarkMode={isDarkMode}
                                        agGridStyle={styles.agGridStyle}
                                        currentTheme={currentTheme}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        onDeleteHistoryRecord={handleDeleteHistoryRecord}
                                        deletingHistoryId={deletingHistoryId}
                                    />
                                )}

                                {displayMode === "cartCard" && (
                                    <BigCardMode
                                        filteredDownloadList={cartEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={isModifyMode}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        showGalleries={showGalleries}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        onRefreshRecord={handleRefreshOneRecord}
                                        onRefreshModelVersionObject={handleRefreshModelVersionObjectOneRecord}
                                        onToggleIsError={handleToggleIsError}
                                        canChangeSelection={canChangeSelection}
                                        isLoading={isLoading}
                                        editingPathId={editingPathId}
                                        setEditingPathId={setEditingPathId}
                                        handleDownloadPathSave={handleDownloadPathSave}
                                        handleHoldChange={handleHoldChange}
                                        handlePriorityChange={handlePriorityChange}
                                        handleRemoveOne={handleRemoveOne}
                                        handleCreateAddDummyFromError={handleCreateAddDummyFromError}
                                        dummyCreateStatusByVid={dummyCreateStatusByVid}
                                        showAiSuggestionsPanel={false}
                                        selectedSuggestedPathByVid={selectedSuggestedPathByVid}
                                        setSelectedSuggestedPathByVid={setSelectedSuggestedPathByVid}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                        mergeSuggestedPathsForEntry={mergeSuggestedPathsForEntry}
                                        normalizePathKey={normalizePathKey}
                                        displayMode="cartCard"
                                        cartDownloadStatusByVid={cartDownloadStatusByVid}
                                        editingVersionId={editingVersionId}
                                        setEditingVersionId={setEditingVersionId}
                                        handleVersionIdSave={handleVersionIdSave}
                                    />
                                )}

                                {displayMode === 'bigCard' && (
                                    <BigCardMode
                                        filteredDownloadList={paginatedDownloadList}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={isModifyMode}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        showGalleries={showGalleries}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        onRefreshRecord={handleRefreshOneRecord}
                                        onRefreshModelVersionObject={handleRefreshModelVersionObjectOneRecord}
                                        onToggleIsError={handleToggleIsError}
                                        canChangeSelection={canChangeSelection}
                                        isLoading={isLoading}
                                        editingPathId={editingPathId}
                                        setEditingPathId={setEditingPathId}
                                        handleDownloadPathSave={handleDownloadPathSave}
                                        handleHoldChange={handleHoldChange}
                                        handlePriorityChange={handlePriorityChange}
                                        handleRemoveOne={handleRemoveOne}
                                        handleCreateAddDummyFromError={handleCreateAddDummyFromError}
                                        dummyCreateStatusByVid={dummyCreateStatusByVid}
                                        showAiSuggestionsPanel={false}
                                        selectedSuggestedPathByVid={selectedSuggestedPathByVid}
                                        setSelectedSuggestedPathByVid={setSelectedSuggestedPathByVid}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                        mergeSuggestedPathsForEntry={mergeSuggestedPathsForEntry}
                                        normalizePathKey={normalizePathKey}
                                        editingVersionId={editingVersionId}
                                        setEditingVersionId={setEditingVersionId}
                                        handleVersionIdSave={handleVersionIdSave}
                                    />
                                )}

                                {displayMode === 'smallCard' && (
                                    <SmallCardMode
                                        filteredDownloadList={paginatedDownloadList}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={isModifyMode}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        canChangeSelection={canChangeSelection}
                                        displayMode={displayMode}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                    />
                                )}

                                {displayMode === 'holdCard' && (
                                    <BigCardMode
                                        filteredDownloadList={holdEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        showGalleries={false}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        onToggleIsError={handleToggleIsError}
                                        canChangeSelection={canChangeSelection}
                                        isLoading={isLoading}
                                        editingPathId={editingPathId}
                                        setEditingPathId={setEditingPathId}
                                        handleDownloadPathSave={handleDownloadPathSave}
                                        handleHoldChange={handleHoldChange}
                                        handlePriorityChange={handlePriorityChange}
                                        handleRemoveOne={handleRemoveOne}
                                        handleCreateAddDummyFromError={handleCreateAddDummyFromError}
                                        dummyCreateStatusByVid={dummyCreateStatusByVid}
                                        showAiSuggestionsPanel={false}
                                        selectedSuggestedPathByVid={selectedSuggestedPathByVid}
                                        setSelectedSuggestedPathByVid={setSelectedSuggestedPathByVid}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                        mergeSuggestedPathsForEntry={mergeSuggestedPathsForEntry}
                                        normalizePathKey={normalizePathKey}
                                        editingVersionId={editingVersionId}
                                        setEditingVersionId={setEditingVersionId}
                                        handleVersionIdSave={handleVersionIdSave}
                                    />
                                )}

                                {displayMode === 'earlyAccessCard' && (
                                    <BigCardMode
                                        filteredDownloadList={earlyAccessEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        showGalleries={false}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        onRefreshRecord={handleRefreshOneRecord}
                                        onRefreshModelVersionObject={handleRefreshModelVersionObjectOneRecord}
                                        onToggleIsError={handleToggleIsError}
                                        canChangeSelection={canChangeSelection}
                                        isLoading={isLoading}
                                        editingPathId={editingPathId}
                                        setEditingPathId={setEditingPathId}
                                        handleDownloadPathSave={handleDownloadPathSave}
                                        handleHoldChange={handleHoldChange}
                                        handlePriorityChange={handlePriorityChange}
                                        handleRemoveOne={handleRemoveOne}
                                        handleCreateAddDummyFromError={handleCreateAddDummyFromError}
                                        dummyCreateStatusByVid={dummyCreateStatusByVid}
                                        showAiSuggestionsPanel={false}
                                        selectedSuggestedPathByVid={selectedSuggestedPathByVid}
                                        setSelectedSuggestedPathByVid={setSelectedSuggestedPathByVid}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                        mergeSuggestedPathsForEntry={mergeSuggestedPathsForEntry}
                                        normalizePathKey={normalizePathKey}
                                        editingVersionId={editingVersionId}
                                        setEditingVersionId={setEditingVersionId}
                                        handleVersionIdSave={handleVersionIdSave}
                                    />
                                )}

                                {displayMode === 'recentCard' && (
                                    <BigCardMode
                                        filteredDownloadList={recentlyDownloaded}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        showGalleries={showGalleries}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        onRefreshRecord={handleRefreshOneRecord}
                                        onRefreshModelVersionObject={handleRefreshModelVersionObjectOneRecord}
                                        onToggleIsError={handleToggleIsError}
                                        canChangeSelection={canChangeSelection}
                                        isLoading={isLoading}
                                        editingPathId={editingPathId}
                                        setEditingPathId={setEditingPathId}
                                        handleDownloadPathSave={handleDownloadPathSave}
                                        handleHoldChange={handleHoldChange}
                                        handlePriorityChange={handlePriorityChange}
                                        handleRemoveOne={handleRemoveOne}
                                        handleCreateAddDummyFromError={handleCreateAddDummyFromError}
                                        dummyCreateStatusByVid={dummyCreateStatusByVid}
                                        showAiSuggestionsPanel={false}
                                        selectedSuggestedPathByVid={selectedSuggestedPathByVid}
                                        setSelectedSuggestedPathByVid={setSelectedSuggestedPathByVid}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                        mergeSuggestedPathsForEntry={mergeSuggestedPathsForEntry}
                                        normalizePathKey={normalizePathKey}
                                        displayMode="recentCard"
                                        editingVersionId={editingVersionId}
                                        setEditingVersionId={setEditingVersionId}
                                        handleVersionIdSave={handleVersionIdSave}
                                    />
                                )}

                                {displayMode === 'failedCard' && (
                                    <BigCardMode
                                        filteredDownloadList={failedEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        showGalleries={false}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        onRefreshRecord={handleRefreshOneRecord}
                                        onRefreshModelVersionObject={handleRefreshModelVersionObjectOneRecord}
                                        onToggleIsError={handleToggleIsError}
                                        canChangeSelection={canChangeSelection}
                                        isLoading={isLoading}
                                        editingPathId={editingPathId}
                                        setEditingPathId={setEditingPathId}
                                        handleDownloadPathSave={handleDownloadPathSave}
                                        handleHoldChange={handleHoldChange}
                                        handlePriorityChange={handlePriorityChange}
                                        handleRemoveOne={handleRemoveOne}
                                        handleCreateAddDummyFromError={handleCreateAddDummyFromError}
                                        dummyCreateStatusByVid={dummyCreateStatusByVid}
                                        showAiSuggestionsPanel={false}
                                        selectedSuggestedPathByVid={selectedSuggestedPathByVid}
                                        setSelectedSuggestedPathByVid={setSelectedSuggestedPathByVid}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                        mergeSuggestedPathsForEntry={mergeSuggestedPathsForEntry}
                                        normalizePathKey={normalizePathKey}
                                        displayMode="failedCard"
                                        editingVersionId={editingVersionId}
                                        setEditingVersionId={setEditingVersionId}
                                        handleVersionIdSave={handleVersionIdSave}
                                    />
                                )}

                                {displayMode === 'errorCard' && (
                                    <BigCardMode
                                        filteredDownloadList={errorEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        showGalleries={false}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        displayMode="errorCard"
                                        onErrorCardDownload={handleErrorCardDownload}
                                        onToggleIsError={handleToggleIsError}
                                        canChangeSelection={canChangeSelection}
                                        isLoading={isLoading}
                                        editingPathId={editingPathId}
                                        setEditingPathId={setEditingPathId}
                                        handleDownloadPathSave={handleDownloadPathSave}
                                        handleHoldChange={handleHoldChange}
                                        handlePriorityChange={handlePriorityChange}
                                        handleRemoveOne={handleRemoveOne}
                                        handleCreateAddDummyFromError={handleCreateAddDummyFromError}
                                        dummyCreateStatusByVid={dummyCreateStatusByVid}
                                        showAiSuggestionsPanel={false}
                                        selectedSuggestedPathByVid={selectedSuggestedPathByVid}
                                        setSelectedSuggestedPathByVid={setSelectedSuggestedPathByVid}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                        mergeSuggestedPathsForEntry={mergeSuggestedPathsForEntry}
                                        normalizePathKey={normalizePathKey}
                                        editingVersionId={editingVersionId}
                                        setEditingVersionId={setEditingVersionId}
                                        handleVersionIdSave={handleVersionIdSave}
                                    />
                                )}

                                {displayMode === 'aiCard' && (
                                    <BigCardMode
                                        filteredDownloadList={aiEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        handleOpenDownloadPath={handleOpenDownloadPath}
                                        showGalleries={showGalleries}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        onRefreshRecord={handleRefreshOneRecord}
                                        onRefreshModelVersionObject={handleRefreshModelVersionObjectOneRecord}
                                        onToggleIsError={handleToggleIsError}
                                        canChangeSelection={canChangeSelection}
                                        isLoading={isLoading}
                                        editingPathId={editingPathId}
                                        setEditingPathId={setEditingPathId}
                                        handleDownloadPathSave={handleDownloadPathSave}
                                        handleHoldChange={handleHoldChange}
                                        handlePriorityChange={handlePriorityChange}
                                        handleRemoveOne={handleRemoveOne}
                                        handleCreateAddDummyFromError={handleCreateAddDummyFromError}
                                        dummyCreateStatusByVid={dummyCreateStatusByVid}
                                        showAiSuggestionsPanel={true}
                                        selectedSuggestedPathByVid={selectedSuggestedPathByVid}
                                        setSelectedSuggestedPathByVid={setSelectedSuggestedPathByVid}
                                        styles={styles}
                                        isInteractiveClickTarget={isInteractiveClickTarget}
                                        isEntryEarlyAccess={isEntryEarlyAccess}
                                        getEarlyAccessEndsAt={getEarlyAccessEndsAt}
                                        formatLocalDateTime={formatLocalDateTime}
                                        normalizeImg={normalizeImg}
                                        withWidth={withWidth}
                                        buildSrcSet={buildSrcSet}
                                        mergeSuggestedPathsForEntry={mergeSuggestedPathsForEntry}
                                        normalizePathKey={normalizePathKey}
                                        displayMode="aiCard"
                                        editingVersionId={editingVersionId}
                                        setEditingVersionId={setEditingVersionId}
                                        handleVersionIdSave={handleVersionIdSave}
                                    />
                                )}

                            </>
                        )}
                    </div>

                    {/* Footer Area */}
                    {(displayMode === 'bigCard' ||
                        displayMode === 'smallCard' ||
                        displayMode === 'historyTable' ||
                        displayMode === 'aiCard') && (
                            <div style={styles.footerStyle}>
                                {(() => {
                                    const isHistory = displayMode === "historyTable";
                                    const isAi = displayMode === "aiCard";

                                    const page = isHistory
                                        ? historyPage
                                        : isAi
                                            ? aiPage
                                            : currentPage;

                                    const total = isHistory
                                        ? historyTotalPages
                                        : isAi
                                            ? aiTotalPages
                                            : totalPages;

                                    const totalItemsX = isHistory
                                        ? historyTotalItems
                                        : isAi
                                            ? aiTotalItems
                                            : totalItems;

                                    const perPage = isHistory
                                        ? historyItemsPerPage
                                        : isAi
                                            ? aiItemsPerPage
                                            : itemsPerPage;

                                    const start = totalItemsX === 0 ? 0 : (page - 1) * perPage + 1;
                                    const end = Math.min(page * perPage, totalItemsX);

                                    return (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                            <div style={{ fontWeight: 'bold', color: isDarkMode ? '#fff' : '#000' }}>
                                                Showing {start} - {end} of {totalItemsX} items
                                            </div>

                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <Pagination className="mb-0" size="sm" style={{ marginBottom: 0 }}>
                                                    <Pagination.First
                                                        onClick={() =>
                                                            isHistory
                                                                ? setHistoryPage(1)
                                                                : isAi
                                                                    ? setAiPage(1)
                                                                    : setCurrentPage(1)
                                                        }
                                                        disabled={page === 1}
                                                    >
                                                        <FaAngleDoubleLeft />
                                                    </Pagination.First>

                                                    <Pagination.Prev
                                                        onClick={() =>
                                                            isHistory
                                                                ? setHistoryPage(prev => Math.max(prev - 1, 1))
                                                                : isAi
                                                                    ? setAiPage(prev => Math.max(prev - 1, 1))
                                                                    : setCurrentPage(prev => Math.max(prev - 1, 1))
                                                        }
                                                        disabled={page === 1}
                                                    >
                                                        <FaAngleLeft />
                                                    </Pagination.Prev>

                                                    {Array.from({ length: total }, (_, index) => index + 1)
                                                        .slice(Math.max(page - 3, 0), page + 2)
                                                        .map(p => (
                                                            <Pagination.Item
                                                                key={p}
                                                                active={p === page}
                                                                onClick={() =>
                                                                    isHistory
                                                                        ? setHistoryPage(p)
                                                                        : isAi
                                                                            ? setAiPage(p)
                                                                            : setCurrentPage(p)
                                                                }
                                                            >
                                                                {p}
                                                            </Pagination.Item>
                                                        ))}

                                                    <Pagination.Next
                                                        onClick={() =>
                                                            isHistory
                                                                ? setHistoryPage(prev => Math.min(prev + 1, total))
                                                                : isAi
                                                                    ? setAiPage(prev => Math.min(prev + 1, total))
                                                                    : setCurrentPage(prev => Math.min(prev + 1, total))
                                                        }
                                                        disabled={page === total}
                                                    >
                                                        <FaAngleRight />
                                                    </Pagination.Next>

                                                    <Pagination.Last
                                                        onClick={() =>
                                                            isHistory
                                                                ? setHistoryPage(total)
                                                                : isAi
                                                                    ? setAiPage(total)
                                                                    : setCurrentPage(total)
                                                        }
                                                        disabled={page === total}
                                                    >
                                                        <FaAngleDoubleRight />
                                                    </Pagination.Last>
                                                </Pagination>
                                            </div>

                                            <Form.Select
                                                value={
                                                    isHistory
                                                        ? historyItemsPerPage
                                                        : isAi
                                                            ? aiItemsPerPage
                                                            : itemsPerPage
                                                }
                                                onChange={(e) => {
                                                    const next = parseInt(e.target.value, 10);

                                                    if (isHistory) {
                                                        setHistoryItemsPerPage(next);
                                                        setHistoryPage(1);
                                                    } else if (isAi) {
                                                        setAiItemsPerPage(next);
                                                        setAiPage(1);
                                                    } else {
                                                        setItemsPerPage(next);
                                                    }
                                                }}
                                                style={{
                                                    width: '170px',
                                                    padding: '5px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ccc',
                                                    backgroundColor: isDarkMode ? '#555' : '#fff',
                                                    color: isDarkMode ? '#fff' : '#000',
                                                }}
                                                aria-label="Items Per Page"
                                            >
                                                <option value={50}>50 items per page</option>
                                                <option value={100}>100 items per page</option>
                                                <option value={200}>200 items per page</option>
                                            </Form.Select>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                </div>

            </>

            {/* Scroll-to-top button */}
            <Button
                onClick={() => {
                    rightInnerRef.current?.scrollTo({ top: 0 });
                }}
                style={{
                    position: 'fixed',
                    bottom: '100px',
                    right: '70px',
                    zIndex: 2000,
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                }}
                aria-label="Scroll to top"
            >
                <FaArrowUp />
            </Button>

        </div >
    );
};

export default OfflineWindow;