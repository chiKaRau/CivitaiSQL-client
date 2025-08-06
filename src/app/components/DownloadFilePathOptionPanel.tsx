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
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { BsPencilFill } from 'react-icons/bs'

interface DownloadFilePathOptionPanelProps {
    isHandleRefresh: boolean
    setIsHandleRefresh: (val: boolean) => void
}

const DownloadFilePathOptionPanel: React.FC<DownloadFilePathOptionPanelProps> = ({
    isHandleRefresh,
    setIsHandleRefresh
}) => {
    const dispatch = useDispatch()
    const {
        downloadFilePath,
        selectedFilteredCategoriesList,
        selectedCategory
    } = useSelector((s: AppState) => s.chrome)

    // 1) Local typing state
    const [inputValue, setInputValue] = useState<string>(downloadFilePath)

    // 2) Folders from server
    const [foldersList, setFoldersList] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Keep local input in sync if Redux changes externally
    useEffect(() => {
        setInputValue(downloadFilePath)
    }, [downloadFilePath])

    // Fetch function
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

    // Initial fetch on mount
    useEffect(() => {
        handleGetFoldersList()
        // eslint-disable-next-line
    }, [])

    // Refresh when parent tells us
    useEffect(() => {
        if (isHandleRefresh) {
            handleGetFoldersList()
        }
    }, [isHandleRefresh])

    // Parse categories JSON once
    const parsedCategories = useMemo(() => {
        try {
            return JSON.parse(selectedFilteredCategoriesList)
        } catch {
            return []
        }
    }, [selectedFilteredCategoriesList])

    // 3) Memoized sort & filter
    const sortedAndFiltered = useMemo(() => {
        return foldersList
            .filter((folder) => {
                const lower = folder.toLowerCase()
                // match at least one displayed category
                if (
                    !parsedCategories.some(
                        (item: any) =>
                            item.display &&
                            lower.includes(item.category.value.toLowerCase())
                    )
                ) {
                    return false
                }
                // exception flags
                const isChars = parsedCategories.some(
                    (i: any) => i.category.name === 'Characters' && i.display
                )
                const isReal = parsedCategories.some(
                    (i: any) => i.category.name === 'Real' && i.display
                )
                const isPoses = parsedCategories.some(
                    (i: any) => i.category.name === 'Poses' && i.display
                )
                const isMales = parsedCategories.some(
                    (i: any) => i.category.name === 'Males' && i.display
                )
                const isSFW = parsedCategories.some(
                    (i: any) => i.category.name === 'SFW' && i.display
                )
                const isNSFW = parsedCategories.some(
                    (i: any) => i.category.name === 'NSFW' && i.display
                )
                const isEX = parsedCategories.some(
                    (i: any) => i.category.name === 'EX' && i.display
                )

                // apply same exceptions
                if (isChars && !isMales && lower.includes('(males)')) return false
                if (isPoses && !isNSFW && lower.includes('/nsfw/')) return false
                if (isPoses && !isSFW && lower.includes('/sfw/')) return false
                if (isPoses && !isReal && lower.includes('/real/')) return false
                if (isSFW && !isNSFW && lower.includes('/nsfw/')) return false
                if (!isEX && lower.includes('/ex/')) return false

                return true
            })
            .sort((a, b) => {
                const A = a.charAt(0).toUpperCase()
                const B = b.charAt(0).toUpperCase()
                const dA = /\d/.test(A),
                    dB = /\d/.test(B)
                if (dA && !dB) return 1
                if (!dA && dB) return -1
                return a.localeCompare(b, 'en', {
                    numeric: true,
                    sensitivity: 'base'
                })
            })
    }, [foldersList, parsedCategories])

    // 4) Commit to Redux on selection or blur
    const commit = (_: any, val: string | null) => {
        const clean = val?.replace(/[<>:"\\|?*]/g, '') || ''
        dispatch(updateDownloadFilePath(clean))
    }
    const handleBlur = () => commit(null, inputValue)

    // Save to Chrome storage
    const handleSave = () => {
        updateDownloadFilePathIntoChromeStorage(downloadFilePath)
        updateSelectedCategoryIntoChromeStorage(selectedCategory)
    }

    return (
        <>
            <FilesPathSettingPanel
                isHandleRefresh={isHandleRefresh}
                setIsHandleRefresh={setIsHandleRefresh}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Autocomplete
                    freeSolo
                    options={sortedAndFiltered}
                    loading={isLoading}
                    inputValue={inputValue}
                    onInputChange={(_, v) => setInputValue(v)}
                    value={downloadFilePath}
                    onChange={commit}
                    sx={{ width: 350 }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            inputRef={inputRef}
                            label="Folder path"
                            helperText={`Can't contain <>:"\\|?*`}
                            onBlur={handleBlur}
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
                    overlay={<Tooltip id="tooltip">Save this download file path.</Tooltip>}
                >
                    <Button variant="light" disabled={isLoading} onClick={handleSave}>
                        <BsPencilFill />
                    </Button>
                </OverlayTrigger>
            </div>
        </>
    )
}

export default DownloadFilePathOptionPanel
