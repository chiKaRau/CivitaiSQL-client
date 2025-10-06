import React, { useEffect, useState } from "react";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { togglePanel } from '../../store/actions/panelActions';

//Icons Components
import { BsCheck, BsArrowRepeat, BsStarFill, BsStar, BsFillCloudArrowUpFill, BsInfoCircleFill, BsFillCartCheckFill, BsReverseLayoutTextWindowReverse } from 'react-icons/bs';
import { MdOutlineDownloadForOffline, MdOutlineDownload } from "react-icons/md";
import { AiFillFolderOpen } from "react-icons/ai"
import { GrCopy, GrPowerShutdown } from 'react-icons/gr';
import { PiMagnifyingGlassBold } from "react-icons/pi"
import { MdAddLocation } from "react-icons/md";
import { FaEdit } from 'react-icons/fa';

import { RiFileAddFill } from "react-icons/ri";
import { MdAccessAlarms, MdOutlineApps } from "react-icons/md"
import { PiCellSignalFullLight, PiCellSignalSlash } from "react-icons/pi"
import { SlDocs } from "react-icons/sl"
import { TbDatabaseSearch, TbDatabaseHeart, TbDatabasePlus, TbDatabaseEdit } from "react-icons/tb";
import { AiFillDatabase } from "react-icons/ai";

//api
import { fetchOpenDownloadDirectory, fetchAppendToMustAddList } from "../../api/civitaiSQL_api"

//utils
import { bookmarkThisModel, unBookmarkThisModel, updateOfflineModeIntoChromeStorage } from "../../utils/chromeUtils"

//Components
import ButtonWrap from "./ButtonWrap";
import DownloadFileButton from "./DownloadFileButton";
import WindowCollapseButton from "../window/WindowCollapseButton";

const ButtonsGroup: React.FC = () => {
    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl } = civitaiModel


    const chromeData = useSelector((state: AppState) => state.chrome);
    const { isBookmarked, bookmarkID, offlineMode } = chromeData

    const [collapseButtonStates, setCollapseButtonStates] = useState<{ [key: string]: boolean }>({
        utilsButtons: false,
        WindowsButtons: false
    });

    const handleToggleCollapseButton = (panelId: any) => {
        setCollapseButtonStates((prevStates) => ({
            ...prevStates,
            [panelId]: !prevStates[panelId],
        }));
    };

    const handleOpenModelListModeWindow = () => {
        console.log("open Model List window")
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Store the original tab ID in local storage
            // chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openNewWindow" });
            //window.close(); // This closes the popup window
        });
    }

    const handleOpenOfflineWindow = () => {
        console.log("open offline window")
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Store the original tab ID in local storage
            // chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openOfflineWindow" });
            //window.close(); // This closes the popup window
        });
    }

    const handleOpenCustomWindow = () => {
        console.log("open custom window")
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
            // Store the original tab ID in local storage
            // chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openCustomWindow" });
            //window.close(); // This closes the popup window
        });
    }

    const handleOpenEditWindow = () => {
        console.log("open edit window")
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
            // Store the original tab ID in local storage
            // chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openEditWindow" });
            //window.close(); // This closes the popup window
        });
    }


    const dispatch = useDispatch();

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/**Database's RelatedModelsPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Related Models",
                variant: "secondary",
                buttonIcon: <TbDatabaseSearch />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseRelatedModelsPanel"))} />

            {/**Database's ModelInfoPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Model Information",
                variant: "success",
                buttonIcon: <TbDatabaseHeart />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseModelInfoPanel"))} />

            {/**Database's UpdateModelPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Update this Model",
                variant: "success",
                buttonIcon: <TbDatabaseEdit />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseUpdateModelPanel"))} />

            <WindowCollapseButton
                panelId="WindowsButtons"
                isPanelOpen={collapseButtonStates['WindowsButtons']}
                handleTogglePanel={handleToggleCollapseButton}
                icons={<MdOutlineApps />}
                buttons={
                    <div>

                        {/**Open Offline Window */}
                        <ButtonWrap buttonConfig={{
                            placement: "top",
                            tooltip: "Open Model List Window",
                            variant: "primary",
                            buttonIcon: <BsReverseLayoutTextWindowReverse />
                            ,
                            disabled: false,
                        }}
                            handleFunctionCall={() => handleOpenModelListModeWindow()} />

                        {/**Open Offline Window */}
                        <ButtonWrap buttonConfig={{
                            placement: "top",
                            tooltip: "Open Offline Window",
                            variant: "primary",
                            buttonIcon: <BsReverseLayoutTextWindowReverse />
                            ,
                            disabled: false,
                        }}
                            handleFunctionCall={() => handleOpenOfflineWindow()} />

                        {/**Database's CustomModelPanel Button */}
                        <ButtonWrap buttonConfig={{
                            placement: "bottom",
                            tooltip: "Add a custom model",
                            variant: "warning",
                            buttonIcon: <TbDatabasePlus />,
                            disabled: false,
                        }}
                            handleFunctionCall={() => handleOpenCustomWindow()} />

                        {/**Database's CustomModelPanel Button */}
                        <ButtonWrap buttonConfig={{
                            placement: "bottom",
                            tooltip: "edit a model",
                            variant: "warning",
                            buttonIcon: <FaEdit />,
                            disabled: false,
                        }}
                            handleFunctionCall={() => handleOpenEditWindow()} />
                    </div>
                }
            />


            {/**Database's LatestAddedModelsPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Latest Added Models",
                variant: "dark",
                buttonIcon: <AiFillDatabase />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseLastestAddedModelsPanel"))} />


            {/**Download Button */}
            <DownloadFileButton />

            <WindowCollapseButton
                panelId="utilsButton"
                isPanelOpen={collapseButtonStates['utilsButton']}
                handleTogglePanel={handleToggleCollapseButton}
                icons={<MdOutlineApps />}
                buttons={
                    <div>
                        {/**Open Download Button */}
                        <ButtonWrap buttonConfig={{
                            placement: "bottom",
                            tooltip: "Open Download Directory",
                            variant: "primary",
                            buttonIcon: <AiFillFolderOpen />,
                            disabled: false,
                        }}
                            handleFunctionCall={() => fetchOpenDownloadDirectory(dispatch)} />

                        {/**Must Add List Button */}
                        <ButtonWrap buttonConfig={{
                            placement: "bottom",
                            tooltip: "must add",
                            variant: "primary",
                            buttonIcon: <MdAddLocation />,
                            disabled: false,
                        }}
                            handleFunctionCall={() => fetchAppendToMustAddList(civitaiUrl, dispatch)} />

                        {/**offline mode button */}
                        <ButtonWrap buttonConfig={{
                            placement: "bottom",
                            tooltip: offlineMode ? "offline" : "online",
                            variant: offlineMode ? "success" : "primary",
                            buttonIcon: offlineMode ? <MdOutlineDownloadForOffline /> : <MdOutlineDownload />,
                            disabled: false,
                        }}
                            handleFunctionCall={() => updateOfflineModeIntoChromeStorage(!offlineMode, dispatch)} />

                    </div>
                }
            />

            {/**Bookmark Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: isBookmarked ? "Unbookmark this model" : "bookmark this model",
                variant: "success",
                buttonIcon: isBookmarked ? <BsStarFill /> : <BsStar />,
                disabled: false,
            }}
                handleFunctionCall={isBookmarked ?
                    () => unBookmarkThisModel(bookmarkID, dispatch, false)
                    :
                    () => bookmarkThisModel(data?.type, dispatch)} />

        </div>
    );
};

export default ButtonsGroup;

