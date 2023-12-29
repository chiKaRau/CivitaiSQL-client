import React, { useEffect, useState } from "react";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { togglePanel } from '../actions/panelActions';

//Icons Components
import { BsCheck, BsArrowRepeat, BsStarFill, BsStar, BsFillCloudArrowUpFill, BsInfoCircleFill, BsFillCartCheckFill, BsCloudDownloadFill } from 'react-icons/bs';
import { FcDownload } from "react-icons/fc";
import { AiFillFolderOpen } from "react-icons/ai"
import { GrCopy, GrPowerShutdown } from 'react-icons/gr';
import { PiMagnifyingGlassBold } from "react-icons/pi"
import { MdAccessAlarms } from "react-icons/md"
import { PiCellSignalFullLight, PiCellSignalSlash } from "react-icons/pi"
import { SiTask } from "react-icons/si";
import { SlDocs } from "react-icons/sl"
import { TbCloudX } from "react-icons/tb"

//utils
import { bookmarkThisModel, unBookmarkThisModel } from "../utils/bookmarkUtils"

//Components
import ButtonWrap from "./ButtonWrap";

const ButtonsGroup: React.FC = () => {
    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const { isBookmarked, bookmarkID } = civitaiModel
    const data: Record<string, any> | undefined = civitaiModel.modelObject;
    const modelType = data?.type;

    const dispatch = useDispatch();

    return (
        <div>
            {/**Database's ModelInfoPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Model Information",
                variant: "success",
                buttonIcon: <BsInfoCircleFill />,
                disable: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("ModelInfoPanel"))} />

            {/**Database's RelatedModelsPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Related Models",
                variant: "success",
                buttonIcon: <PiMagnifyingGlassBold />,
                disable: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("RelatedModelsPanel"))} />

            {/**Bookmark Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: isBookmarked ? "Unbookmark this model" : "bookmark this model",
                variant: "success",
                buttonIcon: isBookmarked ? <BsStarFill /> : <BsStar />,
                disable: false,
            }}
                handleFunctionCall={isBookmarked ?
                    () => unBookmarkThisModel(bookmarkID, dispatch)
                    :
                    () => bookmarkThisModel(data?.type, dispatch)} />


        </div>
    );
};

export default ButtonsGroup;

