import React, { useEffect, useState } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { updateDownloadFilePath } from "../store/actions/chromeActions"

//components
import { Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';

//data
import categoriesPrefix from "../data/categoriesPrefix.json"

const TagsPanel: React.FC = () => {
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

    const chrome = useSelector((state: AppState) => state.chrome);
    const { downloadFilePath } = chrome;

    const [open, setOpen] = useState(false);

    const [prefixsList, setPrefixsList] = useState<{ name: string; value: string; }[]>(categoriesPrefix.prefixsList);
    const [suffixsList, setSuffixsList] = useState<{ name: string; value: string; }[]>(modelTagsList);

    const [selectedPrefix, setSelectedPrefix] = useState("");
    const [selectedSuffix, setSelectedSuffix] = useState("");


    useEffect(() => {
        dispatch(updateDownloadFilePath(`${selectedPrefix}${selectedSuffix}`))
    }, [selectedPrefix, selectedSuffix])

    return (
        <div className="collapse-panel-container">
            <div className="toggle-section"
                onClick={() => setOpen(!open)} aria-controls="collapse-panel" aria-expanded={open}>
                <center> Folder Suggestions </center>
            </div>
            <hr />

            <Collapse in={open}>
                <div id="collapse-panel">
                    <center> Prefix </center>
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
                    <center> Suffix </center>
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
                </div>
            </Collapse >
        </div>
    )
};

export default TagsPanel;

