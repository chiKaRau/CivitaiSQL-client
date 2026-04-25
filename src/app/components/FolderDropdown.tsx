// FolderDropdown.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Dropdown, FormControl, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import Fuse from 'fuse.js';

import { fetchGetFoldersList } from "../api/civitaiSQL_api";
import { updateDownloadFilePath, updateDownloadPriority } from '../store/actions/chromeActions';
import { AppState } from '../store/configureStore';
import { darkTheme, lightTheme } from './window_offline/OfflineWindow.theme';

interface FolderDropdownProps {
    filterText?: string;
    isDarkMode?: boolean;
}

type Category = {
    id?: number;
    prefixName?: string;
    downloadFilePath?: string;
    downloadPriority?: number;
    createdAt?: string;
    updatedAt?: string;
};

type SelectedFilteredCategoryItem = {
    category: Category;
    display: boolean;
};

const DEFAULT_FOLDER = '/@scan@/ACG/Pending/';

const normalizePath = (value?: string) => {
    return String(value || '')
        .replace(/\\/g, '/')
        .trim()
        .toLowerCase();
};

const normalizePrefix = (value?: string) => {
    const cleaned = normalizePath(value).replace(/\/+$/, '');
    return cleaned ? `${cleaned}/` : '';
};

const sortFolders = (a: string, b: string) => {
    const firstCharA = a.charAt(0).toUpperCase();
    const firstCharB = b.charAt(0).toUpperCase();

    const isDigitA = /\d/.test(firstCharA);
    const isDigitB = /\d/.test(firstCharB);

    if (isDigitA && !isDigitB) return 1;
    if (!isDigitA && isDigitB) return -1;

    return a.localeCompare(b, "en", {
        numeric: true,
        sensitivity: "base",
    });
};

const parseSelectedFilteredCategoriesList = (value: unknown): SelectedFilteredCategoryItem[] => {
    if (Array.isArray(value)) {
        return value as SelectedFilteredCategoryItem[];
    }

    if (typeof value !== 'string' || !value.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Failed to parse selectedFilteredCategoriesList:", error);
        return [];
    }
};

const buildCategoryPrefixFilters = (selected: SelectedFilteredCategoryItem[]) => {
    const allowPrefixes = selected
        .filter(item => {
            const path = normalizePrefix(item?.category?.downloadFilePath);
            return item.display === true && path.startsWith('/@scan@/');
        })
        .map(item => normalizePrefix(item.category.downloadFilePath));

    const denyPrefixes = selected
        .filter(item => {
            const path = normalizePrefix(item?.category?.downloadFilePath);
            return item.display === false && path.startsWith('/@scan@/');
        })
        .map(item => normalizePrefix(item.category.downloadFilePath));

    return {
        allowPrefixes,
        denyPrefixes,
    };
};

const isFolderAllowedByCategoryFilter = (
    folder: string,
    allowPrefixes: string[],
    denyPrefixes: string[]
) => {
    const normalizedFolder = normalizePrefix(folder);

    const isAllowed =
        allowPrefixes.length === 0
            ? true
            : allowPrefixes.some(prefix => normalizedFolder.startsWith(prefix));

    if (!isAllowed) {
        return false;
    }

    const isDenied = denyPrefixes.some(prefix => normalizedFolder.startsWith(prefix));

    if (isDenied) {
        return false;
    }

    return true;
};

const putDefaultFolderFirst = (
    folders: string[],
    allowPrefixes: string[],
    denyPrefixes: string[]
) => {
    const defaultAllowed = isFolderAllowedByCategoryFilter(
        DEFAULT_FOLDER,
        allowPrefixes,
        denyPrefixes
    );

    const normalizedDefault = normalizePrefix(DEFAULT_FOLDER);

    const withoutDefault = folders.filter(
        folder => normalizePrefix(folder) !== normalizedDefault
    );

    return defaultAllowed
        ? [DEFAULT_FOLDER, ...withoutDefault]
        : withoutDefault;
};

const FolderDropdown: React.FC<FolderDropdownProps> = ({
    filterText,
    isDarkMode,
}) => {
    const dispatch = useDispatch();

    const chromeData = useSelector((state: AppState) => state.chrome);

    const {
        selectedFilteredCategoriesList,
        isDarkMode: storeIsDarkMode,
    } = chromeData;

    const [foldersList, setFoldersList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [clipboardText, setClipboardText] = useState<string>('');
    const [filteredFolders, setFilteredFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string>('');

    const [threshold, setThreshold] = useState<number>(0.35);
    const [activeFilterSource, setActiveFilterSource] = useState<'prop' | 'clipboard'>('prop');

    const theme = (isDarkMode ?? storeIsDarkMode ?? true) ? darkTheme : lightTheme;

    const selectedCategories = useMemo(() => {
        return parseSelectedFilteredCategoriesList(selectedFilteredCategoriesList);
    }, [selectedFilteredCategoriesList]);

    const { allowPrefixes, denyPrefixes } = useMemo(() => {
        return buildCategoryPrefixFilters(selectedCategories);
    }, [selectedCategories]);

    const categoryFilteredFolders = useMemo(() => {
        return foldersList
            .filter(folder => isFolderAllowedByCategoryFilter(folder, allowPrefixes, denyPrefixes))
            .sort(sortFolders);
    }, [foldersList, allowPrefixes, denyPrefixes]);

    const effectiveFilterText =
        activeFilterSource === 'clipboard'
            ? clipboardText
            : (filterText?.trim().length ? filterText : clipboardText);

    useEffect(() => {
        handleGetFoldersList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleGetFoldersList = async () => {
        setIsLoading(true);

        try {
            const data = await fetchGetFoldersList(dispatch);

            if (Array.isArray(data)) {
                const cleaned = data.filter(folder =>
                    typeof folder === "string" &&
                    folder.trim().startsWith("/") &&
                    !folder.toLowerCase().includes("/update/")
                );

                setFoldersList(cleaned);
            }
        } catch (error) {
            console.error('Error fetching folders list:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUseClipboardAsFilter = async () => {
        try {
            if (!navigator.clipboard?.readText) {
                console.warn("Clipboard API is not available.");
                return;
            }

            const text = await navigator.clipboard.readText();

            setClipboardText(text);

            if (text.trim().length > 0) {
                setActiveFilterSource('clipboard');
            } else if (filterText?.trim().length) {
                setActiveFilterSource('prop');
            } else {
                setActiveFilterSource('clipboard');
            }
        } catch (error) {
            console.error('Error reading clipboard:', error);
        }
    };

    useEffect(() => {
        if (filterText?.trim().length) {
            setActiveFilterSource('prop');
        }
    }, [filterText]);

    useEffect(() => {
        const term = effectiveFilterText.trim();

        if (!term) {
            const nextList = putDefaultFolderFirst(
                categoryFilteredFolders,
                allowPrefixes,
                denyPrefixes
            );

            setFilteredFolders(nextList);
            return;
        }

        const fuse = new Fuse(categoryFilteredFolders, {
            threshold,
            ignoreLocation: true,
        });

        const results = fuse.search(term).map(result => result.item);

        const nextList = putDefaultFolderFirst(
            results,
            allowPrefixes,
            denyPrefixes
        );

        setFilteredFolders(nextList);
    }, [
        categoryFilteredFolders,
        effectiveFilterText,
        threshold,
        allowPrefixes,
        denyPrefixes,
    ]);

    useEffect(() => {
        setSelectedFolder(prev => {
            if (!prev) {
                return prev;
            }

            const selectedStillAllowed = categoryFilteredFolders.some(folder =>
                normalizePrefix(folder) === normalizePrefix(prev)
            );

            return selectedStillAllowed ? prev : '';
        });
    }, [categoryFilteredFolders]);

    const handleSelectFolder = (folder: string) => {
        setSelectedFolder(folder);
        dispatch(updateDownloadFilePath(folder));
        dispatch(updateDownloadPriority(5));
    };

    const dropdownToggleStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };

    const themedDropdownToggleStyle: React.CSSProperties = {
        ...dropdownToggleStyle,
        backgroundColor: theme.buttonBackground,
        color: theme.buttonText,
        border: `1px solid ${theme.buttonBorder}`,
        boxShadow: theme.buttonShadow,
    };

    const themedDropdownMenuStyle: React.CSSProperties = {
        width: '80%',
        maxHeight: '400px',
        overflowY: 'auto',
        whiteSpace: 'normal',
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        boxShadow: theme.buttonShadow,
    };

    const themedDropdownItemStyle: React.CSSProperties = {
        wordWrap: 'break-word',
        whiteSpace: 'normal',
        padding: '8px',
        cursor: 'pointer',
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
    };

    const themedInputStyle: React.CSSProperties = {
        width: '80px',
        flexShrink: 0,
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
    };

    const dropdownLabel = selectedFolder
        ? selectedFolder
        : filteredFolders.length > 0
            ? 'Select Folder'
            : 'No matching folders';

    const tooltipText = selectedFolder
        ? selectedFolder
        : clipboardText
            ? `Clipboard filter: ${clipboardText}`
            : filteredFolders.length > 0
                ? 'Click to filter by clipboard'
                : 'No matching folders';

    return (
        <div style={{ padding: '4px 0', width: '100%', minWidth: 0 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    minWidth: 0,
                    flexWrap: 'nowrap',
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Dropdown style={{ width: '100%' }}>
                        <OverlayTrigger
                            placement="top"
                            overlay={
                                <Tooltip
                                    id="dropdown-toggle-tooltip"
                                    style={{
                                        backgroundColor: theme.panelBackground,
                                        color: theme.panelText,
                                        border: `1px solid ${theme.panelBorder}`,
                                        boxShadow: theme.buttonShadow,
                                    }}
                                >
                                    {tooltipText}
                                </Tooltip>
                            }
                        >
                            <Dropdown.Toggle
                                style={themedDropdownToggleStyle}
                                onMouseDown={() => {
                                    void handleUseClipboardAsFilter();
                                }}
                            >
                                {dropdownLabel}
                            </Dropdown.Toggle>
                        </OverlayTrigger>

                        <Dropdown.Menu style={themedDropdownMenuStyle}>
                            {filteredFolders.map(folder => (
                                <Dropdown.Item
                                    key={folder}
                                    as="div"
                                    style={{
                                        ...themedDropdownItemStyle,
                                        backgroundColor:
                                            selectedFolder === folder
                                                ? theme.rowBackgroundColor
                                                : theme.panelBackground,
                                    }}
                                    onClick={() => handleSelectFolder(folder)}
                                >
                                    {folder}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                <FormControl
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={threshold}
                    onChange={event => {
                        const nextValue = Number(event.target.value);
                        setThreshold(Number.isNaN(nextValue) ? 0.35 : nextValue);
                    }}
                    style={themedInputStyle}
                    aria-label="Fuzzy threshold"
                    title="0 = exact match, 1 = very fuzzy"
                />
            </div>

            {isLoading && (
                <div style={{ marginTop: '10px', color: theme.panelText }}>
                    <Spinner animation="border" size="sm" /> Loading folders...
                </div>
            )}
        </div>
    );
};

export default FolderDropdown;