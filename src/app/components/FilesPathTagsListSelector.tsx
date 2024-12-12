import React, { useEffect, useState } from 'react';
import { fetchGetTagsList } from '../api/civitaiSQL_api'; // Assuming this is where your fetch function is located
import { useDispatch } from 'react-redux';
import { updateDownloadFilePath } from '../store/actions/chromeActions';

interface FilesPathTagsListSelectorProps {
    selectedPrefix: string;
    isHandleRefresh: boolean;
    setIsHandleRefresh: (isHandleRefresh: boolean) => void;
}

const FilesPathTagsListSelector: React.FC<FilesPathTagsListSelectorProps> = ({ isHandleRefresh, selectedPrefix, setIsHandleRefresh }) => {
    const [topTags, setTopTags] = useState<any[]>([]);
    const [recentTags, setRecentTags] = useState<any[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const dispatch = useDispatch();

    useEffect(() => {
        // Fetch tags list on component mount
        const loadTags = async () => {
            const result = await fetchGetTagsList(dispatch, selectedPrefix);
            if (result) {
                setTopTags(result.topTags || []);
                setRecentTags(result.recentTags || []);
            }
        };

        loadTags();
        setIsHandleRefresh(false)
    }, [dispatch, isHandleRefresh, selectedPrefix]);

    const handleTagClick = (tag: string) => {
        setSelectedTag(tag); // Set the clicked tag as selected
        dispatch(updateDownloadFilePath(tag))
    };

    return (
        <div>
            <h6>Top 10 Tags by Count</h6>
            <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px' }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {topTags.map((tag, index) => (
                        <li
                            key={index}
                            style={{
                                margin: '5px 0',
                                cursor: 'pointer',
                                backgroundColor: selectedTag === tag.string_value ? '#d3d3d3' : 'transparent', // Highlight if selected
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
            <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '3px', marginBottom: "10px" }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {recentTags.map((tag, index) => (
                        <li
                            key={index}
                            style={{
                                margin: '5px 0',
                                cursor: 'pointer',
                                backgroundColor: selectedTag === tag.string_value ? '#d3d3d3' : 'transparent', // Highlight if selected
                                fontWeight: selectedTag === tag.string_value ? 'bold' : 'normal'
                            }}
                            onClick={() => handleTagClick(tag.string_value)}
                        >
                            {10 - index}# {tag.string_value} {/* Numbering in reverse order */}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FilesPathTagsListSelector;
