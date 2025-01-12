// OfflineWindow.tsx

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';

// Store
import { useDispatch, useSelector } from 'react-redux';

// Icons Components
import { AiFillFolderOpen } from "react-icons/ai";
import { BsDownload } from 'react-icons/bs';
import { TbDatabaseSearch, TbDatabasePlus, TbDatabaseMinus } from "react-icons/tb";
import { PiPlusMinusFill } from "react-icons/pi";
import { FaMagnifyingGlass, FaMagnifyingGlassPlus, FaSun, FaMoon } from "react-icons/fa6"; // Added FaSun and FaMoon
import { MdOutlineApps, MdOutlineTipsAndUpdates, MdOutlineDownloadForOffline, MdOutlineDownload } from "react-icons/md";
import { FcGenericSortingAsc, FcGenericSortingDesc } from "react-icons/fc";
import { PiTabsFill } from "react-icons/pi";
import { LuPanelLeftOpen, LuPanelRightOpen } from "react-icons/lu";
import { BsReverseLayoutTextWindowReverse } from "react-icons/bs";

// Components
import CategoriesListSelector from '../CategoriesListSelector';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';
import ButtonWrap from "../buttons/ButtonWrap";
import { Button, Spinner, OverlayTrigger, Tooltip, Form, Dropdown, ButtonGroup, Carousel, Card } from 'react-bootstrap';
import ErrorAlert from '../ErrorAlert';

// APIs
import {
    fetchOfflineDownloadList,
    fetchAddRecordToDatabase,
    fetchDownloadFilesByServer,
    fetchDownloadFilesByServer_v2,
    fetchAddOfflineDownloadFileIntoOfflineDownloadList
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
    const [displayMode, setDisplayMode] = useState<'table' | 'bigCard' | 'smallCard'>('table');

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

    // Additional states for progress and failed downloads
    const [downloadProgress, setDownloadProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
    const [failedEntries, setFailedEntries] = useState<OfflineDownloadEntry[]>([]);

    // **New: State for Cooldown Management**
    const [completedCount, setCompletedCount] = useState<number>(0);
    const [delayTime, setDelayTime] = useState<number>(0);

    // In your OfflineWindow component
    const [isPaused, setIsPaused] = useState(false);

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
        setIsModifyMode(prevMode => !prevMode);
        setSelectedIds(new Set()); // Clear selections when toggling modify mode
    };

    // Utility function to pause execution for a given number of milliseconds
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // **New: Countdown Timer for delayTime**
    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (delayTime > 0) {
            timer = setInterval(() => {
                setDelayTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [delayTime]);

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchOfflineDownloadList(dispatch);
                if (Array.isArray(data)) {
                    setOfflineDownloadList(data);
                    // Initialize all IDs as selected by default
                    const allIds = data.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
                    setSelectedIds(new Set(allIds));
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

    // Function to determine if an entry matches the filter condition (OR logic)
    const doesEntryMatch = (entry: OfflineDownloadEntry): boolean => {
        const fieldsToCheck = [
            entry.civitaiFileName,
            entry.modelVersionObject?.name,
            entry.civitaiUrl
        ];

        return fieldsToCheck.some(field => {
            if (!field) return false;

            const text = filterText.toLowerCase();
            const fieldValue = field.toLowerCase();

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
    };

    // Memoized filtered list based on filterText and filterCondition
    const filteredDownloadList = useMemo(() => {
        if (filterText.trim() === '') {
            return offlineDownloadList;
        }

        return offlineDownloadList.filter(entry => doesEntryMatch(entry));
    }, [offlineDownloadList, filterText, filterCondition]);

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
            headerName: "Model Name",
            field: "modelName",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
        },
        {
            headerName: "Version Name",
            field: "versionName",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
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
            headerName: "URL",
            field: "url",
            sortable: true,
            filter: false,
            cellRenderer: (params: any) => (
                <a href={params.value} target="_blank" rel="noopener noreferrer" style={{ color: isDarkMode ? '#1e90ff' : '#007bff' }}>
                    {params.value}
                </a>
            ),
            cellStyle: cellStyle,
        },
        {
            headerName: "Category",
            field: "category",
            sortable: true,
            filter: false,
            cellStyle: cellStyle,
        },
        {
            headerName: "FilePath",
            field: "filepath",
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
        return filteredDownloadList.map(entry => {
            // Safely access modelVersionObject and files
            const safetensorFile = entry.modelVersionObject?.files?.find(file => file.name.endsWith('.safetensors'));
            const filesizeMB = safetensorFile ? (safetensorFile.sizeKB / 1024).toFixed(2) : 'N/A';

            return {
                modelName: entry.civitaiFileName ?? 'N/A',
                versionName: entry.modelVersionObject?.name ?? 'N/A',
                modelId: entry.modelVersionObject?.modelId ?? 'N/A',
                versionid: entry.civitaiVersionID ?? 'N/A',
                baseModel: entry.modelVersionObject?.baseModel ?? 'N/A',
                category: entry.selectedCategory ?? 'N/A',
                filepath: entry.downloadFilePath ?? 'N/A',
                url: entry.civitaiUrl ?? 'N/A',
                filesize: filesizeMB + " MB"
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
        width: '100%',
        height: '100%',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: currentTheme.gridBackgroundColor,
        transition: 'background-color 0.3s ease',
    };

    const headerStyleContainer: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
    };

    const buttonGroupStyle: React.CSSProperties = {
        display: 'flex',
        gap: '10px',
        marginTop: '10px'
    };

    const agGridStyle: React.CSSProperties = {
        height: '600px',
        width: '100%',
        transition: 'background-color 0.3s ease, color 0.3s ease',
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
        setCompletedCount(0); // Reset completed count on refresh

        try {
            setIsLoading(true);
            console.log("isLoading set to true");

            // Fetch the latest download list
            const updatedData = await fetchOfflineDownloadList(dispatch);

            if (Array.isArray(updatedData)) {
                setOfflineDownloadList(updatedData);
                const allIds = updatedData.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
                setSelectedIds(new Set(allIds));
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
    };

    // Function to handle "Download Now" button click
    const handleDownloadNow = async () => {
        console.log("Download Now button clicked");

        // Collect selected entries from the filtered list
        const entriesToDownload = filteredDownloadList.filter(entry => selectedIds.has(entry.civitaiVersionID));

        if (entriesToDownload.length === 0) {
            alert("No entries selected for download.");
            return;
        }

        setDownloadProgress({ completed: 0, total: entriesToDownload.length });
        setFailedEntries([]);
        setCompletedCount(0);
        // Always reset isCancelled so a new click starts fresh
        setIsCancelled(false);

        // Callback to update the download list after each download completes
        const handleEachDownloadComplete = async (success: boolean, entry: OfflineDownloadEntry) => {
            if (!success) {
                setFailedEntries(prev => [...prev, entry]);
            }

            // Increment the completed count and initiate cooldown if necessary
            setCompletedCount(prevCount => {
                const newCount = prevCount + 1;

                // After every 10 completions, initiate a cooldown
                if (newCount % 10 === 0) {
                    setDelayTime(60); // 60-second cooldown
                    console.log("Cooldown initiated for 60 seconds after 10 downloads.");
                }

                return newCount;
            });

            // Update progress
            setDownloadProgress(prev => ({ completed: prev.completed + 1, total: prev.total }));

            // Optionally, update the download list
            try {
                const updatedData = await fetchOfflineDownloadList(dispatch);
                if (Array.isArray(updatedData)) {
                    setOfflineDownloadList(updatedData);
                    const allIds = updatedData.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
                    setSelectedIds(new Set(allIds));
                } else {
                    console.warn("fetchOfflineDownloadList returned non-array data:", updatedData);
                    setOfflineDownloadList([]);
                    setSelectedIds(new Set());
                }
            } catch (error: any) {
                console.error("Failed to fetch updated download list:", error.message);
                // Optionally, dispatch an error to the Redux store
            }
        };

        // Send selected entries to the backend for download
        try {
            setIsLoading(true);
            console.log("isLoading set to true");
            await downloadSelectedEntries(entriesToDownload, dispatch, handleEachDownloadComplete, isPausedRef);
        } catch (error: any) {
            console.error("Download failed:", error.message);
            // Optionally, dispatch an error to the Redux store
            // dispatch(setError({ hasError: true, errorMessage: error.message }));
        } finally {
            setIsLoading(false);
            console.log("isLoading set to false");
        }
    };

    const handleAddModeltoDatabase = (url: string, selectedCategory: string) => {
        fetchAddRecordToDatabase(selectedCategory, url, dispatch);
    }

    // Updated downloadSelectedEntries with concurrency control and callback
    const downloadSelectedEntries = async (
        entriesToDownload: OfflineDownloadEntry[],
        dispatch: any,
        onDownloadComplete: (success: boolean, entry: OfflineDownloadEntry) => void,
        isPausedRef: React.MutableRefObject<boolean> // or pass boolean & a callback
    ) => {
        const CONCURRENCY_LIMIT = 5;
        const semaphore = new Semaphore(CONCURRENCY_LIMIT);

        // Helper sleep function
        const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

        // We’ll do 10 items per chunk
        const chunkSize = 10;

        for (let i = 0; i < entriesToDownload.length; i += chunkSize) {
            // If user has paused, wait until user resumes
            while (isPausedRef.current) {
                console.log("Pausing before starting next batch...");
                await sleep(500);
                if (isCancelledRef.current) {
                    console.log("Download canceled while paused, stopping now.");
                    break;
                }
            }

            // If user cancelled while paused, break out 
            if (isCancelledRef.current) break;

            // 2) Slice out up to 10 items for this chunk
            const chunk = entriesToDownload.slice(i, i + chunkSize);

            // 3) Start concurrent downloads of this chunk
            const downloadPromises = chunk.map((entry) =>
                semaphore.acquire(async () => {
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
                            modelVersionObject
                        } = entry;

                        const downloadParams = {
                            civitaiUrl,
                            civitaiFileName,
                            civitaiModelID,
                            civitaiVersionID,
                            downloadFilePath,
                            civitaiModelFileList
                        };

                        // Make your API call
                        await fetchDownloadFilesByServer_v2(downloadParams, dispatch);

                        // Add to database, etc.
                        fetchAddRecordToDatabase(selectedCategory, civitaiUrl, dispatch);

                        bookmarkThisUrl(
                            modelVersionObject?.baseModel ?? "N/A",
                            civitaiUrl,
                            `${modelVersionObject?.name ?? "N/A"} - ${civitaiModelID}`
                        );
                    } catch (error: any) {
                        console.error("Download failed for", entry.civitaiFileName, error);
                        success = false;
                    } finally {
                        onDownloadComplete(success, entry);
                    }
                })
            );

            // 4) Wait for this entire chunk to finish
            await Promise.all(downloadPromises);

            // 5) If more chunks remain, do a cooldown
            if (i + chunkSize < entriesToDownload.length) {
                console.log("Cooldown for 60 seconds after 10 downloads...");
                await sleep(60_000);
            }
        }
    };


    const handleProcessSelected = async () => {
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
                        modelVersionObject
                    } = entry;

                    const modelObject = {
                        downloadFilePath: modify_downloadFilePath,
                        civitaiFileName,
                        civitaiModelID,
                        civitaiVersionID,
                        civitaiModelFileList,
                        civitaiUrl,
                        selectedCategory: modify_selectedCategory,
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
                const allIds = updatedData.map((entry: OfflineDownloadEntry) => entry.civitaiVersionID);
                setSelectedIds(new Set(allIds));
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
            setIsLoading(false);
        }
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
        setCompletedCount(0);
        setDelayTime(0);
    };

    // **BigCardMode Component Implementation**
    const BigCardMode: React.FC<{
        filteredDownloadList: OfflineDownloadEntry[];
        isDarkMode: boolean;
        isModifyMode: boolean;
        selectedIds: Set<string>;
        toggleSelect: (id: string) => void;
    }> = ({ filteredDownloadList, isDarkMode, isModifyMode, selectedIds, toggleSelect }) => {
        if (filteredDownloadList.length === 0) {
            return <div style={{ color: isDarkMode ? '#fff' : '#000' }}>No downloads available.</div>;
        }

        return (
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                justifyContent: 'center'
            }}>
                {filteredDownloadList.map((entry, index) => {
                    const isSelected = selectedIds.has(entry.civitaiVersionID);
                    return (
                        <Card
                            key={index}
                            style={{
                                // Smaller overall card width
                                width: '100%',
                                maxWidth: '380px', // try 350-400px to match your desired size
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
                                transition: 'background-color 0.3s ease, color 0.3s ease, opacity 0.3s ease',
                                overflow: 'hidden',
                                margin: '0 auto', // center the card if you like
                                padding: '10px'   // minimal padding
                            }}
                            onClick={(e) => {
                                if (isModifyMode && e.ctrlKey) {
                                    toggleSelect(entry.civitaiVersionID);
                                }
                            }}
                        >
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

                            {/* Model Name */}
                            <div style={{
                                marginTop: '40px', // leaves space for checkbox
                                marginBottom: '5px',
                                fontSize: '0.95rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                paddingBottom: '5px',
                                wordWrap: 'break-word',
                            }}>
                                {entry.civitaiFileName ?? 'N/A'}
                            </div>

                            {/* Carousel for Images */}
                            {entry.imageUrlsArray && entry.imageUrlsArray.length > 0 ? (
                                <Carousel
                                    variant={isDarkMode ? 'dark' : 'light'}
                                    indicators={entry.imageUrlsArray.length > 1}
                                    controls={entry.imageUrlsArray.length > 1}
                                    interval={null}
                                    style={{
                                        marginBottom: '5px',
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
                                        marginBottom: '5px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <span>No Images Available</span>
                                </div>
                            )}

                            {/* Version Name */}
                            <div style={{
                                fontSize: '0.85rem',
                                textAlign: 'center',
                                borderTop: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                marginTop: '5px',
                                paddingTop: '5px',
                                marginBottom: '5px',
                                wordWrap: 'break-word',
                            }}>
                                <strong>Version:</strong> {entry.modelVersionObject?.name ?? 'N/A'}
                            </div>

                            {/* Entry Details */}
                            <div style={{
                                fontSize: '0.8rem',
                                lineHeight: 1.3,
                                wordWrap: 'break-word',
                                padding: '0 5px',
                            }}>
                                <p><strong>Download Path:</strong> {entry.downloadFilePath ?? 'N/A'}</p>
                                <p><strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}</p>
                                <p><strong>Version ID:</strong> {entry.modelVersionObject?.id ?? 'N/A'}</p>
                                <p><strong>Model ID:</strong> {entry.modelVersionObject?.modelId ?? 'N/A'}</p>
                                <p><strong>Base Model:</strong> {entry.modelVersionObject?.baseModel ?? 'N/A'}</p>
                                <p>
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
                                    ) : 'N/A'}
                                </p>
                                <p>
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
        );
    };

    // **SmallCardMode Component Implementation**
    const SmallCardMode: React.FC<{
        filteredDownloadList: OfflineDownloadEntry[];
        isDarkMode: boolean;
        isModifyMode: boolean;
        selectedIds: Set<string>;
        toggleSelect: (id: string) => void;
    }> = ({ filteredDownloadList, isDarkMode, isModifyMode, selectedIds, toggleSelect }) => {
        if (filteredDownloadList.length === 0) {
            return <div style={{ color: isDarkMode ? '#fff' : '#000' }}>No downloads available.</div>;
        }

        return (
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                justifyContent: 'center',
            }}>
                {filteredDownloadList.map((entry, index) => {
                    const isSelected = selectedIds.has(entry.civitaiVersionID);
                    const firstImageUrl = entry.imageUrlsArray?.[0] ?? null;

                    return (
                        <Card
                            key={index}
                            style={{
                                border: '1px solid',
                                borderColor: isDarkMode ? '#555' : '#ccc',
                                borderRadius: '4px',
                                // Let’s keep a max width & height, but not strictly fix it
                                width: 'auto',
                                maxWidth: '180px',
                                // Remove fixed height or set a maxHeight
                                // height: 'auto',
                                boxShadow: isDarkMode
                                    ? '1px 1px 6px rgba(255,255,255,0.1)'
                                    : '1px 1px 6px rgba(0,0,0,0.1)',
                                backgroundColor: isDarkMode ? '#333' : '#fff',
                                color: isDarkMode ? '#fff' : '#000',
                                position: 'relative',
                                cursor: isModifyMode ? 'pointer' : 'default',
                                opacity: isModifyMode && !isSelected ? 0.8 : 1,
                                transition: 'background-color 0.3s ease, color 0.3s ease, opacity 0.3s ease',
                                overflow: 'hidden',
                                padding: '10px'
                            }}
                            onClick={(e) => {
                                if (isModifyMode && e.ctrlKey) {
                                    toggleSelect(entry.civitaiVersionID);
                                }
                            }}
                        >
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

                            {/* Model Name */}
                            <div style={{
                                marginTop: '40px', // spacing for checkbox
                                marginBottom: '5px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                borderBottom: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                paddingBottom: '5px',
                                wordWrap: 'break-word',
                            }}>
                                {entry.civitaiFileName ?? 'N/A'}
                            </div>

                            {/* Image Display */}
                            {firstImageUrl ? (
                                <img
                                    src={firstImageUrl}
                                    alt={`Thumbnail ${index + 1}`}
                                    style={{
                                        width: '100%',
                                        maxHeight: '100px',
                                        objectFit: 'contain',
                                        borderRadius: '4px',
                                        marginBottom: '5px',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    height: '100px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDarkMode ? '#555' : '#f0f0f0',
                                    marginBottom: '5px',
                                    borderRadius: '4px'
                                }}>
                                    <span>No Image</span>
                                </div>
                            )}

                            {/* Version Name */}
                            <div style={{
                                fontSize: '0.75rem',
                                textAlign: 'center',
                                borderTop: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                                marginTop: '5px',
                                paddingTop: '5px',
                                marginBottom: '5px',
                                wordWrap: 'break-word',
                            }}>
                                <strong>Version:</strong> {entry.modelVersionObject?.name ?? 'N/A'}
                            </div>

                            {/* Entry Details */}
                            <div style={{
                                fontSize: '0.7rem',
                                lineHeight: 1.2,
                                wordWrap: 'break-word',
                            }}>
                                <p>
                                    <strong>Path:</strong>{' '}
                                    {entry.downloadFilePath
                                        ? entry.downloadFilePath.length > 15
                                            ? `${entry.downloadFilePath.substring(0, 12)}...`
                                            : entry.downloadFilePath
                                        : 'N/A'}
                                </p>
                                <p><strong>Category:</strong> {entry.selectedCategory ?? 'N/A'}</p>
                            </div>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <div>
            <ErrorAlert />
            <div style={containerStyle}>
                <div style={headerStyleContainer}>
                    <h2 style={{ color: isDarkMode ? '#fff' : '#000' }}>Offline Download List</h2>
                    <div style={buttonGroupStyle}>
                        {/* Refresh List Button */}
                        <Button
                            onClick={handleRefreshList}
                            style={{
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
                            variant={displayMode === 'table' ? 'primary' : 'secondary'}
                            onClick={() => setDisplayMode('table')}
                        >
                            Table Mode
                        </Button>
                        <Button
                            variant={displayMode === 'bigCard' ? 'primary' : 'secondary'}
                            onClick={() => setDisplayMode('bigCard')}
                        >
                            Big Card Mode
                        </Button>
                        <Button
                            variant={displayMode === 'smallCard' ? 'primary' : 'secondary'}
                            onClick={() => setDisplayMode('smallCard')}
                        >
                            Small Card Mode
                        </Button>
                        {/* Modify Mode Toggle Button */}
                        <Button
                            onClick={toggleModifyMode}
                            style={{
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

                {/**Categories List Selector */}
                <CategoriesListSelector />

                {/**Folder Lists Option */}
                <DownloadFilePathOptionPanel setIsHandleRefresh={setIsHandleRefresh} isHandleRefresh={isHandleRefresh} />

                {/* **New: Display Remaining Cooldown Time** */}
                {delayTime > 0 && (
                    <div style={{
                        marginBottom: '20px',
                        fontWeight: 'bold',
                        color: isDarkMode ? '#fff' : '#000',
                        backgroundColor: isDarkMode ? '#555' : '#f8f9fa',
                        padding: '10px',
                        borderRadius: '4px',
                        textAlign: 'center'
                    }}>
                        Cooldown Active: Please wait {delayTime} second{delayTime !== 1 ? 's' : ''} before initiating more downloads.
                    </div>
                )}

                {/* Filter Section */}
                <div style={filterContainerStyle}>
                    <input
                        type="text"
                        placeholder="Filter..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        style={{
                            ...filterInputStyle,
                            backgroundColor: isDarkMode ? '#555' : '#fff',
                            color: isDarkMode ? '#fff' : '#000',
                            border: '1px solid',
                            borderColor: isDarkMode ? '#777' : '#ccc',
                        }}
                        disabled={isModifyMode} // Optionally disable filtering in Modify Mode
                    />
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
                        disabled={isModifyMode} // Optionally disable filtering in Modify Mode
                    >
                        <option value="contains">Contains</option>
                        <option value="does not contain">Does not contain</option>
                        <option value="equals">Equals</option>
                        <option value="does not equal">Does not equal</option>
                        <option value="begins with">Begins with</option>
                        <option value="ends with">Ends with</option>
                    </select>
                    <Button
                        onClick={handleDownloadNow}
                        style={selectedIds.size > 0 ? downloadButtonStyle : downloadButtonDisabledStyle}
                        disabled={selectedIds.size === 0 || isLoading || isModifyMode || delayTime > 0}
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
                        ) : delayTime > 0 ? (
                            'Download Disabled'
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

                    {/* Action Button for Modify Mode */}
                    {isModifyMode && (
                        <Button
                            onClick={handleProcessSelected}
                            style={{
                                ...downloadButtonStyle,
                                backgroundColor: '#ffc107',
                                color: '#000',
                            }}
                            disabled={selectedIds.size === 0}
                        >
                            Process Selected
                        </Button>
                    )}
                </div>

                {/* Download Progress Indicators */}
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
                        Initiating downloads... ({downloadProgress.completed}/{downloadProgress.total})
                    </div>
                )}

                {/* Failed Downloads */}
                {failedEntries.length > 0 && (
                    <div style={{ color: '#dc3545', marginTop: '20px' }}>
                        <h4>Failed Downloads:</h4>
                        <ul>
                            {failedEntries.map((entry, index) => (
                                <li key={index}>{entry.civitaiFileName}</li>
                            ))}
                        </ul>
                        {/* Optionally, add a retry button */}
                    </div>
                )}

                {/* Main Content */}
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
                                    paginationPageSize={10}
                                    getRowStyle={getRowStyle}
                                    onRowClicked={(params: any) => {
                                        if (isModifyMode && params.event.ctrlKey) {
                                            toggleSelect(params.data.versionid);
                                        }
                                    }}
                                    headerHeight={40}
                                />
                            </div>
                        )}


                        {displayMode === 'bigCard' && (
                            <BigCardMode
                                filteredDownloadList={filteredDownloadList}
                                isDarkMode={isDarkMode}
                                isModifyMode={isModifyMode}
                                selectedIds={selectedIds}
                                toggleSelect={toggleSelect}
                            />
                        )}

                        {displayMode === 'smallCard' && (
                            <SmallCardMode
                                filteredDownloadList={filteredDownloadList}
                                isDarkMode={isDarkMode}
                                isModifyMode={isModifyMode}
                                selectedIds={selectedIds}
                                toggleSelect={toggleSelect}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default OfflineWindow;