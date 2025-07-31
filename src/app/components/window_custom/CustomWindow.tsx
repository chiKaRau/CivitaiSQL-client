import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';

// Store
import { useDispatch, useSelector } from 'react-redux';
import { updateDownloadFilePath } from '../../store/actions/chromeActions';
import { AppState } from '../../store/configureStore';

const CustomWindow: React.FC = () => {

    const chromeData = useSelector((state: AppState) => state.chrome);

    const modify_downloadFilePath = chromeData.downloadFilePath;
    const modify_selectedCategory = chromeData.selectedCategory;

    return (
        <div>
            Hello Custom


        </div>
    )

}

export default CustomWindow;