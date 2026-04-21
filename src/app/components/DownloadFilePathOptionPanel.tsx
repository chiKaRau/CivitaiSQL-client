// DownloadFilePathOptionPanel.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { updateDownloadFilePath } from '../store/actions/chromeActions';
import FilesPathSettingPanel from './FilesPathSettingPanel';
import { fetchGetFoldersList } from '../api/civitaiSQL_api';
import {
    updateDownloadFilePathIntoChromeStorage,
    updateSelectedCategoryIntoChromeStorage
} from '../utils/chromeUtils';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { BsPencilFill } from 'react-icons/bs';
import { AppTheme, darkTheme, lightTheme } from './window_offline/OfflineWindow.theme';

interface DownloadFilePathOptionPanelProps {
    isHandleRefresh?: boolean;
    setIsHandleRefresh?: (val: boolean) => void;
    isDarkMode?: boolean;

    downloadFilePath?: string;
    selectedCategory?: string;
    setDownloadFilePath?: (val: string) => void;
    theme?: AppTheme;
}

const noop = (_val: boolean) => { };

const DownloadFilePathOptionPanel: React.FC<DownloadFilePathOptionPanelProps> = ({
    isHandleRefresh = false,
    setIsHandleRefresh = noop,
    isDarkMode: propIsDarkMode,
    downloadFilePath: propDownloadFilePath,
    selectedCategory: propSelectedCategory,
    setDownloadFilePath: propSetDownloadFilePath,
    theme: propTheme,
}) => {
    const dispatch = useDispatch();

    const chrome = useSelector((s: AppState) => s.chrome);
    const {
        downloadFilePath: reduxDownloadFilePath,
        selectedFilteredCategoriesList,
        selectedCategory: reduxSelectedCategory,
        isDarkMode: reduxIsDarkMode,
    } = chrome;

    const resolvedIsDarkMode = propIsDarkMode ?? reduxIsDarkMode;
    const resolvedTheme = propTheme ?? (resolvedIsDarkMode ? darkTheme : lightTheme);

    const resolvedDownloadFilePath = propDownloadFilePath ?? reduxDownloadFilePath ?? '';
    const resolvedSelectedCategory = propSelectedCategory ?? reduxSelectedCategory ?? '';

    const [inputValue, setInputValue] = useState<string>(resolvedDownloadFilePath);
    const [foldersList, setFoldersList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInputValue(resolvedDownloadFilePath);
    }, [resolvedDownloadFilePath]);

    const handleSetDownloadFilePath = (nextValue: string) => {
        propSetDownloadFilePath?.(nextValue);
        dispatch(updateDownloadFilePath(nextValue));
    };

    const handleGetFoldersList = async () => {
        setIsLoading(true);
        try {
            const data = await fetchGetFoldersList(dispatch);
            if (Array.isArray(data)) {
                setFoldersList(data);
            } else {
                console.warn('Unexpected fetchGetFoldersList result:', data);
                setFoldersList([]);
            }
        } catch (err) {
            console.error('Error fetching folders list:', err);
            setFoldersList([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void handleGetFoldersList();
    }, []);

    useEffect(() => {
        if (isHandleRefresh) {
            void handleGetFoldersList();
        }
    }, [isHandleRefresh]);

    const parsedCategories = useMemo(() => {
        try {
            if (Array.isArray(selectedFilteredCategoriesList)) {
                return selectedFilteredCategoriesList;
            }

            if (typeof selectedFilteredCategoriesList === 'string') {
                return JSON.parse(selectedFilteredCategoriesList || '[]');
            }

            return [];
        } catch {
            return [];
        }
    }, [selectedFilteredCategoriesList]);

    const sortedAndFiltered = useMemo(() => {
        const lc = (s: string) => s.toLowerCase();

        const allowPrefixes = parsedCategories
            .filter(
                (item: any) =>
                    item.display &&
                    item.category?.downloadFilePath?.startsWith('/@scan@/')
            )
            .map((item: any) => lc(item.category.downloadFilePath));

        const denyPrefixes = parsedCategories
            .filter(
                (item: any) =>
                    !item.display &&
                    item.category?.downloadFilePath?.startsWith('/@scan@/')
            )
            .map((item: any) => lc(item.category.downloadFilePath));

        return foldersList
            .filter((raw) => {
                const folder = lc(raw);

                const allowed =
                    allowPrefixes.length === 0
                        ? true
                        : allowPrefixes.some((p: string) => folder.startsWith(p));

                if (!allowed) return false;
                if (denyPrefixes.some((p: string) => folder.startsWith(p))) return false;

                return true;
            })
            .sort((a, b) => {
                const firstCharA = a.charAt(0).toUpperCase();
                const firstCharB = b.charAt(0).toUpperCase();
                const isDigitA = /\d/.test(firstCharA);
                const isDigitB = /\d/.test(firstCharB);

                if (isDigitA && !isDigitB) return 1;
                if (!isDigitA && isDigitB) return -1;

                return a.localeCompare(b, 'en', {
                    numeric: true,
                    sensitivity: 'base'
                });
            });
    }, [foldersList, parsedCategories]);

    const commit = (_event: any, val: string | null) => {
        const rawValue = val ?? inputValue ?? '';
        const clean = rawValue.replace(/[<>:"\\|?*]/g, '');
        setInputValue(clean);
        handleSetDownloadFilePath(clean);
    };

    const handleBlur = () => {
        commit(null, inputValue);
    };

    const handleSave = () => {
        updateDownloadFilePathIntoChromeStorage(resolvedDownloadFilePath ?? '');
        updateSelectedCategoryIntoChromeStorage(resolvedSelectedCategory ?? '');
    };

    return (
        <>
            <FilesPathSettingPanel
                isHandleRefresh={isHandleRefresh}
                setIsHandleRefresh={setIsHandleRefresh}
            />

            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginTop: '12px',
                }}
            >
                <Autocomplete
                    freeSolo
                    options={sortedAndFiltered}
                    loading={isLoading}
                    inputValue={inputValue}
                    onInputChange={(_, v) => setInputValue(v ?? '')}
                    value={resolvedDownloadFilePath ?? ''}
                    onChange={commit}
                    sx={{ width: 350 }}
                    slotProps={{
                        paper: {
                            sx: {
                                backgroundColor: resolvedTheme.panelBackground,
                                color: resolvedTheme.panelText,
                                border: `1px solid ${resolvedTheme.panelBorder}`,
                                boxShadow: resolvedTheme.buttonShadow,
                            },
                        },
                        listbox: {
                            sx: {
                                backgroundColor: resolvedTheme.panelBackground,
                                color: resolvedTheme.panelText,
                            },
                        },
                        popper: {
                            sx: {
                                '& .MuiAutocomplete-option': {
                                    backgroundColor: resolvedTheme.panelBackground,
                                    color: resolvedTheme.panelText,
                                },
                                '& .MuiAutocomplete-option.Mui-focused': {
                                    backgroundColor: resolvedTheme.rowBackgroundColor,
                                },
                                '& .MuiAutocomplete-option[aria-selected="true"]': {
                                    backgroundColor: resolvedTheme.evenRowBackgroundColor,
                                },
                            },
                        },
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            inputRef={inputRef}
                            label="Folder path"
                            helperText={`Can't contain <>:"\\|?*`}
                            onBlur={handleBlur}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: resolvedTheme.panelText,
                                    backgroundColor: resolvedTheme.panelBackground,
                                    '& fieldset': {
                                        borderColor: resolvedTheme.panelBorder,
                                    },
                                    '&:hover fieldset': {
                                        borderColor: resolvedTheme.buttonBorder,
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: resolvedTheme.buttonBorder,
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: resolvedTheme.subText,
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: resolvedTheme.panelText,
                                },
                                '& .MuiFormHelperText-root': {
                                    color: resolvedTheme.subText,
                                },
                                '& .MuiSvgIcon-root': {
                                    color: resolvedTheme.panelText,
                                },
                                '& .MuiAutocomplete-popupIndicator': {
                                    color: resolvedTheme.panelText,
                                },
                                '& .MuiAutocomplete-clearIndicator': {
                                    color: resolvedTheme.panelText,
                                },
                            }}
                        />
                    )}
                    onFocus={() => {
                        if (inputRef.current) {
                            inputRef.current.scrollLeft =
                                inputRef.current.scrollWidth - inputRef.current.offsetWidth + 100;
                        }
                    }}
                />

                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip id="download-file-path-save-tooltip">
                            Save this download file path.
                        </Tooltip>
                    }
                >
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleSave}
                        style={{
                            width: '56px',
                            minWidth: '56px',
                            height: '56px',
                            borderRadius: '12px',
                            border: `1px solid ${resolvedTheme.buttonBorder}`,
                            background: resolvedTheme.buttonBackground,
                            color: resolvedTheme.buttonText,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: resolvedTheme.buttonShadow,
                            flexShrink: 0,
                            opacity: isLoading ? 0.7 : 1,
                        }}
                    >
                        <BsPencilFill />
                    </button>
                </OverlayTrigger>
            </div>
        </>
    );
};

export default DownloadFilePathOptionPanel;