import React, { useEffect, useState } from "react";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { togglePanel } from '../../store/actions/panelActions';

//Icons Components
import { BsCheck, BsArrowRepeat, BsStarFill, BsStar, BsFillCloudArrowUpFill, BsInfoCircleFill, BsFillCartCheckFill } from 'react-icons/bs';
import { AiFillFolderOpen } from "react-icons/ai"
import { GrCopy, GrPowerShutdown } from 'react-icons/gr';
import { PiMagnifyingGlassBold } from "react-icons/pi"
import { RiFileAddFill } from "react-icons/ri";
import { MdAccessAlarms } from "react-icons/md"
import { PiCellSignalFullLight, PiCellSignalSlash } from "react-icons/pi"
import { SlDocs } from "react-icons/sl"

//api
import { fetchOpenDownloadDirectory } from "../../api/civitaiSQL_api"

//utils
import { bookmarkThisModel, unBookmarkThisModel } from "../../utils/chromeUtils"

//Components
import ButtonWrap from "./ButtonWrap";
import DownloadFileButton from "./DownloadFileButton";

const ButtonsGroup: React.FC = () => {
    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { isBookmarked, bookmarkID } = chrome

    const dispatch = useDispatch();

    return (
        <div className="buttonGroup">
            {/**Database's ModelInfoPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Model Information",
                variant: "success",
                buttonIcon: <BsInfoCircleFill />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseModelInfoPanel"))} />

            {/**Database's RelatedModelsPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Related Models",
                variant: "secondary",
                buttonIcon: <PiMagnifyingGlassBold />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseRelatedModelsPanel"))} />

            {/**Database's LatestAddedModelsPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Latest Added Models",
                variant: "warning",
                buttonIcon: <SlDocs />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseLastestAddedModelsPanel"))} />

            {/**Database's UpdateModelPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Update this Model",
                variant: "success",
                buttonIcon: <GrCopy />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseUpdateModelPanel"))} />

            {/**Database's CustomModelPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Add a custom model",
                variant: "success",
                buttonIcon: <RiFileAddFill />,
                disabled: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseCustomModelPanel"))} />


            {/**Download Button */}
            <DownloadFileButton />

            {/**Open Download Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Open Download Directory",
                variant: "primary",
                buttonIcon: <AiFillFolderOpen />,
                disabled: false,
            }}
                handleFunctionCall={() => fetchOpenDownloadDirectory(dispatch)} />

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

