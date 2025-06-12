import React, { useState, useEffect, useRef } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { updateDownloadFilePath } from "../store/actions/chromeActions"

//components
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { BsPencilFill } from "react-icons/bs"

//api
import {
    fetchGetFoldersList
} from "../api/civitaiSQL_api"

//utils
import { updateDownloadFilePathIntoChromeStorage, updateSelectedCategoryIntoChromeStorage } from "../utils/chromeUtils"
import FilesPathSettingPanel from './FilesPathSettingPanel';

//Suggestion
//Auto Complete

interface DownloadFilePathOptionPanelProps {
    isHandleRefresh: boolean;
    setIsHandleRefresh: (isHandleRefresh: boolean) => void;
}

const DownloadFilePathOptionPanel: React.FC<DownloadFilePathOptionPanelProps> = ({ isHandleRefresh, setIsHandleRefresh }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadFilePath, selectedFilteredCategoriesList, selectedCategory } = chrome;
    const dispatch = useDispatch();
    const [sortedandFilteredfoldersList, setSortedandFilteredfoldersList] = useState<string[]>([]);
    const [foldersList, setFoldersList] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    const sortedFoldersList = foldersList.sort((a: string, b: string) => {
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

        console.log("data---folder")
        console.log(foldersList);

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

        console.log("filteredFolderList")
        console.log(filteredFolderList)

        setSortedandFilteredfoldersList(filteredFolderList);

    }

    const handleGetFoldersList = async () => {
        setIsLoading(true)
        const data = await fetchGetFoldersList(dispatch);
        setFoldersList(data)
        setIsLoading(false)
    }

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

    return (
        <>
            <FilesPathSettingPanel setIsHandleRefresh={setIsHandleRefresh} isHandleRefresh={isHandleRefresh} />

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
        </>
    );
};

export default DownloadFilePathOptionPanel;

