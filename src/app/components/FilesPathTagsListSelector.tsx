import React, { useEffect, useRef, useState } from 'react';
import { fetchGetTagsList } from '../api/civitaiSQL_api';
import { useDispatch } from 'react-redux';
import { updateDownloadFilePath } from '../store/actions/chromeActions';

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

    // UI state
    const [topTags, setTopTags] = useState<any[]>([]);
    const [recentTags, setRecentTags] = useState<any[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Simple in-component cache: { [prefix]: { top: any[], recent: any[] } }
    const cacheRef = useRef<Record<string, { top: any[]; recent: any[] }>>({});

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setError(null);

            if (!selectedPrefix) {
                setTopTags([]);
                setRecentTags([]);
                if (isHandleRefresh) setIsHandleRefresh(false);
                return;
            }

            // Use cached tags if we have them and we're not forcing a refresh
            const cached = cacheRef.current[selectedPrefix];
            if (cached && !isHandleRefresh) {
                setTopTags(cached.top);
                setRecentTags(cached.recent);
                // make sure to clear the refresh flag if parent toggled it
                if (isHandleRefresh) setIsHandleRefresh(false);
                return;
            }

            // Fetch from backend
            try {
                setLoading(true);
                const result = await fetchGetTagsList(dispatch, selectedPrefix);
                if (cancelled) return;

                const nextTop = result?.topTags || [];
                const nextRecent = result?.recentTags || [];

                cacheRef.current[selectedPrefix] = { top: nextTop, recent: nextRecent };
                setTopTags(nextTop);
                setRecentTags(nextRecent);
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
        // keep your existing behavior:
        dispatch(updateDownloadFilePath(tag));
        // If you actually want prefix + tag, use this instead:
        // dispatch(updateDownloadFilePath(`${selectedPrefix}${tag}`));
    };

    return (
        <div>
            <h6>Top 10 Tags by Count</h6>
            {loading && <div style={{ opacity: 0.7 }}>Loading…</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px' }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {topTags.map((tag, index) => (
                        <li
                            key={index}
                            style={{
                                margin: '5px 0',
                                cursor: 'pointer',
                                backgroundColor: selectedTag === tag.string_value ? '#d3d3d3' : 'transparent',
                                fontWeight: selectedTag === tag.string_value ? 'bold' : 'normal'
                            }}
                            onClick={() => handleTagClick(tag.string_value)}
                        >
                            {index + 1}# {tag.string_value}
                        </li>
                    ))}
                </ul>
            </div>

            <h6>Recently Added 10 Tags</h6>
            <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px', marginBottom: '10px' }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {recentTags.map((tag, index) => (
                        <li
                            key={index}
                            style={{
                                margin: '5px 0',
                                cursor: 'pointer',
                                backgroundColor: selectedTag === tag.string_value ? '#d3d3d3' : 'transparent',
                                fontWeight: selectedTag === tag.string_value ? 'bold' : 'normal'
                            }}
                            onClick={() => handleTagClick(tag.string_value)}
                        >
                            {10 - index}# {tag.string_value}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FilesPathTagsListSelector;
