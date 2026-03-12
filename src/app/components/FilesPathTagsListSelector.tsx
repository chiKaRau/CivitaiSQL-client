import React, { useEffect, useRef, useState } from 'react';
import { fetchGetTagsList, fetchDeleteDownloadPathCountRecord } from '../api/civitaiSQL_api';
import { useDispatch } from 'react-redux';
import { updateDownloadFilePath } from '../store/actions/chromeActions';
import { getRecentDownloadFilePaths } from '../utils/chromeUtils';

interface FilesPathTagsListSelectorProps {
    selectedPrefix: string;
    isHandleRefresh: boolean;
    setIsHandleRefresh: (isHandleRefresh: boolean) => void;
}

const FilesPathTagsListSelector: React.FC<FilesPathTagsListSelectorProps> = ({
    isHandleRefresh,
    selectedPrefix,
    setIsHandleRefresh
}) => {
    const dispatch = useDispatch();

    const [topTags, setTopTags] = useState<any[]>([]);
    const [recentAddedTags, setRecentAddedTags] = useState<any[]>([]);
    const [recentUpdatedTags, setRecentUpdatedTags] = useState<any[]>([]);
    const [recentLocalTags, setRecentLocalTags] = useState<{ path: string; createdAt: number }[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [deletingPath, setDeletingPath] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // cache by prefix
    const cacheRef = useRef<Record<string, { top: any[]; recent: any[]; updated: any[] }>>({});

    const loadRecentLocalTags = async () => {
        const list = await getRecentDownloadFilePaths();
        setRecentLocalTags(list);
    };

    const applyResultToState = (result: any) => {
        const nextTop = result?.topTags || [];
        const nextRecentAdded = result?.recentAddedTags || [];
        const nextRecentUpdated = result?.recentUpdatedTags || [];

        cacheRef.current[selectedPrefix] = {
            top: nextTop,
            recent: nextRecentAdded,
            updated: nextRecentUpdated
        };

        setTopTags(nextTop);
        setRecentAddedTags(nextRecentAdded);
        setRecentUpdatedTags(nextRecentUpdated);
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
                setTopTags([]);
                setRecentAddedTags([]);
                setRecentUpdatedTags([]);
                if (isHandleRefresh) setIsHandleRefresh(false);
                return;
            }

            const cached = cacheRef.current[selectedPrefix];
            if (cached && !isHandleRefresh) {
                setTopTags(cached.top);
                setRecentAddedTags(cached.recent);
                setRecentUpdatedTags(cached.updated);
                if (isHandleRefresh) setIsHandleRefresh(false);
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

    const handleTagClick = (tag: string) => {
        setSelectedTag(tag);
        dispatch(updateDownloadFilePath(tag));
        // if needed:
        // dispatch(updateDownloadFilePath(`${selectedPrefix}${tag}`));
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

            // Clear cache for this prefix so we don't show stale results
            delete cacheRef.current[selectedPrefix];

            // If the deleted tag was selected, clear highlight
            setSelectedTag(prev => (prev === downloadFilePath ? null : prev));

            // Re-fetch lists to fill back to 10 items correctly
            setLoading(true);
            await fetchAndSet();
        } catch (e: any) {
            setError(e?.message || 'Delete failed.');
        } finally {
            setDeletingPath(null);
            setLoading(false);
        }
    };

    const renderList = (title: string, tags: any[], numberLabel: (index: number) => string) => {
        return (
            <>
                <h6>{title}</h6>
                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px', marginBottom: '10px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {tags.map((tag, index) => {
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
                                        backgroundColor: isSelected ? '#d3d3d3' : 'transparent',
                                        fontWeight: isSelected ? 'bold' : 'normal',
                                        padding: '4px 6px',
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 8
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0, flex: 1 }}>
                                        <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>{numberLabel(index)}#</span>
                                        <span style={{ wordBreak: 'break-word' }}>{value}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation(); // don't trigger handleTagClick
                                            handleDelete(value);
                                        }}
                                        disabled={!!deletingPath || isDeletingThis}
                                        title="Delete"
                                        style={{
                                            padding: '2px 8px',
                                            borderRadius: 6,
                                            border: '1px solid #bbb',
                                            cursor: !!deletingPath ? 'not-allowed' : 'pointer',
                                            opacity: isDeletingThis ? 0.7 : 1
                                        }}
                                    >
                                        {isDeletingThis ? 'Deleting…' : 'Delete'}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </>
        );
    };

    const renderRecentLocalList = () => {
        return (
            <>
                <h6>Recently Added 25 Tags (Local)</h6>
                <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px', marginBottom: '10px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {recentLocalTags.map((item, index) => {
                            const value = item?.path ?? '';
                            const isSelected = selectedTag === value;

                            return (
                                <li
                                    key={`${value}-${index}`}
                                    onClick={() => handleTagClick(value)}
                                    style={{
                                        margin: '5px 0',
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? '#d3d3d3' : 'transparent',
                                        fontWeight: isSelected ? 'bold' : 'normal',
                                        padding: '4px 6px',
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0, flex: 1 }}>
                                        <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>{index + 1}#</span>
                                        <span style={{ wordBreak: 'break-word' }}>{value}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </>
        );
    };

    return (
        <div>
            {loading && <div style={{ opacity: 0.7 }}>Loading…</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {renderList('Top 10 Tags by Count', topTags, (i) => String(i + 1))}
            {renderRecentLocalList()}
        </div>
    );
};

export default FilesPathTagsListSelector;