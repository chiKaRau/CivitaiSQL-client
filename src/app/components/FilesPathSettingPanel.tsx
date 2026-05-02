import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';

import { AppState } from '../store/configureStore';
import {
    updateDownloadFilePath,
    updateDownloadPriority,
    updateSelectedFilteredCategoriesList
} from '../store/actions/chromeActions';
import FilesPathTagsListSelector from './FilesPathTagsListSelector';
import {
    fetchGetCategoryPrefixesList,
    fetchUpdateCategoryPrefixActive
} from '../api/civitaiSQL_api';
import { QuickModeControls } from './QuickModeControls';
import { AppTheme, darkTheme, lightTheme } from './window_offline/OfflineWindow.theme';
import { buildPrefixToneMap, findBestPrefixMatch } from '../utils/ColorUtils';

interface FilesPathSettingPanelProps {
    isHandleRefresh?: boolean;
    setIsHandleRefresh?: (b: boolean) => void;

    downloadFilePath?: string;
    setDownloadFilePath?: (path: string) => void;

    theme?: AppTheme;
    isDarkMode?: boolean;

    defaultOpen?: boolean;
    showQuickModeControls?: boolean;
}

type PrefixItem = {
    id: number;
    prefixName: string;
    downloadFilePath: string;
    downloadPriority: number;
    active?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

const FilesPathSettingPanel: React.FC<FilesPathSettingPanelProps> = ({
    isHandleRefresh = false,
    setIsHandleRefresh = () => { },
    downloadFilePath,
    setDownloadFilePath,
    theme: themeProp,
    isDarkMode: isDarkModeProp,
    defaultOpen = false,
    showQuickModeControls = true
}) => {
    const dispatch = useDispatch();
    const chrome = useSelector((s: AppState) => s.chrome);

    const effectiveIsDarkMode = isDarkModeProp ?? chrome.isDarkMode;
    const theme = themeProp ?? (effectiveIsDarkMode ? darkTheme : lightTheme);
    const effectiveDownloadFilePath = downloadFilePath ?? chrome.downloadFilePath ?? '';

    const [open, setOpen] = useState(defaultOpen);
    const [prefixsList, setPrefixsList] = useState<PrefixItem[]>([]);
    const [selectedPrefix, setSelectedPrefix] = useState('');
    const [selectedSuffix, setSelectedSuffix] = useState('');

    const [quickMode, setQuickMode] = useState(false);
    const [lockedPrefix, setLockedPrefix] = useState('');
    const [suffixInput, setSuffixInput] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [isUpdatingActive, setIsUpdatingActive] = useState(false);

    const currentPrefix = isLocked ? lockedPrefix : selectedPrefix;

    const buildSelectedFilteredCategoriesPayload = (rows: PrefixItem[]) => {
        return rows.map((category) => ({
            category,
            display: category.active !== false
        }));
    };

    const syncSelectedCategoriesToRedux = (rows: PrefixItem[]) => {
        dispatch(
            updateSelectedFilteredCategoriesList(
                JSON.stringify(buildSelectedFilteredCategoriesPayload(rows))
            )
        );
    };

    const loadPrefixes = async () => {
        const prefixes = await fetchGetCategoryPrefixesList(dispatch);

        if (prefixes) {
            const normalized: PrefixItem[] = prefixes.map((item: PrefixItem) => ({
                ...item,
                active: item.active !== false
            }));

            setPrefixsList(normalized);
            syncSelectedCategoriesToRedux(normalized);
        }
    };

    const applyDownloadFilePath = (nextPath: string) => {
        setDownloadFilePath?.(nextPath);
        dispatch(updateDownloadFilePath(nextPath));
    };

    const handleApply = () => {
        applyDownloadFilePath(`${currentPrefix}${suffixInput}`);
    };

    useEffect(() => {
        void loadPrefixes();
    }, []);

    const splitFullPath = (fullPath: string) => {
        const matchedPrefix = findBestPrefixMatch(fullPath, prefixsList);

        if (!matchedPrefix) {
            return {
                matchedPrefix: null,
                prefix: '',
                suffix: fullPath || '',
            };
        }

        const prefix = matchedPrefix.downloadFilePath;
        const suffix = fullPath.slice(prefix.length);

        return {
            matchedPrefix,
            prefix,
            suffix,
        };
    };

    useEffect(() => {
        if (!prefixsList.length) return;

        const { prefix, suffix } = splitFullPath(effectiveDownloadFilePath || '');
        setSelectedPrefix(prefix);
        setSelectedSuffix(suffix);
    }, [effectiveDownloadFilePath, prefixsList]);

    const handlePrefixClick = (el: PrefixItem) => {
        setSelectedPrefix(el.downloadFilePath);
        setSelectedSuffix('');
        dispatch(updateDownloadPriority(el.downloadPriority ?? 0));
        applyDownloadFilePath(el.downloadFilePath);
    };

    const handleFullPathSelection = (fullPath: string) => {
        const { matchedPrefix, prefix, suffix } = splitFullPath(fullPath);

        setSelectedPrefix(prefix);
        setSelectedSuffix(suffix);

        if (matchedPrefix) {
            dispatch(updateDownloadPriority(matchedPrefix.downloadPriority ?? 0));
        }

        applyDownloadFilePath(fullPath);
    };

    const handleToggleBaseModelCheckbox = async (prefixName: string) => {
        if (isUpdatingActive) return;

        const current = prefixsList.find(item => item.prefixName === prefixName);
        if (!current) return;

        const nextActive = !(current.active !== false);
        const previousRows = prefixsList;

        const optimisticRows = prefixsList.map(item =>
            item.prefixName === prefixName
                ? { ...item, active: nextActive }
                : item
        );

        setPrefixsList(optimisticRows);
        syncSelectedCategoriesToRedux(optimisticRows);
        setIsUpdatingActive(true);

        try {
            const result = await fetchUpdateCategoryPrefixActive(dispatch, prefixName, nextActive);

            if (!result) {
                setPrefixsList(previousRows);
                syncSelectedCategoriesToRedux(previousRows);
                return;
            }

            await loadPrefixes();
        } finally {
            setIsUpdatingActive(false);
        }
    };

    const handleSelectAllCheckbox = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isUpdatingActive) return;

        const allOn = e.target.checked;
        const previousRows = prefixsList;
        const optimisticRows = prefixsList.map(item => ({ ...item, active: allOn }));

        setPrefixsList(optimisticRows);
        syncSelectedCategoriesToRedux(optimisticRows);
        setIsUpdatingActive(true);

        try {
            const results = await Promise.all(
                optimisticRows.map(item =>
                    fetchUpdateCategoryPrefixActive(dispatch, item.prefixName, allOn)
                )
            );

            const hasFailure = results.some(result => !result);

            if (hasFailure) {
                setPrefixsList(previousRows);
                syncSelectedCategoriesToRedux(previousRows);
                return;
            }

            await loadPrefixes();
        } finally {
            setIsUpdatingActive(false);
        }
    };

    const areAllSelected =
        prefixsList.length > 0 && prefixsList.every(item => item.active !== false);

    const handleToggleLock = () => {
        if (!isLocked && selectedPrefix) {
            setLockedPrefix(selectedPrefix);
        } else if (isLocked) {
            setLockedPrefix('');
        }
        setIsLocked(l => !l);
    };

    const prefixToneMap = useMemo(() => {
        return buildPrefixToneMap(prefixsList, theme, effectiveIsDarkMode);
    }, [prefixsList, theme, effectiveIsDarkMode]);

    const isDefaultPrefix = (item: PrefixItem) => {
        const name = item.prefixName?.trim().toLowerCase() ?? '';
        const path = item.downloadFilePath?.trim().replace(/\\/g, '/').toLowerCase() ?? '';

        return name === 'default' || path.endsWith('/default/');
    };

    const orderedPrefixsList = useMemo(() => {
        return prefixsList
            .map((item, index) => ({ item, index }))
            .sort((a, b) => {
                const aIsDefault = isDefaultPrefix(a.item);
                const bIsDefault = isDefaultPrefix(b.item);

                if (aIsDefault !== bIsDefault) {
                    return aIsDefault ? 1 : -1;
                }

                return a.index - b.index;
            })
            .map(({ item }) => item);
    }, [prefixsList]);

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
            {showQuickModeControls && (
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
            )}

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

                        {orderedPrefixsList.map((el) => {
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
                                            opacity: el.active === false ? 0.55 : 1,
                                        }}
                                        onClick={() => handlePrefixClick(el)}
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
                                    disabled={isUpdatingActive}
                                />{' '}
                                Select/Deselect All
                            </label>

                            {orderedPrefixsList.map((item) => (
                                <label key={item.id} style={{ marginRight: 10, color: theme.panelText }}>
                                    <input
                                        type="checkbox"
                                        checked={item.active !== false}
                                        onChange={() => handleToggleBaseModelCheckbox(item.prefixName)}
                                        disabled={isUpdatingActive}
                                    />{' '}
                                    {item.prefixName}
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