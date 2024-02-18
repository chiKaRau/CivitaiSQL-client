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
import TagsPanel from './TagsPanel';

//api
import {
    fetchGetFoldersList
} from "../api/civitaiSQL_api"

//utils
import { updateDownloadFilePathIntoChromeStorage } from "../utils/chromeUtils"

//Suggestion
//Auto Complete

const DownloadFilePathOptionPanel: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadFilePath } = chrome;
    const dispatch = useDispatch();
    const [foldersList, setFoldersList] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    const sortedFoldersList = foldersList.sort((a : string, b : string) => {
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
            <TagsPanel />

            <div className="autocomplete-container">
                <div className="autocomplete-container-row">
                    <Autocomplete
                        value={downloadFilePath}
                        onChange={handleFoldersListOnChange}
                        inputValue={downloadFilePath}
                        onInputChange={handleFoldersListOnChange}
                        id="controllable-states-demo"
                        options={sortedFoldersList}
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
                        renderOption={(props, option) => {
                            // Check if the option includes the substring 'real'
                            const isMatch = option.includes("NSFW");
                        
                            return (
                              <li {...props}>
                                {isMatch ? (
                                  <strong>{option}</strong> // Render the option in bold if it includes 'real'
                                ) : (
                                  option // Render the option normally if it doesn't include 'real'
                                )}
                              </li>
                            );
                          }}
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

