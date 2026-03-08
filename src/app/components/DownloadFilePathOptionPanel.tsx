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
