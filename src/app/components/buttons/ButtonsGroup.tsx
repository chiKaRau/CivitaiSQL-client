import React, { useEffect, useState } from "react";

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { togglePanel } from '../../store/actions/panelActions';

//Icons Components
import { BsCheck, BsArrowRepeat, BsStarFill, BsStar, BsFillCloudArrowUpFill, BsInfoCircleFill, BsFillCartCheckFill, BsCloudDownloadFill } from 'react-icons/bs';
import { FcDownload } from "react-icons/fc";
import { AiFillFolderOpen } from "react-icons/ai"
import { GrCopy, GrPowerShutdown } from 'react-icons/gr';
import { PiMagnifyingGlassBold } from "react-icons/pi"
import { MdAccessAlarms } from "react-icons/md"
import { PiCellSignalFullLight, PiCellSignalSlash } from "react-icons/pi"
import { SiTask } from "react-icons/si";


//utils
import { bookmarkThisModel, unBookmarkThisModel } from "../../utils/chromeUtils"

//Components
import ButtonWrap from "./ButtonWrap";

const ButtonsGroup: React.FC = () => {
    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { isBookmarked, bookmarkID } = chrome

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
                handleFunctionCall={() => dispatch(togglePanel("DatabaseModelInfoPanel"))} />

            {/**Database's RelatedModelsPanel Button */}
            <ButtonWrap buttonConfig={{
                placement: "bottom",
                tooltip: "Related Models",
                variant: "success",
                buttonIcon: <PiMagnifyingGlassBold />,
                disable: false,
            }}
                handleFunctionCall={() => dispatch(togglePanel("DatabaseRelatedModelsPanel"))} />

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

