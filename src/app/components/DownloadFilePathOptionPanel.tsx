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
            <div className="autocomplete-container">
                <div className="autocomplete-container-row">
                    <Autocomplete
                        value={downloadFilePath}
                        onChange={handleFoldersListOnChange}
                        inputValue={downloadFilePath}
                        onInputChange={handleFoldersListOnChange}
                        id="controllable-states-demo"
                        options={foldersList}
                        sx={{ width: 300 }}
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

