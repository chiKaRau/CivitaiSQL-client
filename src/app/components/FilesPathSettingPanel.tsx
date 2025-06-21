import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';

import { AppState } from '../store/configureStore';
import {
    updateDownloadFilePath,
    updateSelectedFilteredCategoriesList
} from '../store/actions/chromeActions';
import { updateSelectedFilteredCategoriesListIntoChromeStorage } from '../utils/chromeUtils';
import FilesPathTagsListSelector from './FilesPathTagsListSelector';
import {
    fetchGetCategoriesPrefixsList,
    fetchGetFilePathCategoriesList
} from '../api/civitaiSQL_api';

interface FilesPathSettingPanelProps {
    isHandleRefresh: boolean;
    setIsHandleRefresh: (b: boolean) => void;
}

const FilesPathSettingPanel: React.FC<FilesPathSettingPanelProps> = ({
    isHandleRefresh,
    setIsHandleRefresh
}) => {
    const dispatch = useDispatch();
    const chrome = useSelector((s: AppState) => s.chrome);

    const [open, setOpen] = useState(false);
    const [prefixsList, setPrefixsList] = useState<{ name: string; value: string }[]>([]);
    const [filePathCategoriesList, setFilePathCategoriesList] = useState<
        { name: string; value: string }[]
    >([]);
    const [selectedFilteredCategoriesList, setSelectedFilteredCategoriesList] = useState<
        { category: { name: string; value: string }; display: boolean }[]
    >([]);
    const [selectedPrefix, setSelectedPrefix] = useState('');
    const [selectedSuffix, setSelectedSuffix] = useState('');

    // 1) ONE INIT EFFECT that:
    //    • checks Chrome storage → uses that if present
    //    • otherwise fetches categories, seeds defaults, **and immediately persists them**
    //    • then fetches your prefix list
    useEffect(() => {
        const init = async () => {
            // A) load saved from Chrome?
            if (chrome.selectedFilteredCategoriesList) {
                const saved = JSON.parse(chrome.selectedFilteredCategoriesList);
                setSelectedFilteredCategoriesList(saved);
            } else {
                // B) else fetch the list from your API
                const cats = await fetchGetFilePathCategoriesList(dispatch);
                if (cats) {
                    setFilePathCategoriesList(cats);

                    // seed defaults
                    const initial = cats.map((category: any) => ({
                        category,
                        display: true as const
                    }));
                    setSelectedFilteredCategoriesList(initial);

                    // persist right away
                    updateSelectedFilteredCategoriesListIntoChromeStorage(initial);
                    dispatch(updateSelectedFilteredCategoriesList(JSON.stringify(initial)));
                }
            }

            // C) fetch your prefixes in parallel or sequence
            const prefixes = await fetchGetCategoriesPrefixsList(dispatch);
            if (prefixes) {
                setPrefixsList(prefixes);
            }
        };

        init();
    }, [dispatch, chrome.selectedFilteredCategoriesList]);

    // 2) any direct toggle now writes straight away
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

    const handleSelectAllCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
        const allOn = e.target.checked;
        const next = selectedFilteredCategoriesList.map(item => ({ ...item, display: allOn }));
        persist(next);
    };

    const areAllSelected = selectedFilteredCategoriesList.every(item => item.display);

    // 3) downloadFilePath update stays as is
    useEffect(() => {
        dispatch(updateDownloadFilePath(`${selectedPrefix}${selectedSuffix}`));
    }, [dispatch, selectedPrefix, selectedSuffix]);

    return (
        <div className="collapse-panel-container">
            <div
                className="toggle-section"
                onClick={() => setOpen(o => !o)}
                aria-controls="collapse-panel"
                aria-expanded={open}
            >
                <center> Folder Settings </center>
            </div>
            <hr />

            <Collapse in={open}>
                <div id="collapse-panel">
                    <center> Prefix Suggestions</center>
                    <hr />
                    {prefixsList.map((el, i) => (
                        <OverlayTrigger key={i} placement="bottom" overlay={<Tooltip>{el.value}</Tooltip>}>
                            <label
                                className={`panel-tag-button ${selectedPrefix === el.value ? 'panel-tag-default' : 'panel-tag-selected'
                                    }`}
                                onClick={() => setSelectedPrefix(el.value)}
                            >
                                {el.name}
                            </label>
                        </OverlayTrigger>
                    ))}
                    <br />

                    <center> Suffix Suggestions</center>
                    <hr />
                    {/* If your suffix list comes from props or state, render similarly */}
                    {/* ... you didn’t show suffix fetch but same idea ... */}

                    <hr />
                    <FilesPathTagsListSelector
                        setIsHandleRefresh={setIsHandleRefresh}
                        selectedPrefix={selectedPrefix}
                        isHandleRefresh={isHandleRefresh}
                    />
                    <br />

                    <center> Selected Categories</center>
                    <hr />
                    <div style={{ display: 'inline-block' }}>
                        <label style={{ marginRight: 10 }}>
                            <input type="checkbox" checked={areAllSelected} onChange={handleSelectAllCheckbox} />{' '}
                            Select/Deselect All
                        </label>

                        {selectedFilteredCategoriesList.map((item, idx) => (
                            <label key={idx} style={{ marginRight: 10 }}>
                                <input
                                    type="checkbox"
                                    checked={item.display}
                                    onChange={() => handleToggleBaseModelCheckbox(idx)}
                                />
                                {item.category.name}
                            </label>
                        ))}
                    </div>
                </div>
            </Collapse>
        </div>
    );
};

export default FilesPathSettingPanel;
