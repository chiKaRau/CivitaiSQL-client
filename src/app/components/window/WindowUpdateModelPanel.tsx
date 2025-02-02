import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

//components
import { Badge, Col, Carousel, Collapse, Form, OverlayTrigger, Toast, Tooltip, Spinner, Button } from 'react-bootstrap';
import { BiCategory } from "react-icons/bi";
import { CiWarning } from "react-icons/ci";

//utils
import { bookmarkThisModel, initializeDatafromChromeStorage, updateDownloadFilePathIntoChromeStorage, updateSelectedCategoryIntoChromeStorage, callChromeBrowserDownload_v2 } from "../../utils/chromeUtils"
import { fetchAddOfflineDownloadFileIntoOfflineDownloadList, fetchCheckCartList, fetchCivitaiModelInfoFromCivitaiByModelID, fetchCivitaiModelInfoFromCivitaiByVersionID, fetchDatabaseModelInfoByModelID, fetchDownloadFilesByBrowser_v2, fetchDownloadFilesByServer_v2, fetchGetCategoriesList, fetchGetCategoriesPrefixsList, fetchGetFilePathCategoriesList, fetchGetFoldersList, fetchGetTagsList, fetchUpdateRecordAtDatabase } from '../../api/civitaiSQL_api';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../store/configureStore';
import TextField from '@mui/material/TextField';
import { BsFillCartCheckFill, BsFillFileEarmarkArrowUpFill, BsType, BsArrowRepeat, BsSortDown, BsSortUp, BsPencilFill } from 'react-icons/bs';
import Autocomplete from '@mui/material/Autocomplete';
import { setError } from '../../store/actions/errorsActions';
import { clearError } from '../../store/actions/errorsActions';
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from '../../utils/objectUtils';

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
        <div className="panel-container">
            <div className="panel-container-content">
                <button className="panel-close-button" onClick={onClose}>
                    &#x2715;
                </button>

                <CategoriesListSelector downloadFilePath={downloadFilePath} selectedCategory={selectedCategory} setSelectCategory={setSelectCategory} />

                <DownloadFilePathOptionPanel downloadFilePath={downloadFilePath} setDownloadFilePath={setDownloadFilePath} selectedCategory={selectedCategory} />

                <DatabaseUpdateModelPanel modelID={modelId} url={modelURL} modelData={modelData} selectedVersion={selectedVersion}
                    selectedCategory={selectedCategory}
                    downloadFilePath={downloadFilePath} setDownloadFilePath={setDownloadFilePath}
                    setHasUpdated={setHasUpdated}
                    closePanel={onClose}
                />

                {/* <FilesPathSettingPanel downloadFilePath={downloadFilePath} setDownloadFilePath={setDownloadFilePath} /> */}

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
        <div className="selector-container">
            <Form className="selector-form-container">
                <Form.Group controlId="selectSheet" className="selector-form-group ">
                    <Form.Label className="selector-form-label"><BiCategory /> </Form.Label>
                    <Form.Select
                        className="selector-form-select"
                        value={selectedCategory}
                        disabled={isLoading}
                        onChange={(event) => {
                            setSelectCategory(event.target.value);
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
            {notMatchSelector && <div style={{ paddingLeft: "5px" }}> <CiWarning /> </div>}
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

    const [prefixsList, setPrefixsList] = useState<{ name: string; value: string; }[]>([]);
    const [suffixsList, setSuffixsList] = useState<{ name: string; value: string; }[]>(modelTagsList);

    const [selectedPrefix, setSelectedPrefix] = useState("");
    const [selectedSuffix, setSelectedSuffix] = useState("");
    const [filePathCategoriesList, setFilePathCategoriesList] = useState<{ name: string; value: string; }[]>([]);

    // Initializing state with the entire object and display property
    const [selectedFilteredCategoriesList, setSelectedFilteredCategoriesList] = useState<{ category: { name: string, value: string }, display: boolean }[]>(
        filePathCategoriesList.map((category) => ({
            category: category,
            display: true
        }))
    );

    useEffect(() => {
        const fetchPrefixsList = async () => {
            try {
                const data = await fetchGetCategoriesPrefixsList(dispatch);
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
        <div className="collapse-panel-container">
            <div className="toggle-section"
                onClick={() => setOpen(!open)} aria-controls="collapse-panel" aria-expanded={open}>
                <center> Folder Settings </center>
            </div>
            <hr />

            <Collapse in={open}>
                <div id="collapse-panel">
                    <center> Prefix Suggestions</center>
                    <hr />
                    {prefixsList?.map((element, index) => (
                        <OverlayTrigger placement="bottom" overlay={<Tooltip id="tooltip">{element.value}</Tooltip>}>
                            <label key={index}
                                className={`panel-tag-button ${selectedPrefix === element.value ? 'panel-tag-default' : 'panel-tag-selected'}`}
                                onClick={() => setSelectedPrefix(element.value)}>
                                {element.name}
                            </label>
                        </OverlayTrigger>
                    ))}
                    <br />

                    <center> Suffix Suggestions</center>
                    <hr />
                    {suffixsList?.map((element, index) => (
                        <OverlayTrigger placement="bottom" overlay={<Tooltip id="tooltip">{element.value}</Tooltip>}>
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
                                {item.category.name}
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

const FilesPathTagsListSelector: React.FC<FilesPathTagsListSelectorProps> = ({ downloadFilePath, selectedPrefix, setDownloadFilePath }) => {
    const [topTags, setTopTags] = useState<any[]>([]);
    const [recentTags, setRecentTags] = useState<any[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const dispatch = useDispatch();

    useEffect(() => {
        // Fetch tags list on component mount
        const loadTags = async () => {
            const result = await fetchGetTagsList(dispatch, selectedPrefix);
            if (result) {
                setTopTags(result.topTags || []);
                setRecentTags(result.recentTags || []);
            }
        };

        loadTags();
    }, [dispatch, selectedPrefix]);

    const handleTagClick = (tag: string) => {
        setSelectedTag(tag); // Set the clicked tag as selected
        setDownloadFilePath(tag)
    };

    return (
        <div>
            <h6>Top 10 Tags by Count</h6>
            <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px' }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {topTags.map((tag, index) => (
                        <li
                            key={index}
                            style={{
                                margin: '5px 0',
                                cursor: 'pointer',
                                backgroundColor: selectedTag === tag.string_value ? '#d3d3d3' : 'transparent', // Highlight if selected
                                fontWeight: selectedTag === tag.string_value ? 'bold' : 'normal'
                            }}
                            onClick={() => handleTagClick(tag.string_value)}
                        >
                            {index + 1}# {tag.string_value}
                        </li>
                    ))}
                </ul>
            </div>

            <h6>Recently Added 10 Tags</h6>
            <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px', marginBottom: "10px" }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {recentTags.map((tag, index) => (
                        <li
                            key={index}
                            style={{
                                margin: '5px 0',
                                cursor: 'pointer',
                                backgroundColor: selectedTag === tag.string_value ? '#d3d3d3' : 'transparent', // Highlight if selected
                                fontWeight: selectedTag === tag.string_value ? 'bold' : 'normal'
                            }}
                            onClick={() => handleTagClick(tag.string_value)}
                        >
                            {10 - index}# {tag.string_value} {/* Numbering in reverse order */}
                        </li>
                    ))}
                </ul>
            </div>
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

            <div className="autocomplete-container">
                <div className="autocomplete-container-row">
                    <div className="select-container" style={{ width: "350px" }}>
                        <Autocomplete
                            value={downloadFilePath} // The selected value
                            onChange={(event, newValue) => {
                                // Handle when a value is selected from the dropdown
                                const disallowedRegex = /[<>:"\\|?*]/g;
                                setDownloadFilePath(newValue?.replace(disallowedRegex, "") || "");
                            }}
                            inputValue={downloadFilePath} // The typed input
                            onInputChange={(event, newInputValue) => {
                                // Handle when typing in the input field
                                setDownloadFilePath(newInputValue || "");
                            }}
                            id="controllable-states-update"
                            options={sortedandFilteredfoldersList}
                            sx={{ width: 350 }}
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
                                />
                            )}
                        />
                    </div>

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

    const [originalModelsList, setOriginalModelsList] = useState<{ name: string; url: string; id: number; baseModel: string; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
    const [modelsList, setModelsList] = useState<{ name: string; url: string; id: number; baseModel: string; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]>([]);
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
                handleAddOfflineDownloadFileintoOfflineDownloadList();
            } else {
                // Perform the necessary actions
                handleDownload_v2();
                bookmarkThisModel(props.selectedVersion.baseModel, dispatch);
            }
            // Reset states with a slight delay
            setTimeout(() => {
                setHasUpdateCompleted(false);
                props.setHasUpdated(true);
                props.closePanel();
            }, 0);
        }
    }, [hasUpdateCompleted]);


    const handleDownload_v2 = async () => {

        setIsLoading(true);
        dispatch(clearError());

        let civitaiFileName = retrieveCivitaiFileName(props.modelData, civitaiVersionID);
        //the fileList would contains the urls of all files such as safetensor, training data, ...
        let civitaiModelFileList = retrieveCivitaiFilesList(props.modelData, civitaiVersionID)

        //Check for null or empty
        if (
            civitaiUrl === null || civitaiUrl === "" ||
            civitaiFileName === null || civitaiFileName === "" ||
            civitaiModelID === null || civitaiModelID === "" ||
            civitaiVersionID === null || civitaiVersionID === "" ||
            downloadFilePath === null || downloadFilePath === "" ||
            civitaiModelFileList === null || !civitaiModelFileList.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false)
            return;
        }

        let modelObject = {
            downloadFilePath, civitaiFileName, civitaiModelID,
            civitaiVersionID, civitaiModelFileList, civitaiUrl
        }

        if (downloadMethod === "server") {
            //If download Method is server, the server will download the file into server's folder
            await fetchDownloadFilesByServer_v2(modelObject, dispatch);
        } else {
            //if download Method is browser, the chrome browser will download the file into server's folder
            await fetchDownloadFilesByBrowser_v2(civitaiUrl, downloadFilePath, dispatch);
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

        switch (updateOption) {
            case "Database_and_UpdateFolder":

                props.setDownloadFilePath(UpdateDownloadFilePath);
                //dispatch(updateDownloadFilePath(`/@scan@/Update/${downloadFilePath.split('/').reverse()[1]}/`))
                break;
            case "Database_and_FileFolder":
                props.setDownloadFilePath(downloadFilePath);
                break;
            case "Database_Only":
                props.setDownloadFilePath(downloadFilePath);
                break;
            default:
                props.setDownloadFilePath('/@scan@/ACG/Temp/');
                break;
        }

        fetchUpdateRecordAtDatabase(id, civitaiUrl, selectedCategory, dispatch);

        if (updateOption !== "Database_Only") {
            setHasUpdateCompleted(true)
        } else {
            bookmarkThisModel(props.selectedVersion.baseModel, dispatch)

            // Reset states with a slight delay
            setTimeout(() => {
                setHasUpdateCompleted(false);
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

    const handleAddOfflineDownloadFileintoOfflineDownloadList = async () => {

        setIsLoading(true)
        // Utility function to delay execution

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

            }

        } catch (error) {
            console.error(error);
        }

        setIsLoading(false)
    };

    return (
        <>
            <div className="buttonGroup" style={{ padding: "5px", display: "flex", justifyContent: "flex-start", alignItems: "flex-start" }}>
                <div style={{ marginRight: '10px' }}>
                    <Button variant="secondary" disabled={isLoading} onClick={handleReverseModelList}>
                        {isLoading ? <BsArrowRepeat className="spinner" /> : (isSorted ? <BsSortUp /> : <BsSortDown />)}
                    </Button>
                </div>

                <div className="collapse-panel-container" style={{ flexShrink: 0, margin: 0, padding: "0px 10px 0px 10px" }}>
                    <div className="toggle-section" onClick={handleToggleColapPanel} aria-controls="collapse-panel-update" aria-expanded={isColapPanelOpen} style={{
                        textAlign: 'center'
                    }}>
                        <BsType />
                    </div>

                    <Collapse in={isColapPanelOpen}>
                        <div id="collapse-panel-update" style={{
                            marginTop: '10px',
                            padding: '10px',
                            borderRadius: '5px',
                            background: '#f9f9f9',
                            width: '100%'
                        }}>
                            {baseModelList.map((item, index) => (
                                <div key={index}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={item.display}
                                            onChange={() => handleToggleBaseModelCheckbox(index)}
                                        />
                                        {item.baseModel}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </Collapse>
                </div>
            </div>

            {isLoading ?
                <div className="centered-container">
                    <Spinner />
                </div>
                :
                <>
                    {modelsList?.map((model, index) => {
                        if (!visibleToasts[index]) return null;
                        return (
                            <div key={index} className="panel-toast-container">
                                <Toast onClose={() => handleClose(index)}>
                                    <Toast.Header>
                                        <Col xs={10} className="panel-toast-header">
                                            <Badge>{model?.baseModel}</Badge><b><span> #{model?.id}</span> : <span>{model?.name}</span></b>
                                        </Col>
                                    </Toast.Header>
                                    <Toast.Body>
                                        {/* Image Carousel */}
                                        <div className="panel-image-carousel-container">
                                            {model?.imageUrls[0]?.url
                                                &&
                                                <Carousel fade>
                                                    {model?.imageUrls?.map((image) => {
                                                        return (
                                                            <Carousel.Item >
                                                                <img
                                                                    src={image.url || "https://placehold.co/200x250"}
                                                                    alt={model.name}
                                                                />
                                                            </Carousel.Item>
                                                        )
                                                    })}
                                                </Carousel>}
                                        </div>

                                        {/* Url */}
                                        <a href={model?.url}> {model?.url} </a>

                                        {/**Update Radio Button */}
                                        <div className="radio-container">
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    value="Database_and_UpdateFolder"
                                                    checked={updateOption === 'Database_and_UpdateFolder'}
                                                    onChange={() => setUpdateOption('Database_and_UpdateFolder')}
                                                    className="radio-input"
                                                />
                                                <div className="truncated-text-container">
                                                    <span>
                                                        Database & Update to {UpdateDownloadFilePath}
                                                    </span>
                                                </div>
                                            </label>
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    value="Database_and_FileFolder"
                                                    checked={updateOption === 'Database_and_FileFolder'}
                                                    onChange={() => setUpdateOption('Database_and_FileFolder')}
                                                    className="radio-input"
                                                />
                                                <div className="truncated-text-container">
                                                    <span>
                                                        Database & {downloadFilePath}
                                                    </span>
                                                </div>
                                            </label>
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    value="Database_Only"
                                                    checked={updateOption === 'Database_Only'}
                                                    onChange={() => setUpdateOption('Database_Only')}
                                                    className="radio-input"
                                                />
                                                Database Only
                                            </label>
                                        </div>

                                        {/**Update button */}

                                        <div className="panel-update-button-container">
                                            <Button
                                                variant={offlineMode ? "success" : "primary"}
                                                disabled={isLoading}
                                                onClick={() => handleUpdateModel(model?.id)}
                                                className="btn btn-primary btn-lg w-100"
                                            >
                                                <BsFillFileEarmarkArrowUpFill />
                                                {isLoading && <span className="button-state-complete">✓</span>}
                                            </Button>
                                            {visibleIsCarted[index] ? <BsFillCartCheckFill className="icon" /> : null}
                                        </div>

                                    </Toast.Body>
                                </Toast>
                            </div>
                        );
                    })}
                </>
            }

        </>

    );
};

export default updateModelPanel;
