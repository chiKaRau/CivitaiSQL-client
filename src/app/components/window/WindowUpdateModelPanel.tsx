import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

//components
import { Badge, Col, Carousel, Collapse, Form, OverlayTrigger, Toast, Tooltip, Spinner, Button } from 'react-bootstrap';
import { BiCategory } from "react-icons/bi";
import { CiWarning } from "react-icons/ci";
import FolderDropdown from "../FolderDropdown"

//utils
import { bookmarkThisModel, initializeDatafromChromeStorage, updateDownloadFilePathIntoChromeStorage, updateSelectedCategoryIntoChromeStorage, callChromeBrowserDownload_v2, RecentDownloadPathItem, getRecentDownloadFilePaths } from "../../utils/chromeUtils"
import { fetchAddOfflineDownloadFileIntoOfflineDownloadList, fetchCheckCartList, fetchCivitaiModelInfoFromCivitaiByModelID, fetchCivitaiModelInfoFromCivitaiByVersionID, fetchDatabaseModelInfoByModelID, fetchDeleteDownloadPathCountRecord, fetchDownloadFilesByBrowser_v2, fetchDownloadFilesByServer_v2, fetchGetCategoriesList, fetchGetCategoryPrefixesList, fetchGetFilePathCategoriesList, fetchGetFoldersList, fetchGetTagsList, fetchUpdateRecordAtDatabase } from '../../api/civitaiSQL_api';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../store/configureStore';
import TextField from '@mui/material/TextField';
import { BsFillCartCheckFill, BsFillFileEarmarkArrowUpFill, BsType, BsArrowRepeat, BsSortDown, BsSortUp, BsPencilFill } from 'react-icons/bs';
import Autocomplete from '@mui/material/Autocomplete';
import { setError } from '../../store/actions/errorsActions';
import { clearError } from '../../store/actions/errorsActions';
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from '../../utils/objectUtils';
import { updateDownloadFilePath } from '../../store/actions/chromeActions';
import { FaFilter, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { FaXmark, FaFolderTree, FaHardDrive } from 'react-icons/fa6';

interface Version {
    id: number;
    name: string;
    baseModel: string;
    images: { url: string }[];
}

interface Model {
    name: string;
    creator: { username: string };
    tags: string[];
    modelVersions: Version[];
}

interface PanelProps {
    selectedVersion: Version;
    modelId: string;
    modelURL: string;
    modelData: Model;
    setHasUpdated: (hasUpdated: boolean) => void;
    onClose: () => void;
}

const updateModelPanel: React.FC<PanelProps> = ({ selectedVersion, modelId, modelURL, modelData, setHasUpdated, onClose }) => {
    const dispatch = useDispatch();
    const chrome = useSelector((state: AppState) => state.chrome);
    const [selectedCategory, setSelectCategory] = useState(chrome.selectedCategory || "Characters")
    const [downloadFilePath, setDownloadFilePath] = useState(chrome.downloadFilePath || "")
    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    // Inline styles
    const panelContainerStyle = {
        position: 'relative',
        display: 'flex',        // enables side-by-side layout
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
    };

    const closeButtonStyle = {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'transparent',
        border: 'none',
        fontSize: '18px',
        cursor: 'pointer',
    };

    const panelLeftStyle = {
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        backgroundColor: '#f9f9f9', // Example color
    };

    const panelRightStyle = {
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        backgroundColor: '#fafafa', // Example color
    };

    useEffect(() => {
        console.log("test-window-selectedVersion");
        console.log(selectedVersion)
        initializeDatafromChromeStorage(dispatch);
    }, []);

    useEffect(() => {
        setDownloadFilePath(chrome.downloadFilePath)
        setSelectCategory(chrome.selectedCategory)
    }, [chrome])

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000,
                padding: '20px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '1400px',
                    height: '88vh',
                    background: '#ffffff',
                    borderRadius: '18px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 18px',
                        borderBottom: '1px solid #eef1f4',
                        background: '#fbfcfe',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#1f2937',
                                lineHeight: 1.3,
                            }}
                        >
                            Update Existing Model
                        </div>

                        <div
                            style={{
                                marginTop: '4px',
                                fontSize: '13px',
                                color: '#6b7280',
                                wordBreak: 'break-word',
                            }}
                        >
                            Model {modelId}_{selectedVersion?.id} : {selectedVersion?.name}
                        </div>
                    </div>

                    <OverlayTrigger
                        placement="left"
                        container={document.body}
                        overlay={
                            <Tooltip id="tooltip-close-update-panel" style={{ zIndex: 20000 }}>
                                Close update panel
                            </Tooltip>
                        }
                    >
                        <button
                            onClick={onClose}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                border: '1px solid #d0d7de',
                                background: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                flexShrink: 0,
                            }}
                        >
                            <FaXmark size={18} />
                        </button>
                    </OverlayTrigger>
                </div>

                {/* Body */}
                <div
                    style={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: '1.1fr 0.9fr',
                        minHeight: 0,
                        background: '#f8fafc',
                    }}
                >
                    {/* Left */}
                    <div
                        style={{
                            minHeight: 0,
                            overflowY: 'auto',
                            padding: '16px',
                            borderRight: '1px solid #e5e7eb',
                            background: '#f8fafc',
                        }}
                    >
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '16px',
                                padding: '14px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                        >
                            <DatabaseUpdateModelPanel
                                modelID={modelId}
                                url={modelURL}
                                modelData={modelData}
                                selectedVersion={selectedVersion}
                                selectedCategory={selectedCategory}
                                downloadFilePath={downloadFilePath}
                                setDownloadFilePath={setDownloadFilePath}
                                setHasUpdated={setHasUpdated}
                                closePanel={onClose}
                            />
                        </div>
                    </div>

                    {/* Right */}
                    <div
                        style={{
                            minHeight: 0,
                            overflowY: 'auto',
                            padding: '16px',
                            background: '#fbfcfe',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                        }}
                    >
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '16px',
                                padding: '14px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                    fontWeight: 700,
                                    color: '#1f2937',
                                }}
                            >
                                <FaFilter />
                                Category Selector
                            </div>

                            <CategoriesListSelector
                                downloadFilePath={downloadFilePath}
                                selectedCategory={selectedCategory}
                                setSelectCategory={setSelectCategory}
                            />
                        </div>

                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '16px',
                                padding: '14px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                    fontWeight: 700,
                                    color: '#1f2937',
                                }}
                            >
                                <FaFolderTree />
                                Download Path
                            </div>

                            <DownloadFilePathOptionPanel
                                downloadFilePath={downloadFilePath}
                                setDownloadFilePath={setDownloadFilePath}
                                selectedCategory={selectedCategory}
                            />
                        </div>

                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '16px',
                                padding: '14px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                minHeight: 0,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                    fontWeight: 700,
                                    color: '#1f2937',
                                    flexShrink: 0,
                                }}
                            >
                                <FaHardDrive />
                                Folder Browser
                            </div>

                            <FolderDropdown />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CategoriesListSelectorProps {
    downloadFilePath: string;
    selectedCategory: string;
    setSelectCategory: (category: string) => void;
}

const CategoriesListSelector: React.FC<CategoriesListSelectorProps> = ({ downloadFilePath, selectedCategory, setSelectCategory }) => {

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false)
    const [notMatchSelector, setNotMatchSelector] = useState(false)

    const [categoriesList, setCategoriesList] = useState([])

    useEffect(() => {
        //initializeDatafromChromeStorage(dispatch);
        setupCategoriesInfo()
        handleCheckNotMatchSelector();
    }, [])

    useEffect(() => {
        updateSelectedCategoryByFilePath()
    }, [downloadFilePath])

    useEffect(() => {
        handleCheckNotMatchSelector();
    }, [selectedCategory, downloadFilePath])


    const setupCategoriesInfo = async () => {
        setIsLoading(true)
        const data = await fetchGetCategoriesList(dispatch);
        setCategoriesList(data)
        setIsLoading(false)
    }

    const handleCheckNotMatchSelector = () => {
        setNotMatchSelector(!downloadFilePath.replace(/\(.*?\)/g, '').includes(selectedCategory));
    }

    //TODO
    const updateSelectedCategoryByFilePath = () => {
        //Since DB tables name are different than folder, need to change name for matching
        let pathArray = []
        for (let category of categoriesList) {
            if (category === "Type Character") {
                pathArray.push("Type")
            } else {
                pathArray.push(category)
            }
        }

        //Find First Match
        let firstMatch = null;
        if (!(downloadFilePath === null || downloadFilePath.length === 0)) {
            for (let category of pathArray) {
                if (downloadFilePath.includes(category)) {
                    if (firstMatch === null || downloadFilePath.indexOf(category) < downloadFilePath.indexOf(firstMatch)) {
                        firstMatch = category;
                    }
                }
            }
        }

        //Changing back for setting sheet
        if (downloadFilePath.includes("Type")) {
            firstMatch = "Type Character"
        }

        if (downloadFilePath.includes("Males")) {
            firstMatch = "Males"
        }

        if (downloadFilePath.includes("Graphic Element/")) {
            firstMatch = "Art"
        }

        if (downloadFilePath.includes("/Style/")) {
            if (downloadFilePath.includes("Checkpoint")) {
                firstMatch = "Art"
            }
        }

        if (downloadFilePath.includes("Art")) {
            if (downloadFilePath.includes("Artist")) {

                if (downloadFilePath.includes("OTK")) {
                    firstMatch = "OTK"
                } else {
                    firstMatch = "Artist"
                }

            } else {
                if (downloadFilePath.includes("SAO")) {
                    firstMatch = "Characters"
                } else {
                    firstMatch = "Art"
                }
            }
        }

        if (firstMatch === null) {
            firstMatch = selectedCategory
        }


        setSelectCategory(firstMatch)
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
            }}
        >
            <Form style={{ flex: 1, minWidth: 0, margin: 0 }}>
                <Form.Group controlId="selectSheet" style={{ margin: 0 }}>
                    <Form.Label
                        style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#374151',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <BiCategory />
                        Category
                    </Form.Label>

                    <Form.Select
                        value={selectedCategory}
                        disabled={isLoading}
                        onChange={(event) => {
                            setSelectCategory(event.target.value);
                        }}
                        style={{
                            borderRadius: '10px',
                            border: '1px solid #cfd6de',
                            padding: '10px 12px',
                            fontSize: '14px',
                            boxShadow: 'none',
                        }}
                    >
                        <option value="">Select an option</option>
                        {categoriesList?.map((element, index) => (
                            <option key={index} value={element}>
                                {element}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </Form>

            {notMatchSelector && (
                <OverlayTrigger
                    placement="top"
                    container={document.body}
                    overlay={
                        <Tooltip id="tooltip-category-warning" style={{ zIndex: 20000 }}>
                            Current folder path does not seem to match the selected category.
                        </Tooltip>
                    }
                >
                    <div
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '999px',
                            background: '#fff3cd',
                            border: '1px solid #ffe08a',
                            color: '#8a6d3b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '24px',
                        }}
                    >
                        <CiWarning size={18} />
                    </div>
                </OverlayTrigger>
            )}
        </div>
    );
};

interface FilesPathSettingPanelProps {
    downloadFilePath: string;
    setDownloadFilePath: (downloadFilePath: string) => void;
}

const FilesPathSettingPanel: React.FC<FilesPathSettingPanelProps> = ({ downloadFilePath, setDownloadFilePath }) => {
    const isInitialMount = useRef(true);
    const dispatch = useDispatch();

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelTags = data?.tags;
    const modelTagsList = modelTags?.map((element: any) => {
        return {
            "name": element?.split(' ')
                .map((word: String) => word.toLowerCase().charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            "value": element?.split(' ')
                .map((word: String) => word.toLowerCase().charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        }
    })

    modelTagsList?.push({ "name": "Temp", "value": "Temp" });

    const chrome = useSelector((state: AppState) => state.chrome);

    const [open, setOpen] = useState(false);

    const [prefixsList, setPrefixsList] = useState<{
        id: number;
        prefixName: string;
        downloadFilePath: string;
        downloadPriority: number;
        createdAt?: string;
        updatedAt?: string;
    }[]>([]);
    const [suffixsList, setSuffixsList] = useState<{ name: string; value: string; }[]>(modelTagsList);

    const [selectedPrefix, setSelectedPrefix] = useState("");
    const [selectedSuffix, setSelectedSuffix] = useState("");
    const [filePathCategoriesList, setFilePathCategoriesList] = useState<{
        id: number;
        prefixName: string;
        downloadFilePath: string;
        downloadPriority: number;
        createdAt?: string;
        updatedAt?: string;
    }[]>([]);

    // Initializing state with the entire object and display property
    const [selectedFilteredCategoriesList, setSelectedFilteredCategoriesList] = useState<{
        category: {
            id: number;
            prefixName: string;
            downloadFilePath: string;
            downloadPriority: number;
            createdAt?: string;
            updatedAt?: string;
        }, display: boolean
    }[]>(
        filePathCategoriesList.map((category) => ({
            category: category,
            display: true
        }))
    );

    useEffect(() => {
        const fetchPrefixsList = async () => {
            try {
                const data = await fetchGetCategoryPrefixesList(dispatch);
                if (data) {
                    setPrefixsList(data);
                }
            } catch (error) {
                console.error("Error fetching categories prefix list:", error);
            }
        };

        fetchPrefixsList();

        const fetchFilePathList = async () => {
            try {
                const data = await fetchGetFilePathCategoriesList(dispatch);
                if (data) {
                    setFilePathCategoriesList(data);
                }
            } catch (error) {
                console.error("Error fetching file path categories list:", error);
            }
        };

        fetchFilePathList();

    }, [dispatch]); // Include `dispatch` in the dependency array to avoid stale closures

    useEffect(() => {
        if (chrome.selectedFilteredCategoriesList) {
            setSelectedFilteredCategoriesList(JSON.parse(chrome.selectedFilteredCategoriesList))
        }

    }, [chrome.selectedFilteredCategoriesList])

    useEffect(() => {
        setDownloadFilePath(`${selectedPrefix}${selectedSuffix}`)
    }, [selectedPrefix, selectedSuffix])


    const handleToggleBaseModelCheckbox = (index: number) => {
        setSelectedFilteredCategoriesList(prevState => {
            const newState = [...prevState];
            newState[index].display = !newState[index].display;
            return newState;
        });
    };

    const handleSelectAllCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setSelectedFilteredCategoriesList(prevState =>
            prevState.map(item => ({ ...item, display: isChecked }))
        );
    };

    // Determine if all checkboxes are selected
    const areAllSelected = selectedFilteredCategoriesList.every(item => item.display);

    return (
        <div
            style={{
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                overflow: 'hidden',
                background: '#fcfcfd',
            }}
        >
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-controls="collapse-panel"
                aria-expanded={open}
                style={{
                    width: '100%',
                    border: 'none',
                    background: '#f8fafc',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: '#1f2937',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaFolderTree />
                    Folder Settings
                </span>
                {open ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
            </button>

            <Collapse in={open}>
                <div id="collapse-panel">
                    <div style={{ fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                        Prefix Suggestions
                    </div>

                    {prefixsList?.map((element, index) => (
                        <OverlayTrigger placement="bottom" overlay={<Tooltip id="tooltip" style={{ zIndex: 20000 }}>{element.downloadFilePath}</Tooltip>}>
                            <label key={index}
                                className={`panel-tag-button ${selectedPrefix === element.downloadFilePath ? 'panel-tag-default' : 'panel-tag-selected'}`}
                                onClick={() => {
                                    setSelectedPrefix(element.downloadFilePath)
                                    dispatch(updateDownloadFilePath(`${element.downloadFilePath}${selectedSuffix}`));
                                }}>
                                {element.prefixName}
                            </label>
                        </OverlayTrigger>
                    ))}
                    <br />

                    <center> Suffix Suggestions</center>
                    <hr />
                    {suffixsList?.map((element, index) => (
                        <OverlayTrigger placement="bottom" overlay={<Tooltip id="tooltip" style={{ zIndex: 20000 }}>{element.value}</Tooltip>}>
                            <label key={index}
                                className={`panel-tag-button ${selectedSuffix === element.value ? 'panel-tag-default' : 'panel-tag-selected'}`}
                                onClick={() => setSelectedSuffix(element.value)}>
                                {element.name}
                            </label>
                        </OverlayTrigger>
                    ))}


                    <br />

                    <hr />

                    <FilesPathTagsListSelector downloadFilePath={downloadFilePath} setDownloadFilePath={setDownloadFilePath} selectedPrefix={selectedPrefix} />

                    <br />

                    <center> Selected Categories</center>
                    <hr />
                    <div style={{ display: 'inline-block' }}>

                        <label style={{ marginRight: '10px' }}>
                            <input
                                type="checkbox"
                                checked={areAllSelected}
                                onChange={handleSelectAllCheckbox}
                            />
                            Select/Deselect All
                        </label>

                        {selectedFilteredCategoriesList.map((item, index) => (
                            <label key={index} style={{ marginRight: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={item.display}
                                    onChange={() => handleToggleBaseModelCheckbox(index)}
                                />
                                {item.category.prefixName}
                            </label>
                        ))}

                    </div>

                </div>
            </Collapse >
        </div>
    )
};

interface FilesPathTagsListSelectorProps {
    selectedPrefix: string;
    downloadFilePath: string;
    setDownloadFilePath: (downloadFilePath: string) => void;
}

const FilesPathTagsListSelector: React.FC<FilesPathTagsListSelectorProps> = ({
    downloadFilePath,
    selectedPrefix,
    setDownloadFilePath
}) => {
    const dispatch = useDispatch();

    const [topTags, setTopTags] = useState<any[]>([]);
    const [recentAddedTags, setRecentAddedTags] = useState<any[]>([]);
    const [recentUpdatedTags, setRecentUpdatedTags] = useState<any[]>([]);
    const [recentLocalTags, setRecentLocalTags] = useState<RecentDownloadPathItem[]>([]);

    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [deletingPath, setDeletingPath] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // small cache per prefix so switching prefixes feels instant
    const cacheRef = useRef<Record<string, { top: any[]; recent: any[]; updated: any[] }>>({});

    useEffect(() => {
        // keep highlight in sync with the current input path
        setSelectedTag(downloadFilePath || null);
    }, [downloadFilePath]);

    const applyResult = (result: any) => {
        const nextTop = result?.topTags || [];
        const nextRecentAdded = result?.recentAddedTags || [];
        const nextRecentUpdated = result?.recentUpdatedTags || [];

        cacheRef.current[selectedPrefix] = {
            top: nextTop,
            recent: nextRecentAdded,
            updated: nextRecentUpdated
        };

        setTopTags(nextTop);
        setRecentAddedTags(nextRecentAdded);
        setRecentUpdatedTags(nextRecentUpdated);
    };

    const loadRecentLocalTags = async () => {
        try {
            const list = await getRecentDownloadFilePaths();
            setRecentLocalTags(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error("Failed to load recent local download paths.", e);
        }
    };

    const reload = async (ignoreCache = false) => {
        setError(null);

        // always load local recent 25
        await loadRecentLocalTags();

        if (!selectedPrefix) {
            setTopTags([]);
            setRecentAddedTags([]);
            setRecentUpdatedTags([]);
            return;
        }

        const cached = cacheRef.current[selectedPrefix];
        if (cached && !ignoreCache) {
            setTopTags(cached.top);
            setRecentAddedTags(cached.recent);
            setRecentUpdatedTags(cached.updated);
            return;
        }

        setLoading(true);
        try {
            const result = await fetchGetTagsList(dispatch, selectedPrefix);
            applyResult(result);
        } catch (e) {
            setError('Failed to load tags.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        reload(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPrefix]);

    const handleTagClick = (path: string) => {
        setSelectedTag(path);
        setDownloadFilePath(path);
    };

    const handleDelete = async (path: string) => {
        if (!path?.trim()) return;

        const ok = window.confirm(`Delete this record?\n\n${path}`);
        if (!ok) return;

        setError(null);
        setDeletingPath(path);

        try {
            const res = await fetchDeleteDownloadPathCountRecord(dispatch, path);
            if (!res?.deleted) {
                setError(res?.message || 'Delete failed.');
                return;
            }

            // clear cache so we don’t show stale backend results
            delete cacheRef.current[selectedPrefix];

            // if user deleted the currently selected one, clear highlight
            setSelectedTag(prev => (prev === path ? null : prev));

            // re-fetch backend list and local list
            await reload(true);
        } catch (e: any) {
            setError(e?.message || 'Delete failed.');
        } finally {
            setDeletingPath(null);
        }
    };

    const renderLocalRecentList = () => (
        <>
            <h6>Recently Added 25 Tags (Local)</h6>

            <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px', marginBottom: '10px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {recentLocalTags.map((item, index) => {
                        const value = item?.path ?? '';
                        const isSelected = selectedTag === value;

                        return (
                            <li
                                key={`${value}-${index}`}
                                onClick={() => handleTagClick(value)}
                                style={{
                                    margin: '5px 0',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#d3d3d3' : 'transparent',
                                    fontWeight: isSelected ? 'bold' : 'normal',
                                    padding: '4px 6px',
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0, flex: 1 }}>
                                    <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>{index + 1}#</span>
                                    <span style={{ wordBreak: 'break-word' }}>{value}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );

    const renderList = (title: string, tags: any[], numberLabel: (index: number) => string) => (
        <>
            <h6>{title}</h6>

            <div
                style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '6px',
                    marginBottom: '12px',
                    background: '#fafafa'
                }}
            >
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tags.map((tag, index) => {
                        const value = tag?.string_value ?? '';
                        const isSelected = selectedTag === value;
                        const isDeletingThis = deletingPath === value;

                        return (
                            <li
                                key={`${value}-${index}`}
                                onClick={() => handleTagClick(value)}
                                style={{
                                    margin: '6px 0',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#e8f0ff' : '#ffffff',
                                    border: isSelected ? '1px solid #c9dcff' : '1px solid #eceff3',
                                    fontWeight: isSelected ? 700 : 500,
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8
                                }}
                            >
                                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0, flex: 1 }}>
                                    <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>{numberLabel(index)}#</span>
                                    <span style={{ wordBreak: 'break-word' }}>{value}</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(value);
                                    }}
                                    disabled={!!deletingPath || isDeletingThis}
                                    title="Delete"
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: 8,
                                        border: '1px solid #d6dbe1',
                                        background: '#fff',
                                        cursor: !!deletingPath ? 'not-allowed' : 'pointer',
                                        opacity: isDeletingThis ? 0.7 : 1,
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        flexShrink: 0,
                                    }}
                                >
                                    {isDeletingThis ? 'Deleting…' : 'Delete'}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );

    return (
        <div>
            {loading && <div style={{ opacity: 0.7 }}>Loading…</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {renderList('Top 10 Tags by Count', topTags, (i) => String(i + 1))}
            {renderLocalRecentList()}
        </div>
    );
};

interface DownloadFilePathOptionPanelProps {
    downloadFilePath: string;
    selectedCategory: string;
    setDownloadFilePath: (downloadFilePath: string) => void;

}

const DownloadFilePathOptionPanel: React.FC<DownloadFilePathOptionPanelProps> = ({ downloadFilePath, setDownloadFilePath, selectedCategory }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedFilteredCategoriesList } = chrome;
    const dispatch = useDispatch();
    const [sortedandFilteredfoldersList, setSortedandFilteredfoldersList] = useState<string[]>([]);
    const [foldersList, setFoldersList] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    console.log("DownloadFilePathOptionPanel-downloadFilePath")
    console.log(downloadFilePath)

    useEffect(() => {
        // Update FoldersList
        handleGetFoldersList()
    }, []);

    useEffect(() => {
        if (selectedFilteredCategoriesList) {
            handleAddFilterIntoFoldersList(JSON.parse(selectedFilteredCategoriesList))
        }
    }, [selectedFilteredCategoriesList, foldersList])


    const handleAddFilterIntoFoldersList = (selectedFilteredCategoriesList: any) => {

        const filteredFolderList = (foldersList as any[]).filter(folder => {
            const isIncluded = (selectedFilteredCategoriesList as any[]).some(item => {
                return item.display && folder.toLowerCase().includes(item.category.prefixName.toLowerCase());
            });

            if (!isIncluded) {
                return false;
            }

            // Additional checks for specific exceptions
            const isCharactersSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.prefixName === "Characters" && item.display);
            const isRealSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.prefixName === "Real" && item.display);
            const isPosesSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.prefixName === "Poses" && item.display);
            const isMalesSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.prefixName === "Males" && item.display);
            const isSFWSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.prefixName === "SFW" && item.display);
            const isNSFWSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.prefixName === "NSFW" && item.display);
            const isEXSelected = (selectedFilteredCategoriesList as any[]).some(item => item.category.prefixName === "EX" && item.display);

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
    // Handler for blur event
    const handleAutocompleteBlur = () => {
        // If downloadFilePath is empty
        if (!downloadFilePath) {
            setDownloadFilePath('/@scan@/ErrorPath/')
        }
    };

    return (
        <>
            <FilesPathSettingPanel downloadFilePath={downloadFilePath} setDownloadFilePath={setDownloadFilePath} />

            <div
                style={{
                    marginTop: '14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    flexWrap: 'nowrap',
                    width: '100%',
                    minWidth: 0,
                }}
            >
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <Autocomplete
                        value={downloadFilePath}
                        onChange={(event, newValue) => {
                            const disallowedRegex = /[<>:"\\|?*]/g;
                            setDownloadFilePath(newValue?.replace(disallowedRegex, "") || "");
                        }}
                        inputValue={downloadFilePath}
                        onInputChange={(event, newInputValue) => {
                            setDownloadFilePath(newInputValue || "");
                        }}
                        id="controllable-states-update"
                        options={sortedandFilteredfoldersList}
                        disablePortal
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
                                fullWidth
                            />
                        )}
                    />
                </div>

                <OverlayTrigger
                    placement="top"
                    container={document.body}
                    overlay={
                        <Tooltip id="tooltip-save-download-path" style={{ zIndex: 20000 }}>
                            Save this download file path
                        </Tooltip>
                    }
                >
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                            updateDownloadFilePathIntoChromeStorage(downloadFilePath);
                            updateSelectedCategoryIntoChromeStorage(selectedCategory);
                        }}
                        style={{
                            width: '56px',
                            minWidth: '56px',
                            height: '56px',
                            borderRadius: '12px',
                            border: '1px solid #cfd6de',
                            background: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            flexShrink: 0,
                            marginTop: '0px',
                        }}
                    >
                        <BsPencilFill size={18} />
                    </button>
                </OverlayTrigger>
            </div>
        </>
    );
};


interface DatabaseUpdateModelPanelProps {
    modelID: string;
    url: string;
    modelData: Model;
    selectedVersion: Version;
    selectedCategory: string;
    downloadFilePath: string;
    setDownloadFilePath: (downloadFilePath: string) => void;
    setHasUpdated: (hasUpdated: boolean) => void;
    closePanel: () => void;
}


const DatabaseUpdateModelPanel: React.FC<DatabaseUpdateModelPanelProps> = (props) => {
    const isInitialMount = useRef(true);

    const dispatch = useDispatch();

    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadMethod, offlineMode } = chrome;

    const [originalModelsList, setOriginalModelsList] = useState<{
        name: string;
        url: string;
        id: number;
        baseModel: string;
        localPath?: string | null;
        imageUrls: { url: string; height: number; width: number; nsfw: string }[];
    }[]>([]);

    const [modelsList, setModelsList] = useState<{
        name: string;
        url: string;
        id: number;
        baseModel: string;
        localPath?: string | null;
        imageUrls: { url: string; height: number; width: number; nsfw: string }[];
    }[]>([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([])
    const [visibleIsCarted, setVisibleIsCarted] = useState<boolean[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [updateOption, setUpdateOption] = useState("Database_and_UpdateFolder")
    const [hasUpdateCompleted, setHasUpdateCompleted] = useState(false)

    const [isSorted, setIsSorted] = useState(false)
    const [baseModelList, setBaseModelList] = useState<{ baseModel: string, display: boolean }[]>([]);
    const [isColapPanelOpen, setUsColapPanelOpen] = useState(false);

    const civitaiModelID = props.modelID.toString();
    const civitaiVersionID = props.selectedVersion.id.toString();
    const civitaiUrl = props.url;
    const downloadFilePath = props.downloadFilePath;
    const selectedCategory = props.selectedCategory;

    const [effectiveDownloadFilePath, setEffectiveDownloadFilePath] = useState("");

    let UpdateDownloadFilePath = "";

    // Check if downloadFilePath matches the format /@scan@/{some word} (with optional trailing slash)
    const regex = /^\/@scan@\/[^\/]+\/?$/; // Matches /@scan@/{some word} or /@scan@/{some word}/

    if (regex.test(downloadFilePath)) {
        UpdateDownloadFilePath = `/@scan@/Update/${downloadFilePath.replace("/@scan@/", "")}`;
    } else {
        UpdateDownloadFilePath = `/@scan@/Update/${downloadFilePath.replace("/@scan@/ACG/", "")}`;
    }

    //Retrivie Modellist when pane is open
    useEffect(() => {
        handleUpdateModelsList();
    }, [])

    useEffect(() => {
        //Preventing First time update
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            setModelsList(originalModelsList?.reverse().filter(model =>
                baseModelList.some(baseModelObj => baseModelObj.baseModel === model.baseModel && baseModelObj.display)
            ));
            setOriginalModelsList(originalModelsList?.reverse());
        }
    }, [baseModelList]);


    const handleUpdateModelsList = async () => {
        setIsLoading(true)
        dispatch(clearError());

        //Check for null or empty
        if (
            civitaiModelID === null || civitaiModelID === "") {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        const data = await fetchDatabaseModelInfoByModelID(civitaiModelID, dispatch);

        console.log("update window record data : ", data)

        setModelsList(data)
        setOriginalModelsList(data);
        const uniqueBaseModels = Array.from(
            new Set(data?.map((obj: any) => obj.baseModel))
        ).map(baseModel => ({ baseModel: baseModel as string, display: true }));
        setBaseModelList(uniqueBaseModels);
        setVisibleToasts(data?.map(() => true))


        const cartListData = data || [];
        const cartedStatusArray = await Promise.all(
            cartListData.map(async (element: any) => {
                return await handleCheckCartList(element.url);
            })
        );
        setVisibleIsCarted(cartedStatusArray);

        setIsLoading(false)
    }

    const handleClose = (index: any) => {
        const newVisibleToasts = [...visibleToasts];
        newVisibleToasts[index] = false;
        setVisibleToasts(newVisibleToasts);
    };


    useEffect(() => {
        if (hasUpdateCompleted) {
            if (offlineMode) {
                handleAddOfflineDownloadFileintoOfflineDownloadList(effectiveDownloadFilePath);
            } else {
                handleDownload_v2(effectiveDownloadFilePath);
                bookmarkThisModel(props.selectedVersion.baseModel, dispatch);
            }

            setTimeout(() => {
                setHasUpdateCompleted(false);
                setEffectiveDownloadFilePath("");
                props.setHasUpdated(true);
                props.closePanel();
            }, 0);
        }
    }, [hasUpdateCompleted, effectiveDownloadFilePath]);


    const handleDownload_v2 = async (targetDownloadFilePath?: string) => {

        setIsLoading(true);
        dispatch(clearError());

        const finalDownloadFilePath = targetDownloadFilePath || downloadFilePath;

        let civitaiFileName = retrieveCivitaiFileName(props.modelData, civitaiVersionID);
        //the fileList would contains the urls of all files such as safetensor, training data, ...
        let civitaiModelFileList = retrieveCivitaiFilesList(props.modelData, civitaiVersionID)

        //Check for null or empty
        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            finalDownloadFilePath === null || finalDownloadFilePath === "" ||
            civitaiModelFileList === null || !civitaiModelFileList.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        let modelObject = {
            downloadFilePath: finalDownloadFilePath,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl
        }

        if (downloadMethod === "server") {
            //If download Method is server, the server will download the file into server's folder
            await fetchDownloadFilesByServer_v2(modelObject, dispatch);
        } else {
            //if download Method is browser, the chrome browser will download the file into server's folder
            await fetchDownloadFilesByBrowser_v2(civitaiUrl, finalDownloadFilePath, dispatch);
            try {
                const data = await fetchCivitaiModelInfoFromCivitaiByVersionID(civitaiVersionID.toString(), dispatch);
                if (data) {
                    callChromeBrowserDownload_v2({ ...modelObject, modelVersionObject: data })
                } else {
                    throw new Error('No data returned from fetchCivitaiModelInfoFromCivitaiByVersionID');
                }
            } catch (error) {
                console.error('Error fetching data for civitaiVersionID:', civitaiVersionID, error);
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            }

        }

        setIsLoading(false)
    }

    const handleUpdateModel = async (id: number) => {
        setIsLoading(true)
        dispatch(clearError());

        if (civitaiUrl === "" || selectedCategory === "" ||
            civitaiUrl === undefined || selectedCategory === undefined || id === undefined ||
            civitaiUrl === null || selectedCategory === null || id === null) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        let selectedPath = "";

        switch (updateOption) {
            case "Database_and_LocalUpdateFolder": {
                const clickedModel = modelsList.find(m => m.id === id);
                const localScanPath = normalizeLocalPathToScanPath(clickedModel?.localPath);
                const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);
                selectedPath = localUpdatePath || UpdateDownloadFilePath;
                break;
            }
            case "Database_and_LocalFileFolder": {
                const clickedModel = modelsList.find(m => m.id === id);
                const localScanPath = normalizeLocalPathToScanPath(clickedModel?.localPath);
                selectedPath = localScanPath || downloadFilePath;
                break;
            }
            case "Database_and_UpdateFolder":
                selectedPath = UpdateDownloadFilePath;
                break;
            case "Database_and_FileFolder":
                selectedPath = downloadFilePath;
                break;
            case "Database_Only":
                selectedPath = downloadFilePath;
                break;
            default:
                selectedPath = '/@scan@/ACG/Temp/';
                break;
        }

        props.setDownloadFilePath(selectedPath);
        setEffectiveDownloadFilePath(selectedPath);

        await fetchUpdateRecordAtDatabase(id, civitaiUrl, selectedCategory, dispatch);

        if (updateOption !== "Database_Only") {
            setHasUpdateCompleted(true)
        } else {
            bookmarkThisModel(props.selectedVersion.baseModel, dispatch)

            setTimeout(() => {
                setHasUpdateCompleted(false);
                setEffectiveDownloadFilePath("");
                props.setHasUpdated(true);
                props.closePanel();
            }, 0);
        }

        setIsLoading(false)
    }

    const handleCheckCartList = async (url: string) => {
        setIsLoading(true)
        dispatch(clearError());

        //Check for null or empty
        if (url === "" || url === undefined || url === null) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return false;
        }

        let isCarted = await fetchCheckCartList(url, dispatch);

        setIsLoading(false)
        return isCarted ? true : false;
    }

    const handleToggleColapPanel = () => {
        setUsColapPanelOpen(!isColapPanelOpen);
    };

    const handleToggleBaseModelCheckbox = (index: number) => {
        setBaseModelList(prevState => {
            const newState = [...prevState];
            newState[index].display = !newState[index].display;
            return newState;
        });
    };

    const handleReverseModelList = () => {
        setModelsList(modelsList?.reverse());
        setOriginalModelsList(originalModelsList?.reverse());
        setIsSorted(!isSorted)
    }

    const handleAddOfflineDownloadFileintoOfflineDownloadList = async (targetDownloadFilePath?: string) => {

        setIsLoading(true)
        // Utility function to delay execution

        const finalDownloadFilePath = targetDownloadFilePath || downloadFilePath;

        //Fetch Civitai ModelInfo
        const modelId = civitaiUrl.match(/\/models\/(\d+)/)?.[1] || '';
        // Fetch data with error handling
        try {
            const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);
            if (data) {

                let versionIndex = 0;
                const uri = new URL(civitaiUrl);

                if (uri.searchParams.has('modelVersionId')) {
                    let modelVersionId = uri.searchParams.get('modelVersionId');
                    versionIndex = data.modelVersions.findIndex((version: any) => {
                        return version.id == modelVersionId
                    });
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
                    finalDownloadFilePath === null || finalDownloadFilePath === "" ||
                    selectedCategory === null || selectedCategory === "" ||
                    civitaiModelFileList === null || !civitaiModelFileList.length ||
                    civitaiTags === null
                ) {
                    console.log("fail in handleAddOfflineDownloadFileintoOfflineDownloadList()")
                    return;
                }

                let modelObject = {
                    downloadFilePath: finalDownloadFilePath,
                    civitaiFileName,
                    civitaiModelID,
                    civitaiVersionID,
                    civitaiModelFileList,
                    civitaiUrl,
                    selectedCategory,
                    civitaiTags
                }

                await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, false, dispatch);

            }

        } catch (error) {
            console.error(error);
        }

        setIsLoading(false)
    };

    const normalizeLocalPathToScanPath = (localPath?: string | null) => {
        if (!localPath) return "";

        const normalized = localPath.replace(/\\/g, "/");
        const marker = "/@scan@/";
        const markerIndex = normalized.indexOf(marker);

        if (markerIndex === -1) return "";

        let scanPath = normalized.substring(markerIndex);
        if (!scanPath.endsWith("/")) {
            scanPath += "/";
        }

        return scanPath;
    };

    const buildUpdatePathFromScanPath = (scanPath: string) => {
        if (!scanPath) return "";

        const regex = /^\/@scan@\/[^\/]+\/?$/;

        if (regex.test(scanPath)) {
            return `/@scan@/Update/${scanPath.replace("/@scan@/", "")}`;
        } else {
            return `/@scan@/Update/${scanPath.replace("/@scan@/ACG/", "")}`;
        }
    };

    const radioCardStyle = (isSelected: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '10px',
        border: isSelected ? '1px solid #b7d0ff' : '1px solid #e5e7eb',
        background: isSelected ? '#edf4ff' : '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#1f2937',
        wordBreak: 'break-word',
    });

    return (
        <>return (
            <>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid #eef1f4',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <OverlayTrigger
                            placement="top"
                            container={document.body}
                            overlay={
                                <Tooltip id="tooltip-reverse-model-list" style={{ zIndex: 20000 }}>
                                    Reverse current model order
                                </Tooltip>
                            }
                        >
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={handleReverseModelList}
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    border: '1px solid #d0d7de',
                                    background: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                }}
                            >
                                {isLoading ? <BsArrowRepeat className="spinner" /> : (isSorted ? <BsSortUp /> : <BsSortDown />)}
                            </button>
                        </OverlayTrigger>

                        <button
                            type="button"
                            onClick={handleToggleColapPanel}
                            style={{
                                border: '1px solid #d0d7de',
                                background: '#fff',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                        >
                            <FaFilter />
                            Base Model Filter
                            {isColapPanelOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                        </button>
                    </div>

                    <div
                        style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            background: '#f8fafc',
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                            padding: '10px 12px',
                        }}
                    >
                        {modelsList?.length || 0} records
                    </div>
                </div>

                <Collapse in={isColapPanelOpen}>
                    <div
                        id="collapse-panel-update"
                        style={{
                            marginBottom: '16px',
                            padding: '12px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid #e5e7eb',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '10px 16px',
                            }}
                        >
                            {baseModelList.map((item, index) => (
                                <label
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '14px',
                                        color: '#374151',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={item.display}
                                        onChange={() => handleToggleBaseModelCheckbox(index)}
                                    />
                                    {item.baseModel}
                                </label>
                            ))}
                        </div>
                    </div>
                </Collapse>

                {isLoading ? (
                    <div
                        style={{
                            minHeight: '180px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Spinner />
                    </div>
                ) : (
                    <>
                        {modelsList?.map((model, index) => {
                            const localScanPath = normalizeLocalPathToScanPath(model?.localPath);
                            const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);

                            if (!visibleToasts[index]) return null;

                            return (
                                <div
                                    key={index}
                                    style={{
                                        marginBottom: '14px',
                                    }}
                                >
                                    <Toast
                                        onClose={() => handleClose(index)}
                                        style={{
                                            width: '100%',
                                            borderRadius: '16px',
                                            border: '1px solid #e5e7eb',
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                                            background: '#fff',
                                        }}
                                    >
                                        <Toast.Header
                                            style={{
                                                background: '#f8fafc',
                                                borderBottom: '1px solid #eef1f4',
                                                padding: '12px 14px',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    gap: '12px',
                                                }}
                                            >
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ marginBottom: '6px' }}>
                                                        <Badge bg="primary">{model?.baseModel}</Badge>
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontWeight: 700,
                                                            color: '#1f2937',
                                                            lineHeight: 1.35,
                                                            wordBreak: 'break-word',
                                                        }}
                                                    >
                                                        #{model?.id} : {model?.name}
                                                    </div>
                                                </div>

                                                {visibleIsCarted[index] ? (
                                                    <OverlayTrigger
                                                        placement="top"
                                                        container={document.body}
                                                        overlay={
                                                            <Tooltip id={`tooltip-carted-${index}`} style={{ zIndex: 20000 }}>
                                                                Already in cart
                                                            </Tooltip>
                                                        }
                                                    >
                                                        <div style={{ color: '#198754', flexShrink: 0 }}>
                                                            <BsFillCartCheckFill size={18} />
                                                        </div>
                                                    </OverlayTrigger>
                                                ) : null}
                                            </div>
                                        </Toast.Header>

                                        <Toast.Body style={{ padding: '14px' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '14px',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        borderRadius: '12px',
                                                        overflow: 'hidden',
                                                        border: '1px solid #e5e7eb',
                                                        background: '#f8fafc',
                                                    }}
                                                >
                                                    {model?.imageUrls?.[0]?.url ? (
                                                        <Carousel fade interval={null}>
                                                            {model?.imageUrls?.map((image, imgIndex) => (
                                                                <Carousel.Item key={imgIndex}>
                                                                    <div
                                                                        style={{
                                                                            height: '260px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            background: '#fff',
                                                                        }}
                                                                    >
                                                                        <img
                                                                            src={image.url || "https://placehold.co/200x250"}
                                                                            alt={model.name}
                                                                            style={{
                                                                                maxWidth: '100%',
                                                                                maxHeight: '260px',
                                                                                objectFit: 'contain',
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </Carousel.Item>
                                                            ))}
                                                        </Carousel>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                height: '180px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#6b7280',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            No image available
                                                        </div>
                                                    )}
                                                </div>

                                                <div
                                                    style={{
                                                        fontSize: '13px',
                                                        background: '#f8fafc',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '10px',
                                                        padding: '10px 12px',
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontWeight: 700,
                                                            color: '#374151',
                                                            marginBottom: '6px',
                                                        }}
                                                    >
                                                        URL
                                                    </div>
                                                    <a
                                                        href={model?.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ color: '#0d6efd', textDecoration: 'none' }}
                                                    >
                                                        {model?.url}
                                                    </a>
                                                </div>

                                                <div
                                                    style={{
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        background: '#fcfcfd',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontWeight: 700,
                                                            color: '#374151',
                                                            marginBottom: '10px',
                                                        }}
                                                    >
                                                        Update Options
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {localUpdatePath && (
                                                            <label style={radioCardStyle(updateOption === 'Database_and_LocalUpdateFolder')}>
                                                                <input
                                                                    type="radio"
                                                                    value="Database_and_LocalUpdateFolder"
                                                                    checked={updateOption === 'Database_and_LocalUpdateFolder'}
                                                                    onChange={() => setUpdateOption('Database_and_LocalUpdateFolder')}
                                                                />
                                                                <span>
                                                                    Database & Update to {localUpdatePath}
                                                                </span>
                                                            </label>
                                                        )}

                                                        {localScanPath && (
                                                            <label style={radioCardStyle(updateOption === 'Database_and_LocalFileFolder')}>
                                                                <input
                                                                    type="radio"
                                                                    value="Database_and_LocalFileFolder"
                                                                    checked={updateOption === 'Database_and_LocalFileFolder'}
                                                                    onChange={() => setUpdateOption('Database_and_LocalFileFolder')}
                                                                />
                                                                <span>
                                                                    Database & {localScanPath}
                                                                </span>
                                                            </label>
                                                        )}

                                                        <label style={radioCardStyle(updateOption === 'Database_and_UpdateFolder')}>
                                                            <input
                                                                type="radio"
                                                                value="Database_and_UpdateFolder"
                                                                checked={updateOption === 'Database_and_UpdateFolder'}
                                                                onChange={() => setUpdateOption('Database_and_UpdateFolder')}
                                                            />
                                                            <span>
                                                                Database & Update to {UpdateDownloadFilePath}
                                                            </span>
                                                        </label>

                                                        <label style={radioCardStyle(updateOption === 'Database_and_FileFolder')}>
                                                            <input
                                                                type="radio"
                                                                value="Database_and_FileFolder"
                                                                checked={updateOption === 'Database_and_FileFolder'}
                                                                onChange={() => setUpdateOption('Database_and_FileFolder')}
                                                            />
                                                            <span>
                                                                Database & {downloadFilePath}
                                                            </span>
                                                        </label>

                                                        <label style={radioCardStyle(updateOption === 'Database_Only')}>
                                                            <input
                                                                type="radio"
                                                                value="Database_Only"
                                                                checked={updateOption === 'Database_Only'}
                                                                onChange={() => setUpdateOption('Database_Only')}
                                                            />
                                                            <span>Database Only</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={isLoading}
                                                    onClick={() => handleUpdateModel(model?.id)}
                                                    style={{
                                                        width: '100%',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        padding: '12px 16px',
                                                        background: offlineMode ? '#198754' : '#0d6efd',
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                                        boxShadow: offlineMode
                                                            ? '0 4px 12px rgba(25, 135, 84, 0.25)'
                                                            : '0 4px 12px rgba(13, 110, 253, 0.25)',
                                                    }}
                                                >
                                                    <BsFillFileEarmarkArrowUpFill />
                                                    <span>{offlineMode ? 'Update & Queue Offline' : 'Update & Download'}</span>
                                                </button>
                                            </div>
                                        </Toast.Body>
                                    </Toast>
                                </div>
                            );
                        })}
                    </>
                )}
            </>
            );

        </>

    );
};

export default updateModelPanel;
