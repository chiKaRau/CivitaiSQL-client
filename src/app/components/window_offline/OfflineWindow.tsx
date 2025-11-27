// OfflineWindow.tsx

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';

// Store
import { useDispatch, useSelector } from 'react-redux';
import { updateDownloadFilePath } from '../../store/actions/chromeActions';

// Icons Components
import { AiFillFolderOpen } from "react-icons/ai";
import { BsDownload } from 'react-icons/bs';
import { TbDatabaseSearch, TbDatabasePlus, TbDatabaseMinus } from "react-icons/tb";
import { PiPlusMinusFill } from "react-icons/pi";
import { FaMagnifyingGlass, FaMagnifyingGlassPlus, FaSun, FaMoon, FaArrowRight } from "react-icons/fa6"; // Added FaSun and FaMoon
import { MdOutlineApps, MdOutlineTipsAndUpdates, MdOutlineDownloadForOffline, MdOutlineDownload, MdOutlinePendingActions } from "react-icons/md";
import { FcGenericSortingAsc, FcGenericSortingDesc } from "react-icons/fc";
import { PiTabsFill } from "react-icons/pi";
import { LuPanelLeftOpen, LuPanelRightOpen } from "react-icons/lu";
import { BsReverseLayoutTextWindowReverse } from "react-icons/bs";
import { FaArrowUp, FaTrashAlt } from 'react-icons/fa';
import { FaTimes } from 'react-icons/fa'; // Import the '×' icon
import { FaAngleDoubleLeft, FaAngleLeft, FaAngleRight, FaAngleDoubleRight } from 'react-icons/fa';
import { IoCloseOutline } from "react-icons/io5";

// Components
import CategoriesListSelector from '../CategoriesListSelector';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import ButtonWrap from "../buttons/ButtonWrap";
import { InputGroup, FormControl, Button, Spinner, OverlayTrigger, Tooltip, Form, Dropdown, ButtonGroup, Carousel, Card, Pagination, Accordion } from 'react-bootstrap';
import ErrorAlert from '../ErrorAlert';
import FolderDropdown from "../FolderDropdown"

// APIs
import {
    fetchOfflineDownloadList,
    fetchAddRecordToDatabase,
    fetchDownloadFilesByServer,
    fetchDownloadFilesByServer_v2,
    fetchAddOfflineDownloadFileIntoOfflineDownloadList,
    fetchRemoveOfflineDownloadFileIntoOfflineDownloadList,
    fetchBackupOfflineDownloadList,
    fetchGetPendingRemoveTagsList,
    fetchAddPendingRemoveTag,
    fetchGetCategoriesPrefixsList,
    fetchOpenDownloadDirectory,
    fetchOpenModelDownloadDirectory,
    fetchOfflineDownloadListPage,
    TagCountDTO,
    fetchUpdateHoldFromOfflineDownloadList,
    fetchUpdateDownloadPriorityFromOfflineDownloadList,
    fetchOfflineDownloadListHold,
    fetchOfflineDownloadListEarlyAccessActive,
    fetchUpdateDownloadFilePathFromOfflineDownloadList
} from "../../api/civitaiSQL_api"

import {
    bookmarkThisUrl,
    updateDownloadMethodIntoChromeStorage,
    callChromeBrowserDownload,
    removeBookmarkByUrl,
    updateOfflineModeIntoChromeStorage
} from "../../utils/chromeUtils"

// Ag-Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AppState } from '../../store/configureStore';
import FailedCardMode from './FailedCardMode';
import ErrorCardMode from './ErrorCardMode';
import FileNameToggle from './FileNameToggle';
import TagList from './TagList';
import TitleNameToggle from './TitleNameToggle';
import TopTagsDropdown from './TopTagsDropdown';
import SimilarSearchPanel from './SimilarSearchPanel';
import DownloadPathEditor from './DownloadPathEditor';

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
    downloadPriority?: number;           // 1..10
    earlyAccessEndsAt?: string | null;
}

// **1. SelectAllHeaderCheckbox Component**
interface SelectAllHeaderCheckboxProps {
    isChecked: boolean;
    isIndeterminate: boolean;
    onChange: (checked: boolean) => void;
}

// put near your other helpers
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

const OfflineWindow: React.FC = () => {

    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const rightInnerRef = useRef<HTMLDivElement>(null);


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

    const chromeData = useSelector((state: AppState) => state.chrome);

    const modify_downloadFilePath = chromeData.downloadFilePath;
    const modify_selectedCategory = chromeData.selectedCategory;

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

    // Add this in your component's top-level state:
    const [showPending, setShowPending] = useState(true);
    const [showNonPending, setShowNonPending] = useState(true);

    // NEW: show / hide “hold” entries
    const [showHoldEntries, setShowHoldEntries] = useState(false);

    const [showEarlyAccess, setShowEarlyAccess] = useState(true);


    // NEW: sort direction for date (server-side)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc'); // if you hate the type, you can drop it

    const [categoriesPrefixsList, setCategoriesPrefixsList] = useState<{ name: string; value: string; }[]>([]);
    const [selectedPrefixes, setSelectedPrefixes] = useState<Set<string>>(new Set());

    const [allowTryEarlyAccess, setAllowTryEarlyAccess] = useState(false);

    const [editingPathId, setEditingPathId] = useState<string | null>(null);


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

    // Accept either a string URL or an {url,width,height} object.
    function normalizeImg(img: string | { url: string; width?: number; height?: number }) {
        return typeof img === 'string'
            ? { url: img, width: undefined, height: undefined }
            : { url: img.url, width: img.width, height: img.height };
    }


    // how many *entries* per page of tags:
    const TAG_ENTRIES_PER_PAGE = 100;

    // how many tags per page
    const TAGS_PER_PAGE = 100;
    // current page index, 0-based
    const [tagPage, setTagPage] = useState(0);

    // 1) On mount, fetch the initial list of excluded tags from the server
    useEffect(() => {
        fetchExcludedTags();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadSpecialList = async () => {
            // Only react when switching into one of these modes
            if (displayMode !== 'holdCard' && displayMode !== 'earlyAccessCard') return;

            try {
                setUiMode('paging');
                setIsLoading(true);

                if (displayMode === 'holdCard') {
                    const payload = await fetchOfflineDownloadListHold(dispatch);
                    if (!cancelled) {
                        setHoldEntries(Array.isArray(payload) ? payload as OfflineDownloadEntry[] : []);
                    }
                } else {
                    const payload = await fetchOfflineDownloadListEarlyAccessActive(dispatch);
                    if (!cancelled) {
                        setEarlyAccessEntries(Array.isArray(payload) ? payload as OfflineDownloadEntry[] : []);
                    }
                }
            } catch (err: any) {
                console.error('Special list fetch failed:', err?.message || err);
                if (!cancelled) {
                    if (displayMode === 'holdCard') setHoldEntries([]);
                    else setEarlyAccessEntries([]);
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
    }, [displayMode, dispatch]);


    async function fetchExcludedTags() {
        const serverTags = await fetchGetPendingRemoveTagsList(dispatch);
        if (serverTags && Array.isArray(serverTags)) {
            setExcludedTags(serverTags);
        }
    }

    const [excludedTags, setExcludedTags] = useState<string[]>([]);

    type StatusFilter = 'pending' | 'non-pending' | 'both';

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





    // Remove a tag by adding it to the backend and excludedTags
    const handleRemoveTag = async (tag: string) => {
        try {
            // Call your API to add this tag to the "pending_remove_tags" in the backend
            await fetchAddPendingRemoveTag(tag, dispatch);
            // Then update local excludedTags, so it doesn't appear in subsequent rendering
            setExcludedTags((prev) => [...prev, tag]);
        } catch (error) {
            console.error("Failed to remove tag:", error);
        }
    };
    const handleSelectTag = (tag: string) => {
        setFilterCondition("contains");
        setFilterText(tag);
    };

    // Additional states for progress and failed downloads
    const [downloadProgress, setDownloadProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
    const [failedEntries, setFailedEntries] = useState<OfflineDownloadEntry[]>([]);

    // **New: State for Cooldown Management**
    // const [completedCount, setCompletedCount] = useState<number>(0);
    // const [delayTime, setDelayTime] = useState<number>(0);

    // State for tracking the 60s cooldown between batches
    const [batchCooldown, setBatchCooldown] = useState<number | null>(null);

    // In your OfflineWindow component
    const [isPaused, setIsPaused] = useState(false);

    const [selectCount, setSelectCount] = useState(20);

    const [currentBatchRange, setCurrentBatchRange] = useState<string | null>(null);

    // Add this alongside your existing useState hooks
    const [initiationDelay, setInitiationDelay] = useState<number | null>(null);


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

    const [isCancelled, setIsCancelled] = useState(false);

    const isCancelledRef = useRef(isCancelled);
    useEffect(() => {
        isCancelledRef.current = isCancelled;
    }, [isCancelled]);

    // Toggle functions
    const toggleTheme = () => {
        setIsDarkMode(prevMode => !prevMode);
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

    // // **New: Countdown Timer for delayTime**
    // useEffect(() => {
    //     let timer: NodeJS.Timeout;

    //     if (delayTime > 0) {
    //         timer = setInterval(() => {
    //             setDelayTime(prev => {
    //                 if (prev <= 1) {
    //                     clearInterval(timer);
    //                     return 0;
    //                 }
    //                 return prev - 1;
    //             });
    //         }, 1000);
    //     }

    //     return () => {
    //         if (timer) clearInterval(timer);
    //     };
    // }, [delayTime]);

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
                    sortDir                       // NEW ("asc" | "desc")

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
        sortDir            // add
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


    // Function to determine if an entry matches the filter condition (OR logic)
    const doesEntryMatch = (entry: OfflineDownloadEntry): boolean => {
        const fieldsToCheck = [
            entry.civitaiFileName,
            entry.modelVersionObject?.name, //version name
            entry.civitaiUrl,
            entry.modelVersionObject?.model?.name, //This should be the title
            entry.modelVersionObject?.creator?.username,
            entry.civitaiTags,
            entry.civitaiModelID,
            entry.civitaiVersionID,
            entry.downloadFilePath
        ];

        // Iterate through each field using OR logic
        return fieldsToCheck.some(field => {
            if (!field) return false; // Skip if the field is null or undefined

            const text = filterText.toLowerCase(); // Normalize filter text for case-insensitive comparison

            // If the field is an array, iterate through each item
            if (Array.isArray(field)) {
                return field.some(item => {
                    const fieldValue = item.toLowerCase(); // Normalize item for comparison

                    switch (filterCondition) {
                        case 'contains':
                            return fieldValue.includes(text);
                        case 'does not contain':
                            return !fieldValue.includes(text);
                        case 'equals':
                            return fieldValue === text;
                        case 'does not equal':
                            return fieldValue !== text;
                        case 'begins with':
                            return fieldValue.startsWith(text);
                        case 'ends with':
                            return fieldValue.endsWith(text);
                        default:
                            return false;
                    }
                });
            }
            // If the field is a string, apply the filtering logic directly
            else if (typeof field === 'string') {
                const fieldValue = field.toLowerCase(); // Normalize field value for comparison

                switch (filterCondition) {
                    case 'contains':
                        return fieldValue.includes(text);
                    case 'does not contain':
                        return !fieldValue.includes(text);
                    case 'equals':
                        return fieldValue === text;
                    case 'does not equal':
                        return fieldValue !== text;
                    case 'begins with':
                        return fieldValue.startsWith(text);
                    case 'ends with':
                        return fieldValue.endsWith(text);
                    default:
                        return false;
                }
            }

            // If the field is neither an array nor a string, do not consider it a match
            return false;
        });
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
        showHoldEntries, showEarlyAccess]);

    useEffect(() => {
        setSelectedIds(new Set());
    }, [filterText, filterCondition]);


    // New state for selecting the tag source (defaulting to 'all')
    const [tagSource, setTagSource] = useState<'all' | 'tags' | 'fileName' | 'titles' | 'other'>('all');


    // Recompute mostFrequentPendingTags when offlineDownloadList, excludedTags, or tagSource changes
    const [allTags, setAllTags] = useState<string[]>([]);
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

    const [preventPendingPaths, setPreventPendingPaths] = useState(true);

    // LEFT OVERLAY (preview) state
    const [leftOverlayEntry, setLeftOverlayEntry] = useState<OfflineDownloadEntry | null>(null);

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


    // Define themes
    const darkTheme = {
        headerBackgroundColor: '#333',
        headerFontColor: '#fff',
        rowBackgroundColor: '#444',
        rowFontColor: '#fff',
        evenRowBackgroundColor: '#555',
        oddRowBackgroundColor: '#444',
        gridBackgroundColor: '#2b2b2b',
    };

    const lightTheme = {
        headerBackgroundColor: '#f0f0f0',
        headerFontColor: '#000',
        rowBackgroundColor: '#fff',
        rowFontColor: '#000',
        evenRowBackgroundColor: '#fafafa',
        oddRowBackgroundColor: '#fff',
        gridBackgroundColor: '#ffffff',
    };

    const currentTheme = isDarkMode ? darkTheme : lightTheme;

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

    const controlRowStyle: React.CSSProperties = {
        marginTop: 8,
        paddingTop: 8,
        paddingBottom: 8,
        borderTop: `1px solid ${isDarkMode ? '#555' : '#ddd'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'nowrap',        // keep on a single line
    };

    const inlineIconBtnStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
        background: isDarkMode ? '#111' : '#fff',
        color: isDarkMode ? '#fff' : '#000',
        cursor: 'pointer',
    };

    const inlineDangerBtnStyle: React.CSSProperties = {
        ...inlineIconBtnStyle,
        border: `1px solid ${isDarkMode ? '#7f1d1d' : '#f5c2c7'}`,
        background: '#dc3545',
        color: '#fff',
    };


    const removeBtnStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: 8,
        right: 50, // leave room for the preview button at right:8
        width: 34,
        height: 34,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '999px',
        border: `1px solid ${isDarkMode ? '#7f1d1d' : '#f5c2c7'}`,
        color: '#fff',
        background: '#dc3545',
        cursor: 'pointer',
        boxShadow: isDarkMode ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.2)'
    };


    // Inline styles
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100vh',         // full viewport height
        overflowX: 'hidden',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: currentTheme.gridBackgroundColor,
        transition: 'background-color 0.3s ease',
    };

    const leftPanelStyle: React.CSSProperties = {
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        width: '500px',
        height: '100vh',
        overflowY: 'auto',      // <--- enable vertical scrolling if content is tall
        overflowX: 'hidden',
        backgroundColor: isDarkMode ? '#333' : '#fff',
        borderRight: isDarkMode ? '1px solid #777' : '1px solid #ccc',
        zIndex: 1000,
        padding: '20px',
        boxSizing: 'border-box',
    };

    const leftPanelComputedStyle: React.CSSProperties = {
        ...leftPanelStyle,
        overflowY: leftOverlayEntry ? 'hidden' : leftPanelStyle.overflowY
    };

    const leftOverlayBackdropStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',  // dims ONLY the left panel
        display: 'flex',
        zIndex: 1100
    };

    const leftOverlayDrawerStyle: React.CSSProperties = {
        width: '95%',  // covers ~95% of the left panel
        height: '100%',
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        color: isDarkMode ? '#fff' : '#000',
        boxShadow: '2px 0 10px rgba(0,0,0,0.4)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: 14,
        position: 'relative',
        transform: 'translateX(0)',
        transition: 'transform 180ms ease'
    };

    const closeBtnStyle: React.CSSProperties = {
        position: 'absolute',
        top: 8, right: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer'
    };

    const previewBtnStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 34,
        height: 34,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '999px',
        border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
        color: isDarkMode ? '#fff' : '#111',
        background: isDarkMode ? '#111' : '#fff',
        cursor: 'pointer',
        boxShadow: isDarkMode ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.2)'
    };

    const previewBtnActiveStyle: React.CSSProperties = {
        ...previewBtnStyle,
        background: '#2563eb',
        borderColor: isDarkMode ? '#60A5FA' : '#93c5fd',
        color: '#fff',
        boxShadow: isDarkMode ? '0 0 0 3px rgba(37,99,235,.35)' : '0 0 0 3px rgba(37,99,235,.2)'
    };


    const rightContentStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,                        // <- allow this flex child to get narrower than its contents
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        boxSizing: 'border-box',
        height: '100vh',
        overflowY: 'auto',                  // vertical scroll for tall content
        overflowX: 'auto',                  // horizontal scroll for wide content
    };

    const contentStyle: React.CSSProperties = {
        flex: 1, // Take up remaining space
        overflowY: 'auto', // Enable vertical scrolling
        paddingBottom: '60px', // Space for the fixed pagination
    };

    const footerStyle: React.CSSProperties = {
        backgroundColor: isDarkMode ? '#333' : '#f8f9fa',
        padding: '10px 20px',
        boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        width: '100%', // Ensures the footer spans the entire width of the right panel
        // Removed position: 'fixed', bottom: 0, left: 0
    };


    // Define styles for the selection count display
    const selectionCountStyle: React.CSSProperties = {
        padding: '8px 12px',
        borderRadius: '4px',
        backgroundColor: isDarkMode ? '#444' : '#e0e0e0',
        color: isDarkMode ? '#fff' : '#000',
        marginTop: '10px', // Adds spacing from the buttons above
        fontWeight: 'bold',
        width: '100%', // Ensures it takes the full width for a new row
        textAlign: 'center', // Centers the text
    };

    const headerStyleContainer: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column', // Change from default 'row' to 'column'
        alignItems: 'flex-start', // Align items to the start for better wrapping
        marginBottom: '20px',
    };


    const buttonGroupStyle: React.CSSProperties = {
        display: 'flex',
        gap: '10px',
        marginTop: '10px',
        flexWrap: 'wrap', // Allow buttons to wrap to the next line
        width: '100%', // Ensure the button group takes full width for better wrapping
    };

    // Example Button Style Adjustments
    const responsiveButtonStyle: React.CSSProperties = {
        flex: '1 1 auto', // Allow buttons to grow and shrink as needed
        minWidth: '100px', // Set a minimum width to maintain readability
        padding: '8px 12px', // Adjust padding for better fit
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const badgeStyle: React.CSSProperties = {
        position: 'absolute',
        top: -6,
        right: -6,
        background: 'red',
        color: 'white',
        borderRadius: '999px',
        padding: '2px 6px',
        fontSize: '0.75rem',
        lineHeight: 1,
        zIndex: 1
    };

    const badgeCount = (n: number) => (String(n));


    const agGridStyle: React.CSSProperties = {
        height: '1000px',
        width: '100%',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        paddingBottom: '60px', // Space for the fixed pagination if needed
    };


    const filterContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
    };

    const filterInputStyle: React.CSSProperties = {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        flex: '1',
        minWidth: '200px',
    };

    const filterSelectStyle: React.CSSProperties = {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        minWidth: '150px',
    };

    const downloadButtonStyle: React.CSSProperties = {
        padding: '10px 20px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: '#28a745',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '16px',
    };

    const downloadButtonDisabledStyle: React.CSSProperties = {
        ...downloadButtonStyle,
        backgroundColor: '#6c757d',
        cursor: 'not-allowed',
    };

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
                sortDir                       // NEW ("asc" | "desc")
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
                sortDir                       // NEW ("asc" | "desc")
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


        // const isBackupSuccessful = await fetchBackupOfflineDownloadList(dispatch);
        // if (!isBackupSuccessful) {
        //     alert("Backup failed. Cannot proceed with the download.");
        //     return;
        // }

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
                sortDir                       // NEW ("asc" | "desc")
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



    const handleProcessSelected = async () => {
        if (modify_downloadFilePath === "/@scan@/ErrorPath/") {
            alert("Invalid DownloadFilePath: ErrorPath is never allowed");
            return;
        }

        const pendingPaths = ["/@scan@/ACG/Pending", "/@scan@/ACG/Pending/"];
        if (preventPendingPaths && pendingPaths.includes(modify_downloadFilePath)) {
            alert("Invalid DownloadFilePath: pending paths are blocked");
            return;
        }

        // Use the currently visible list (respects filters/modify mode & server paging)
        const selectedEntries = filteredDownloadList.filter(entry =>
            selectedIds.has(entry.civitaiVersionID)
        );

        if (selectedEntries.length === 0) {
            console.log("No entries selected for processing.");
            return;
        }

        try {
            setIsLoading(true);
            setUiMode('modifying');
            for (const entry of selectedEntries) {
                try {
                    const {
                        civitaiUrl,
                        civitaiFileName,
                        civitaiModelID,
                        civitaiVersionID,
                        civitaiModelFileList,
                        civitaiTags
                    } = entry;

                    const modelObject = {
                        downloadFilePath: modify_downloadFilePath,
                        civitaiFileName,
                        civitaiModelID,
                        civitaiVersionID,
                        civitaiModelFileList,
                        civitaiUrl,
                        selectedCategory: modify_selectedCategory,
                        civitaiTags
                    };

                    await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, true, dispatch);
                    console.log(`Processed entry: ${civitaiFileName}`);
                } catch (entryError: any) {
                    console.error(`Failed to process entry ${entry.civitaiFileName}:`, entryError.message);
                }
            }

            const page0 = Math.max(0, currentPage - 1); // UI is 1-based
            try {
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
                    sortDir                       // NEW ("asc" | "desc")
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
            } catch (e: any) {
                console.error("Failed to refresh current page after processing:", e.message);
                setOfflineDownloadList([]);
                setSelectedIds(new Set());
                setServerTotalItems(0);
                setServerTotalPages(1);
            }


            console.log("All selected entries have been processed.");
        } catch (error: any) {
            console.error("An unexpected error occurred during processing:", error.message);
        } finally {
            dispatch(updateDownloadFilePath("/@scan@/ACG/Pending/"));
            setIsLoading(false);
            setUiMode('idle');
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
                sortDir                       // NEW ("asc" | "desc")
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
                sortDir                       // NEW ("asc" | "desc")
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

    // Similar to doesEntryMatch(), but using the provided tag (always with 'contains' logic)
    const doesEntryMatchWithTag = (entry: OfflineDownloadEntry, tag: string): boolean => {
        const lowerTag = tag.toLowerCase();
        const fieldsToCheck = [
            entry.civitaiFileName,
            entry.modelVersionObject?.name,        // version name
            entry.civitaiUrl,
            entry.modelVersionObject?.model?.name,   // model title
            entry.civitaiTags,
            entry.civitaiModelID,
            entry.civitaiVersionID,
        ];

        return fieldsToCheck.some((field) => {
            if (!field) return false;
            if (Array.isArray(field)) {
                return field.some((item) => item.toLowerCase().includes(lowerTag));
            }
            if (typeof field === "string") {
                return field.toLowerCase().includes(lowerTag);
            }
            return false;
        });
    };

    useEffect(() => {
        setTagPage(0);
    }, [tagSource, filteredDownloadList]);

    const paginatedTags = allTags.slice(
        tagPage * TAGS_PER_PAGE,
        (tagPage + 1) * TAGS_PER_PAGE
    );

    const totalTagPages = Math.max(1, Math.ceil(allTags.length / TAGS_PER_PAGE));

    const [goToPageInput, setGoToPageInput] = useState<string>('');

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
                    <FileNameToggle fileName={entry.civitaiFileName ?? 'N/A'} truncateAfter={56} />
                    {Array.isArray(entry.civitaiTags) && entry.civitaiTags.length > 0 && (
                        <TagList tags={entry.civitaiTags} isDarkMode={isDarkMode} />
                    )}
                    <div style={{ marginTop: 4, whiteSpace: 'normal', wordWrap: 'break-word' }}>
                        <strong>Download Path:</strong> {entry.downloadFilePath ?? 'N/A'}
                    </div>
                    <div><strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}</div>
                    <div><strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}</div>
                    <div><strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}</div>
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
    const BigCardMode: React.FC<{
        filteredDownloadList: OfflineDownloadEntry[];
        isDarkMode: boolean;
        isModifyMode: boolean;
        selectedIds: Set<string>;
        activePreviewId: string | null;
        toggleSelect: (id: string) => void;
        handleSelectAll: () => void;
        showGalleries: boolean;
        onToggleOverlay: (entry: OfflineDownloadEntry) => void;
    }> = ({
        filteredDownloadList,
        isDarkMode,
        isModifyMode,
        selectedIds,
        toggleSelect,
        handleSelectAll,
        showGalleries,
        activePreviewId,
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
                            gap: '20px',
                            justifyContent: 'center'
                        }}
                    >
                        {filteredDownloadList.map((entry, cardIndex) => {
                            const isSelected = selectedIds.has(entry.civitaiVersionID);
                            const showEA = isEntryEarlyAccess(entry);
                            return (
                                <Card
                                    key={cardIndex}
                                    style={{
                                        width: '100%',
                                        maxWidth: '380px',
                                        border: '1px solid',
                                        borderColor: isDarkMode ? '#555' : '#ccc',
                                        borderRadius: '8px',
                                        boxShadow: isDarkMode
                                            ? '2px 2px 8px rgba(255,255,255,0.1)'
                                            : '2px 2px 8px rgba(0,0,0,0.1)',
                                        backgroundColor: isDarkMode ? '#333' : '#fff',
                                        color: isDarkMode ? '#fff' : '#000',
                                        position: 'relative',
                                        cursor: isModifyMode ? 'pointer' : 'default',
                                        opacity: isModifyMode && !isSelected ? 0.8 : 1,
                                        transition:
                                            'background-color 0.3s ease, color 0.3s ease, opacity 0.3s ease',
                                        overflow: 'hidden',
                                        margin: '0 auto',
                                        padding: '10px'
                                    }}
                                    onClick={(e) => {
                                        if (isModifyMode && e.ctrlKey) {
                                            toggleSelect(entry.civitaiVersionID);
                                        }
                                    }}
                                >
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

                                    {/* Selection Checkbox at the top-left */}
                                    <Form.Check
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            toggleSelect(entry.civitaiVersionID);
                                        }}
                                        disabled={displayMode === "recentCard" || displayMode === "holdCard" || displayMode === "earlyAccessCard"}
                                        style={{
                                            position: 'absolute',
                                            top: '10px',
                                            left: '10px',
                                            transform: 'scale(1.2)',
                                            cursor: isModifyMode ? 'pointer' : 'not-allowed',
                                            accentColor: isDarkMode ? '#fff' : '#000',
                                        }}
                                    />

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
                                        <div style={{ flex: 1, minWidth: 0 }}>
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
                                            <TagList tags={entry.civitaiTags} isDarkMode={isDarkMode} />
                                        )}

                                        {/* 3) Show full download path with line wrapping */}
                                        <div
                                            style={{
                                                margin: "4px 0",
                                                whiteSpace: "normal",
                                                wordWrap: "break-word",
                                            }}
                                        >
                                            {displayMode === "recentCard" ? (
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
                                                </>
                                            )}
                                        </div>

                                        {/* Category */}
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}
                                        </p>

                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}
                                        </p>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}
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
                                    </div>

                                    {/* --- Hold, Priority, Remove, Preview (one line) --- */}
                                    <div style={controlRowStyle}>
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
                                                style={inlineDangerBtnStyle}
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
                                                style={inlineIconBtnStyle}
                                                disabled={isLoading}
                                            >
                                                <LuPanelLeftOpen size={18} />
                                            </button>
                                        </div>
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
                        {filteredDownloadList.map((entry, index) => {
                            const isSelected = selectedIds.has(entry.civitaiVersionID);
                            const showEA = isEntryEarlyAccess(entry);
                            const firstImageUrl = entry.imageUrlsArray?.[0] ?? null;
                            const isFirstCard = index === 0;

                            return (
                                <Card
                                    key={index}
                                    style={{
                                        border: '1px solid',
                                        borderColor: isDarkMode ? '#555' : '#ccc',
                                        borderRadius: '4px',
                                        maxWidth: '180px',
                                        boxShadow: isDarkMode
                                            ? '1px 1px 6px rgba(255,255,255,0.1)'
                                            : '1px 1px 6px rgba(0,0,0,0.1)',
                                        backgroundColor: isDarkMode ? '#333' : '#fff',
                                        color: isDarkMode ? '#fff' : '#000',
                                        position: 'relative',
                                        cursor: isModifyMode ? 'pointer' : 'default',
                                        opacity: isModifyMode && !isSelected ? 0.8 : 1,
                                        transition:
                                            'background-color 0.3s ease, color 0.3s ease, opacity 0.3s ease',
                                        overflow: 'hidden',
                                        padding: '10px',
                                    }}
                                    onClick={(e) => {
                                        if (isModifyMode && e.ctrlKey) {
                                            toggleSelect(entry.civitaiVersionID);
                                        }
                                    }}
                                >
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

                                    {/* Selection Checkbox */}
                                    <Form.Check
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            toggleSelect(entry.civitaiVersionID);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '10px',
                                            left: '10px',
                                            transform: 'scale(1.2)',
                                            cursor: isModifyMode ? 'pointer' : 'not-allowed',
                                            accentColor: isDarkMode ? '#fff' : '#000',
                                        }}
                                    />

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
                                                alt={`Thumbnail ${index + 1}`}
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
                                        style={activePreviewId === entry.civitaiVersionID ? previewBtnActiveStyle : previewBtnStyle}
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
        <div style={containerStyle}>
            {/* Scrollable Content Area */}
            <>
                <div style={leftPanelComputedStyle} ref={leftPanelRef}>
                    <div style={headerStyleContainer}>
                        <h3 style={{ color: isDarkMode ? '#fff' : '#000' }}>Offline Download List</h3>

                        <div style={buttonGroupStyle}>
                            {/* Refresh List Button */}
                            <Button
                                onClick={handleRefreshList}
                                style={{
                                    ...responsiveButtonStyle,
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
                                    ...responsiveButtonStyle
                                }}
                                variant={displayMode === 'table' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('table')}
                            >
                                Table Mode
                            </Button>
                            <Button
                                style={{
                                    ...responsiveButtonStyle
                                }}
                                variant={displayMode === 'bigCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('bigCard')}
                            >
                                Big Card Mode
                            </Button>
                            <Button
                                style={{
                                    ...responsiveButtonStyle
                                }}
                                variant={displayMode === 'smallCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('smallCard')}
                            >
                                Small Card Mode
                            </Button>
                            {/* <Button
                                style={responsiveButtonStyle}
                                variant={displayMode === 'updateCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('updateCard')}
                            >
                                Update Card Mode
                            </Button> */}

                            <Button
                                style={{ ...responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                variant={displayMode === 'recentCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('recentCard')}
                                aria-label={`Recently Downloaded (${recentlyDownloaded.length})`}
                            >
                                Recently Downloaded
                                {recentlyDownloaded.length > 0 && (
                                    <span
                                        style={{
                                            ...badgeStyle,
                                            background: '#28a745' // green for "recent/success"
                                        }}
                                    >
                                        {badgeCount(recentlyDownloaded.length)}
                                    </span>
                                )}
                            </Button>

                            {/* NEW: Hold list mode */}
                            <Button
                                style={{ ...responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                variant={displayMode === 'holdCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('holdCard')}
                                aria-label={`Hold entries (${holdEntries.length})`}
                            >
                                Hold
                                {holdEntries.length > 0 && (
                                    <span
                                        style={{
                                            ...badgeStyle,
                                            background: '#f97316', // orange-ish
                                        }}
                                    >
                                        {badgeCount(holdEntries.length)}
                                    </span>
                                )}
                            </Button>

                            {/* NEW: Early Access mode */}
                            <Button
                                style={{ ...responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                                variant={displayMode === 'earlyAccessCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('earlyAccessCard')}
                                aria-label={`Early Access entries (${earlyAccessEntries.length})`}
                            >
                                Early Access
                                {earlyAccessEntries.length > 0 && (
                                    <span
                                        style={{
                                            ...badgeStyle,
                                            background: '#ef4444', // red-ish
                                        }}
                                    >
                                        {badgeCount(earlyAccessEntries.length)}
                                    </span>
                                )}
                            </Button>


                            <Button
                                variant={displayMode === 'failedCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('failedCard')}
                                style={{ ...responsiveButtonStyle, position: 'relative', overflow: 'visible' }}
                            >
                                Failed Card Mode
                                {failedEntries.length > 0 && (
                                    <span style={badgeStyle}>{badgeCount(failedEntries.length)}</span>
                                )}
                            </Button>



                            <Button
                                variant={displayMode === 'errorCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('errorCard')}
                                style={{
                                    ...responsiveButtonStyle
                                }}
                            >
                                Error Card Mode
                            </Button>

                            {/* Modify Mode Toggle Button */}
                            <Button
                                onClick={toggleModifyMode}
                                style={{
                                    ...responsiveButtonStyle,
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
                                    ...responsiveButtonStyle,
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
                                style={responsiveButtonStyle}
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
                    <div style={filterContainerStyle}>

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
                                    ...filterSelectStyle,
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
                                    ...downloadButtonStyle,
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
                            <>
                                <Button
                                    onClick={handleProcessSelected}
                                    style={{
                                        ...downloadButtonStyle,
                                        backgroundColor: '#ffc107',
                                        color: '#000',
                                    }}
                                    disabled={selectedIds.size === 0 || isLoading}
                                >
                                    Process Selected
                                </Button>

                                {/* New Remove button */}
                                <Button
                                    onClick={handleRemoveSelected}
                                    style={{
                                        ...downloadButtonStyle,
                                        backgroundColor: '#dc3545',
                                        color: '#fff',
                                    }}
                                    disabled={selectedIds.size === 0 || isLoading}
                                >
                                    Remove Selected
                                </Button>
                            </>
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
                                style={selectedIds.size > 0 ? downloadButtonStyle : downloadButtonDisabledStyle}
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
                        <div style={leftOverlayBackdropStyle} onClick={closeLeftOverlay}>
                            <div style={leftOverlayDrawerStyle} onClick={(e) => e.stopPropagation()}>
                                <button onClick={closeLeftOverlay} style={closeBtnStyle} aria-label="Close overlay">
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
                <div style={rightContentStyle}>
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
                            {(isModifyMode || (displayMode === 'errorCard')) ? (
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
                                    <div className="ag-theme-alpine" style={agGridStyle}>
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

                                {/* {displayMode === 'updateCard' && (
                                    <UpdateCardMode
                                        filteredDownloadList={paginatedDownloadList} // or your full filtered list if preferred
                                        isDarkMode={isDarkMode}
                                        isModifyMode={isModifyMode}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
                                    />
                                )} */}

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
                                    <ErrorCardMode
                                        isDarkMode={isDarkMode}
                                        modify_downloadFilePath={modify_downloadFilePath}
                                        modify_selectedCategory={modify_selectedCategory}
                                        offlineDownloadList={offlineDownloadList}
                                        handleRefreshList={handleRefreshList}  // NEW PROP
                                    />
                                )}

                            </>
                        )}
                    </div>

                    {/* Footer Area */}
                    {(displayMode === 'bigCard' || displayMode === 'smallCard') && (
                        <div style={footerStyle}>
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