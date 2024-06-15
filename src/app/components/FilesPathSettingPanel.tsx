import React, { useEffect, useState, useRef } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { updateDownloadFilePath, UpdateSelectedFilteredCategoriesList } from "../store/actions/chromeActions"

//components
import { Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';

//data
import categoriesPrefix from "../data/categoriesPrefix.json"
import { filesPathCategoriesList } from "../data/filesPathCategoriesList.json"

//utils
import { updateSelectedFilteredCategoriesListIntoChromeStorage } from "../utils/chromeUtils"

const FilesPathSettingPanel: React.FC = () => {
    const isInitialMount = useRef(true);
    const dispatch = useDispatch();

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelTags = data?.tags;
    const modelTagsList = modelTags?.map((element: any) => {
        return {
            "name": element?.split(' ')
                .map((word: String) => word.toLowerCase().charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            "value": element?.split(' ')
                .map((word: String) => word.toLowerCase().charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        }
    })

    modelTagsList?.push({ "name": "Temp", "value": "Temp" });

    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadFilePath } = chrome;

    const [open, setOpen] = useState(false);

    const [prefixsList, setPrefixsList] = useState<{ name: string; value: string; }[]>(categoriesPrefix.prefixsList);
    const [suffixsList, setSuffixsList] = useState<{ name: string; value: string; }[]>(modelTagsList);

    const [selectedPrefix, setSelectedPrefix] = useState("");
    const [selectedSuffix, setSelectedSuffix] = useState("");
    // Initializing state with the entire object and display property
    const [selectedFilteredCategoriesList, setSelectedFilteredCategoriesList] = useState<{ category: { name: string, value: string }, display: boolean }[]>(
        filesPathCategoriesList.map((category) => ({
            category: category,
            display: true
        }))
    );

    useEffect(() => {
        if (chrome.selectedFilteredCategoriesList) {
            setSelectedFilteredCategoriesList(JSON.parse(chrome.selectedFilteredCategoriesList))
        }

    }, [chrome.selectedFilteredCategoriesList])

    useEffect(() => {
        dispatch(updateDownloadFilePath(`${selectedPrefix}${selectedSuffix}`))
    }, [selectedPrefix, selectedSuffix])

    //Update Chrome Storage
    useEffect(() => {
        //Preventing First time update
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            updateSelectedFilteredCategoriesListIntoChromeStorage(selectedFilteredCategoriesList);
            dispatch(UpdateSelectedFilteredCategoriesList(JSON.stringify(selectedFilteredCategoriesList)))
        }
    }, [selectedFilteredCategoriesList]);


    const handleToggleBaseModelCheckbox = (index: number) => {
        setSelectedFilteredCategoriesList(prevState => {
            const newState = [...prevState];
            newState[index].display = !newState[index].display;
            return newState;
        });
    };

    const handleSelectAllCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setSelectedFilteredCategoriesList(prevState =>
            prevState.map(item => ({ ...item, display: isChecked }))
        );
    };

    // Determine if all checkboxes are selected
    const areAllSelected = selectedFilteredCategoriesList.every(item => item.display);

    return (
        <div className="collapse-panel-container">
            <div className="toggle-section"
                onClick={() => setOpen(!open)} aria-controls="collapse-panel" aria-expanded={open}>
                <center> Folder Settings </center>
            </div>
            <hr />

            <Collapse in={open}>
                <div id="collapse-panel">
                    <center> Prefix Suggestions</center>
                    <hr />
                    {prefixsList?.map((element, index) => (
                        <OverlayTrigger placement="bottom" overlay={<Tooltip id="tooltip">{element.value}</Tooltip>}>
                            <label key={index}
                                className={`panel-tag-button ${selectedPrefix === element.value ? 'panel-tag-default' : 'panel-tag-selected'}`}
                                onClick={() => setSelectedPrefix(element.value)}>
                                {element.name}
                            </label>
                        </OverlayTrigger>
                    ))}
                    <br />

                    <center> Suffix Suggestions</center>
                    <hr />
                    {suffixsList?.map((element, index) => (
                        <OverlayTrigger placement="bottom" overlay={<Tooltip id="tooltip">{element.value}</Tooltip>}>
                            <label key={index}
                                className={`panel-tag-button ${selectedSuffix === element.value ? 'panel-tag-default' : 'panel-tag-selected'}`}
                                onClick={() => setSelectedSuffix(element.value)}>
                                {element.name}
                            </label>
                        </OverlayTrigger>
                    ))}
                    <br />

                    <center> Selected Categories</center>
                    <hr />
                    <div style={{ display: 'inline-block' }}>

                        <label style={{ marginRight: '10px' }}>
                            <input
                                type="checkbox"
                                checked={areAllSelected}
                                onChange={handleSelectAllCheckbox}
                            />
                            Select/Deselect All
                        </label>

                        {selectedFilteredCategoriesList.map((item, index) => (
                            <label key={index} style={{ marginRight: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={item.display}
                                    onChange={() => handleToggleBaseModelCheckbox(index)}
                                />
                                {item.category.name}
                            </label>
                        ))}

                    </div>
                    <br />

                </div>
            </Collapse >
        </div>
    )
};

export default FilesPathSettingPanel;

