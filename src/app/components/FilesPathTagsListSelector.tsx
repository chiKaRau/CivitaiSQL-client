import React, { useEffect, useRef, useState } from 'react';
import { fetchGetTagsList, fetchDeleteDownloadPathCountRecord } from '../api/civitaiSQL_api';
import { useDispatch } from 'react-redux';
import { getRecentDownloadFilePaths } from '../utils/chromeUtils';
import { AppTheme } from './window_offline/OfflineWindow.theme';
import { findBestPrefixMatch, PrefixItem, PrefixTone } from '../utils/ColorUtils';

interface FilesPathTagsListSelectorProps {
    selectedPrefix: string;
    isHandleRefresh: boolean;
    setIsHandleRefresh: (isHandleRefresh: boolean) => void;
    theme: AppTheme;
    prefixsList: PrefixItem[];
    prefixToneMap: Record<string, PrefixTone>;
    onSelectFullPath: (fullPath: string) => void;
}

type TagsTabKey = 'count' | 'recentAdded' | 'recentUpdated';

type TagsCacheEntry = {
    top: any[];
    recent: any[];
    updated: any[];

    prefixNameTop: any[];
    prefixNameRecent: any[];
    prefixNameUpdated: any[];
};

const FilesPathTagsListSelector: React.FC<FilesPathTagsListSelectorProps> = ({
    isHandleRefresh,
    selectedPrefix,
    setIsHandleRefresh,
    theme,
    prefixsList,
    prefixToneMap,
    onSelectFullPath
}) => {
    const dispatch = useDispatch();

    const [topTags, setTopTags] = useState<any[]>([]);
    const [recentAddedTags, setRecentAddedTags] = useState<any[]>([]);
    const [recentUpdatedTags, setRecentUpdatedTags] = useState<any[]>([]);

    const [prefixNameTopTags, setPrefixNameTopTags] = useState<any[]>([]);
    const [prefixNameRecentAddedTags, setPrefixNameRecentAddedTags] = useState<any[]>([]);
    const [prefixNameRecentUpdatedTags, setPrefixNameRecentUpdatedTags] = useState<any[]>([]);

    const [recentLocalTags, setRecentLocalTags] = useState<{ path: string; createdAt: number }[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const [activePathTagsTab, setActivePathTagsTab] = useState<TagsTabKey>('count');
    const [activePrefixNameTagsTab, setActivePrefixNameTagsTab] = useState<TagsTabKey>('count');

    const [loading, setLoading] = useState(false);
    const [deletingPath, setDeletingPath] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cacheRef = useRef<Record<string, TagsCacheEntry>>({});

    const getPrefixNameFromPath = (prefix: string) => {
        if (!prefix?.trim()) return '';

        let p = prefix.trim().replace(/\\/g, '/');

        while (p.endsWith('/') && p.length > 1) {
            p = p.slice(0, -1);
        }

        const lastSlash = p.lastIndexOf('/');
        return lastSlash >= 0 ? p.slice(lastSlash + 1) : p;
    };

    const applyResultToState = (result: any) => {
        const nextTop = result?.topTags || [];
        const nextRecentAdded = result?.recentAddedTags || [];
        const nextRecentUpdated = result?.recentUpdatedTags || [];

        const nextPrefixNameTop = result?.prefixNameTopTags || [];
        const nextPrefixNameRecentAdded = result?.prefixNameRecentAddedTags || [];
        const nextPrefixNameRecentUpdated = result?.prefixNameRecentUpdatedTags || [];

        cacheRef.current[selectedPrefix] = {
            top: nextTop,
            recent: nextRecentAdded,
            updated: nextRecentUpdated,

            prefixNameTop: nextPrefixNameTop,
            prefixNameRecent: nextPrefixNameRecentAdded,
            prefixNameUpdated: nextPrefixNameRecentUpdated,
        };

        setTopTags(nextTop);
        setRecentAddedTags(nextRecentAdded);
        setRecentUpdatedTags(nextRecentUpdated);

        setPrefixNameTopTags(nextPrefixNameTop);
        setPrefixNameRecentAddedTags(nextPrefixNameRecentAdded);
        setPrefixNameRecentUpdatedTags(nextPrefixNameRecentUpdated);
    };

    const clearAllDbTags = () => {
        setTopTags([]);
        setRecentAddedTags([]);
        setRecentUpdatedTags([]);

        setPrefixNameTopTags([]);
        setPrefixNameRecentAddedTags([]);
        setPrefixNameRecentUpdatedTags([]);
    };

    const fetchAndSet = async () => {
        const result = await fetchGetTagsList(dispatch, selectedPrefix);
        applyResultToState(result);
    };

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setError(null);

            try {
                const localList = await getRecentDownloadFilePaths();
                if (!cancelled) {
                    setRecentLocalTags(localList);
                }
            } catch (e) {
                if (!cancelled) {
                    console.error('Failed to load recent local download paths.', e);
                }
            }

            if (!selectedPrefix) {
                clearAllDbTags();

                if (!cancelled && isHandleRefresh) {
                    setIsHandleRefresh(false);
                }

                return;
            }

            const cached = cacheRef.current[selectedPrefix];

            if (cached && !isHandleRefresh) {
                if (!cancelled) {
                    setTopTags(cached.top);
                    setRecentAddedTags(cached.recent);
                    setRecentUpdatedTags(cached.updated);

                    setPrefixNameTopTags(cached.prefixNameTop);
                    setPrefixNameRecentAddedTags(cached.prefixNameRecent);
                    setPrefixNameRecentUpdatedTags(cached.prefixNameUpdated);
                }

                if (!cancelled && isHandleRefresh) {
                    setIsHandleRefresh(false);
                }

                return;
            }

            try {
                setLoading(true);
                const result = await fetchGetTagsList(dispatch, selectedPrefix);
                if (cancelled) return;
                applyResultToState(result);
            } catch (e) {
                if (!cancelled) setError('Failed to load tags.');
            } finally {
                if (!cancelled) setLoading(false);
                if (!cancelled && isHandleRefresh) setIsHandleRefresh(false);
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [dispatch, selectedPrefix, isHandleRefresh, setIsHandleRefresh]);

    const renderColoredPath = (fullPath: string) => {
        const matchedPrefix = findBestPrefixMatch(fullPath, prefixsList);

        if (!matchedPrefix) {
            return <span style={{ wordBreak: 'break-word' }}>{fullPath}</span>;
        }

        const prefix = matchedPrefix.downloadFilePath;
        const suffix = fullPath.slice(prefix.length);
        const tone = prefixToneMap[prefix];

        return (
            <span style={{ wordBreak: 'break-word' }}>
                <span
                    style={{
                        color: tone?.text ?? theme.panelText,
                        fontWeight: 700,
                    }}
                >
                    {prefix}
                </span>
                <span style={{ color: theme.panelText }}>
                    {suffix}
                </span>
            </span>
        );
    };

    const handleTagClick = (tag: string) => {
        setSelectedTag(tag);
        onSelectFullPath(tag);
    };

    const handleDelete = async (downloadFilePath: string) => {
        if (!downloadFilePath?.trim()) return;

        const ok = window.confirm(`Delete this record?\n\n${downloadFilePath}`);
        if (!ok) return;

        setError(null);
        setDeletingPath(downloadFilePath);

        try {
            const res = await fetchDeleteDownloadPathCountRecord(dispatch, downloadFilePath);
            if (!res?.deleted) {
                setError(res?.message || 'Delete failed.');
                return;
            }

            delete cacheRef.current[selectedPrefix];
            setSelectedTag(prev => (prev === downloadFilePath ? null : prev));

            setRecentLocalTags(prev => prev.filter(item => item.path !== downloadFilePath));

            setLoading(true);
            await fetchAndSet();
        } catch (e: any) {
            setError(e?.message || 'Delete failed.');
        } finally {
            setDeletingPath(null);
            setLoading(false);
        }
    };

    const listBoxStyle: React.CSSProperties = {
        minHeight: '220px',
        maxHeight: '220px',
        overflowY: 'auto',
        border: `1px solid ${theme.panelBorder}`,
        padding: '3px',
        marginBottom: '10px',
        borderRadius: '12px',
        background: theme.rowBackgroundColor,
        color: theme.panelText,
    };

    const recentListBoxStyle: React.CSSProperties = {
        minHeight: '260px',
        maxHeight: '260px',
        overflowY: 'auto',
        border: `1px solid ${theme.panelBorder}`,
        padding: '3px',
        marginBottom: '10px',
        borderRadius: '12px',
        background: theme.rowBackgroundColor,
        color: theme.panelText,
    };

    const renderList = (
        title: string,
        tags: any[],
        numberLabel: (index: number) => string,
        headerExtra?: React.ReactNode
    ) => {
        return (
            <>
                <h6 style={{ color: theme.panelText }}>{title}</h6>

                {headerExtra}

                <div style={listBoxStyle}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {tags.length === 0 ? (
                            <li
                                style={{
                                    padding: '8px 6px',
                                    color: theme.subText,
                                    fontStyle: 'italic',
                                }}
                            >
                                No tags found.
                            </li>
                        ) : (
                            tags.map((tag, index) => {
                                const value = tag?.string_value ?? '';
                                const isSelected = selectedTag === value;
                                const isDeletingThis = deletingPath === value;

                                return (
                                    <li
                                        key={`${value}-${index}`}
                                        onClick={() => handleTagClick(value)}
                                        style={{
                                            margin: '5px 0',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? theme.evenRowBackgroundColor : theme.panelBackground,
                                            color: theme.panelText,
                                            fontWeight: isSelected ? 'bold' : 'normal',
                                            padding: '4px 6px',
                                            borderRadius: 6,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            border: isSelected
                                                ? `1px solid ${theme.buttonBorder}`
                                                : `1px solid ${theme.panelBorder}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 8,
                                                alignItems: 'baseline',
                                                minWidth: 0,
                                                flex: 1,
                                            }}
                                        >
                                            <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>
                                                {numberLabel(index)}#
                                            </span>
                                            {renderColoredPath(value)}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(value);
                                            }}
                                            disabled={!!deletingPath || isDeletingThis}
                                            title="Delete"
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                border: `1px solid ${theme.buttonBorder}`,
                                                background: theme.buttonBackground,
                                                color: theme.buttonText,
                                                cursor: !!deletingPath ? 'not-allowed' : 'pointer',
                                                opacity: isDeletingThis ? 0.7 : 1,
                                                boxShadow: theme.buttonShadow,
                                            }}
                                        >
                                            {isDeletingThis ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            </>
        );
    };

    const renderTabbedList = (
        activeTabKey: TagsTabKey,
        setActiveTabKey: (key: TagsTabKey) => void,
        tabs: {
            key: TagsTabKey;
            label: string;
            title: string;
            tags: any[];
        }[]
    ) => {
        const activeTab = tabs.find(tab => tab.key === activeTabKey) ?? tabs[0];

        const tabButtons = (
            <div
                role="tablist"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginBottom: 8,
                }}
            >
                {tabs.map(tab => {
                    const active = tab.key === activeTabKey;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveTabKey(tab.key)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: 999,
                                border: active
                                    ? `1px solid ${theme.buttonBorder}`
                                    : `1px solid ${theme.panelBorder}`,
                                background: active ? theme.buttonBackground : theme.panelBackground,
                                color: active ? theme.buttonText : theme.panelText,
                                cursor: 'pointer',
                                fontWeight: active ? 700 : 500,
                                boxShadow: active ? theme.buttonShadow : 'none',
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        );

        return renderList(activeTab.title, activeTab.tags, (i) => String(i + 1), tabButtons);
    };

    const renderDownloadPathTabbedList = () => {
        return renderTabbedList(
            activePathTagsTab,
            setActivePathTagsTab,
            [
                {
                    key: 'count',
                    label: 'Count',
                    title: 'Top 10 Tags by Full Prefix',
                    tags: topTags,
                },
                {
                    key: 'recentAdded',
                    label: 'Recent Added',
                    title: 'Top 10 Recent Added by Full Prefix',
                    tags: recentAddedTags,
                },
                {
                    key: 'recentUpdated',
                    label: 'Recent Updated',
                    title: 'Top 10 Recent Updated by Full Prefix',
                    tags: recentUpdatedTags,
                },
            ]
        );
    };

    const renderPrefixNameTabbedList = () => {
        const prefixName = getPrefixNameFromPath(selectedPrefix);

        return renderTabbedList(
            activePrefixNameTagsTab,
            setActivePrefixNameTagsTab,
            [
                {
                    key: 'count',
                    label: 'Count',
                    title: `Top 10 Tags by Prefix Name${prefixName ? ` (${prefixName})` : ''}`,
                    tags: prefixNameTopTags,
                },
                {
                    key: 'recentAdded',
                    label: 'Recent Added',
                    title: `Top 10 Recent Added by Prefix Name${prefixName ? ` (${prefixName})` : ''}`,
                    tags: prefixNameRecentAddedTags,
                },
                {
                    key: 'recentUpdated',
                    label: 'Recent Updated',
                    title: `Top 10 Recent Updated by Prefix Name${prefixName ? ` (${prefixName})` : ''}`,
                    tags: prefixNameRecentUpdatedTags,
                },
            ]
        );
    };

    const renderRecentLocalList = () => {
        return (
            <>
                <h6 style={{ color: theme.panelText }}>Recently Added 25 Tags (Local)</h6>
                <div style={recentListBoxStyle}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {recentLocalTags.length === 0 ? (
                            <li
                                style={{
                                    padding: '8px 6px',
                                    color: theme.subText,
                                    fontStyle: 'italic',
                                }}
                            >
                                No local recent tags found.
                            </li>
                        ) : (
                            recentLocalTags.map((item, index) => {
                                const value = item?.path ?? '';
                                const isSelected = selectedTag === value;
                                const isDeletingThis = deletingPath === value;

                                return (
                                    <li
                                        key={`${value}-${index}`}
                                        onClick={() => handleTagClick(value)}
                                        style={{
                                            margin: '5px 0',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? theme.evenRowBackgroundColor : theme.panelBackground,
                                            color: theme.panelText,
                                            fontWeight: isSelected ? 'bold' : 'normal',
                                            padding: '4px 6px',
                                            borderRadius: 6,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            border: isSelected
                                                ? `1px solid ${theme.buttonBorder}`
                                                : `1px solid ${theme.panelBorder}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 8,
                                                alignItems: 'baseline',
                                                minWidth: 0,
                                                flex: 1
                                            }}
                                        >
                                            <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>
                                                {index + 1}#
                                            </span>
                                            {renderColoredPath(value)}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(value);
                                            }}
                                            disabled={!!deletingPath || isDeletingThis}
                                            title="Delete"
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                border: `1px solid ${theme.buttonBorder}`,
                                                background: theme.buttonBackground,
                                                color: theme.buttonText,
                                                cursor: !!deletingPath ? 'not-allowed' : 'pointer',
                                                opacity: isDeletingThis ? 0.7 : 1,
                                                boxShadow: theme.buttonShadow,
                                            }}
                                        >
                                            {isDeletingThis ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            </>
        );
    };

    return (
        <div>
            {loading && <div style={{ opacity: 0.7, color: theme.subText }}>Loading…</div>}
            {error && <div style={{ color: theme.panelText }}>{error}</div>}

            {renderDownloadPathTabbedList()}
            {renderRecentLocalList()}
            {renderPrefixNameTabbedList()}
        </div>
    );
};

export default FilesPathTagsListSelector;