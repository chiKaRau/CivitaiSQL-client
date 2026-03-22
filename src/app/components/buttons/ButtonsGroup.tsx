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

interface ButtonsGroupProps {
    isDarkMode?: boolean;
}

const ButtonsGroup: React.FC<ButtonsGroupProps> = ({ isDarkMode = true }) => {
    const dispatch = useDispatch();
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
    const tightItemStyle = {
        display: "inline-flex",
        alignItems: "flex-start",
    };

    const tightItemShiftStyle = {
        display: "inline-flex",
        alignItems: "flex-start",
        marginLeft: "-10px", // try -3px to -6px
    };

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "nowrap",
                alignItems: "flex-start",
                overflowX: "auto",
                overflowY: "hidden",
                width: "100%",
            }}
        >
            {/**Database's RelatedModelsPanel Button */}
            <div style={tightItemShiftStyle}>
                <ButtonWrap
                    buttonConfig={{
                        placement: "bottom",
                        tooltip: "Related Models",
                        variant: "secondary",
                        buttonIcon: <TbDatabaseSearch />,
                        disabled: false,
                    }}
                    handleFunctionCall={() => {
                        dispatch(togglePanel("DatabaseRelatedModelsPanel"));
                    }}
                    isDarkMode={isDarkMode}
                />
            </div>

            {/**Database's ModelInfoPanel Button */}
            <div style={tightItemShiftStyle}>
                <ButtonWrap buttonConfig={{
                    placement: "bottom",
                    tooltip: "Model Information",
                    variant: "success",
                    buttonIcon: <TbDatabaseHeart />,
                    disabled: false,
                }}
                    handleFunctionCall={() => {
                        dispatch(togglePanel("DatabaseModelInfoPanel"));
                    }}
                    isDarkMode={isDarkMode}
                />
            </div>

            {/**Database's UpdateModelPanel Button */}
            <div style={tightItemShiftStyle}>
                <ButtonWrap buttonConfig={{
                    placement: "bottom",
                    tooltip: "Update this Model",
                    variant: "success",
                    buttonIcon: <TbDatabaseEdit />,
                    disabled: false,
                }}
                    handleFunctionCall={() => {
                        dispatch(togglePanel("DatabaseUpdateModelPanel"));
                    }}
                    isDarkMode={isDarkMode}
                />
            </div>

            <div style={tightItemShiftStyle}>
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
                                handleFunctionCall={() => handleOpenModelListModeWindow()}
                                isDarkMode={isDarkMode}
                                withShell={false}
                            />

                            {/**Open Offline Window */}
                            <ButtonWrap buttonConfig={{
                                placement: "top",
                                tooltip: "Open Offline Window",
                                variant: "primary",
                                buttonIcon: <BsReverseLayoutTextWindowReverse />
                                ,
                                disabled: false,
                            }}
                                handleFunctionCall={() => handleOpenOfflineWindow()}
                                isDarkMode={isDarkMode}
                                withShell={false}
                            />

                            {/**Database's CustomModelPanel Button */}
                            <ButtonWrap buttonConfig={{
                                placement: "bottom",
                                tooltip: "Add a custom model",
                                variant: "warning",
                                buttonIcon: <TbDatabasePlus />,
                                disabled: false,
                            }}
                                handleFunctionCall={() => handleOpenCustomWindow()}
                                isDarkMode={isDarkMode}
                                withShell={false}
                            />

                            {/**Database's CustomModelPanel Button */}
                            <ButtonWrap buttonConfig={{
                                placement: "bottom",
                                tooltip: "edit a model",
                                variant: "warning",
                                buttonIcon: <FaEdit />,
                                disabled: false,
                            }}
                                handleFunctionCall={() => handleOpenEditWindow()}
                                isDarkMode={isDarkMode}
                                withShell={false}
                            />
                        </div>
                    }
                />
            </div>

            {/**Database's LatestAddedModelsPanel Button */}
            <div style={tightItemShiftStyle}>
                <ButtonWrap buttonConfig={{
                    placement: "bottom",
                    tooltip: "Latest Added Models",
                    variant: "dark",
                    buttonIcon: <AiFillDatabase />,
                    disabled: false,
                }}
                    handleFunctionCall={() => {
                        dispatch(togglePanel("DatabaseLastestAddedModelsPanel"));
                    }}
                    isDarkMode={isDarkMode}
                />
            </div>

            {/**Download Button */}
            <div style={tightItemStyle}>
                <DownloadFileButton />
            </div>

            <div style={tightItemShiftStyle}>
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
                                handleFunctionCall={() => fetchOpenDownloadDirectory(dispatch)}
                                isDarkMode={isDarkMode}
                            />

                            {/**Must Add List Button */}
                            <ButtonWrap buttonConfig={{
                                placement: "bottom",
                                tooltip: "must add",
                                variant: "primary",
                                buttonIcon: <MdAddLocation />,
                                disabled: false,
                            }}
                                handleFunctionCall={() => fetchAppendToMustAddList(civitaiUrl, dispatch)}
                                isDarkMode={isDarkMode}
                            />

                            {/**offline mode button */}
                            <ButtonWrap buttonConfig={{
                                placement: "bottom",
                                tooltip: offlineMode ? "offline" : "online",
                                variant: offlineMode ? "success" : "primary",
                                buttonIcon: offlineMode ? <MdOutlineDownloadForOffline /> : <MdOutlineDownload />,
                                disabled: false,
                            }}
                                handleFunctionCall={() => updateOfflineModeIntoChromeStorage(!offlineMode, dispatch)}
                                isDarkMode={isDarkMode}
                            />

                        </div>
                    }
                />
            </div>

            {/**Bookmark Button */}
            <div style={tightItemShiftStyle}>
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
                        () => bookmarkThisModel(data?.type, dispatch)}
                    isDarkMode={isDarkMode}
                />
            </div>

        </div>
    );
};

export default ButtonsGroup;

