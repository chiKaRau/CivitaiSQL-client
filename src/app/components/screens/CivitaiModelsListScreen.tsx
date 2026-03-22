import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { darkTheme, lightTheme } from '../window_offline/OfflineWindow.theme';

// ModelList page
// Page which lists a bunch of models
const CivitaiModelsListScreen: React.FC = () => {
    //Redux Store will check which Reducer has the "state.[key]" then return appropriate value from the state
    //Any Changes and Updates in Reducer would trigger rerender
    //const counter = useSelector((state: AppState) => state.counter);
    //const user = useSelector((state: AppState) => state.user);
    //const dispatch = useDispatch();

    const chromeData = useSelector((state: AppState) => state.chrome);
    const { bookmarkID, isBookmarked, isDarkMode } = chromeData;
    const theme = isDarkMode ? darkTheme : lightTheme;

    useEffect(() => {
        openNewWindow()
    }, [])

    const openNewWindow = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Store the original tab ID in local storage
            chrome.storage.local.set({ originalTabId: tabs[0].id });
            // Then open the new window
            chrome.runtime.sendMessage({ action: "openNewWindow" });
            window.close(); // This closes the popup window
        });
    };

    return (
        <div
            style={{
                backgroundColor: theme.pageBackground,
                color: theme.panelText,
            }}
        >
            <p> CivitaiModelsListScreen </p>
            <div>
                <h1>Extension Popup</h1>
                {/* Existing content */}

                {/* Button to open new window */}
                <button onClick={openNewWindow}>Open New Window</button>
            </div>
        </div>
    );
};

export default CivitaiModelsListScreen;

