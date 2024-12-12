import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WindowUpdateModelPanel from './WindowUpdateModelPanel';
import { fetchFindVersionNumbersForModel } from '../../api/civitaiSQL_api';
import { useDispatch } from 'react-redux';

interface Version {
    id: number;
    name: string;
    baseModel: string;
    images: { url: string }[];
}

interface Model {
    name: string;
    creator: { username: string };
    tags: string[];
    modelVersions: Version[];
}

interface PanelProps {
    url: string;
    setUrlList: (updater: (prevUrlList: string[]) => string[]) => void; // Callback to update the URL list
    onClose: () => void;
    urlList: string[]; // Pass the list of URLs to check for duplicates
}

const FullInfoModelPanel: React.FC<PanelProps> = ({ url, urlList, setUrlList, onClose }) => {
    const dispatch = useDispatch();

    const [modelData, setModelData] = useState<Model | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [existingVersions, setExistingVersions] = useState<any[]>([]);
    const [renderKey, setRenderKey] = useState(0); // State to manage re-renders
    const [hasUpdated, setHasUpdated] = useState(false);

    // Extract modelId from the URL
    const modelId = url.match(/\/models\/(\d+)/)?.[1] || '';

    const [isUpdatePanelVisible, setIsUpdatePanelVisible] = useState(false);

    // Fetch model info when the component is mounted or `renderKey` changes
    useEffect(() => {
        fetchModelInfo();
    }, [renderKey]); // Add renderKey as a dependency

    // Fetch model info when the component is mounted
    useEffect(() => {
        if (hasUpdated) {
            fetchModelInfo();
            setHasUpdated(false);
        }
    }, [hasUpdated]);

    // Fetch the model information
    const fetchModelInfo = async () => {
        setIsLoading(true);
        try {
            console.log("test-fetchModelInfo");
            const response = await axios.post(`https://civitai.com/api/v1/models/${modelId}`);
            const data = response.data;
            console.log(response);

            setModelData(data);
            const firstVersion = data.modelVersions[0];
            setSelectedVersion(firstVersion); // Select the first version by default

            const imagesArray = response?.data?.modelVersions?.map((version: any) => ({
                id: version.id,
                baseModel: version.baseModel || 'No Base Model',
                images: version.images.map((image: any) => image.url)
            }));

            // Get version IDs to check with the API
            const versionIds = imagesArray.map((version: any) => version.id);

            // Check for existing version numbers
            const existingVersionsSet = await fetchFindVersionNumbersForModel(modelId, versionIds, dispatch);
            console.log(existingVersionsSet);
            // Safely convert the Set to an array and set state
            setExistingVersions(Array.from(existingVersionsSet || []));

            if (!(new URL(url).searchParams.has('modelVersionId'))) {
                // Use "first one" URL format
                if (urlList.includes(url)) {
                    setMessage({ text: 'This URL is already in the list.', type: 'error' });
                } else {
                    setMessage(null);
                }
            }

        } catch (error) {
            console.error('Error fetching model info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Dropdown Change
    const handleVersionChange = (versionId: number) => {
        const version = modelData?.modelVersions.find(v => v.id === versionId) || null;
        setSelectedVersion(version);

        if (version) {

            const formattedUrl =
                (version.id === modelData?.modelVersions[0].id && !(new URL(url).searchParams.has('modelVersionId')))
                    ? url
                    : `https://civitai.com/models/${modelId}?modelVersionId=${version.id}`;

            console.log(formattedUrl)
            console.log(urlList)

            // Check if the selected version URL is in the list
            if (urlList.includes(formattedUrl)) {
                setMessage({ text: 'This URL is already in the list.', type: 'error' });
            } else {
                setMessage(null); // Clear the message if the version is not in the list
            }
        }
    };

    // Handle Add Button Click
    const handleAdd = () => {
        if (!selectedVersion || !modelData) return;

        const formattedUrl =
            (selectedVersion.id === modelData?.modelVersions[0].id && !(new URL(url).searchParams.has('modelVersionId')))
                ? url
                : `https://civitai.com/models/${modelId}?modelVersionId=${selectedVersion.id}`;

        setUrlList(prevUrlList => {
            if (prevUrlList.includes(formattedUrl)) {
                setMessage({ text: 'This URL is already in the list.', type: 'error' });
                return prevUrlList; // Return the original list if duplicate
            }

            setMessage({ text: 'URL added successfully!', type: 'success' });
            return [...prevUrlList, formattedUrl]; // Add the new URL if it's not a duplicate
        });

        console.log("check-url")
        chrome.storage.local.get('originalTabId', (result) => {
            if (result.originalTabId) {
                chrome.tabs.sendMessage(result.originalTabId, { action: "check-url", url: formattedUrl });
            }
        });

    };

    const forceRerender = () => {
        setRenderKey((prevKey) => prevKey + 1); // Increment renderKey to force a re-render
    };

    const toggleUpdateModelPanel = () => {
        setIsUpdatePanelVisible(!isUpdatePanelVisible);
    };

    return (
        <div className="panel-container">
            <div className="panel-container-content">
                <button className="panel-close-button" onClick={onClose}>
                    &#x2715;
                </button>

                <button onClick={forceRerender} style={{ marginBottom: '10px' }}>
                    Force Re-render
                </button>

                {isLoading ? (
                    <p>Loading...</p>
                ) : modelData ? (
                    <div>
                        <h3>{modelData.name}</h3>
                        <p>Created by: {modelData.creator.username}</p>

                        {/* Dropdown */}
                        <label htmlFor="versionDropdown">Select Version:</label>
                        <select
                            id="versionDropdown"
                            onChange={(e) =>
                                handleVersionChange(Number(e.target.value))
                            }
                            value={selectedVersion?.id || ''}
                        >
                            {modelData.modelVersions.map(version => (
                                <option key={version.id} value={version.id}>
                                    {version.name} (Base Model: {version.baseModel}) {existingVersions.includes(version.id.toString()) ? ' *' : ''}
                                </option>
                            ))}
                        </select>

                        {/* Carousel */}
                        {selectedVersion && (
                            <div style={{ marginTop: '16px' }}>
                                <h4>Images for {selectedVersion.name}</h4>
                                <Carousel images={selectedVersion.images.map(image => image.url)} />
                            </div>
                        )}

                        {/* Add Button */}
                        {selectedVersion && (
                            <>
                                <button onClick={handleAdd}>Add to Download List</button>
                                <button onClick={toggleUpdateModelPanel}>Update Existing Model to this Select Model</button>
                            </>
                        )}

                        {selectedVersion && existingVersions.includes(selectedVersion.id.toString())
                            && (
                                <div
                                    style={{
                                        marginTop: '20px',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        color: 'white',
                                        backgroundColor: 'lightblue',
                                        textAlign: 'center',
                                        animation: 'fade-in 0.5s',
                                    }}
                                >
                                    This version is already existed in the database.
                                </div>
                            )}

                        {selectedVersion && (isUpdatePanelVisible &&
                            <WindowUpdateModelPanel selectedVersion={selectedVersion} modelId={modelId}
                                modelURL={`https://civitai.com/models/${modelId}?modelVersionId=${selectedVersion.id}`}
                                modelData={modelData}
                                setHasUpdated={setHasUpdated}
                                onClose={toggleUpdateModelPanel} />)}

                        {/* Notification */}
                        {message && (
                            <div
                                style={{
                                    marginTop: '20px',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    color: message.type === 'success' ? 'green' : 'red',
                                    backgroundColor: message.type === 'success' ? '#e6ffe6' : '#ffe6e6',
                                    textAlign: 'center',
                                    animation: 'fade-in 0.5s',
                                }}
                            >
                                {message.text}
                            </div>
                        )}
                    </div>
                ) : (
                    <p>No data available.</p>
                )}
            </div>
        </div>
    );
};

interface CarouselProps {
    images: string[];
}

const Carousel: React.FC<CarouselProps> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrev = () => {
        setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
    };

    return (
        <div style={{ position: 'relative', width: '300px', height: '300px', margin: '0 auto' }}>
            {images.length > 0 ? (
                <img
                    src={images[currentIndex]}
                    alt={`Image ${currentIndex + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            ) : (
                <p>No images available</p>
            )}

            <button
                onClick={handlePrev}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                }}
            >
                &#9664;
            </button>
            <button
                onClick={handleNext}
                style={{
                    position: 'absolute',
                    top: '50%',
                    right: '0',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                }}
            >
                &#9654;
            </button>
        </div>
    );
};

export default FullInfoModelPanel;