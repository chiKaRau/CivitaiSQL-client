// DownloadFilePathOptionPanel.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { AppState } from '../store/configureStore'
import { updateDownloadFilePath } from '../store/actions/chromeActions'
import FilesPathSettingPanel from './FilesPathSettingPanel'
import { fetchGetFoldersList } from '../api/civitaiSQL_api'
import {
    updateDownloadFilePathIntoChromeStorage,
    updateSelectedCategoryIntoChromeStorage
} from '../utils/chromeUtils'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { BsPencilFill } from 'react-icons/bs'
import { darkTheme, lightTheme } from './window_offline/OfflineWindow.theme'

interface DownloadFilePathOptionPanelProps {
    isHandleRefresh: boolean
    setIsHandleRefresh: (val: boolean) => void
    isDarkMode: boolean
}

const DownloadFilePathOptionPanel: React.FC<DownloadFilePathOptionPanelProps> = ({
    isHandleRefresh,
    setIsHandleRefresh,
    isDarkMode
}) => {
    const dispatch = useDispatch()
    const {
        downloadFilePath,
        selectedFilteredCategoriesList,
        selectedCategory,
    } = useSelector((s: AppState) => s.chrome)

    const theme = isDarkMode ? darkTheme : lightTheme

    const [inputValue, setInputValue] = useState<string>(downloadFilePath ?? '')
    const [foldersList, setFoldersList] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setInputValue(downloadFilePath ?? '')
    }, [downloadFilePath])

    const handleGetFoldersList = async () => {
        setIsLoading(true)
        try {
            const data = await fetchGetFoldersList(dispatch)
            if (Array.isArray(data)) {
                setFoldersList(data)
            } else {
                console.warn('Unexpected fetchGetFoldersList result:', data)
                setFoldersList([])
            }
        } catch (err) {
            console.error('Error fetching folders list:', err)
            setFoldersList([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        handleGetFoldersList()
        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        if (isHandleRefresh) {
            handleGetFoldersList()
        }
    }, [isHandleRefresh])

    const parsedCategories = useMemo(() => {
        try {
            return JSON.parse(selectedFilteredCategoriesList ?? '[]')
        } catch {
            return []
        }
    }, [selectedFilteredCategoriesList])

    const sortedAndFiltered = useMemo(() => {
        const lc = (s: string) => s.toLowerCase()

        const allowPrefixes = parsedCategories
            .filter(
                (item: any) =>
                    item.display &&
                    item.category?.downloadFilePath?.startsWith('/@scan@/')
            )
            .map((item: any) => lc(item.category.downloadFilePath))

        const denyPrefixes = parsedCategories
            .filter(
                (item: any) =>
                    !item.display &&
                    item.category?.downloadFilePath?.startsWith('/@scan@/')
            )
            .map((item: any) => lc(item.category.downloadFilePath))

        return foldersList
            .filter((raw) => {
                const folder = lc(raw)

                const allowed =
                    allowPrefixes.length === 0
                        ? true
                        : allowPrefixes.some((p: string) => folder.startsWith(p))

                if (!allowed) return false
                if (denyPrefixes.some((p: string) => folder.startsWith(p))) return false

                return true
            })
            .sort((a, b) => {
                const firstCharA = a.charAt(0).toUpperCase()
                const firstCharB = b.charAt(0).toUpperCase()
                const isDigitA = /\d/.test(firstCharA)
                const isDigitB = /\d/.test(firstCharB)

                if (isDigitA && !isDigitB) return 1
                if (!isDigitA && isDigitB) return -1

                return a.localeCompare(b, 'en', {
                    numeric: true,
                    sensitivity: 'base'
                })
            })
    }, [foldersList, parsedCategories])

    const commit = (_: any, val: string | null) => {
        const clean = val?.replace(/[<>:"\\|?*]/g, '') || ''
        dispatch(updateDownloadFilePath(clean))
    }

    const handleBlur = () => commit(null, inputValue)

    const handleSave = () => {
        updateDownloadFilePathIntoChromeStorage(downloadFilePath ?? '')
        updateSelectedCategoryIntoChromeStorage(selectedCategory ?? '')
    }

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
                    value={downloadFilePath ?? ''}
                    onChange={commit}
                    sx={{ width: 350 }}
                    slotProps={{
                        paper: {
                            sx: {
                                backgroundColor: theme.panelBackground,
                                color: theme.panelText,
                                border: `1px solid ${theme.panelBorder}`,
                                boxShadow: theme.buttonShadow,
                            },
                        },
                        listbox: {
                            sx: {
                                backgroundColor: theme.panelBackground,
                                color: theme.panelText,
                            },
                        },
                        popper: {
                            sx: {
                                '& .MuiAutocomplete-option': {
                                    backgroundColor: theme.panelBackground,
                                    color: theme.panelText,
                                },
                                '& .MuiAutocomplete-option.Mui-focused': {
                                    backgroundColor: theme.rowBackgroundColor,
                                },
                                '& .MuiAutocomplete-option[aria-selected="true"]': {
                                    backgroundColor: theme.evenRowBackgroundColor,
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
                                    color: theme.panelText,
                                    backgroundColor: theme.panelBackground,
                                    '& fieldset': {
                                        borderColor: theme.panelBorder,
                                    },
                                    '&:hover fieldset': {
                                        borderColor: theme.buttonBorder,
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: theme.buttonBorder,
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: theme.subText,
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: theme.panelText,
                                },
                                '& .MuiFormHelperText-root': {
                                    color: theme.subText,
                                },
                                '& .MuiSvgIcon-root': {
                                    color: theme.panelText,
                                },
                                '& .MuiAutocomplete-popupIndicator': {
                                    color: theme.panelText,
                                },
                                '& .MuiAutocomplete-clearIndicator': {
                                    color: theme.panelText,
                                },
                            }}
                        />
                    )}
                    onFocus={() => {
                        if (inputRef.current) {
                            inputRef.current.scrollLeft =
                                inputRef.current.scrollWidth - inputRef.current.offsetWidth + 100
                        }
                    }}
                />

                <OverlayTrigger
                    placement="bottom"
                    overlay={<Tooltip id="download-file-path-save-tooltip">Save this download file path.</Tooltip>}
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
                            border: `1px solid ${theme.buttonBorder}`,
                            background: theme.buttonBackground,
                            color: theme.buttonText,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: theme.buttonShadow,
                            flexShrink: 0,
                            opacity: isLoading ? 0.7 : 1,
                        }}
                    >
                        <BsPencilFill />
                    </button>
                </OverlayTrigger>
            </div>
        </>
    )
}

export default DownloadFilePathOptionPanel