import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';

import { AppState } from '../store/configureStore';
import {
    updateDownloadFilePath,
    updateDownloadPriority,
    updateSelectedFilteredCategoriesList
} from '../store/actions/chromeActions';
import { updateSelectedFilteredCategoriesListIntoChromeStorage } from '../utils/chromeUtils';
import FilesPathTagsListSelector from './FilesPathTagsListSelector';
import { fetchGetCategoryPrefixesList } from '../api/civitaiSQL_api';
import { QuickModeControls } from './QuickModeControls';
import { darkTheme, lightTheme } from './window_offline/OfflineWindow.theme';
import { buildPrefixToneMap, findBestPrefixMatch } from '../utils/ColorUtils';

interface FilesPathSettingPanelProps {
    isHandleRefresh: boolean;
    setIsHandleRefresh: (b: boolean) => void;
}

const DEFAULT_OFF = new Set(['real', 'creature']);

const FilesPathSettingPanel: React.FC<FilesPathSettingPanelProps> = ({
    isHandleRefresh,
    setIsHandleRefresh
}) => {
    const dispatch = useDispatch();
    const chrome = useSelector((s: AppState) => s.chrome);
    const { isDarkMode } = chrome;
    const theme = isDarkMode ? darkTheme : lightTheme;

    const [open, setOpen] = useState(false);
    const [prefixsList, setPrefixsList] = useState<{
        id: number;
        prefixName: string;
        downloadFilePath: string;
        downloadPriority: number;
        createdAt?: string;
        updatedAt?: string;
    }[]>([]);
    const [filePathCategoriesList, setFilePathCategoriesList] = useState<
        {
            id: number;
            prefixName: string;
            downloadFilePath: string;
            downloadPriority: number;
            createdAt?: string;
            updatedAt?: string;
        }[]
    >([]);
    const [selectedFilteredCategoriesList, setSelectedFilteredCategoriesList] = useState<
        {
            category: {
                id: number;
                prefixName: string;
                downloadFilePath: string;
                downloadPriority: number;
                createdAt?: string;
                updatedAt?: string;
            };
            display: boolean;
        }[]
    >([]);
    const [selectedPrefix, setSelectedPrefix] = useState('');
    const [selectedSuffix, setSelectedSuffix] = useState('');

    const [quickMode, setQuickMode] = useState(false);
    const [lockedPrefix, setLockedPrefix] = useState('');
    const [suffixInput, setSuffixInput] = useState('');
    const [isLocked, setIsLocked] = useState(false);

    const currentPrefix = isLocked ? lockedPrefix : selectedPrefix;

    const handleApply = () => {
        dispatch(updateDownloadFilePath(`${currentPrefix}${suffixInput}`));
    };

    useEffect(() => {
        const init = async () => {
            if (chrome.selectedFilteredCategoriesList) {
                const saved = JSON.parse(chrome.selectedFilteredCategoriesList);
                setSelectedFilteredCategoriesList(saved);
            } else {
                const cats = await fetchGetCategoryPrefixesList(dispatch);
                if (cats) {
                    setFilePathCategoriesList(cats);

                    const initial = cats.map((category: {
                        id: number;
                        prefixName: string;
                        downloadFilePath: string;
                        downloadPriority: number;
                        createdAt?: string;
                        updatedAt?: string;
                    }) => ({
                        category,
                        display: !DEFAULT_OFF.has(String(category.prefixName).trim().toLowerCase())
                    }));

                    setSelectedFilteredCategoriesList(initial);
                    updateSelectedFilteredCategoriesListIntoChromeStorage(initial);
                    dispatch(updateSelectedFilteredCategoriesList(JSON.stringify(initial)));
                }
            }

            const prefixes = await fetchGetCategoryPrefixesList(dispatch);
            if (prefixes) {
                setPrefixsList(prefixes);
            }
        };

        init();
    }, [dispatch, chrome.selectedFilteredCategoriesList]);

    const persist = (next: typeof selectedFilteredCategoriesList) => {
        updateSelectedFilteredCategoriesListIntoChromeStorage(next);
        dispatch(updateSelectedFilteredCategoriesList(JSON.stringify(next)));
        setSelectedFilteredCategoriesList(next);
    };

    const handleToggleBaseModelCheckbox = (idx: number) => {
        const next = selectedFilteredCategoriesList.map((item, i) =>
            i === idx ? { ...item, display: !item.display } : item
        );
        persist(next);
    };

    const prefixToneMap = useMemo(() => {
        return buildPrefixToneMap(prefixsList, theme, isDarkMode);
    }, [prefixsList, theme, isDarkMode]);

    const handleSelectAllCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
        const allOn = e.target.checked;
        const next = selectedFilteredCategoriesList.map(item => ({ ...item, display: allOn }));
        persist(next);
    };

    const areAllSelected = selectedFilteredCategoriesList.every(item => item.display);

    useEffect(() => {
        dispatch(updateDownloadFilePath(`${selectedPrefix}${selectedSuffix}`));
    }, [dispatch, selectedPrefix, selectedSuffix]);

    const handleToggleLock = () => {
        if (!isLocked && selectedPrefix) {
            setLockedPrefix(selectedPrefix);
        } else if (isLocked) {
            setLockedPrefix('');
        }
        setIsLocked(l => !l);
    };

    const handleFullPathSelection = (fullPath: string) => {
        const matchedPrefix = findBestPrefixMatch(fullPath, prefixsList);

        if (matchedPrefix) {
            const prefix = matchedPrefix.downloadFilePath;
            const suffix = fullPath.slice(prefix.length);

            setSelectedPrefix(prefix);
            setSelectedSuffix(suffix);
            dispatch(updateDownloadPriority(matchedPrefix.downloadPriority ?? 0));
        } else {
            setSelectedPrefix('');
            setSelectedSuffix(fullPath);
        }

        dispatch(updateDownloadFilePath(fullPath));
    };

    const panelStyle: React.CSSProperties = {
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: '14px',
        overflow: 'hidden',
        background: theme.panelBackground,
        color: theme.panelText,
        boxShadow: theme.buttonShadow,
    };

    const headerStyle: React.CSSProperties = {
        width: '100%',
        background: theme.rowBackgroundColor,
        color: theme.panelText,
        padding: '12px 14px',
        cursor: 'pointer',
        fontWeight: 700,
        borderBottom: open ? `1px solid ${theme.panelBorder}` : 'none',
    };

    const sectionTitleStyle: React.CSSProperties = {
        color: theme.panelText,
        fontWeight: 700,
        marginTop: '6px',
    };

    const tagStyle = (isSelected: boolean): React.CSSProperties => ({
        display: 'inline-block',
        padding: '6px 10px',
        margin: '4px',
        borderRadius: '10px',
        cursor: 'pointer',
        border: isSelected
            ? `1px solid ${theme.buttonBorder}`
            : `1px solid ${theme.panelBorder}`,
        background: isSelected ? theme.rowBackgroundColor : theme.panelBackground,
        color: theme.panelText,
        boxShadow: theme.buttonShadow,
        fontWeight: 600,
    });

    const checkboxWrapStyle: React.CSSProperties = {
        display: 'inline-block',
        color: theme.panelText,
        background: theme.panelBackground,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: '12px',
        padding: '10px 12px',
    };

    return (
        <>
            <QuickModeControls
                quickMode={quickMode}
                onToggleQuick={() => {
                    setQuickMode(q => !q);
                    if (quickMode) {
                        setIsLocked(false);
                        setLockedPrefix('');
                        setSuffixInput('');
                    }
                }}
                currentPrefix={currentPrefix}
                isLocked={isLocked}
                onToggleLock={handleToggleLock}
                suffixInput={suffixInput}
                onSuffixChange={setSuffixInput}
                onApply={handleApply}
                theme={theme}
            />

            <div style={panelStyle}>
                <div
                    onClick={() => setOpen(o => !o)}
                    aria-controls="collapse-panel"
                    aria-expanded={open}
                    style={headerStyle}
                >
                    <center>Folder Settings</center>
                </div>

                <Collapse in={open}>
                    <div id="collapse-panel" style={{ padding: '12px 14px' }}>
                        <center style={sectionTitleStyle}>Prefix Suggestions</center>
                        <hr style={{ borderColor: theme.panelBorder, opacity: 1 }} />

                        {prefixsList.map((el) => {
                            const tone = prefixToneMap[el.downloadFilePath];
                            const isSelected = selectedPrefix === el.downloadFilePath;

                            return (
                                <OverlayTrigger
                                    key={el.id}
                                    placement="bottom"
                                    overlay={<Tooltip id={`prefix-tooltip-${el.id}`}>{el.downloadFilePath}</Tooltip>}
                                >
                                    <label
                                        style={{
                                            display: 'inline-block',
                                            padding: '6px 10px',
                                            margin: '4px',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            border: `1px solid ${isSelected ? tone?.border ?? theme.buttonBorder : theme.panelBorder}`,
                                            background: isSelected ? tone?.bg ?? theme.rowBackgroundColor : theme.panelBackground,
                                            color: tone?.text ?? theme.panelText,
                                            boxShadow: theme.buttonShadow,
                                            fontWeight: 600,
                                        }}
                                        onClick={() => {
                                            setSelectedPrefix(el.downloadFilePath);
                                            dispatch(updateDownloadPriority(el.downloadPriority ?? 0));
                                            dispatch(updateDownloadFilePath(`${el.downloadFilePath}${selectedSuffix}`));
                                        }}
                                    >
                                        {el.prefixName}
                                    </label>
                                </OverlayTrigger>
                            );
                        })}

                        <br />

                        <center style={sectionTitleStyle}>Suffix Suggestions</center>
                        <hr style={{ borderColor: theme.panelBorder, opacity: 1 }} />

                        <hr style={{ borderColor: theme.panelBorder, opacity: 1 }} />

                        <FilesPathTagsListSelector
                            setIsHandleRefresh={setIsHandleRefresh}
                            selectedPrefix={selectedPrefix}
                            isHandleRefresh={isHandleRefresh}
                            theme={theme}
                            prefixsList={prefixsList}
                            prefixToneMap={prefixToneMap}
                            onSelectFullPath={handleFullPathSelection}
                        />

                        <br />

                        <center style={sectionTitleStyle}>Selected Categories</center>
                        <hr style={{ borderColor: theme.panelBorder, opacity: 1 }} />

                        <div style={checkboxWrapStyle}>
                            <label style={{ marginRight: 10, color: theme.panelText }}>
                                <input
                                    type="checkbox"
                                    checked={areAllSelected}
                                    onChange={handleSelectAllCheckbox}
                                />{' '}
                                Select/Deselect All
                            </label>

                            {selectedFilteredCategoriesList.map((item, idx) => (
                                <label key={item.category.id ?? idx} style={{ marginRight: 10, color: theme.panelText }}>
                                    <input
                                        type="checkbox"
                                        checked={item.display}
                                        onChange={() => handleToggleBaseModelCheckbox(idx)}
                                    />{' '}
                                    {item.category.prefixName}
                                </label>
                            ))}
                        </div>
                    </div>
                </Collapse>
            </div>
        </>
    );
};

export default FilesPathSettingPanel;