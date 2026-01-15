// OfflineWindow.tsx

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';

// Store
import { useDispatch, useSelector } from 'react-redux';
import { updateDownloadFilePath } from '../../store/actions/chromeActions';

// Icons Components
import { AiFillFolderOpen, AiOutlineClose } from "react-icons/ai";
import { BsCloudDownloadFill, BsDownload } from 'react-icons/bs';
import { FaMagnifyingGlass, FaMagnifyingGlassPlus, FaSun, FaMoon, FaArrowRight } from "react-icons/fa6"; // Added FaSun and FaMoon
import { MdOutlineApps, MdOutlineTipsAndUpdates, MdOutlineDownloadForOffline, MdOutlineDownload, MdOutlinePendingActions } from "react-icons/md";
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
    fetchGetCategoriesPrefixsList,
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
    fetchRunPendingFromOfflineDownloadListAiSuggestion
} from "../../api/civitaiSQL_api"

import { makeOfflineWindowStyles } from "./OfflineWindow.styles";

import {
    bookmarkThisUrl,
} from "../../utils/chromeUtils"

// Ag-Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AppState } from '../../store/configureStore';
import FailedCardMode from './FailedCardMode';
import FileNameToggle from './FileNameToggle';
import TagList from './TagList';
import TitleNameToggle from './TitleNameToggle';
import TopTagsDropdown from './TopTagsDropdown';
import SimilarSearchPanel from './SimilarSearchPanel';
import DownloadPathEditor from './DownloadPathEditor';
import { setError } from '../../store/actions/errorsActions';
import { darkTheme, lightTheme } from './OfflineWindow.theme';


//TYPE
type DownloadMethod = 'server' | 'browser';
type DisplayMode = 'table'
    | 'bigCard'
    | 'smallCard'
    | 'failedCard'
    | 'errorCard'
    | 'updateCard'
    | 'recentCard'
    | 'holdCard'
    | 'earlyAccessCard';

type BatchStatus = "running" | "success" | "fail";

type BatchResult = {
    batchNo: number;
    start: number;
    end: number;
    status: BatchStatus;
    msg?: string;
};

type StatusFilter = 'pending' | 'non-pending' | 'both';

// TypeScript Interfaces
interface CivitaiModelFile {
    name: string;
    downloadUrl: string;
}

interface ModelVersionObject {
    id: number;
    modelId: number;
    name: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    publishedAt: string;
    trainedWords: string[];
    trainingStatus: any;
    trainingDetails: any;
    baseModel: string;
    baseModelType: any;
    earlyAccessEndsAt: any;
    availability?: 'EarlyAccess' | 'Public' | string;
    description: string;
    uploadType: string;
    air: string;
    stats: {
        downloadCount: number;
        ratingCount: number;
        rating: number;
        thumbsUpCount: number;
    };
    model: {
        name: string;
        type: string;
        nsfw: boolean;
        poi: boolean;
    };
    creator: {
        username: string;
        image: string;
    };
    files: {
        id: number;
        sizeKB: number;
        name: string;
        type: string;
        pickleScanResult: string;
        pickleScanMessage: string | null;
        virusScanResult: string;
        virusScanMessage: string | null;
        scannedAt: string;
        metadata: {
            format: string;
            size: any;
            fp: any;
        };
        hashes: {
            AutoV1: string;
            AutoV2: string;
            SHA256: string;
            CRC32: string;
            BLAKE3: string;
            AutoV3: string;
        };
        primary: boolean;
        downloadUrl: string;
    }[];
    images: {
        url: string;
        nsfwLevel: number;
        width: number;
        height: number;
        hash: string;
        type: string;
        metadata: {
            hash: string;
            size: number;
            width: number;
            height: number;
        };
        meta: any;
        availability: string;
        hasMeta: boolean;
        onSite: boolean;
    }[];
    downloadUrl: string;
}

export interface OfflineDownloadEntry {
    civitaiFileName: string;
    civitaiModelFileList: CivitaiModelFile[];
    modelVersionObject: ModelVersionObject;
    civitaiBaseModel: string;
    downloadFilePath: string;
    civitaiUrl: string;
    civitaiVersionID: string;
    civitaiModelID: string;
    imageUrlsArray: (string | { url: string; width?: number; height?: number; nsfw?: any })[];
    selectedCategory: string;
    civitaiTags: string[];
    hold?: boolean;
    isError?: boolean;
    downloadPriority?: number;           // 1..10
    earlyAccessEndsAt?: string | null;

    aiSuggestedArtworkTitle?: string | null;
    jikanNormalizedArtworkTitle?: string | null;

    aiSuggestedDownloadFilePath?: string[];      // e.g. ["/@scan@/ACG/.../", "@scan@/Update/.../"]
    jikanSuggestedDownloadFilePath?: string[];   // same shape
    localSuggestedDownloadFilePath?: string[];   // can be [] in your sample
}

interface BigCardModeProps {
    filteredDownloadList: OfflineDownloadEntry[];
    isDarkMode: boolean;
    isModifyMode: boolean;
    selectedIds: Set<string>;
    toggleSelect: (id: string) => void;
    handleSelectAll: (entries: OfflineDownloadEntry[]) => void;
    showGalleries: boolean;
    onToggleOverlay: (entry: OfflineDownloadEntry) => void;
    activePreviewId: string | null;

    // ⬇️ NEW props
    displayMode?: string;
    onErrorCardDownload?: (entry: OfflineDownloadEntry, method: 'server' | 'browser') => void;
}


// **1. SelectAllHeaderCheckbox Component**
interface SelectAllHeaderCheckboxProps {
    isChecked: boolean;
    isIndeterminate: boolean;
    onChange: (checked: boolean) => void;
}

const PENDING_PATH_RE = /[/\\]@scan@[/\\]acg[/\\]pending([/\\]|$)/i;

function isPendingEntry(entry: OfflineDownloadEntry): boolean {
    const p = (entry.downloadFilePath || '').trim();
    return PENDING_PATH_RE.test(p);
}

const SelectAllHeaderCheckbox: React.FC<SelectAllHeaderCheckboxProps> = ({ isChecked, isIndeterminate, onChange }) => {
    const checkboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate = isIndeterminate;
        }
    }, [isIndeterminate]);

    return (
        <input
            type="checkbox"
            ref={checkboxRef}
            checked={isChecked}
            onChange={(e) => onChange(e.target.checked)}
            style={{
                transform: 'scale(1.2)',
                cursor: 'pointer',
            }}
        />
    );
};

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
];

const AI_BATCH_SIZE = 10;
const AI_COOLDOWN_SECONDS = 90;
const DEFAULT_AI_SUGGEST_COUNT = 20;

const OfflineWindow: React.FC = () => {

    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const rightInnerRef = useRef<HTMLDivElement>(null);

    const chromeData = useSelector((state: AppState) => state.chrome);

    const modify_downloadFilePath = chromeData.downloadFilePath;
    const modify_selectedCategory = chromeData.selectedCategory;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [offlineDownloadList, setOfflineDownloadList] = useState<OfflineDownloadEntry[]>([]);
    const [displayMode, setDisplayMode] = useState<
        'table'
        | 'bigCard'
        | 'smallCard'
        | 'failedCard'
        | 'errorCard'
        | 'updateCard'
        | 'recentCard'
        | 'holdCard'
        | 'earlyAccessCard'
    >('bigCard');

    // States for filtering
    const [filterText, setFilterText] = useState('');
    const [filterCondition, setFilterCondition] = useState<'contains' | 'does not contain' | 'equals' | 'does not equal' | 'begins with' | 'ends with'>('contains');

    // State for selected IDs
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Theme state: true for dark mode, false for light mode
    const [isDarkMode, setIsDarkMode] = useState(true); // Dark mode is default

    // Modify Mode state
    const [isModifyMode, setIsModifyMode] = useState(false); // Modify mode is off by default

    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    const [selectedPatchFields, setSelectedPatchFields] = useState(new Set());
    const [bulkHold, setBulkHold] = useState(true);
    const [bulkDownloadPriority, setBulkDownloadPriority] = useState(5); // default 5 (1~10)

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

    // NEW: sort direction for date (server-side)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc'); // if you hate the type, you can drop it

    const [categoriesPrefixsList, setCategoriesPrefixsList] = useState<{ name: string; value: string; }[]>([]);
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

    const [excludedTags, setExcludedTags] = useState<string[]>([]);

    const [isCancelled, setIsCancelled] = useState(false);

    const [preventPendingPaths, setPreventPendingPaths] = useState(true);

    // LEFT OVERLAY (preview) state
    const [leftOverlayEntry, setLeftOverlayEntry] = useState<OfflineDownloadEntry | null>(null);

    const [goToPageInput, setGoToPageInput] = useState<string>('');

    // NEW: toggle AI Suggestions block (only used in Modify Mode UI)
    const [showAiSuggestionsPanel, setShowAiSuggestionsPanel] = useState(false);

    // NEW: keep what the user clicked in the AI suggestion list (per versionID)
    const [selectedSuggestedPathByVid, setSelectedSuggestedPathByVid] = useState({} as Record<string, string>);

    const [aiSuggestedOnly, setAiSuggestedOnly] = useState(false);

    const handleBulkPatchSelected = async () => {
        // 1) Targets = selected models (by versionID)
        const modelObjects = filteredDownloadList
            .filter((entry) => selectedIds.has(entry.civitaiVersionID))
            .map((entry) => ({
                civitaiModelID: entry.civitaiModelID,
                civitaiVersionID: entry.civitaiVersionID,
            }));

        if (!modelObjects.length) return;

        // 2) Patch = only fields in second block
        const patch = {} as Parameters<typeof fetchBulkPatchOfflineDownloadList>[1];

        if (selectedPatchFields.has("hold")) {
            patch.hold = bulkHold;                 // boolean
        }
        if (selectedPatchFields.has("downloadPriority")) {
            patch.downloadPriority = bulkDownloadPriority; // number 1~10
        }

        if (selectedPatchFields.has("downloadFilePath")) {
            const v = (modify_downloadFilePath || "").trim();
            if (!v) {
                dispatch(setError({ hasError: true, errorMessage: "downloadFilePath is empty." }));
                return;
            }
            patch.downloadFilePath = v;
        }

        setIsPatching(true);
        try {
            await fetchBulkPatchOfflineDownloadList(modelObjects, patch, dispatch);

            // ---------------------------
            // ✅ Reset UI to defaults
            // ---------------------------

            // 1) Reset bulk controls
            setBulkHold(true);                 // change to false if your "default" is false
            setBulkDownloadPriority(5);

            // reset modify_downloadFilePath to default
            dispatch(updateDownloadFilePath("/@scan@/ACG/Pending/"));

            // 2) Clear the patch-field selection blocks
            setSelectedPatchFields(new Set());

            // 3) Clear selected models
            setSelectedIds(new Set());

            // 4) Refresh list
            await handleRefreshList();

            // Optional UX:
            // clear selected models after patch
            // setSelectedIds(new Set());   <-- depends on how you store selectedIds
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

    const removePatchField = (key: any) => {
        setSelectedPatchFields((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    };

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

    // how many tags per page
    const TAGS_PER_PAGE = 100;

    // 1) On mount, fetch the initial list of excluded tags from the server
    useEffect(() => {
        fetchExcludedTags();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadSpecialList = async () => {
            // Only react when switching into one of these modes
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
        const selected = Array.from(selectedPrefixes ?? []);
        const isPendingPrefix = (p: string) =>
            PENDING_PATHS.includes(p) || /\/@scan@\/ACG\/Pending\/?$/.test(p);

        const onlyPending = selected.filter(isPendingPrefix);
        const onlyNonPending = selected.filter(p => !isPendingPrefix(p));

        // Both toggles on → whatever user selected (or nothing → means "no server filter")
        if (showPending && showNonPending) {
            return selected.length ? selected : []; // ← let server include all
        }

        // Pending only
        if (showPending && !showNonPending) {
            return onlyPending.length ? onlyPending : PENDING_PATHS;
        }

        // Non-Pending only
        if (!showPending && showNonPending) {
            // If user picked some non-pending prefixes, use them.
            // If not, ask server for “everything except pending”.
            return onlyNonPending.length ? onlyNonPending : [SENTINELS.EXCLUDE_PENDING];
        }

        // Neither checked → explicitly zero results
        return [SENTINELS.NONE];
    }, [selectedPrefixes, showPending, showNonPending]);



    useEffect(() => {
        const loadPrefixes = async () => {
            const list = await fetchGetCategoriesPrefixsList(dispatch);
            if (Array.isArray(list)) {
                // remove the “Default” / empty‐value entry
                const filtered = list.filter(p => p.value !== "");

                // Add a virtual “Updates” option that matches ANY path containing /@scan@/Update/
                const enhanced = [
                    ...filtered,
                    { name: 'Updates (any folder)', value: '/@scan@/Update/' },
                ];

                setCategoriesPrefixsList(enhanced);

                // Start with everything selected EXCEPT '/@scan@/' and the virtual Updates option
                const DEFAULT_UNCHECKED = new Set<string>(['/@scan@/', '/@scan@/Update/']);
                const initialChecked = enhanced
                    .filter(p => !DEFAULT_UNCHECKED.has(p.value))
                    .map(p => p.value);

                setSelectedPrefixes(new Set(initialChecked));
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
        setIsDarkMode(prevMode => !prevMode);
    };

    const toggleAiSuggestionsPanel = () => {
        const next = !showAiSuggestionsPanel; // header controls open/close
        setShowAiSuggestionsPanel(next);
        setAiSuggestedOnly(next);
    };


    const toggleModifyMode = () => {
        setIsModifyMode(prev => {
            const next = !prev;

            if (next) {
                setShowPending(true);
                setShowNonPending(false);
            } else {
                setShowPending(true);
                setShowNonPending(true);
            }
            return next;
        });

        setSelectedIds(new Set());
        setFilterText("");
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
        let cancelled = false;

        const timer = setTimeout(async () => {
            if (cancelled) return;

            // If neither is selected, clear and bail
            if (!showPending && !showNonPending) {
                setUiMode('idle');
                setOfflineDownloadList([]);
                setServerTotalItems(0);
                setServerTotalPages(1);
                setIsLoading(false);
                return;
            }

            const status: StatusFilter = deriveStatus(showPending, showNonPending);

            setUiMode('paging');
            setIsLoading(true);

            try {
                const page0 = Math.max(0, currentPage - 1);
                const prefixes = getActivePrefixes();

                const p = await fetchOfflineDownloadListPage(
                    dispatch,
                    page0,
                    itemsPerPage,
              /* filterEmptyBaseModel */ false,
                    prefixes,
              /* search */ filterText.trim(),
              /* op */ filterCondition,
              /* status */ status,
                    showHoldEntries,              // NEW
                    showEarlyAccess,  // NEW
                    sortDir,
                    showErrorEntries,
                    aiSuggestedOnly
                );

                if (!cancelled) {
                    setOfflineDownloadList(Array.isArray(p?.content) ? p.content : []);
                    setServerTotalItems(p?.totalElements ?? 0);
                    setServerTotalPages(p?.totalPages ?? 1);
                }
            } catch (e: any) {
                if (!cancelled) {
                    console.error('Paged fetch failed:', e?.message || e);
                    setOfflineDownloadList([]);
                    setServerTotalItems(0);
                    setServerTotalPages(1);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                    setUiMode('idle');
                }
            }
        }, 200);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [
        dispatch,
        currentPage,
        itemsPerPage,
        getActivePrefixes,
        filterText,
        filterCondition,
        showPending,
        showNonPending,
        showHoldEntries,   // add
        showEarlyAccess,   // add
        sortDir,
        showErrorEntries,
        aiSuggestedOnly
    ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [getActivePrefixes]);


    useEffect(() => {
        // Reset the selection when filterText or filterCondition changes
        setSelectedIds(new Set());
    }, [filterText, filterCondition]);

    const handleDownloadPathSave = async (
        entry: OfflineDownloadEntry,
        nextPath: string
    ) => {
        const trimmed = nextPath.trim();
        const prevPath = entry.downloadFilePath ?? "";

        // Nothing changed → just close
        if (!trimmed || trimmed === prevPath.trim()) {
            setEditingPathId(null);
            return;
        }

        const matcher = (e: OfflineDownloadEntry) =>
            e.civitaiModelID === entry.civitaiModelID &&
            e.civitaiVersionID === entry.civitaiVersionID;

        // Optimistic update
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
        } catch (err: any) {
            // Revert on failure
            updateEntryLocal(matcher, { downloadFilePath: prevPath });
            alert(`Failed to update download path: ${err?.message || "Unknown error"}`);
        } finally {
            setEditingPathId(null);
        }
    };

    const filteredDownloadList = useMemo(() => {
        const base = offlineDownloadList;

        // pending/non-pending filter
        const pendingFiltered = base.filter(entry => {
            const pending = isPendingEntry(entry); // you already have this helper
            return (showPending && pending) || (showNonPending && !pending);
        });

        const extraFiltered = pendingFiltered.filter(entry => {
            // Early Access filter:
            // if checkbox is OFF and this entry is still Early Access -> hide it
            if (!showEarlyAccess && isEarlyAccessActive(entry)) {
                return false;
            }
            return true;
        });

        if (!isModifyMode) {
            return [...extraFiltered].sort((a, b) => {
                const aSelected = selectedIds.has(a.civitaiVersionID) ? 1 : 0;
                const bSelected = selectedIds.has(b.civitaiVersionID) ? 1 : 0;
                return bSelected - aSelected;
            });
        }
        return extraFiltered;
    }, [offlineDownloadList, selectedIds, isModifyMode, showPending, showNonPending,
        showHoldEntries, showEarlyAccess, showErrorEntries, aiSuggestedOnly]);

    useEffect(() => {
        setSelectedIds(new Set());
    }, [filterText, filterCondition]);

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
        setLeftOverlayEntry(prev => (prev?.civitaiVersionID === entry.civitaiVersionID ? null : entry));
    }, []);

    const closeLeftOverlay = useCallback(() => setLeftOverlayEntry(null), []);

    // ESC to close
    useEffect(() => {
        if (!leftOverlayEntry) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLeftOverlay(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [leftOverlayEntry, closeLeftOverlay]);

    // Function to style rows
    const getRowStyle = (params: any) => {
        const isEven = params.node.rowIndex % 2 === 0;
        const isSelected = selectedIds.has(params.data.versionid);
        return {
            backgroundColor: isSelected
                ? isDarkMode
                    ? '#666666'
                    : '#e0e0e0'
                : isEven
                    ? currentTheme.evenRowBackgroundColor
                    : currentTheme.oddRowBackgroundColor,
            color: currentTheme.rowFontColor,
        };
    };

    // Function to style cells
    const cellStyle = (params: any) => ({
        color: currentTheme.rowFontColor,
    });

    // **2. Compute Select All Checkbox State**
    const isAllSelected = filteredDownloadList.length > 0 && filteredDownloadList.every(entry => selectedIds.has(entry.civitaiVersionID));
    const isIndeterminate = filteredDownloadList.some(entry => selectedIds.has(entry.civitaiVersionID)) && !isAllSelected;

    // **3. Define column definitions for Ag-Grid with dynamic styles**
    const columnDefs: ColDef[] = [
        {
            headerName: 'ID',
            field: 'id',
            width: 60,
            cellStyle: { textAlign: 'center', padding: '5px' } // Center-align ID column 
        },
        {
            headerName: "",
            field: "select",
            sortable: false,
            filter: false,
            width: 50,
            // **4. Add headerComponentFramework and headerComponentParams for Select All functionality**
            headerComponent: SelectAllHeaderCheckbox,
            headerComponentParams: {
                isChecked: isAllSelected,
                isIndeterminate: isIndeterminate,
                onChange: (checked: boolean) => {
                    if (checked) {
                        // Select all filtered entries
                        const newSelectedIds = new Set(selectedIds);
                        filteredDownloadList.forEach(entry => newSelectedIds.add(entry.civitaiVersionID));
                        setSelectedIds(newSelectedIds);
                    } else {
                        // Unselect all filtered entries
                        const newSelectedIds = new Set(selectedIds);
                        filteredDownloadList.forEach(entry => newSelectedIds.delete(entry.civitaiVersionID));
                        setSelectedIds(newSelectedIds);
                    }
                }
            },
            cellRenderer: (params: any) => (
                <input
                    type="checkbox"
                    checked={selectedIds.has(params.data.versionid)}
                    onChange={() => toggleSelect(params.data.versionid)}
                    style={{
                        transform: 'scale(1.2)',
                        cursor: isModifyMode ? 'pointer' : 'not-allowed',
                        accentColor: isDarkMode ? '#fff' : '#000',
                    }}
                />
            ),
            headerClass: 'custom-header', // Optional: for additional styling
        },
        {
            headerName: 'Title',
            field: 'title',
            flex: 1,
            tooltipField: 'title', // This tells AG Grid to show the field's content as tooltip
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: 'Model Name',
            field: 'modelName',
            flex: 1,
            tooltipField: 'modelName', // This tells AG Grid to show the field's content as tooltip
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: 'Version Name',
            field: 'versionName',
            flex: 1,
            tooltipField: 'versionName',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: "Model ID",
            field: "modelId",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
        },
        {
            headerName: "Version ID",
            field: "versionid",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
        },
        {
            headerName: "Base Model",
            field: "baseModel",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
        },
        {
            headerName: 'URL',
            field: 'url',
            flex: 2, // give URL more space
            tooltipField: 'url',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '5px',
            },
            cellRenderer: (params: any) => {
                return (
                    <span
                        style={{
                            display: 'inline-block',
                            width: '100%',
                            userSelect: 'text', // optional: let user copy
                        }}
                    >
                        {params.value}
                    </span>
                );
            },
        },
        {
            headerName: 'FilePath',
            field: 'filepath',
            flex: 1,
            tooltipField: 'filepath',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: 'Category',
            field: 'category',
            flex: 1,
            tooltipField: 'category',
            cellStyle: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        },
        {
            headerName: "Early Access",
            field: "earlyAccessDisplay",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
        },
        {
            headerName: "File Size (MB)",
            field: "filesize",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
        }
    ];
    const currentTheme = React.useMemo(
        () => (isDarkMode ? darkTheme : lightTheme),
        [isDarkMode]
    );

    const styles = React.useMemo(
        () => makeOfflineWindowStyles({ isDarkMode, currentTheme, leftOverlayEntry }),
        [isDarkMode, currentTheme, leftOverlayEntry]
    );

    // Prepare row data by extracting necessary fields and computing file size
    const rowData = useMemo(() => {
        return filteredDownloadList.map((entry, index) => {
            // Safely access modelVersionObject and files
            const safetensorFile = entry.modelVersionObject?.files?.find(file => file.name.endsWith('.safetensors'));
            const filesizeMB = safetensorFile ? (safetensorFile.sizeKB / 1024).toFixed(2) : 'N/A';

            return {
                id: index + 1,
                title: entry?.modelVersionObject?.model?.name ?? 'N/A',
                modelName: entry.civitaiFileName ?? 'N/A',
                versionName: entry.modelVersionObject?.name ?? 'N/A',
                modelId: entry.modelVersionObject?.modelId ?? 'N/A',
                versionid: entry.civitaiVersionID ?? 'N/A',
                baseModel: entry.modelVersionObject?.baseModel ?? 'N/A',
                category: entry.selectedCategory ?? 'N/A',
                filepath: entry.downloadFilePath ?? 'N/A',
                url: entry.civitaiUrl ?? 'N/A',
                creator: entry.modelVersionObject?.creator?.username ?? 'N/A',
                filesize: filesizeMB + " MB",
                earlyAccessDisplay: earlyAccessLabel(entry),
            };
        });
    }, [filteredDownloadList]);


    // Define default column properties
    const defaultColDef: ColDef = {
        flex: 1,
        minWidth: 150,
        resizable: true,
        cellStyle: cellStyle,
    };

    const badgeCount = (n: number) => (String(n));

    // Function to toggle selection
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const handleRefreshList = async () => {
        if (isLoading) return;

        setFailedEntries([]);
        try {
            setIsLoading(true);
            const page0 = Math.max(0, currentPage - 1);
            const prefixes = getActivePrefixes();
            const status: StatusFilter = deriveStatus(showPending, showNonPending);

            const p = await fetchOfflineDownloadListPage(
                dispatch,
                page0,
                itemsPerPage,
                /* filterEmptyBaseModel */ false,
                prefixes,
                /* search */ filterText.trim(),
                /* op */ filterCondition,
                /* status */ status,
                showHoldEntries,              // NEW
                showEarlyAccess,  // NEW
                sortDir,
                showErrorEntries,
                aiSuggestedOnly
            );

            setOfflineDownloadList(Array.isArray(p.content) ? p.content : []);
            setServerTotalItems(p.totalElements ?? 0);
            setServerTotalPages(p.totalPages ?? 1);
        } catch (error: any) {
            console.error("Failed to refresh the download list:", error.message);
            alert("Failed to refresh the download list. Please try again later.");
        } finally {
            setIsLoading(false);
        }

        try {
            fetchExcludedTags();
        } catch (error: any) {
            console.error("Failed to refresh pending remove tag list:", error.message);
            alert("Failed to refresh the pending remove tag list. Please try again later.");
        }
    };

    // Refresh helper: re-fetch the current page from the server
    const refreshCurrentPage = async () => {
        try {
            const page0 = Math.max(0, currentPage - 1); // UI 1-based → server 0-based
            const prefixes = getActivePrefixes();
            const status: StatusFilter = deriveStatus(showPending, showNonPending);

            const p = await fetchOfflineDownloadListPage(
                dispatch,
                page0,
                itemsPerPage,
                false,
                prefixes,
                filterText.trim(),
                filterCondition,
                status,
                showHoldEntries,              // NEW
                showEarlyAccess,  // NEW
                sortDir,
                showErrorEntries,
                aiSuggestedOnly
            );

            setOfflineDownloadList(Array.isArray(p.content) ? p.content : []);
            setServerTotalItems(p.totalElements ?? 0);
            setServerTotalPages(p.totalPages ?? 1);
        } catch (error: any) {
            console.error("Failed to fetch updated download list:", error.message);
            setOfflineDownloadList([]);
            setServerTotalItems(0);
            setServerTotalPages(1);
            setSelectedIds(new Set());
        }
    };

    // Function to handle "Download Now" button click
    const handleDownloadNow = async () => {
        console.log("Download Now button clicked");

        // Collect selected entries from the filtered list
        const entriesToDownload = filteredDownloadList.filter(entry => {
            // Must be selected
            const isSelected = selectedIds.has(entry.civitaiVersionID);
            const isEarly = isEarlyAccessActive(entry);

            // Grab early access date and file path
            const downloadFilePath = entry.downloadFilePath ?? "";

            // Check if file path indicates pending
            const isPendingPath =
                downloadFilePath === "/@scan@/ACG/Pending" ||
                downloadFilePath === "/@scan@/ACG/Pending/";

            // Exclude if still in early access or if file path is pending
            const shouldExclude = (!allowTryEarlyAccess && isEarly) || isPendingPath;

            return isSelected && !shouldExclude;
        });

        if (entriesToDownload.length === 0) {
            alert(
                allowTryEarlyAccess
                    ? "No valid entries to download. They may be pointing to /@scan@/ACG/Pending."
                    : "No valid entries to download. Either they're Early Access or pointing to /@scan@/ACG/Pending."
            );
            return;
        }


        setDownloadProgress({ completed: 0, total: entriesToDownload.length });
        setFailedEntries([]);
        // setCompletedCount(0);
        setIsCancelled(false);

        // Called after each file completes
        const handleEachDownloadComplete = async (success: boolean, entry: OfflineDownloadEntry) => {
            if (!success) setFailedEntries(prev => [...prev, entry]);

            setDownloadProgress(prev => ({ completed: prev.completed + 1, total: prev.total }));

            // Re-fetch only the current page (not the whole list)
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
                isCancelledRef
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

            const civitaiUrl = `https://civitai.com/models/${modelID}?modelVersionId=${versionID}`;

            // Prefer modelVersionObject embedded on the entry if it exists,
            // otherwise fall back to calling the API.
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

            // Use the per-entry path if it exists and is not 'N/A', otherwise
            // fall back to the global modify_downloadFilePath from your toolbar.
            const offlinePath =
                entry.downloadFilePath && entry.downloadFilePath !== "N/A"
                    ? entry.downloadFilePath
                    : "";

            const downloadFilePath = offlinePath || modify_downloadFilePath;

            // Block the Pending path exactly like your old ErrorCardMode
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
                alert(
                    "Some required data is missing. Please check the model information and try again."
                );
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

            try {
                if (method === "server") {
                    const isDownloadSuccessful = await fetchDownloadFilesByServer_v2(
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

                    if (isDownloadSuccessful) {
                        await fetchAddRecordToDatabase(
                            modify_selectedCategory,
                            civitaiUrl,
                            downloadFilePath,
                            dispatch
                        );
                        bookmarkThisUrl(
                            modelVersionObject?.model?.type ?? "N/A",
                            civitaiUrl,
                            `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                        );
                    }
                } else {
                    // Browser mode
                    const data = modelVersionObject;

                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.runtime.sendMessage({
                            action: "browser-download_v2_background",
                            data: { ...modelObject, modelVersionObject: data },
                        });
                    });

                    await fetchAddRecordToDatabase(
                        modify_selectedCategory,
                        civitaiUrl,
                        downloadFilePath,
                        dispatch
                    );
                    bookmarkThisUrl(
                        modelVersionObject?.model?.type ?? "N/A",
                        civitaiUrl,
                        `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                    );
                }

                console.log("ErrorCard model download initiated.");
            } catch (error) {
                console.error("Error during ErrorCard download:", error);
                alert("Failed to initiate download. Please try again.");
            }
        },
        [dispatch, modify_downloadFilePath, modify_selectedCategory]
    );


    /**
 * Download selected entries in batches of 10.
 * Wait for all entries in one batch to finish before moving to the next batch.
 */
    const downloadSelectedEntries = async (
        entriesToDownload: OfflineDownloadEntry[],
        dispatch: any,
        onDownloadComplete: (success: boolean, entry: OfflineDownloadEntry) => void,
        isPausedRef: React.MutableRefObject<boolean>,
        isCancelledRef: React.MutableRefObject<boolean>
    ) => {
        const CONCURRENCY_LIMIT = 5;
        const BATCH_SIZE = 10;
        const semaphore = new Semaphore(CONCURRENCY_LIMIT);

        // Split the entries into chunks (batches) of BATCH_SIZE
        const batches = chunkArray(entriesToDownload, BATCH_SIZE);

        let batchIndex = 0;
        for (const batch of batches) {
            if (isCancelledRef.current) {
                console.log("Download process cancelled before batch:", batchIndex);
                break;
            }

            // Range text for this batch (1-based)
            const start = batchIndex * BATCH_SIZE + 1;
            const end = Math.min((batchIndex + 1) * BATCH_SIZE, entriesToDownload.length);
            setCurrentBatchRange(`Now processing ${start} ~ ${end}, please wait until processing next ${BATCH_SIZE}.`);

            console.log(`Processing batch #${batchIndex + 1} (size: ${batch.length})`);

            // Start downloads for this batch with concurrency limit
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

                // Random 5–15s delay before starting this item
                const delayMilliseconds = 5000 + Math.random() * 10000;
                const delaySeconds = Math.ceil(delayMilliseconds / 1000);
                setInitiationDelay(delaySeconds);
                console.log(`Waiting ${delaySeconds}s before starting ${entry.civitaiFileName}...`);
                await sleep(delayMilliseconds);
                setInitiationDelay(null);

                // Acquire a slot in the semaphore
                const task = semaphore.acquire(async () => {
                    let success = true;
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

                        const isDownloadSuccessful = await fetchDownloadFilesByServer_v2(
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

                        if (isDownloadSuccessful) {
                            setRecentlyDownloaded(prev => {
                                const key = `${entry.civitaiModelID}|${entry.civitaiVersionID}`;
                                const dedup = prev.filter(e => `${e.civitaiModelID}|${e.civitaiVersionID}` !== key);
                                const snap = JSON.parse(JSON.stringify(entry));
                                return [snap, ...dedup].slice(0, 200);
                            });

                            if (!entry.downloadFilePath.includes("/@scan@/Update/")) {
                                await fetchAddRecordToDatabase(selectedCategory, civitaiUrl, downloadFilePath, dispatch);
                            }
                            bookmarkThisUrl(
                                modelVersionObject?.model?.type ?? "N/A",
                                civitaiUrl,
                                `${modelVersionObject?.model?.name ?? "N/A"} - ${civitaiModelID} | Stable Diffusion LoRA | Civitai`
                            );
                        } else {
                            success = false;
                        }
                    } catch (err) {
                        console.error("Download failed for", entry.civitaiFileName, err);
                        success = false;
                    } finally {
                        // Notify caller/UI that this item finished
                        onDownloadComplete(success, entry);
                    }
                });

                tasks.push(task);

                if (isCancelledRef.current) {
                    console.log("Download cancelled after initiating some tasks in batch.");
                    break;
                }
            }

            // Wait for all items in this batch
            await Promise.allSettled(tasks);

            console.log(`Batch #${batchIndex + 1} completed.`);

            if (isCancelledRef.current) {
                console.log("Download process cancelled after completing a batch.");
                break;
            }

            // 60-second cooldown between batches
            console.log("Starting 60-second cooldown before next batch...");
            setBatchCooldown(60);
            await sleep(60000);
            setBatchCooldown(null);

            batchIndex++;
        }

        // Wait for any leftover concurrency to drain
        while ((semaphore as any).activeCount > 0) {
            await sleep(500);
        }
        console.log("All batches processed or cancelled.");

        // Clear range message
        setCurrentBatchRange(null);

        // FINAL REFRESH: re-fetch the current server page (not the whole list)
        try {
            const page0 = Math.max(0, currentPage - 1); // UI 1-based → server 0-based
            const prefixes = getActivePrefixes();
            const status: StatusFilter = deriveStatus(showPending, showNonPending);

            const p = await fetchOfflineDownloadListPage(
                dispatch,
                page0,
                itemsPerPage,
                /* filterEmptyBaseModel */ false,
                prefixes,
                /* search */ filterText.trim(),
                /* op */ filterCondition,
                /* status */ status,
                showHoldEntries,              // NEW
                showEarlyAccess,  // NEW
                sortDir,
                showErrorEntries,
                aiSuggestedOnly
            );

            if (Array.isArray(p.content)) {
                setOfflineDownloadList(p.content);
                setSelectedIds(new Set());
                setServerTotalItems(p.totalElements ?? 0);
                setServerTotalPages(p.totalPages ?? 1);
            } else {
                console.warn("paged fetch returned non-array content:", p.content);
                setOfflineDownloadList([]);
                setSelectedIds(new Set());
                setServerTotalItems(0);
                setServerTotalPages(1);
            }
        } catch (error: any) {
            console.error("Failed to refresh current page after all batches:", error.message);
            setOfflineDownloadList([]);
            setSelectedIds(new Set());
            setServerTotalItems(0);
            setServerTotalPages(1);
        }
    };

    // ---- Early Access helpers ----
    function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

    function formatLocalDateTime(isoOrDate: string | Date): string {
        const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
        if (Number.isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    }

    function getEarlyAccessEndsAt(entry: OfflineDownloadEntry): Date | null {
        if (!entry.earlyAccessEndsAt) return null;
        const d = new Date(entry.earlyAccessEndsAt);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function isEarlyAccessActive(entry: OfflineDownloadEntry, now = new Date()): boolean {
        const ends = getEarlyAccessEndsAt(entry);
        if (!ends) return false;              // no date -> treat as Public
        return ends.getTime() > now.getTime(); // only active if in the future
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


    const handleDisplayModeClick = (mode: DisplayMode) => {
        if (displayMode === mode) {
            // Already in this mode → treat as "refresh"

            // 1) Always refresh the main paged list
            void handleRefreshList();

            // 2) If this is a special card mode, also force its list to reload
            if (
                mode === 'holdCard' ||
                mode === 'earlyAccessCard' ||
                mode === 'errorCard'
            ) {
                setSpecialReloadToken((t) => t + 1);
            }
        } else {
            // Normal switch between modes
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
            const selectedEntries = filteredDownloadList.filter(entry =>
                selectedIds.has(entry.civitaiVersionID)
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
            const status: StatusFilter = deriveStatus(showPending, showNonPending);

            const p = await fetchOfflineDownloadListPage(
                dispatch,
                page0,
                itemsPerPage,
                /* filterEmptyBaseModel */ false,
                prefixes,
                /* search */ filterText.trim(),
                /* op */ filterCondition,
                /* status */ status,
                showHoldEntries,              // NEW
                showEarlyAccess,  // NEW
                sortDir,
                showErrorEntries,
                aiSuggestedOnly
            );

            // If current page is now past the end, jump to last page
            const newTotalPages = Math.max(1, p.totalPages || 1);
            if ((p.content?.length ?? 0) === 0 && (p.totalElements ?? 0) > 0 && currentPage > newTotalPages) {
                setCurrentPage(newTotalPages);
            } else {
                setOfflineDownloadList(Array.isArray(p.content) ? p.content : []);
                setServerTotalItems(p.totalElements ?? 0);
                setServerTotalPages(newTotalPages);
            }

            setSelectedIds(new Set());

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

        setUiMode('removing');
        setIsLoading(true);

        // optimistic remove
        const key = `${entry.civitaiModelID}|${entry.civitaiVersionID}`;
        const prevList = offlineDownloadList;
        setOfflineDownloadList(prev => prev.filter(e => `${e.civitaiModelID}|${e.civitaiVersionID}` !== key));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(entry.civitaiVersionID);
            return next;
        });

        try {
            await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                { civitaiModelID: entry.civitaiModelID, civitaiVersionID: entry.civitaiVersionID },
                dispatch
            );

            // refresh current page so totals/paging stay correct
            const page0 = Math.max(0, currentPage - 1);
            const prefixes = getActivePrefixes();
            const status: StatusFilter = deriveStatus(showPending, showNonPending);

            const p = await fetchOfflineDownloadListPage(
                dispatch,
                page0,
                itemsPerPage,
            /* filterEmptyBaseModel */ false,
                prefixes,
            /* search */ filterText.trim(),
            /* op */ filterCondition,
            /* status */ status,
                showHoldEntries,              // NEW
                showEarlyAccess,  // NEW
                sortDir,
                showErrorEntries,
                aiSuggestedOnly
            );

            setOfflineDownloadList(Array.isArray(p?.content) ? p.content : []);
            setServerTotalItems(p?.totalElements ?? 0);
            setServerTotalPages(p?.totalPages ?? 1);
        } catch (err: any) {
            alert(`Failed to remove: ${err?.message || 'Unknown error'}`);
            setOfflineDownloadList(prevList); // revert
        } finally {
            setIsLoading(false);
            setUiMode('idle');
        }
    };

    const handleSelectFirstN = () => {
        // Create a Set of combined civitaiVersionID and civitaiModelID for efficient lookup
        const failedIds = new Set(
            failedEntries.map(entry => `${entry.civitaiVersionID}|${entry.civitaiModelID}`)
        );

        // Apply the same exclusion criteria as in handleDownloadNow
        const validEntries = filteredDownloadList.filter(entry => {
            const isEarlyActive = isEarlyAccessActive(entry); // <-- use ACTIVE check
            const downloadFilePath = entry.downloadFilePath ?? "";

            const isPendingPath =
                downloadFilePath === "/@scan@/ACG/Pending" ||
                downloadFilePath === "/@scan@/ACG/Pending/";

            const combinedId = `${entry.civitaiVersionID}|${entry.civitaiModelID}`;

            // Include if NOT early-active, NOT pending, and NOT previously failed
            return !isEarlyActive && !isPendingPath && !failedIds.has(combinedId);
        });


        // Select the first N entries from the valid entries
        const firstN = validEntries.slice(0, selectCount);

        // Build a new Set with the civitaiVersionIDs of the selected entries
        const newSelected = new Set<string>(
            firstN.map(entry => entry.civitaiVersionID)
        );

        // Update the selectedIds state with the new selection
        setSelectedIds(newSelected);
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

    const PreviewCard: React.FC<{ entry: OfflineDownloadEntry; isDarkMode: boolean }> = ({ entry, isDarkMode }) => {
        const showEA = isEntryEarlyAccess(entry);
        const [activeIdx, setActiveIdx] = React.useState(0);
        return (
            <Card
                style={{
                    width: '100%',
                    maxWidth: 520,
                    margin: '0 auto',
                    border: isDarkMode ? '1px solid #666' : '1px solid #ccc',
                    borderRadius: 10,
                    backgroundColor: isDarkMode ? '#333' : '#fff',
                    color: isDarkMode ? '#fff' : '#000',
                    boxShadow: isDarkMode ? '2px 2px 12px rgba(255,255,255,0.08)' : '2px 2px 12px rgba(0,0,0,0.1)',
                    position: 'relative',
                    padding: 12
                }}
            >
                {showEA && (
                    <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: isDarkMode ? '#444' : '#fff',
                        color: 'red', fontWeight: 700, fontSize: '.8rem',
                        border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
                        padding: '2px 6px', borderRadius: 6
                    }}>
                        {(() => {
                            const ends = getEarlyAccessEndsAt(entry);
                            return ends ? formatLocalDateTime(ends) : 'Early Access Only';
                        })()}

                    </div>
                )}

                <div style={{
                    display: 'flex', alignItems: 'center',
                    marginTop: 10, marginBottom: 6,
                    borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`, paddingBottom: 6
                }}>
                    {entry.modelVersionObject?.baseModel && (
                        <span style={{
                            fontSize: '.75rem', fontWeight: 700, background: '#007bff',
                            color: '#fff', padding: '2px 8px', borderRadius: 6, marginRight: 8
                        }}>
                            {entry.modelVersionObject.baseModel}
                        </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <TitleNameToggle titleName={entry?.modelVersionObject?.model?.name ?? 'N/A'} truncateAfter={40} />
                    </div>
                </div>

                {entry.imageUrlsArray?.length ? (
                    <div style={{ height: 400, overflow: 'hidden' }}>
                        <Carousel
                            variant={isDarkMode ? 'dark' : 'light'}
                            indicators={entry.imageUrlsArray.length > 1}
                            controls={entry.imageUrlsArray.length > 1}
                            interval={null}
                            style={{ height: '100%', marginBottom: 0, overflow: 'hidden' }}
                            activeIndex={activeIdx}
                            onSelect={(next) => setActiveIdx(next as number)}
                        >
                            {entry.imageUrlsArray.map((img, idx) => {
                                const { url } = normalizeImg(img as any);
                                const len = entry.imageUrlsArray.length;

                                const isActive = idx === activeIdx;
                                const isNear =
                                    idx === (activeIdx + 1) % len || idx === (activeIdx - 1 + len) % len;

                                // choose “tiers” of sizes
                                const widths = isActive
                                    ? [520, 720, 960]  // sharp for current slide
                                    : isNear
                                        ? [400, 520]       // medium for next/prev
                                        : [200, 320];      // tiny thumbnails for others

                                return (
                                    <Carousel.Item key={idx} style={{ height: '400px' }}>
                                        <div
                                            style={{
                                                height: '100%',
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: isDarkMode ? '#2b2b2b' : '#f5f5f5',
                                                borderRadius: 6,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <img
                                                className="d-block"
                                                // use a small src, let srcSet upgrade when active
                                                src={withWidth(url, widths[0])}
                                                srcSet={buildSrcSet(url, widths)}
                                                sizes="(max-width: 560px) 100vw, 520px"
                                                loading={isActive ? 'eager' : 'lazy'}
                                                decoding="async"
                                                alt={`Preview ${idx + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    display: 'block',
                                                }}
                                            />
                                        </div>
                                    </Carousel.Item>
                                );
                            })}
                        </Carousel>
                    </div>
                ) : (
                    <div
                        style={{
                            height: 400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isDarkMode ? '#555' : '#f0f0f0',
                            borderRadius: 6,
                        }}
                    >
                        No Images Available
                    </div>
                )}



                <div style={{ marginTop: 8, fontSize: '.9rem', lineHeight: 1.35 }}>
                    <div title={entry.modelVersionObject?.name ?? 'N/A'}><strong>Version:</strong> {entry.modelVersionObject?.name ?? 'N/A'}</div>

                    <div data-no-select="true">
                        <FileNameToggle fileName={entry.civitaiFileName ?? 'N/A'} truncateAfter={56} />
                    </div>

                    {Array.isArray(entry.civitaiTags) && entry.civitaiTags.length > 0 && (
                        <div data-no-select="true">
                            <TagList
                                tags={(() => {
                                    const base = Array.isArray(entry.civitaiTags) ? entry.civitaiTags : [];

                                    const tokenize = (s?: string) =>
                                        (s || "")
                                            .replace(/\.[^/.]+$/, "")
                                            .split(/[^\p{L}\p{N}]+/gu)
                                            .map(x => x.trim())
                                            .filter(Boolean);

                                    const fileTags = tokenize(entry.civitaiFileName);
                                    const nameTags = tokenize(entry?.modelVersionObject?.model?.name);

                                    const isValid = (t: string) => {
                                        const clean = (t || "").trim();
                                        if (clean.length < 2) return false;
                                        if (/^\d+$/u.test(clean)) return false;                 // remove "12"
                                        if (/^[A-Z]{2}$/u.test(clean)) return false;            // remove "IL"

                                        const letterCount = (clean.match(/\p{L}/gu) || []).length;
                                        if (letterCount < 2) return false;                      // needs >= 2 letters
                                        return true;
                                    };


                                    const seen = new Set<string>();
                                    const merged: string[] = [];

                                    for (const t of [...base, ...fileTags, ...nameTags]) {
                                        const clean = (t || "").trim();
                                        if (!isValid(clean)) continue;

                                        const key = clean.toLowerCase();
                                        if (seen.has(key)) continue;

                                        seen.add(key);
                                        merged.push(clean);
                                    }

                                    return merged;
                                })()}
                                isDarkMode={isDarkMode}
                            />

                        </div>
                    )}

                    <div style={{ marginTop: 4, whiteSpace: 'normal', wordWrap: 'break-word' }}>
                        <strong>Download Path:</strong> {entry.downloadFilePath ?? 'N/A'}
                    </div>
                    <div><strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}</div>
                    <div><strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}</div>
                    <div><strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}</div>
                    <div>
                        <strong>URL:</strong>{' '}
                        {entry.civitaiUrl ? (
                            <a href={entry.civitaiUrl} target="_blank" rel="noopener noreferrer" style={{ color: isDarkMode ? '#60A5FA' : '#0d6efd' }}>
                                Visit Model
                            </a>
                        ) : 'N/A'}
                    </div>
                    <div><strong>Creator:</strong> {entry.modelVersionObject?.creator?.username ?? 'N/A'}</div>
                    <div>
                        <strong>File Size:</strong>{' '}
                        {(() => {
                            const f = entry.modelVersionObject?.files?.find(file => file.name.endsWith('.safetensors'));
                            return f ? `${(f.sizeKB / 1024).toFixed(2)} MB` : 'N/A';
                        })()}
                    </div>
                </div>
            </Card>
        );
    };


    // **BigCardMode Component Implementation**
    const BigCardMode: React.FC<BigCardModeProps> = ({
        filteredDownloadList,
        isDarkMode,
        isModifyMode,
        selectedIds,
        toggleSelect,
        handleSelectAll,
        showGalleries,
        onToggleOverlay,
        activePreviewId,
        displayMode,
        onErrorCardDownload,
    }) => {

        const [errorDownloadMethod, setErrorDownloadMethod] = React.useState<'server' | 'browser'>('browser');

        if (filteredDownloadList.length === 0) {
            return (
                <div style={{ color: isDarkMode ? '#fff' : '#000' }}>
                    No downloads available.
                </div>
            );
        }
        return (
            <div>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '20px',
                        justifyContent: 'center'
                    }}
                >
                    {filteredDownloadList.map((entry, cardIndex) => {

                        const selectionDisabled =
                            displayMode === "recentCard" ||
                            displayMode === "holdCard" ||
                            displayMode === "earlyAccessCard" ||
                            displayMode === "errorCard";

                        const canSelect = !selectionDisabled;

                        const baseBg = isDarkMode ? "#333" : "#fff";
                        const selectedBg = isDarkMode ? "#1f2937" : "#eaf2ff";
                        const baseBorder = isDarkMode ? "#555" : "#ccc";
                        const selectedBorder = isDarkMode ? "#60A5FA" : "#2563eb";

                        const baseShadow = isDarkMode
                            ? "2px 2px 8px rgba(255,255,255,0.1)"
                            : "2px 2px 8px rgba(0,0,0,0.1)";

                        const selectedShadow = isDarkMode
                            ? "0 0 0 2px rgba(96,165,250,0.35), 2px 2px 10px rgba(255,255,255,0.12)"
                            : "0 0 0 2px rgba(37,99,235,0.25), 2px 2px 10px rgba(0,0,0,0.12)";


                        const isSelected = selectedIds.has(entry.civitaiVersionID);
                        const showEA = isEntryEarlyAccess(entry);


                        return (
                            <Card
                                key={cardIndex}
                                style={{
                                    width: "100%",
                                    maxWidth: "380px",
                                    border: "1px solid",
                                    borderColor: isSelected ? selectedBorder : baseBorder,
                                    borderRadius: "8px",
                                    boxShadow: isSelected ? selectedShadow : baseShadow,
                                    backgroundColor: isSelected ? selectedBg : baseBg,
                                    color: isDarkMode ? "#fff" : "#000",
                                    position: "relative",
                                    cursor: canSelect ? "pointer" : "default",
                                    opacity: isModifyMode && canSelect && !isSelected ? 0.8 : 1,
                                    transition:
                                        "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
                                    overflow: "hidden",
                                    margin: "0 auto",
                                    padding: "10px",
                                }}
                                onClick={(e) => {
                                    if (!canSelect) return;
                                    if (isInteractiveClickTarget(e.target)) return;
                                    toggleSelect(entry.civitaiVersionID);
                                }}
                                onKeyDown={(e) => {
                                    if (!canSelect) return;
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleSelect(entry.civitaiVersionID);
                                    }
                                }}
                                role={canSelect ? "button" : undefined}
                                tabIndex={canSelect ? 0 : -1}
                                aria-pressed={canSelect ? isSelected : undefined}
                            >
                                {/* Optional: small selected indicator (no checkbox) */}
                                {isSelected && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 8,
                                            left: 8,
                                            background: isDarkMode ? "rgba(37,99,235,0.9)" : "#2563eb",
                                            color: "#fff",
                                            borderRadius: 999,
                                            padding: "2px 8px",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            pointerEvents: "none",
                                            zIndex: 2,
                                        }}
                                    >
                                        <TfiCheckBox /> Selected
                                    </div>
                                )}

                                {/* Early Access badge at the top-right */}
                                {showEA && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '5px',
                                            right: '5px',
                                            color: 'red',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            backgroundColor: isDarkMode ? '#444' : '#fff',
                                            padding: '2px 4px',
                                            borderRadius: '4px',
                                            border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
                                        }}
                                    >
                                        {(() => {
                                            const ends = getEarlyAccessEndsAt(entry);
                                            return ends ? formatLocalDateTime(ends) : 'Early Access Only';
                                        })()}

                                    </div>
                                )}

                                {/* ---- 1) BaseModel badge + Title ---- */}
                                <div
                                    style={{
                                        display: 'flex',            // <-- make this a flex container
                                        alignItems: 'center',       // vertically center badge + title
                                        marginTop: '40px',
                                        marginBottom: '5px',
                                        borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                        paddingBottom: '5px',
                                    }}
                                >
                                    {/* BaseModel as a badge, only if present */}
                                    {entry.modelVersionObject?.baseModel && (
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                backgroundColor: '#007bff',
                                                color: '#fff',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                marginRight: '6px',
                                                flexShrink: 0,          // never shrink the badge
                                            }}
                                        >
                                            {entry.modelVersionObject.baseModel}
                                        </span>
                                    )}

                                    {/* wrap your toggle in a flex child so it can shrink & ellipsis properly */}
                                    <div style={{ flex: 1, minWidth: 0 }} data-no-select="true">
                                        <TitleNameToggle
                                            titleName={entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                            truncateAfter={30}
                                        />
                                    </div>
                                </div>


                                {/* Images */}
                                {entry.imageUrlsArray && entry.imageUrlsArray.length > 0 ? (
                                    showGalleries ? (
                                        // Full carousel (same as before)
                                        <Carousel
                                            variant={isDarkMode ? 'dark' : 'light'}
                                            indicators={entry.imageUrlsArray.length > 1}
                                            controls={entry.imageUrlsArray.length > 1}
                                            interval={null}
                                            style={{ marginBottom: 0 }}
                                        >
                                            {entry.imageUrlsArray.map((img, imgIndex) => {
                                                const { url, width, height } = normalizeImg(img as any);
                                                const baseW = 380;
                                                return (
                                                    <Carousel.Item key={imgIndex}>
                                                        <img
                                                            className="d-block w-100"
                                                            src={withWidth(url, baseW)}
                                                            srcSet={buildSrcSet(url, [320, 480, 640, 800])}
                                                            sizes="(max-width: 420px) 100vw, 380px"
                                                            loading={imgIndex === 0 && cardIndex === 0 ? 'eager' : 'lazy'}
                                                            decoding="async"
                                                            width={width ?? undefined}
                                                            height={height ?? undefined}
                                                            alt={`Slide ${imgIndex + 1}`}
                                                            style={{ maxHeight: '300px', objectFit: 'contain', margin: '0 auto' }}
                                                        />
                                                    </Carousel.Item>
                                                );
                                            })}
                                        </Carousel>
                                    ) : (
                                        // Only the first image (fast)
                                        (() => {
                                            const first = normalizeImg(entry.imageUrlsArray[0] as any);
                                            const baseW = 380;
                                            return (
                                                <img
                                                    className="d-block w-100"
                                                    src={withWidth(first.url, baseW)}
                                                    srcSet={buildSrcSet(first.url, [320, 480, 640, 800])}
                                                    sizes="(max-width: 420px) 100vw, 380px"
                                                    loading={cardIndex === 0 ? 'eager' : 'lazy'}
                                                    decoding="async"
                                                    width={first.width ?? undefined}
                                                    height={first.height ?? undefined}
                                                    alt="Preview"
                                                    style={{ maxHeight: '300px', objectFit: 'contain', margin: '0 auto' }}
                                                />
                                            );
                                        })()
                                    )
                                ) : (
                                    <div
                                        style={{
                                            height: '200px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: isDarkMode ? '#555' : '#f0f0f0',
                                            marginBottom: 0,
                                            borderRadius: '4px',
                                        }}
                                    >
                                        <span>No Images Available</span>
                                    </div>
                                )}

                                {/* 3) Smaller text under the carousel */}
                                <div
                                    style={{
                                        marginTop: '5px',
                                        fontSize: '0.8rem', // smaller text
                                        lineHeight: 1.3,
                                        padding: '0 5px',
                                    }}
                                >
                                    {/* Version Name */}
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            wordWrap: 'break-word',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                        title={entry.modelVersionObject?.name ?? 'N/A'}
                                    >
                                        <strong>Version:</strong> {entry.modelVersionObject?.name ?? 'N/A'}
                                    </div>

                                    {/* File Name */}
                                    <FileNameToggle
                                        fileName={entry.civitaiFileName ?? 'N/A'}
                                        truncateAfter={40}   // adjust to taste
                                    />

                                    {/* Tags */}
                                    {Array.isArray(entry.civitaiTags) && entry.civitaiTags.length > 0 && (
                                        <div data-no-select="true">
                                            <TagList
                                                tags={(() => {
                                                    const base = Array.isArray(entry.civitaiTags) ? entry.civitaiTags : [];

                                                    const tokenize = (s?: string) =>
                                                        (s || "")
                                                            .replace(/\.[^/.]+$/, "")
                                                            .split(/[^\p{L}\p{N}]+/gu)
                                                            .map(x => x.trim())
                                                            .filter(Boolean);

                                                    const fileTags = tokenize(entry.civitaiFileName);
                                                    const nameTags = tokenize(entry?.modelVersionObject?.model?.name);

                                                    const isValid = (t: string) => {
                                                        const clean = (t || "").trim();
                                                        if (clean.length < 2) return false;
                                                        if (/^\d+$/u.test(clean)) return false;                 // remove "12"
                                                        if (/^[A-Z]{2}$/u.test(clean)) return false;            // remove "IL"

                                                        const letterCount = (clean.match(/\p{L}/gu) || []).length;
                                                        if (letterCount < 2) return false;                      // needs >= 2 letters
                                                        return true;
                                                    };


                                                    const seen = new Set<string>();
                                                    const merged: string[] = [];

                                                    for (const t of [...base, ...fileTags, ...nameTags]) {
                                                        const clean = (t || "").trim();
                                                        if (!isValid(clean)) continue;

                                                        const key = clean.toLowerCase();
                                                        if (seen.has(key)) continue;

                                                        seen.add(key);
                                                        merged.push(clean);
                                                    }

                                                    return merged;
                                                })()}
                                                isDarkMode={isDarkMode}
                                            />

                                        </div>
                                    )}

                                    {/* 3) Show full download path with line wrapping */}
                                    <div
                                        style={{
                                            margin: "4px 0",
                                            whiteSpace: "normal",
                                            wordWrap: "break-word",
                                        }}
                                    >
                                        {(displayMode === "recentCard" || (displayMode === "errorCard")) ? (
                                            // keep your existing clickable link for recentCard
                                            entry.downloadFilePath ? (
                                                <a
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        fetchOpenModelDownloadDirectory(entry.downloadFilePath!, dispatch);
                                                    }}
                                                    style={{
                                                        textDecoration: "underline",
                                                        cursor: "pointer",
                                                        color: isDarkMode ? "#60A5FA" : "#1D4ED8",
                                                    }}
                                                    aria-label="Open model download directory"
                                                    title={entry.downloadFilePath}
                                                >
                                                    {entry.downloadFilePath}
                                                </a>
                                            ) : (
                                                "N/A"
                                            )
                                        ) : editingPathId === entry.civitaiVersionID ? (
                                            // ⬇️ ONLY this card shows the editor when its ID matches
                                            <DownloadPathEditor
                                                initialValue={entry.downloadFilePath ?? ""}
                                                isDarkMode={isDarkMode}
                                                onSave={(nextPath: any) => handleDownloadPathSave(entry, nextPath)}
                                                onCancel={() => setEditingPathId(null)}
                                            />
                                        ) : (
                                            // Normal display; double-click to start editing for THIS card only
                                            <>
                                                <strong>Download Path:</strong>{" "}
                                                <span
                                                    data-no-select="true"
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingPathId(entry.civitaiVersionID);
                                                    }}
                                                    style={{
                                                        cursor: "pointer",
                                                        textDecoration: "underline dotted",
                                                        whiteSpace: "normal",
                                                        wordWrap: "break-word",
                                                    }}
                                                    title="Double-click to edit download path"
                                                >
                                                    {entry.downloadFilePath ?? "N/A"}
                                                </span>
                                                <p style={{ margin: '4px 0' }}>
                                                    <strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}
                                                </p>
                                                <p style={{ margin: '4px 0' }}>
                                                    <strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {showAiSuggestionsPanel ? (
                                        <div style={{ marginTop: 8 }}>
                                            <strong>AI suggestion</strong>

                                            <p>
                                                <strong>Gemini Suggested Title:</strong>
                                                <span
                                                    title={entry.aiSuggestedArtworkTitle || ""}
                                                    style={{
                                                        flex: 1,
                                                        whiteSpace: "normal",
                                                        overflowWrap: "anywhere",   // best for long paths with no spaces
                                                        wordBreak: "break-word",    // fallback behavior
                                                        opacity: entry.aiSuggestedArtworkTitle ? 1 : 0.7,
                                                    }}
                                                >
                                                    {entry.aiSuggestedArtworkTitle || "(none)"}
                                                </span>
                                            </p>

                                            <p>
                                                <strong>Jikan Normalized Title:</strong>
                                                <span
                                                    title={entry.jikanNormalizedArtworkTitle || ""}
                                                    style={{
                                                        flex: 1,
                                                        whiteSpace: "normal",
                                                        overflowWrap: "anywhere",   // best for long paths with no spaces
                                                        wordBreak: "break-word",    // fallback behavior
                                                        opacity: entry.jikanNormalizedArtworkTitle ? 1 : 0.7,
                                                    }}
                                                >
                                                    {entry.jikanNormalizedArtworkTitle || "(none)"}
                                                </span>
                                            </p>

                                            {(() => {
                                                const suggestedPaths = mergeSuggestedPathsForEntry(entry);
                                                const vidKey = entry.civitaiVersionID;

                                                const hasUserPick = Object.prototype.hasOwnProperty.call(selectedSuggestedPathByVid, vidKey);
                                                const selectedPath = hasUserPick
                                                    ? (selectedSuggestedPathByVid[vidKey] ?? "")
                                                    : (suggestedPaths[0] ?? "");

                                                const selectedKey = normalizePathKey(selectedPath);

                                                const clearSelected = (e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    setSelectedSuggestedPathByVid((prev) => ({ ...prev, [vidKey]: "" }));
                                                };

                                                if (suggestedPaths.length === 0) {
                                                    return (
                                                        <div style={{ marginTop: 6, opacity: 0.85 }}>
                                                            N/A
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div style={{ marginTop: 6 }}>

                                                        {/* Selected path (defaults to the top suggestion) */}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 8,
                                                                marginBottom: 6,
                                                            }}
                                                        >
                                                            <strong>Selected:</strong>
                                                            <span
                                                                title={selectedPath || ""}
                                                                style={{
                                                                    flex: 1,
                                                                    whiteSpace: "normal",
                                                                    overflowWrap: "anywhere",   // best for long paths with no spaces
                                                                    wordBreak: "break-word",    // fallback behavior
                                                                    opacity: selectedPath ? 1 : 0.7,

                                                                    padding: "6px 10px",
                                                                    borderRadius: 10,
                                                                    border: `1px solid ${isDarkMode ? "rgba(96,165,250,0.45)" : "rgba(13,110,253,0.35)"}`,
                                                                    background: isDarkMode ? "rgba(96,165,250,0.12)" : "rgba(13,110,253,0.08)",
                                                                    boxShadow: isDarkMode ? "0 0 0 2px rgba(96,165,250,0.10)" : "0 0 0 2px rgba(13,110,253,0.06)",
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                {selectedPath || "(none)"}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={clearSelected}
                                                                disabled={!selectedPath}
                                                                style={{
                                                                    borderRadius: 8,
                                                                    padding: "4px 10px",
                                                                    cursor: selectedPath ? "pointer" : "not-allowed",
                                                                    border: isDarkMode ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.18)",
                                                                    background: "transparent",
                                                                    color: isDarkMode ? "#fff" : "#000",
                                                                    opacity: selectedPath ? 1 : 0.5,
                                                                }}
                                                            >
                                                                Clear
                                                            </button>
                                                        </div>

                                                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                                            Suggested paths ({suggestedPaths.length})
                                                        </div>

                                                        {/* Limit to ~3 visible items; scroll for more */}
                                                        <div style={{ maxHeight: 132, overflowY: "auto", paddingRight: 6 }}>
                                                            <ul
                                                                style={{
                                                                    margin: 0,
                                                                    padding: 0,
                                                                    listStyle: "none",
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    gap: 8,
                                                                }}
                                                            >
                                                                {suggestedPaths.map((p) => {
                                                                    const isSelected = selectedKey && normalizePathKey(p) === selectedKey;
                                                                    return (
                                                                        <li key={p}>
                                                                            <button
                                                                                type="button"
                                                                                title={p} // hover shows full path
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedSuggestedPathByVid((prev) => ({ ...prev, [vidKey]: p }));
                                                                                }}
                                                                                style={{
                                                                                    width: "100%",
                                                                                    borderRadius: 10,
                                                                                    padding: "8px 10px",
                                                                                    cursor: "pointer",
                                                                                    textAlign: "left",
                                                                                    border: isSelected
                                                                                        ? (isDarkMode ? "1px solid rgba(96,165,250,0.9)" : "1px solid rgba(37,99,235,0.9)")
                                                                                        : (isDarkMode ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.14)"),
                                                                                    background: isSelected
                                                                                        ? (isDarkMode ? "rgba(96,165,250,0.14)" : "rgba(37,99,235,0.10)")
                                                                                        : (isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"),
                                                                                    color: isDarkMode ? "#fff" : "#000",
                                                                                }}
                                                                            >
                                                                                <span
                                                                                    style={{
                                                                                        display: "block",
                                                                                        overflow: "hidden",
                                                                                        textOverflow: "ellipsis",
                                                                                        whiteSpace: "nowrap",
                                                                                    }}
                                                                                >
                                                                                    {p}
                                                                                </span>
                                                                            </button>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                );
                                            })()}


                                        </div>
                                    ) : (
                                        <>
                                            {/* Category */}
                                            <p style={{ margin: '4px 0' }}>
                                                <strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}
                                            </p>
                                            <p style={{ margin: '4px 0' }}>
                                                <strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}
                                            </p>
                                            <p style={{ margin: '4px 0' }}>
                                                <strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}
                                            </p>
                                            <p style={{ margin: '4px 0' }}>
                                                <strong>URL:</strong>{' '}
                                                {entry.civitaiUrl ? (
                                                    <a
                                                        href={entry.civitaiUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: isDarkMode ? '#1e90ff' : '#007bff' }}
                                                    >
                                                        Visit Model
                                                    </a>
                                                ) : (
                                                    'N/A'
                                                )}
                                            </p>

                                            <p style={{ margin: '4px 0' }}>
                                                <strong>Creator:</strong> {entry.modelVersionObject?.creator?.username ?? 'N/A'}
                                            </p>

                                            <p style={{ margin: '4px 0' }}>
                                                <strong>File Size:</strong>{' '}
                                                {(() => {
                                                    const safetensorFile =
                                                        entry.modelVersionObject?.files?.find(file =>
                                                            file.name.endsWith('.safetensors')
                                                        );
                                                    return safetensorFile
                                                        ? `${(safetensorFile.sizeKB / 1024).toFixed(2)} MB`
                                                        : 'N/A';
                                                })()}
                                            </p>

                                        </>
                                    )}
                                </div>

                                {/* --- Hold, Priority, Remove, Preview (one line) --- */}
                                <div style={styles.controlRowStyle}>
                                    {/* Hold checkbox */}
                                    <Form.Check
                                        type="checkbox"
                                        id={`hold-${entry.civitaiModelID}-${entry.civitaiVersionID}`}
                                        label={<span style={{ fontWeight: 600 }}>Hold</span>}
                                        checked={Boolean(entry.hold)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleHoldChange(entry, e.target.checked);
                                        }}
                                        disabled={isLoading}
                                        style={{ cursor: 'pointer' }}
                                    />

                                    {/* Priority */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: '.85rem', opacity: .9 }}>Priority</span>
                                        <Form.Select
                                            size="sm"
                                            value={(entry.downloadPriority ?? 10)}
                                            onChange={(e) => {
                                                const next = parseInt(e.target.value, 10);
                                                handlePriorityChange(entry, next);
                                            }}
                                            disabled={isLoading}
                                            style={{
                                                width: 90,
                                                backgroundColor: isDarkMode ? '#444' : '#fff',
                                                color: isDarkMode ? '#fff' : '#000',
                                                border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`
                                            }}
                                            aria-label="Download priority (1–10)"
                                        >
                                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </Form.Select>
                                    </div>

                                    {/* right-side action buttons */}
                                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                                        {/* Remove */}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveOne(entry); }}
                                            title="Remove from list"
                                            aria-label="Remove from list"
                                            style={styles.inlineDangerBtnStyle}
                                            disabled={isLoading}
                                        >
                                            <FaTrashAlt size={14} />
                                        </button>

                                        {/* Preview in left panel */}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onToggleOverlay(entry); }}
                                            title="Preview in left panel"
                                            aria-label="Preview in left panel"
                                            style={styles.inlineIconBtnStyle}
                                            disabled={isLoading}
                                        >
                                            <LuPanelLeftOpen size={18} />
                                        </button>
                                    </div>

                                    {displayMode === 'errorCard' && onErrorCardDownload && (
                                        <OverlayTrigger
                                            placement="top"
                                            overlay={
                                                <Tooltip id={`tooltip-error-download-${entry.civitaiVersionID}`}>
                                                    {`Download by ${errorDownloadMethod === 'server' ? 'server' : 'browser'}`}
                                                </Tooltip>
                                            }
                                        >
                                            <Dropdown as={ButtonGroup}>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onErrorCardDownload(entry, errorDownloadMethod);
                                                    }}
                                                >
                                                    {errorDownloadMethod === 'server' ? <BsCloudDownloadFill /> : <FcDownload />}
                                                </Button>

                                                <Dropdown.Toggle
                                                    split
                                                    variant="success"
                                                    size="sm"
                                                    id={`errorCard-download-${entry.civitaiVersionID}`}
                                                />
                                                <Dropdown.Menu>
                                                    <Dropdown.Item
                                                        active={errorDownloadMethod === 'server'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setErrorDownloadMethod('server');
                                                        }}
                                                    >
                                                        server
                                                    </Dropdown.Item>
                                                    <Dropdown.Item
                                                        active={errorDownloadMethod === 'browser'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setErrorDownloadMethod('browser');
                                                        }}
                                                    >
                                                        browser
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </OverlayTrigger>
                                    )}


                                </div>


                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    };


    // **SmallCardMode Component Implementation**
    const SmallCardMode: React.FC<{
        filteredDownloadList: OfflineDownloadEntry[];
        isDarkMode: boolean;
        isModifyMode: boolean;
        selectedIds: Set<string>;
        activePreviewId: string | null;
        toggleSelect: (id: string) => void;
        handleSelectAll: () => void;
        onToggleOverlay: (entry: OfflineDownloadEntry) => void;
    }> = ({
        filteredDownloadList,
        isDarkMode,
        isModifyMode,
        selectedIds,
        toggleSelect,
        activePreviewId,
        handleSelectAll,
        onToggleOverlay
    }) => {
            if (filteredDownloadList.length === 0) {
                return (
                    <div style={{ color: isDarkMode ? '#fff' : '#000' }}>
                        No downloads available.
                    </div>
                );
            }

            return (
                <div>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            justifyContent: 'center',
                        }}
                    >
                        {filteredDownloadList.map((entry, cardIndex) => {

                            const selectionDisabled =
                                displayMode === "recentCard" ||
                                displayMode === "holdCard" ||
                                displayMode === "earlyAccessCard" ||
                                displayMode === "errorCard";

                            const canSelect = !selectionDisabled;

                            const baseBg = isDarkMode ? "#333" : "#fff";
                            const selectedBg = isDarkMode ? "#1f2937" : "#eaf2ff";
                            const baseBorder = isDarkMode ? "#555" : "#ccc";
                            const selectedBorder = isDarkMode ? "#60A5FA" : "#2563eb";

                            const baseShadow = isDarkMode
                                ? "2px 2px 8px rgba(255,255,255,0.1)"
                                : "2px 2px 8px rgba(0,0,0,0.1)";

                            const selectedShadow = isDarkMode
                                ? "0 0 0 2px rgba(96,165,250,0.35), 2px 2px 10px rgba(255,255,255,0.12)"
                                : "0 0 0 2px rgba(37,99,235,0.25), 2px 2px 10px rgba(0,0,0,0.12)";


                            const isSelected = selectedIds.has(entry.civitaiVersionID);
                            const showEA = isEntryEarlyAccess(entry);
                            const firstImageUrl = entry.imageUrlsArray?.[0] ?? null;
                            const isFirstCard = cardIndex === 0;

                            return (
                                <Card
                                    key={cardIndex}
                                    style={{
                                        width: "100%",
                                        maxWidth: '180px',
                                        border: "1px solid",
                                        borderColor: isSelected ? selectedBorder : baseBorder,
                                        borderRadius: "8px",
                                        boxShadow: isSelected ? selectedShadow : baseShadow,
                                        backgroundColor: isSelected ? selectedBg : baseBg,
                                        color: isDarkMode ? "#fff" : "#000",
                                        position: "relative",
                                        cursor: canSelect ? "pointer" : "default",
                                        opacity: isModifyMode && canSelect && !isSelected ? 0.8 : 1,
                                        transition:
                                            "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
                                        overflow: "hidden",
                                        margin: "0 auto",
                                        padding: "10px",
                                    }}
                                    onClick={(e) => {
                                        if (!canSelect) return;
                                        if (isInteractiveClickTarget(e.target)) return;
                                        toggleSelect(entry.civitaiVersionID);
                                    }}
                                    onKeyDown={(e) => {
                                        if (!canSelect) return;
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            toggleSelect(entry.civitaiVersionID);
                                        }
                                    }}
                                    role={canSelect ? "button" : undefined}
                                    tabIndex={canSelect ? 0 : -1}
                                    aria-pressed={canSelect ? isSelected : undefined}
                                >
                                    {/* Optional: small selected indicator (no checkbox) */}
                                    {isSelected && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 8,
                                                left: 8,
                                                background: isDarkMode ? "rgba(37,99,235,0.9)" : "#2563eb",
                                                color: "#fff",
                                                borderRadius: 999,
                                                padding: "2px 8px",
                                                fontSize: 12,
                                                fontWeight: 700,
                                                pointerEvents: "none",
                                                zIndex: 2,
                                            }}
                                        >
                                            <TfiCheckBox /> Selected
                                        </div>
                                    )}

                                    {showEA && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '5px',
                                                right: '5px',
                                                color: 'red',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                backgroundColor: isDarkMode ? '#444' : '#fff',
                                                padding: '2px 4px',
                                                borderRadius: '4px',
                                                border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
                                            }}
                                        >
                                            {(() => {
                                                const ends = getEarlyAccessEndsAt(entry);
                                                return ends ? formatLocalDateTime(ends) : 'Early Access Only';
                                            })()}

                                        </div>
                                    )}

                                    {/* Base Model Badge + Title */}
                                    <div
                                        style={{
                                            marginTop: '40px',
                                            marginBottom: '4px',
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                            paddingBottom: '4px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {/* 1) BaseModel badge */}
                                        {entry.modelVersionObject?.baseModel && (
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: '#007bff',
                                                    color: '#fff',
                                                    padding: '2px 5px',
                                                    borderRadius: '4px',
                                                    marginRight: '5px',
                                                }}
                                            >
                                                {entry.modelVersionObject.baseModel}
                                            </span>
                                        )}
                                        {/* Model Title */}
                                        <span
                                            style={{
                                                fontSize: '0.85rem',
                                            }}
                                            title={entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                        >
                                            {entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                        </span>
                                    </div>

                                    {/* Image (Thumbnail) */}
                                    {/* Image (Thumbnail) */}
                                    {firstImageUrl ? (() => {
                                        // If firstImageUrl is always a string, use:
                                        // const url = firstImageUrl as string;
                                        //
                                        // If it can be an object {url,width,height}, use normalizeImg:
                                        const { url, width, height } =
                                            typeof firstImageUrl === 'string'
                                                ? { url: firstImageUrl, width: undefined, height: undefined }
                                                : normalizeImg(firstImageUrl as any);

                                        const thumbW = 180; // small-card target width

                                        return (
                                            <img
                                                src={withWidth(url, thumbW)}                       // serve a thumbnail
                                                srcSet={buildSrcSet(url, [160, 200, 320])}         // responsive thumbs
                                                sizes="(max-width: 200px) 100vw, 180px"
                                                loading={isFirstCard ? 'eager' : 'lazy'}
                                                decoding="async"
                                                width={width ?? undefined}                         // keeps aspect ratio if known
                                                height={height ?? undefined}
                                                alt={`Thumbnail ${cardIndex + 1}`}
                                                style={{
                                                    width: '100%',
                                                    maxHeight: '100px',
                                                    objectFit: 'contain',
                                                    borderRadius: '4px',
                                                    marginBottom: '2px',
                                                }}
                                            />
                                        );
                                    })() : (
                                        <div
                                            style={{
                                                height: '100px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: isDarkMode ? '#555' : '#f0f0f0',
                                                marginBottom: '2px',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            <span>No Image</span>
                                        </div>
                                    )}


                                    {/* Info Section under the image */}
                                    <div
                                        style={{
                                            fontSize: '0.7rem',
                                            lineHeight: 1.2,
                                            marginTop: '2px',
                                            marginBottom: '0px',
                                        }}
                                    >
                                        {/* Version Name */}
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                marginBottom: '4px',
                                            }}
                                            title={entry.modelVersionObject?.name ?? 'N/A'}
                                        >
                                            <strong>Ver:</strong> {entry.modelVersionObject?.name ?? 'N/A'}
                                        </div>

                                        {/* File Path - allow wrapping */}
                                        <p
                                            style={{
                                                margin: '4px 0',
                                                whiteSpace: 'normal',  // allow multi-line
                                                wordWrap: 'break-word',
                                            }}
                                        >
                                            <strong>Path:</strong> {entry.downloadFilePath ?? 'N/A'}
                                        </p>

                                        {/* Category */}
                                        <p
                                            style={{
                                                margin: '4px 0',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                            title={entry.selectedCategory ?? 'N/A'}
                                        >
                                            <strong>Cat:</strong> {entry.selectedCategory ?? 'N/A'}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onToggleOverlay(entry); }}
                                        title="Preview in left panel"
                                        aria-label="Preview in left panel"
                                        style={activePreviewId === entry.civitaiVersionID ? styles.previewBtnActiveStyle : styles.previewBtnStyle}
                                    >
                                        <LuPanelLeftOpen size={18} />
                                    </button>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            );
        };


    const handleSelectAll = () => {
        if (selectedIds.size === getSelectableEntries().length) {
            // All selectable entries are selected; deselect all
            setSelectedIds(new Set());
        } else {
            // Not all selectable entries are selected; select all
            const newSelectedIds = new Set(selectedIds);
            getSelectableEntries().forEach(entry => newSelectedIds.add(entry.civitaiVersionID));
            setSelectedIds(newSelectedIds);
        }
    };

    const updateEntryLocal = (matcher: (e: OfflineDownloadEntry) => boolean, patch: Partial<OfflineDownloadEntry>) => {
        setOfflineDownloadList(prev =>
            prev.map(e => (matcher(e) ? { ...e, ...patch } : e))
        );
    };

    const handleHoldChange = async (entry: OfflineDownloadEntry, nextHold: boolean) => {
        const match = (e: OfflineDownloadEntry) =>
            e.civitaiVersionID === entry.civitaiVersionID && e.civitaiModelID === entry.civitaiModelID;
        const prevHold = entry.hold ?? false;

        // optimistic
        updateEntryLocal(match, { hold: nextHold });
        try {
            await fetchUpdateHoldFromOfflineDownloadList(
                { civitaiModelID: entry.civitaiModelID, civitaiVersionID: entry.civitaiVersionID },
                nextHold,
                dispatch
            );
        } catch (err: any) {
            // revert on failure
            updateEntryLocal(match, { hold: prevHold });
            alert(`Failed to update hold: ${err?.message || 'Unknown error'}`);
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
                        <h3 style={{ color: isDarkMode ? '#fff' : '#000' }}>Offline Download List</h3>

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
                                    ...styles.responsiveButtonStyle
                                }}
                                variant={displayMode === 'table' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('table')}
                            >
                                Table Mode
                            </Button>
                            <Button
                                style={{
                                    ...styles.responsiveButtonStyle
                                }}
                                variant={displayMode === 'bigCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('bigCard')}
                            >
                                Big Card Mode
                            </Button>
                            <Button
                                style={{
                                    ...styles.responsiveButtonStyle
                                }}
                                variant={displayMode === 'smallCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('smallCard')}
                            >
                                Small Card Mode
                            </Button>

                            <Button
                                style={{ ...styles.responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                variant={displayMode === 'recentCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('recentCard')}
                                aria-label={`Recently Downloaded (${recentlyDownloaded.length})`}
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

                            {/* NEW: Hold list mode */}
                            <Button
                                style={{ ...styles.responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                variant={displayMode === 'holdCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('holdCard')}
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
                                aria-label={`Early Access entries (${earlyAccessEntries.length})`}
                            >
                                Early Access
                                {earlyAccessEntries.length > 0 && (
                                    <span
                                        style={{
                                            ...styles.badgeStyle,
                                            background: '#ef4444', // red-ish
                                        }}
                                    >
                                        {badgeCount(earlyAccessEntries.length)}
                                    </span>
                                )}
                            </Button>


                            <Button
                                variant={displayMode === 'failedCard' ? 'primary' : 'secondary'}
                                onClick={() => handleDisplayModeClick('failedCard')}
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
                                    backgroundColor: '#ffffff', // White background
                                    padding: '15px',
                                    borderRadius: '8px',
                                    boxShadow: isDarkMode
                                        ? '0 2px 8px rgba(255, 255, 255, 0.1)'
                                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    margin: '10px', // Optional: add spacing as needed
                                }}
                            >
                                <DownloadFilePathOptionPanel
                                    setIsHandleRefresh={setIsHandleRefresh}
                                    isHandleRefresh={isHandleRefresh}
                                />
                            </div>

                            <FolderDropdown filterText={filterText} />
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
                            disabled={isLoading}
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
                                disabled={isLoading}
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

                            <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Pending */}
                                <Form.Check
                                    type="checkbox"
                                    id="show-pending-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Show Pending</span>}
                                    checked={showPending}
                                    disabled={isLoading}
                                    onChange={e => setShowPending(e.target.checked)}
                                    title="Show items whose download path is a Pending folder"
                                />

                                {/* Non-Pending */}
                                <Form.Check
                                    type="checkbox"
                                    id="show-non-pending-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Show Non-Pending</span>}
                                    checked={showNonPending}
                                    disabled={isLoading}
                                    onChange={e => setShowNonPending(e.target.checked)}
                                    title="Show items not in Pending folders"
                                />

                                <Form.Check
                                    type="checkbox"
                                    id="show-hold-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Includes Hold</span>}
                                    checked={showHoldEntries}
                                    disabled={isLoading}
                                    onChange={e => setShowHoldEntries(e.target.checked)}
                                />

                                <Form.Check
                                    type="checkbox"
                                    id="show-error-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Includes Errors</span>}
                                    checked={showErrorEntries}
                                    disabled={isLoading}
                                    onChange={e => setShowErrorEntries(e.target.checked)}
                                />

                                {/* NEW: EarlyAccessEndsAt filter */}
                                <Form.Check
                                    type="checkbox"
                                    id="show-earlyaccess-checkbox"
                                    label={<span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 600 }}>Includes Early Access</span>}
                                    checked={showEarlyAccess}
                                    disabled={isLoading}
                                    onChange={e => setShowEarlyAccess(e.target.checked)}
                                />

                                {/* NEW: Date sort toggle */}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={isLoading}
                                    onClick={() => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                    {sortDir === 'desc' ? (
                                        <>
                                            <FcGenericSortingDesc />
                                            <span>Date: New to Old</span>
                                        </>
                                    ) : (
                                        <>
                                            <FcGenericSortingAsc />
                                            <span>Date: Old to New</span>
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


                            </div>


                        </div>


                        {(!isModifyMode && displayMode !== 'errorCard') && <>
                            {/* "Select First N" Button */}
                            <Button
                                onClick={handleSelectFirstN}
                                style={{
                                    ...styles.downloadButtonStyle,
                                    backgroundColor: '#007bff',
                                    color: '#fff',
                                }}
                                disabled={isLoading}
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
                                    disabled={isLoading}
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

                                <div
                                    style={{
                                        borderRadius: 10,
                                        padding: 10,
                                        background: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                        border: isDarkMode ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
                                    }}
                                >
                                    {/* ✅ Header (click to expand/collapse) */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={showAiSuggestionsPanel}
                                        onClick={toggleAiSuggestionsPanel}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                toggleAiSuggestionsPanel();
                                            }
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 10,
                                            cursor: "pointer",
                                            userSelect: "none",
                                            fontWeight: 700,
                                            color: isDarkMode ? "#f0f0f0" : "#222",
                                            padding: "6px 8px",
                                            borderRadius: 8,
                                        }}
                                        title={showAiSuggestionsPanel ? "Click to collapse" : "Click to expand"}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <MdOutlineTipsAndUpdates />
                                            <span>AI Suggestions</span>

                                            {/* Optional quick status hint in header */}
                                            {aiSuggestRunStatus === "running" && (
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, opacity: 0.9 }}>
                                                    <Spinner animation="border" size="sm" variant={isDarkMode ? "light" : "dark"} />
                                                    Running ...
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ fontWeight: 600, opacity: 0.9 }}>
                                            {showAiSuggestionsPanel ? "Hide" : "Show"}
                                        </div>
                                    </div>

                                    {/* ✅ Collapsible body */}
                                    <div
                                        style={{
                                            maxHeight: showAiSuggestionsPanel ? 1200 : 0, // large enough for your content
                                            overflow: "hidden",
                                            opacity: showAiSuggestionsPanel ? 1 : 0,
                                            transition: "max-height 200ms ease, opacity 200ms ease",
                                            pointerEvents: showAiSuggestionsPanel ? "auto" : "none",
                                        }}
                                    >
                                        <div style={{ paddingTop: 10 }}>
                                            {/* Row 1: Button + dropdown on same line */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 10,
                                                    alignItems: "center",
                                                    flexWrap: "nowrap",
                                                    whiteSpace: "nowrap",
                                                    overflowX: "auto",
                                                    paddingBottom: 2,
                                                }}
                                            >
                                                <Button
                                                    variant="warning"
                                                    onClick={handleRunPendingAiSuggestions}
                                                    disabled={isLoading || isPatching || aiSuggestRunStatus === "running"}
                                                    title="Run AI suggestions for pending entries"
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        maxWidth: 320,
                                                        minWidth: 190,
                                                        overflow: "hidden",
                                                        flex: "1 1 auto",
                                                    }}
                                                >
                                                    <MdOutlineTipsAndUpdates style={{ flex: "0 0 auto" }} />

                                                    <span
                                                        style={{
                                                            whiteSpace: "normal",
                                                            textOverflow: "clip",
                                                            overflow: "visible",
                                                            overflowWrap: "anywhere",
                                                            wordBreak: "break-word",
                                                            lineHeight: 1.1,
                                                            textAlign: "left",
                                                            flex: "1 1 auto",
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        Run AI Suggestion for downloadFilePath
                                                    </span>
                                                </Button>

                                                <Form.Control
                                                    as="select"
                                                    value={aiSuggestCountInput}
                                                    onChange={onChangeAiSuggestCount}
                                                    onBlur={() => setAiSuggestCountInput(String(getAiSuggestCount()))}
                                                    disabled={isLoading || isPatching || aiSuggestRunStatus === "running"}
                                                    style={{ width: 90, flex: "0 0 auto" }}
                                                    aria-label="AI suggestion total count (10 to 100)"
                                                >
                                                    {Array.from({ length: 10 }, (_, i) => 100 - i * 10).map((n) => (
                                                        <option key={n} value={String(n)}>
                                                            {n}
                                                        </option>
                                                    ))}
                                                </Form.Control>
                                            </div>

                                            {/* Row 2: Status line */}
                                            <div
                                                style={{
                                                    marginTop: 10,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    flexWrap: "wrap",
                                                    minHeight: 22,
                                                    color: isDarkMode ? "#e6e6e6" : "#333",
                                                }}
                                            >
                                                {aiSuggestRunStatus === "success" && (
                                                    <Badge bg="success" style={{ flex: "0 0 auto" }}>
                                                        Done
                                                    </Badge>
                                                )}

                                                {aiSuggestRunStatus === "fail" && (
                                                    <Badge bg="danger" style={{ flex: "0 0 auto" }}>
                                                        Stopped
                                                    </Badge>
                                                )}

                                                {batchResults.length > 0 && (
                                                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                                                        {batchResults.map((b) => (
                                                            <div key={b.batchNo} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                <span>
                                                                    <strong>Batch #{b.batchNo}</strong> ({b.start} ~ {b.end})
                                                                </span>

                                                                {b.status === "success" && <Badge bg="success">Success</Badge>}
                                                                {b.status === "fail" && <Badge bg="danger">Fail</Badge>}
                                                                {b.status === "running" && (
                                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                                        <Spinner animation="border" size="sm" variant={isDarkMode ? "light" : "dark"} />
                                                                        Processing...
                                                                    </span>
                                                                )}

                                                                {!!b.msg && b.status !== "running" && (
                                                                    <small
                                                                        style={{
                                                                            opacity: isDarkMode ? 0.95 : 0.9,
                                                                            color: isDarkMode ? "#e6e6e6" : "#333",
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

                                                {!aiSuggestRunStatus && <small style={{ opacity: 0.75 }}> </small>}
                                            </div>

                                            {/* Row 3: Progress + cooldown */}
                                            {aiSuggestRunStatus === "running" && (
                                                <div
                                                    style={{
                                                        marginTop: 6,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 4,
                                                        color: isDarkMode ? "#e6e6e6" : "#333",
                                                    }}
                                                >
                                                    {currentBatchRange && <div style={{ fontWeight: 600 }}>{currentBatchRange}</div>}

                                                    <div>
                                                        Progress: {aiSuggestProgress.completed}/{aiSuggestProgress.total}
                                                    </div>

                                                    {batchCooldown !== null && (
                                                        <div>
                                                            Cooldown: <strong>{batchCooldown}s</strong>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>


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
                                style={selectedIds.size > 0 ? styles.downloadButtonStyle : styles.downloadButtonDisabledStyle}
                                disabled={selectedIds.size === 0 || isLoading || isModifyMode}
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
                                        Downloading...
                                    </>
                                ) : (
                                    'Download Now'
                                )}
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
                            <div style={styles.leftOverlayDrawerStyle} onClick={(e) => e.stopPropagation()}>
                                <button onClick={closeLeftOverlay} style={styles.closeBtnStyle} aria-label="Close overlay">
                                    <IoCloseOutline size={22} />
                                </button>

                                <PreviewCard entry={leftOverlayEntry} isDarkMode={isDarkMode} />

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
                                            setSelectedPrefixes(new Set(categoriesPrefixsList.map(p => p.value)));
                                        } else {
                                            setSelectedPrefixes(new Set());
                                        }
                                    }}
                                    disabled={isLoading || (showPending && !showNonPending)}
                                    style={{
                                        marginBottom: '8px',
                                        fontWeight: 'bold',
                                        color: isDarkMode ? '#fff' : '#000',
                                    }}
                                />

                                {/* ── INDIVIDUAL PREFIXES ── */}
                                {categoriesPrefixsList.map(prefix => (
                                    <Form.Check
                                        key={prefix.value}
                                        type="checkbox"
                                        id={`prefix-${prefix.value}`}
                                        label={prefix.value}
                                        checked={selectedPrefixes.has(prefix.value)}
                                        onChange={e =>
                                            setSelectedPrefixes(prev => {
                                                const next = new Set(prev);
                                                if (e.target.checked) next.add(prefix.value);
                                                else next.delete(prefix.value);
                                                return next;
                                            })
                                        }
                                        disabled={isLoading || (showPending && !showNonPending)}
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
                        <Button
                            onClick={handleSelectAll}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '4px',
                                backgroundColor: '#007bff',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                            disabled={isLoading}
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
                                    {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'} selected <FaArrowRight />
                                    "<span
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
                                    {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'} selected
                                </>
                            )}
                        </div>
                    </div>

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
                        {isLoading && offlineDownloadList.length === 0 ? (
                            <div style={{ color: isDarkMode ? '#fff' : '#000' }}>Loading...</div>
                        ) : (
                            <>
                                {displayMode === 'table' && (
                                    <div className="ag-theme-alpine" style={styles.agGridStyle}>
                                        <AgGridReact
                                            rowData={rowData}
                                            columnDefs={columnDefs}
                                            defaultColDef={defaultColDef}
                                            pagination={true}
                                            paginationPageSize={itemsPerPage}
                                            getRowStyle={getRowStyle}
                                            onRowClicked={(params: any) => {
                                                if (isModifyMode && params.event.ctrlKey) {
                                                    toggleSelect(params.data.versionid);
                                                }
                                            }}
                                            headerHeight={40}
                                            onGridReady={(params) => {
                                                params.api.sizeColumnsToFit(); // Automatically size columns to fit the grid width
                                            }}
                                        />
                                    </div>
                                )}

                                {displayMode === 'bigCard' && (
                                    <BigCardMode
                                        filteredDownloadList={paginatedDownloadList}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={isModifyMode}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        showGalleries={showGalleries}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
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
                                    />
                                )}

                                {displayMode === 'recentCard' && (
                                    <BigCardMode
                                        filteredDownloadList={recentlyDownloaded} // reuse BigCard exactly as-is
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false}                      // read-only
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        showGalleries={false}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                    />
                                )}

                                {displayMode === 'holdCard' && (
                                    <BigCardMode
                                        filteredDownloadList={holdEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false} // treat as view-only
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        showGalleries={false}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                    />
                                )}

                                {displayMode === 'earlyAccessCard' && (
                                    <BigCardMode
                                        filteredDownloadList={earlyAccessEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false} // view-only
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        showGalleries={false}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                    />
                                )}

                                {displayMode === 'failedCard' && (
                                    <FailedCardMode
                                        failedEntries={failedEntries}
                                        isDarkMode={isDarkMode}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        isModifyMode={isModifyMode}
                                    />
                                )}

                                {displayMode === 'errorCard' && (
                                    <BigCardMode
                                        filteredDownloadList={errorEntries}
                                        isDarkMode={isDarkMode}
                                        isModifyMode={false} // view-only, same as hold / early access
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                        showGalleries={false}
                                        onToggleOverlay={toggleLeftOverlay}
                                        activePreviewId={leftOverlayEntry?.civitaiVersionID ?? null}
                                        displayMode="errorCard"
                                        onErrorCardDownload={handleErrorCardDownload}
                                    />
                                )}

                            </>
                        )}
                    </div>

                    {/* Footer Area */}
                    {(displayMode === 'bigCard' || displayMode === 'smallCard') && (
                        <div style={styles.footerStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                {/* Range Display */}
                                <div style={{ fontWeight: 'bold', color: isDarkMode ? '#fff' : '#000' }}>
                                    Showing {startItem} - {endItem} of {totalItems} items
                                </div>

                                {/* Pagination + Go-To (center) */}
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
                                    {/* Remove bottom margin on UL */}
                                    <Pagination className="mb-0" size="sm" style={{ marginBottom: 0 }}>
                                        <Pagination.First
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            aria-label="First Page"
                                        >
                                            <FaAngleDoubleLeft />
                                        </Pagination.First>
                                        <Pagination.Prev
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            aria-label="Previous Page"
                                        >
                                            <FaAngleLeft />
                                        </Pagination.Prev>

                                        {Array.from({ length: totalPages }, (_, index) => index + 1)
                                            .slice(Math.max(currentPage - 3, 0), currentPage + 2)
                                            .map(page => (
                                                <Pagination.Item
                                                    key={page}
                                                    active={page === currentPage}
                                                    onClick={() => setCurrentPage(page)}
                                                    aria-label={`Page ${page}`}
                                                >
                                                    {page}
                                                </Pagination.Item>
                                            ))}

                                        <Pagination.Next
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            aria-label="Next Page"
                                        >
                                            <FaAngleRight />
                                        </Pagination.Next>
                                        <Pagination.Last
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            aria-label="Last Page"
                                        >
                                            <FaAngleDoubleRight />
                                        </Pagination.Last>
                                    </Pagination>

                                    {/* Input + Button aligned via InputGroup */}
                                    <InputGroup style={{ width: 170 }}>
                                        <Form.Control
                                            type="number"
                                            min={1}
                                            max={totalPages || 1}
                                            placeholder="Page #"
                                            value={goToPageInput}
                                            onChange={(e) => setGoToPageInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleGoToPage(); }}
                                            size="sm"
                                            aria-label="Go to page number"
                                            disabled={totalPages <= 1}
                                            style={{
                                                backgroundColor: isDarkMode ? '#555' : '#fff',
                                                color: isDarkMode ? '#fff' : '#000',
                                            }}
                                        />
                                        <Button
                                            onClick={handleGoToPage}
                                            size="sm"
                                            disabled={totalPages <= 1 || !goToPageInput.trim()}
                                            aria-label="Go to page"
                                        >
                                            Go
                                        </Button>
                                    </InputGroup>
                                </div>

                                {/* Items Per Page Selector */}
                                <Form.Select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
                                    style={{
                                        width: '150px',
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