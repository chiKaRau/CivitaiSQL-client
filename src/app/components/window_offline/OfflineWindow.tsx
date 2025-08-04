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
    fetchGetCategoriesPrefixsList
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
    earlyAccessConfig: any;
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

interface OfflineDownloadEntry {
    civitaiFileName: string;
    civitaiModelFileList: CivitaiModelFile[];
    modelVersionObject: ModelVersionObject;
    civitaiBaseModel: string;
    downloadFilePath: string;
    civitaiUrl: string;
    civitaiVersionID: string;
    civitaiModelID: string;
    imageUrlsArray: string[];
    selectedCategory: string;
    civitaiTags: string[];
}

// **1. SelectAllHeaderCheckbox Component**
interface SelectAllHeaderCheckboxProps {
    isChecked: boolean;
    isIndeterminate: boolean;
    onChange: (checked: boolean) => void;
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

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [offlineDownloadList, setOfflineDownloadList] = useState<OfflineDownloadEntry[]>([]);
    const [displayMode, setDisplayMode] = useState<
        'table' | 'bigCard' | 'smallCard' | 'failedCard' | 'errorCard' | 'updateCard'
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

    async function fetchExcludedTags() {
        const serverTags = await fetchGetPendingRemoveTagsList(dispatch);
        if (serverTags && Array.isArray(serverTags)) {
            setExcludedTags(serverTags);
        }
    }

    const [excludedTags, setExcludedTags] = useState<string[]>([]);

    // In your component’s state declarations:
    const [isEditingTopTag, setIsEditingTopTag] = useState(false);
    const [topTagInputValue, setTopTagInputValue] = useState(filterText || "");

    const [mostFrequentPendingTags, setMostFrequentPendingTags] = useState<string[]>([]);

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
                : data.filter(
                    (entry) =>
                        entry.downloadFilePath === "/@scan@/ACG/Pending" ||
                        entry.downloadFilePath === "/@scan@/ACG/Pending/"
                );

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

    // Add this in your component's top-level state:
    const [onlyPendingPaths, setOnlyPendingPaths] = useState(false);

    const [categoriesPrefixsList, setCategoriesPrefixsList] = useState<{ name: string; value: string; }[]>([]);
    const [selectedPrefixes, setSelectedPrefixes] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadPrefixes = async () => {
            const list = await fetchGetCategoriesPrefixsList(dispatch);
            if (Array.isArray(list)) {
                // remove the “Default” / empty‐value entry
                const filtered = list.filter(p => p.value !== "");
                setCategoriesPrefixsList(filtered);
                setSelectedPrefixes(new Set(filtered.map(p => p.value)));
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
        setIsModifyMode((prevMode) => {
            const nextMode = !prevMode;
            // If we're enabling modify mode, set onlyPendingPaths = true
            if (nextMode) {
                setOnlyPendingPaths(true);
            } else {
                // If we're disabling modify mode, set onlyPendingPaths = false
                setOnlyPendingPaths(false);
            }
            return nextMode;
        });
        setSelectedIds(new Set()); // Clear selections when toggling modify mode
        setFilterText("")
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

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchOfflineDownloadList(dispatch);
                if (Array.isArray(data)) {
                    setOfflineDownloadList(data);
                    // Initialize all IDs as selected by default
                    // const allIds = data.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
                    // setSelectedIds(new Set(allIds));
                } else {
                    console.warn("fetchOfflineDownloadList returned non-array data:", data);
                    setOfflineDownloadList([]);
                }
            } catch (error: any) {
                console.error("Error fetching offline download list:", error.message);
                setOfflineDownloadList([]);
                // Optionally, dispatch an error to the Redux store
                // dispatch(setError({ hasError: true, errorMessage: error.message }));
            }
            setIsLoading(false);
        };

        fetchData();
    }, [dispatch]);

    useEffect(() => {
        // Reset the selection when filterText or filterCondition changes
        setSelectedIds(new Set());
    }, [filterText, filterCondition]);

    // Function to determine if an entry matches the filter condition (OR logic)
    const doesEntryMatch = (entry: OfflineDownloadEntry): boolean => {
        const fieldsToCheck = [
            entry.civitaiFileName,
            entry.modelVersionObject?.name, //version name
            entry.civitaiUrl,
            entry.modelVersionObject?.model?.name, //This should be the title
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

    // Memoized filtered list based on filterText and filterCondition
    const filteredDownloadList = useMemo(() => {
        // Apply filtering based on filterText and filterCondition
        let filtered = filterText.trim() === ''
            ? offlineDownloadList
            : offlineDownloadList.filter(entry => doesEntryMatch(entry));

        // If the user has checked "Only Pending Paths," keep only those
        if (onlyPendingPaths) {
            filtered = filtered.filter(entry => {
                const path = entry.downloadFilePath ?? "";
                return (
                    path === "/@scan@/ACG/Pending" ||
                    path === "/@scan@/ACG/Pending/"
                );
            });
        }

        // Use .includes() to filter update entries
        if (displayMode === 'updateCard') {
            // Keep only entries whose downloadFilePath contains "/@scan@/Update/"
            filtered = filtered.filter(entry => {
                const path = entry.downloadFilePath ?? "";
                return path.includes("/@scan@/Update/");
            });
        } else if (
            displayMode === 'table' ||
            displayMode === 'bigCard' ||
            displayMode === 'smallCard'
        ) {
            // Exclude entries that have "/@scan@/Update/" in their downloadFilePath
            filtered = filtered.filter(entry => {
                const path = entry.downloadFilePath ?? "";
                return !path.includes("/@scan@/Update/");
            });
        }

        if (selectedPrefixes.size > 0) {
            filtered = filtered.filter(entry => {
                const path = entry.downloadFilePath ?? '';
                return Array.from(selectedPrefixes).some(pref =>
                    path.startsWith(pref)
                );
            });
        }

        // Only sort if modify mode is off
        if (!isModifyMode) {
            // Sort the filtered list so that selected entries come first
            return [...filtered].sort((a, b) => {
                const aSelected = selectedIds.has(a.civitaiVersionID) ? 1 : 0;
                const bSelected = selectedIds.has(b.civitaiVersionID) ? 1 : 0;
                return bSelected - aSelected; // Descending: selected first
            });
        }

        // If modify mode is on, return the filtered list without sorting
        return filtered;
    }, [offlineDownloadList, filterText, filterCondition, selectedIds, isModifyMode, onlyPendingPaths, displayMode, selectedPrefixes]);

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



    // **Add Pagination State and Logic**
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100); // Default to 100 as in table mode

    const totalPages = Math.ceil(filteredDownloadList.length / itemsPerPage);
    const totalItems = filteredDownloadList.length;

    const paginatedDownloadList = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredDownloadList.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredDownloadList, currentPage, itemsPerPage]);

    // Compute current range
    const startItem = useMemo(() => {
        return filteredDownloadList.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    }, [filteredDownloadList, currentPage, itemsPerPage]);

    const endItem = useMemo(() => {
        return Math.min(currentPage * itemsPerPage, filteredDownloadList.length);
    }, [filteredDownloadList, currentPage, itemsPerPage]);

    // **New: Separate useEffect for itemsPerPage changes**
    useEffect(() => {
        setCurrentPage(1);
        console.log(`Items per page changed to ${itemsPerPage}. Resetting to page 1.`);
    }, [itemsPerPage]);

    // **New: Adjust currentPage if it exceeds totalPages**
    useEffect(() => {
        const newTotalPages = Math.ceil(filteredDownloadList.length / itemsPerPage);
        if (currentPage > newTotalPages) {
            setCurrentPage(newTotalPages > 0 ? newTotalPages : 1);
            console.log(`Adjusted currentPage to ${newTotalPages > 0 ? newTotalPages : 1} based on new totalPages.`);
        }
    }, [itemsPerPage, filteredDownloadList, currentPage]);

    const [preventPendingPaths, setPreventPendingPaths] = useState(true);

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
            headerName: "Early Access Ends",
            field: "earlyAccessEndsAt",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
            // Optionally format the date or show a fallback if null
            valueFormatter: (params) => {
                return params.value ? new Date(params.value).toLocaleString() : "Active";
            }
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
                filesize: filesizeMB + " MB",
                earlyAccessEndsAt: entry.modelVersionObject?.earlyAccessEndsAt ?? null,
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

    // Inline styles
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100vh',         // full viewport height
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
        backgroundColor: isDarkMode ? '#333' : '#fff',
        borderRight: isDarkMode ? '1px solid #777' : '1px solid #ccc',
        zIndex: 1000,
        padding: '20px',
        boxSizing: 'border-box',
    };


    const rightContentStyle: React.CSSProperties = {
        flex: 1,                     // Fills the remaining horizontal space
        display: 'flex',            // Enables flex layout
        flexDirection: 'column',    // Stacks children vertically
        padding: '20px',
        boxSizing: 'border-box',
        height: '100vh',            // Ensures the right panel takes full viewport height
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

    // **New: Function to handle "Refresh List" button click**
    const handleRefreshList = async () => {
        // Prevent multiple refreshes
        if (isLoading) return;

        console.log("Refresh List button clicked");

        // Reset failed entries if necessary
        setFailedEntries([]);
        // setCompletedCount(0); // Reset completed count on refresh

        try {
            setIsLoading(true);
            console.log("isLoading set to true");

            // Fetch the latest download list
            const updatedData = await fetchOfflineDownloadList(dispatch);

            if (Array.isArray(updatedData)) {
                setOfflineDownloadList(updatedData);
                // const allIds = updatedData.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
                // setSelectedIds(new Set(allIds));
                console.log("Download list successfully refreshed");
            } else {
                console.warn("fetchOfflineDownloadList returned non-array data:", updatedData);
                setOfflineDownloadList([]);
                setSelectedIds(new Set());
            }
        } catch (error: any) {
            console.error("Failed to refresh download list:", error.message);
            // Optionally, display a toast notification or alert to inform the user
            alert("Failed to refresh the download list. Please try again later.");
            // Optionally, dispatch an error to the Redux store
            // dispatch(setError({ hasError: true, errorMessage: error.message }));
        } finally {
            setIsLoading(false);
            console.log("isLoading set to false");
        }

        try {
            fetchExcludedTags();
        } catch (error: any) {
            console.error("Failed to refresh pending remove tag list:", error.message);
            // Optionally, display a toast notification or alert to inform the user
            alert("Failed to refresh the pending remove tag  list. Please try again later.");
            // Optionally, dispatch an error to the Redux store
            // dispatch(setError({ hasError: true, errorMessage: error.message }));
        }
    };

    // Function to handle "Download Now" button click
    const handleDownloadNow = async () => {
        console.log("Download Now button clicked");

        const isBackupSuccessful = await fetchBackupOfflineDownloadList(dispatch);
        if (!isBackupSuccessful) {
            alert("Backup failed. Cannot proceed with the download.");
            return;
        }

        // Collect selected entries from the filtered list
        const entriesToDownload = filteredDownloadList.filter(entry => {
            // Must be selected
            const isSelected = selectedIds.has(entry.civitaiVersionID);

            // Grab early access date and file path
            const earlyAccessEndsAt = entry.modelVersionObject?.earlyAccessEndsAt;
            const downloadFilePath = entry.downloadFilePath ?? "";

            // Get current time
            const now = new Date();

            // If earlyAccessEndsAt is defined AND strictly after now, it's still in early access
            const stillEarlyAccess = earlyAccessEndsAt
                ? new Date(earlyAccessEndsAt) > now
                : false;   // if null/undefined, treat as "not early access"

            // Check if file path indicates pending
            const isPendingPath =
                downloadFilePath === "/@scan@/ACG/Pending" ||
                downloadFilePath === "/@scan@/ACG/Pending/";

            // Exclude if still in early access or if file path is pending
            const shouldExclude = stillEarlyAccess || isPendingPath;

            return isSelected && !shouldExclude;
        });

        if (entriesToDownload.length === 0) {
            alert("No valid entries to download. Either they're missing earlyAccessEndsAt or pointing to /@scan@/ACG/Pending.");
            return;
        }

        setDownloadProgress({ completed: 0, total: entriesToDownload.length });
        setFailedEntries([]);
        // setCompletedCount(0);
        setIsCancelled(false);

        // Callback to update the download list after each download completes
        const handleEachDownloadComplete = async (success: boolean, entry: OfflineDownloadEntry) => {
            if (!success) {
                setFailedEntries(prev => [...prev, entry]);
            }

            // setCompletedCount(prevCount => {
            //     const newCount = prevCount + 1;

            //     // After every 10 completions, initiate a cooldown
            //     if (newCount % 10 === 0) {
            //         setDelayTime(60); // 60-second cooldown
            //         console.log("Cooldown initiated for 60 seconds after 10 downloads.");
            //     }

            //     return newCount;
            // });

            setDownloadProgress(prev => ({ completed: prev.completed + 1, total: prev.total }));

            // Optionally, update the download list
            try {
                const updatedData = await fetchOfflineDownloadList(dispatch);
                if (Array.isArray(updatedData)) {
                    setOfflineDownloadList(updatedData);
                } else {
                    console.warn("fetchOfflineDownloadList returned non-array data:", updatedData);
                    setOfflineDownloadList([]);
                    setSelectedIds(new Set());
                }
            } catch (error: any) {
                console.error("Failed to fetch updated download list:", error.message);
            }
        };

        try {
            setIsLoading(true);
            console.log("isLoading set to true");

            await downloadSelectedEntries(entriesToDownload, dispatch, handleEachDownloadComplete, isPausedRef, isCancelledRef);
        } catch (error: any) {
            console.error("Download failed:", error.message);
        } finally {
            setIsLoading(false);
            console.log("isLoading set to false");
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
        const CONCURRENCY_LIMIT = 5; // or any number you want
        const semaphore = new Semaphore(CONCURRENCY_LIMIT);

        // Split the entries into chunks (batches) of 10
        const batches = chunkArray(entriesToDownload, 10);

        let batchIndex = 0;
        for (const batch of batches) {
            // 1) Check if the entire download process has been cancelled
            if (isCancelledRef.current) {
                console.log("Download process cancelled before batch:", batchIndex);
                break;
            }


            // Determine the range of the current batch
            const start = batchIndex * 10 + 1;
            const end = Math.min((batchIndex + 1) * 10, entriesToDownload.length);
            setCurrentBatchRange(`Now processing ${start} ~ ${end}, please wait until processing next 10.`);

            console.log(`Processing batch #${batchIndex + 1} (size: ${batch.length})`);

            // 2) Start downloads for this batch in concurrency-limited parallel
            //    We'll store all tasks in an array, then await them all.
            const tasks: Promise<void>[] = [];

            for (const entry of batch) {
                // Check pause/cancel status before starting each item
                while (isPausedRef.current) {
                    console.log("Download paused. Waiting to resume...");
                    await sleep(500);
                    if (isCancelledRef.current) {
                        console.log("Download cancelled during pause.");
                        break;
                    }
                }
                if (isCancelledRef.current) break;

                // *** ADD THIS RANDOM 5–7s DELAY *** 
                // 1) Calculate the random delay for this file
                const delayMilliseconds = 5000 + Math.random() * 10000; // 5000ms to 10000ms
                const delaySeconds = Math.ceil(delayMilliseconds / 1000);

                // 2) Update state so your "Next download will start in X seconds" appears
                setInitiationDelay(delaySeconds);

                // 3) (Optional) console log for debugging
                console.log(`Waiting ${delaySeconds}s before starting ${entry.civitaiFileName}...`);

                // 4) Sleep for that many seconds
                await sleep(delayMilliseconds);

                // 5) Once the delay is done, clear the UI message
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

                        // Perform your actual download
                        const isDownloadSuccessful = await fetchDownloadFilesByServer_v2(
                            {
                                civitaiUrl,
                                civitaiFileName,
                                civitaiModelID,
                                civitaiVersionID,
                                downloadFilePath,
                                civitaiModelFileList
                            },
                            dispatch
                        );

                        // If download is successful, do the DB insert and bookmark
                        if (isDownloadSuccessful) {
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
                        // Notify UI or state that this individual download is done
                        onDownloadComplete(success, entry);
                    }
                });

                tasks.push(task);
                // Also check if user cancelled mid-loop
                if (isCancelledRef.current) {
                    console.log("Download cancelled after initiating some tasks in batch.");
                    break;
                }
            }

            // 3) Wait for all tasks in this batch to complete
            await Promise.allSettled(tasks);

            // The entire batch is done here
            console.log(`Batch #${batchIndex + 1} completed.`);

            // If the user cancelled during or after the batch, break
            if (isCancelledRef.current) {
                console.log("Download process cancelled after completing a batch.");
                break;
            }

            // Set a 60-second cooldown
            console.log("Starting 60-second cooldown before next batch...");
            setBatchCooldown(60);

            // Option A: Simple approach: just sleep 60s
            await sleep(60000);

            // Clear the cooldown display
            setBatchCooldown(null);

            // Move on to the next batch
            batchIndex++;
        }

        // Finally, wait for any leftover concurrency tasks to settle
        while ((semaphore as any).activeCount > 0) {
            await sleep(500);
        }
        console.log("All batches processed or cancelled.");

        // **Clear currentBatchRange after all batches are done**
        setCurrentBatchRange(null);
        // After processing all entries, fetch the updated download list once
        const updatedData = await fetchOfflineDownloadList(dispatch);
        if (Array.isArray(updatedData)) {
            setOfflineDownloadList(updatedData);
            // const allIds = updatedData.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
            // setSelectedIds(new Set(allIds));
            setSelectedIds(new Set());
        } else {
            console.warn("fetchOfflineDownloadList returned non-array data:", updatedData);
            setOfflineDownloadList([]);
            setSelectedIds(new Set());
        }
    };


    const handleProcessSelected = async () => {

        if (modify_downloadFilePath === "/@scan@/ErrorPath/") {
            alert("Invalid DownloadFilePath: ErrorPath is never allowed");
            return;
        }

        // conditionally‐invalid:
        const pendingPaths = ["/@scan@/ACG/Pending", "/@scan@/ACG/Pending/"];
        if (preventPendingPaths && pendingPaths.includes(modify_downloadFilePath)) {
            alert("Invalid DownloadFilePath: pending paths are blocked");
            return;
        }

        const isBackupSuccessful = await fetchBackupOfflineDownloadList(dispatch);
        if (!isBackupSuccessful) {
            alert("Backup failed. Cannot proceed with the download.");
            return;
        }

        const selectedEntries = offlineDownloadList.filter(entry => selectedIds.has(entry.civitaiVersionID));

        if (selectedEntries.length === 0) {
            console.log("No entries selected for processing.");
            return;
        }

        try {
            setIsLoading(true);

            for (const entry of selectedEntries) {
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

                    // Update the backend with the model object
                    await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, true, dispatch);

                    // Optionally, perform additional actions like bookmarking
                    // bookmarkThisUrl(...); // Uncomment and provide necessary parameters if needed

                    console.log(`Processed entry: ${civitaiFileName}`);
                } catch (entryError: any) {
                    console.error(`Failed to process entry ${entry.civitaiFileName}:`, entryError.message);
                    // Optionally, handle individual entry errors, e.g., collect failed entries
                    // You can maintain a list of failed entries to notify the user later
                }
            }

            // After processing all entries, fetch the updated download list once
            const updatedData = await fetchOfflineDownloadList(dispatch);
            if (Array.isArray(updatedData)) {
                setOfflineDownloadList(updatedData);
                // const allIds = updatedData.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
                // setSelectedIds(new Set(allIds));
                setSelectedIds(new Set());
            } else {
                console.warn("fetchOfflineDownloadList returned non-array data:", updatedData);
                setOfflineDownloadList([]);
                setSelectedIds(new Set());
            }

            console.log("All selected entries have been processed.");
        } catch (error: any) {
            console.error("An unexpected error occurred during processing:", error.message);
            // Optionally, dispatch a global error to the Redux store
            // dispatch(setError({ hasError: true, errorMessage: error.message }));
        } finally {
            dispatch(updateDownloadFilePath("/@scan@/ACG/Pending/"));
            setIsLoading(false);
        }
    };

    const handleRemoveSelected = async () => {

        const userConfirmed = window.confirm("Are you sure you want to remove the selected items?");
        if (!userConfirmed) {
            console.log("User canceled the removal operation.");
            return; // Exit the function if the user cancels
        }

        const isBackupSuccessful = await fetchBackupOfflineDownloadList(dispatch);
        if (!isBackupSuccessful) {
            alert("Backup failed. Cannot proceed with the download.");
            return;
        }

        if (selectedIds.size === 0) {
            alert("No items selected to remove.");
            return;
        }

        setIsLoading(true);
        try {
            // Filter the offlineDownloadList to only those selected
            const selectedEntries = offlineDownloadList.filter((entry) =>
                selectedIds.has(entry.civitaiVersionID)
            );

            // Remove each entry using your API call
            for (const entry of selectedEntries) {
                await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                    {
                        civitaiModelID: entry.civitaiModelID,
                        civitaiVersionID: entry.civitaiVersionID,
                    },
                    dispatch
                );
            }

            // Now fetch the updated offline list
            const updatedData = await fetchOfflineDownloadList(dispatch);
            if (Array.isArray(updatedData)) {
                setOfflineDownloadList(updatedData);
                // If you want to clear selection after removal, do:
                setSelectedIds(new Set());
                // Or, reselect all if you prefer:
                // const allIds = updatedData.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
                // setSelectedIds(new Set(allIds));
                setSelectedIds(new Set());
            } else {
                console.warn("fetchOfflineDownloadList returned non-array data:", updatedData);
                setOfflineDownloadList([]);
                setSelectedIds(new Set());
            }
        } catch (error: any) {
            console.error("Failed to remove selected entries:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectFirstN = () => {
        // Get the current time to compare with earlyAccessEndsAt
        const now = new Date();

        // Create a Set of combined civitaiVersionID and civitaiModelID for efficient lookup
        const failedIds = new Set(
            failedEntries.map(entry => `${entry.civitaiVersionID}|${entry.civitaiModelID}`)
        );

        // Apply the same exclusion criteria as in handleDownloadNow
        const validEntries = filteredDownloadList.filter(entry => {
            const earlyAccessEndsAt = entry.modelVersionObject?.earlyAccessEndsAt;
            const downloadFilePath = entry.downloadFilePath ?? "";

            // Determine if the entry is still in early access
            const stillEarlyAccess = earlyAccessEndsAt ? new Date(earlyAccessEndsAt) > now : false;

            // Determine if the download path is pending
            const isPendingPath =
                downloadFilePath === "/@scan@/ACG/Pending" ||
                downloadFilePath === "/@scan@/ACG/Pending/";

            // Create the combined identifier for the current entry
            const combinedId = `${entry.civitaiVersionID}|${entry.civitaiModelID}`;

            // Exclude entries that are still in early access or have a pending path
            return !stillEarlyAccess && !isPendingPath && !failedIds.has(combinedId);
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

    // Checks if an entry has a pending downloadFilePath
    const isPendingEntry = (entry: OfflineDownloadEntry): boolean => {
        const path = entry.downloadFilePath || "";
        return path === "/@scan@/ACG/Pending" || path === "/@scan@/ACG/Pending/";
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


    // **BigCardMode Component Implementation**
    const BigCardMode: React.FC<{
        filteredDownloadList: OfflineDownloadEntry[];
        isDarkMode: boolean;
        isModifyMode: boolean;
        selectedIds: Set<string>;
        toggleSelect: (id: string) => void;
        handleSelectAll: () => void;
    }> = ({
        filteredDownloadList,
        isDarkMode,
        isModifyMode,
        selectedIds,
        toggleSelect,
        handleSelectAll
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
                        {filteredDownloadList.map((entry, index) => {
                            const isSelected = selectedIds.has(entry.civitaiVersionID);
                            const earlyEnds = entry.modelVersionObject?.earlyAccessEndsAt;
                            return (
                                <Card
                                    key={index}
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
                                    {earlyEnds && (
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
                                            Ends: {new Date(earlyEnds).toLocaleString()}
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
                                            marginTop: '40px', // push down below the checkbox row
                                            marginBottom: '5px',
                                            textAlign: 'center',
                                            borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                            paddingBottom: '5px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {/* BaseModel as a badge, only if present */}
                                        {entry.modelVersionObject?.baseModel && (
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: '#007bff',
                                                    color: '#fff',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    marginRight: '6px',
                                                }}
                                            >
                                                {entry.modelVersionObject.baseModel}
                                            </span>
                                        )}
                                        {/* Model title */}
                                        <span
                                            style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 'bold',
                                            }}
                                            title={entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                        >
                                            {entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                        </span>
                                    </div>

                                    {/* Carousel for Images */}
                                    {entry.imageUrlsArray && entry.imageUrlsArray.length > 0 ? (
                                        <Carousel
                                            variant={isDarkMode ? 'dark' : 'light'}
                                            indicators={entry.imageUrlsArray.length > 1}
                                            controls={entry.imageUrlsArray.length > 1}
                                            interval={null}
                                            style={{
                                                marginBottom: 0, // 2) Remove extra space under the carousel
                                            }}
                                        >
                                            {entry.imageUrlsArray.map((imgUrl, imgIndex) => (
                                                <Carousel.Item key={imgIndex}>
                                                    <img
                                                        className="d-block w-100"
                                                        src={imgUrl}
                                                        alt={`Slide ${imgIndex + 1}`}
                                                        style={{
                                                            maxHeight: '300px',
                                                            objectFit: 'contain',
                                                            margin: '0 auto',
                                                        }}
                                                    />
                                                </Carousel.Item>
                                            ))}
                                        </Carousel>
                                    ) : (
                                        <div
                                            style={{
                                                height: '200px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: isDarkMode ? '#555' : '#f0f0f0',
                                                marginBottom: 0, // Keep the same no extra margin
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
                                        <p
                                            style={{
                                                margin: '4px 0',
                                                whiteSpace: 'normal',     // allow multi-line
                                                wordWrap: 'break-word',   // wrap long paths
                                            }}
                                        >
                                            <strong>Download Path:</strong> {entry.downloadFilePath ?? 'N/A'}
                                        </p>

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
        toggleSelect: (id: string) => void;
        handleSelectAll: () => void;
    }> = ({
        filteredDownloadList,
        isDarkMode,
        isModifyMode,
        selectedIds,
        toggleSelect,
        handleSelectAll,
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
                            const earlyEnds = entry.modelVersionObject?.earlyAccessEndsAt;
                            const firstImageUrl = entry.imageUrlsArray?.[0] ?? null;

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
                                    {earlyEnds && (
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
                                            Ends: {new Date(earlyEnds).toLocaleString()}
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
                                    {firstImageUrl ? (
                                        <img
                                            src={firstImageUrl}
                                            alt={`Thumbnail ${index + 1}`}
                                            style={{
                                                width: '100%',
                                                maxHeight: '100px',
                                                objectFit: 'contain',
                                                borderRadius: '4px',
                                                marginBottom: '2px', // Minimizing extra space
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                height: '100px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: isDarkMode ? '#555' : '#f0f0f0',
                                                marginBottom: '2px', // Minimizing extra space
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
                                </Card>
                            );
                        })}
                    </div>
                </div>
            );
        };


    // Inside your OfflineWindow component

    // **UpdateCardMode Component Implementation**
    const UpdateCardMode: React.FC<{
        filteredDownloadList: OfflineDownloadEntry[];
        isDarkMode: boolean;
        isModifyMode: boolean;
        selectedIds: Set<string>;
        toggleSelect: (id: string) => void;
        handleSelectAll: () => void;
    }> = ({
        filteredDownloadList,
        isDarkMode,
        isModifyMode,
        selectedIds,
        toggleSelect,
        handleSelectAll
    }) => {
            if (filteredDownloadList.length === 0) {
                return (
                    <div style={{ color: isDarkMode ? '#fff' : '#000' }}>
                        No update downloads available.
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
                        {filteredDownloadList.map((entry, index) => {
                            const isSelected = selectedIds.has(entry.civitaiVersionID);
                            const earlyEnds = entry.modelVersionObject?.earlyAccessEndsAt;
                            return (
                                <Card
                                    key={index}
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
                                    {earlyEnds && (
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
                                            Ends: {new Date(earlyEnds).toLocaleString()}
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
                                            marginTop: '40px', // push down below the checkbox row
                                            marginBottom: '5px',
                                            textAlign: 'center',
                                            borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                            paddingBottom: '5px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {/* BaseModel as a badge, only if present */}
                                        {entry.modelVersionObject?.baseModel && (
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: '#007bff',
                                                    color: '#fff',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    marginRight: '6px',
                                                }}
                                            >
                                                {entry.modelVersionObject.baseModel}
                                            </span>
                                        )}
                                        {/* Model title */}
                                        <span
                                            style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 'bold',
                                            }}
                                            title={entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                        >
                                            {entry?.modelVersionObject?.model?.name ?? 'N/A'}
                                        </span>
                                    </div>

                                    {/* Carousel for Images */}
                                    {entry.imageUrlsArray && entry.imageUrlsArray.length > 0 ? (
                                        <Carousel
                                            variant={isDarkMode ? 'dark' : 'light'}
                                            indicators={entry.imageUrlsArray.length > 1}
                                            controls={entry.imageUrlsArray.length > 1}
                                            interval={null}
                                            style={{
                                                marginBottom: 0, // Remove extra space under the carousel
                                            }}
                                        >
                                            {entry.imageUrlsArray.map((imgUrl, imgIndex) => (
                                                <Carousel.Item key={imgIndex}>
                                                    <img
                                                        className="d-block w-100"
                                                        src={imgUrl}
                                                        alt={`Slide ${imgIndex + 1}`}
                                                        style={{
                                                            maxHeight: '300px',
                                                            objectFit: 'contain',
                                                            margin: '0 auto',
                                                        }}
                                                    />
                                                </Carousel.Item>
                                            ))}
                                        </Carousel>
                                    ) : (
                                        <div
                                            style={{
                                                height: '200px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: isDarkMode ? '#555' : '#f0f0f0',
                                                marginBottom: 0, // Keep the same no extra margin
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
                                        <p
                                            style={{
                                                margin: '4px 0',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                            title={entry.civitaiFileName ?? 'N/A'}
                                        >
                                            <strong>File Name:</strong> {entry.civitaiFileName ?? 'N/A'}
                                        </p>

                                        {/* Show full download path with line wrapping */}
                                        <p
                                            style={{
                                                margin: '4px 0',
                                                whiteSpace: 'normal',     // allow multi-line
                                                wordWrap: 'break-word',   // wrap long paths
                                            }}
                                        >
                                            <strong>Download Path:</strong> {entry.downloadFilePath ?? 'N/A'}
                                        </p>

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
                <div style={leftPanelStyle}>
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
                            <Button
                                style={responsiveButtonStyle}
                                variant={displayMode === 'updateCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('updateCard')}
                            >
                                Update Card Mode
                            </Button>

                            {/* New: Failed Card Mode Button with Badge */}
                            <Button
                                variant={displayMode === 'failedCard' ? 'primary' : 'secondary'}
                                onClick={() => setDisplayMode('failedCard')}
                                style={{
                                    ...responsiveButtonStyle
                                }}
                            >
                                Failed Card Mode
                                {failedEntries.length > 0 && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '-5px',
                                            right: '-10px',
                                            background: 'red',
                                            color: 'white',
                                            borderRadius: '50%',
                                            padding: '2px 6px',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {failedEntries.length}
                                    </span>
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

                    <div style={{ display: 'flex', gap: '10px', margin: '20px' }}>
                        {isEditingTopTag ? (
                            // Render an input field for editing the top tag text
                            <FormControl
                                type="text"
                                value={topTagInputValue}
                                onChange={(e) => setTopTagInputValue(e.target.value)}
                                onBlur={() => {
                                    // On blur, update the filterText and revert to non-edit mode
                                    setFilterText(topTagInputValue);
                                    setIsEditingTopTag(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        // On Enter, update the filterText and revert to non-edit mode
                                        setFilterText(topTagInputValue);
                                        setIsEditingTopTag(false);
                                    }
                                }}
                                autoFocus
                                style={{ width: '70%' }}
                            />
                        ) : (
                            // Render the dropdown as usual when not editing.
                            <Dropdown style={{ width: '70%' }}>
                                <Dropdown.Toggle
                                    variant="secondary"
                                    style={{ width: '100%' }}
                                    onDoubleClick={() => {
                                        // When the user double-clicks, switch to edit mode.
                                        setTopTagInputValue(filterText);
                                        setIsEditingTopTag(true);
                                    }}
                                >
                                    {filterText || "-- Top Pending Tags (choose one) --"}
                                </Dropdown.Toggle>
                                <Dropdown.Menu
                                    style={{
                                        width: '100%',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                    }}
                                >

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0 8px'
                                    }}>
                                        <Button
                                            size="sm"
                                            disabled={tagPage === 0}
                                            onClick={e => { e.stopPropagation(); setTagPage(p => p - 1); }}
                                        >
                                            Prev
                                        </Button>

                                        <span style={{ lineHeight: '32px' }}>
                                            {tagPage + 1} / {totalTagPages}
                                        </span>

                                        <Button
                                            size="sm"
                                            disabled={tagPage + 1 >= totalTagPages}
                                            onClick={e => { e.stopPropagation(); setTagPage(p => p + 1); }}
                                        >
                                            Next
                                        </Button>
                                    </div>

                                    <Dropdown.Divider />

                                    {paginatedTags.map((tag) => (
                                        <Dropdown.Item
                                            as="div"
                                            key={tag}
                                            onClick={() => handleSelectTag(tag)}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <span>{tag}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                <span>
                                                    <b>
                                                        {
                                                            offlineDownloadList.filter(
                                                                (entry) =>
                                                                    (entry.downloadFilePath === "/@scan@/ACG/Pending" ||
                                                                        entry.downloadFilePath === "/@scan@/ACG/Pending/") &&
                                                                    doesEntryMatchWithTag(entry, tag)
                                                            ).length
                                                        }
                                                    </b>
                                                </span>
                                                <Button
                                                    variant="link"
                                                    style={{ color: 'red', textDecoration: 'none' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveTag(tag);
                                                    }}
                                                >
                                                    <IoCloseOutline />
                                                </Button>
                                            </div>
                                        </Dropdown.Item>
                                    ))}

                                    <Dropdown.Divider />

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0 8px'
                                    }}>
                                        <Button
                                            size="sm"
                                            disabled={tagPage === 0}
                                            onClick={e => { e.stopPropagation(); setTagPage(p => p - 1); }}
                                        >
                                            Prev
                                        </Button>

                                        <span style={{ lineHeight: '32px' }}>
                                            {tagPage + 1} / {totalTagPages}
                                        </span>

                                        <Button
                                            size="sm"
                                            disabled={tagPage + 1 >= totalTagPages}
                                            onClick={e => { e.stopPropagation(); setTagPage(p => p + 1); }}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </Dropdown.Menu>
                            </Dropdown>
                        )}

                        {/* New Dropdown for selecting the source of tags */}
                        <Dropdown style={{ width: '30%' }}>
                            <Dropdown.Toggle variant="secondary" style={{ width: '100%' }}>
                                {tagSource === 'all'
                                    ? 'All'
                                    : tagSource === 'tags'
                                        ? 'Tags'
                                        : tagSource === 'fileName'
                                            ? 'File Name'
                                            : tagSource === 'titles'
                                                ? 'Titles'
                                                : tagSource === 'other'
                                                    ? 'Other'
                                                    : ''}
                            </Dropdown.Toggle>
                            <Dropdown.Menu style={{ width: '100%' }}>
                                <Dropdown.Item onClick={() => setTagSource('all')}>All</Dropdown.Item>
                                <Dropdown.Item onClick={() => setTagSource('tags')}>Tags</Dropdown.Item>
                                <Dropdown.Item onClick={() => setTagSource('fileName')}>File Name</Dropdown.Item>
                                <Dropdown.Item onClick={() => setTagSource('titles')}>Titles</Dropdown.Item>
                                <Dropdown.Item onClick={() => setTagSource('other')}>Entries</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>

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
                                {/* 1st line: “Only Pending” */}
                                <Form.Check
                                    type="checkbox"
                                    id="only-pending-checkbox"
                                    label={<MdOutlinePendingActions size={24} color={isDarkMode ? '#fff' : '#000'} />}
                                    checked={onlyPendingPaths}
                                    onChange={e => setOnlyPendingPaths(e.target.checked)}
                                    style={{ fontWeight: 'bold' }}
                                    title="Only Pending"
                                />

                                {/* 2nd line: “Prevent Pending Paths” */}
                                <Form.Check
                                    type="checkbox"
                                    id="prevent-pending-paths"
                                    label={<MdOutlinePendingActions size={24} color={isDarkMode ? '#fff' : '#000'} />}
                                    checked={preventPendingPaths}
                                    onChange={e => setPreventPendingPaths(e.target.checked)}
                                    title="disallow modify the downloadFilePath to be pending"
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
                            >
                                Select First
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
                                disabled={selectedIds.size === 0 || isLoading === false /* or any other condition */}
                            >
                                {isPaused ? "Resume" : "Pause"}
                            </Button>

                            <Button
                                onClick={handleCancelDownload}
                                disabled={!isLoading || !isPaused} // Only enable if downloads are in progress *and* paused
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
                                    label="Select All"
                                    ref={selectAllRef}
                                    checked={selectedPrefixes.size === categoriesPrefixsList.length}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelectedPrefixes(new Set(categoriesPrefixsList.map(p => p.value)));
                                        } else {
                                            setSelectedPrefixes(new Set());
                                        }
                                    }}
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
                            aria-label={isAllSelected ? 'Deselect All' : 'Select All'}
                        >
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Button>

                        {/* Selection Count Display */}
                        <div
                            style={{
                                flex: 1, // <--- This makes it stretch across the remaining width
                                padding: '8px 12px',
                                borderRadius: '4px',
                                backgroundColor: isDarkMode ? '#444' : '#e0e0e0',
                                color: isDarkMode ? '#fff' : '#000',
                                fontWeight: 'bold',
                                textAlign: 'center',
                            }}
                        >
                            {(isModifyMode || (displayMode === 'errorCard')) ? (
                                <>
                                    {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'} selected <FaArrowRight />
                                    "<span
                                        style={{
                                            display: 'inline-block',
                                            // maxWidth: '100%',         // Adjust as needed
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            verticalAlign: 'middle',   // Helps align icon & text nicely
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
                    {isLoading && (
                        <div style={{
                            marginBottom: '20px',
                            fontWeight: 'bold',
                            color: isDarkMode ? '#fff' : '#000',
                            backgroundColor: isDarkMode ? '#555' : '#f8f9fa',
                            padding: '10px',
                            borderRadius: '4px',
                            textAlign: 'center'
                        }}>
                            {isModifyMode ? (
                                <>
                                    Modifying entries... ({selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'})
                                </>
                            ) : (
                                <>
                                    Processing downloads... ({downloadProgress.completed}/{downloadProgress.total})
                                </>
                            )}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
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
                                    />
                                )}

                                {displayMode === 'updateCard' && (
                                    <UpdateCardMode
                                        filteredDownloadList={paginatedDownloadList} // or your full filtered list if preferred
                                        isDarkMode={isDarkMode}
                                        isModifyMode={isModifyMode}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        handleSelectAll={handleSelectAll}
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

                                {/* Pagination Controls */}
                                <Pagination>
                                    <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} aria-label="First Page" >
                                        <FaAngleDoubleLeft />
                                    </Pagination.First>
                                    <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} aria-label="Previous Page" >
                                        <FaAngleLeft />
                                    </Pagination.Prev>

                                    {/* Display a range of page numbers */}
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

                                    <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next Page" >
                                        <FaAngleRight />
                                    </Pagination.Next>
                                    <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} aria-label="Last Page">
                                        <FaAngleDoubleRight />
                                    </Pagination.Last>
                                </Pagination>

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


        </div >
    );
};

export default OfflineWindow;