import React, { useState } from 'react';

const SetOriginalTabButton = () => {
    const [status, setStatus] = useState('');

    const handleSetOriginalTab = async () => {
        try {
            // Step 1: Retrieve all windows
            const windows = await chrome.windows.getAll({ populate: false });
            console.log('Retrieved Windows:', windows);

            // Step 2: Find the first window of type 'normal' (main browser window)
            const normalWindow = windows.find(win => win.type === 'normal');
            console.log('Normal Window:', normalWindow);

            if (!normalWindow) {
                console.error('No normal window found.');
                setStatus('No normal window found.');
                return;
            }

            // Step 3: Query the active tab in the normal window
            const [activeTab] = await chrome.tabs.query({ active: true, windowId: normalWindow.id });
            console.log('Active Tab in Normal Window:', activeTab);

            if (activeTab && activeTab.id) {
                // Step 4: Save the active tab's ID to chrome.storage.local
                await chrome.storage.local.set({ originalTabId: activeTab.id });
                console.log(`Original Tab ID set to: ${activeTab.id}`);
                setStatus('Original tab has been set successfully.');
            } else {
                console.error('No active tab found in the normal window.');
                setStatus('No active tab found in the normal window.');
            }
        } catch (error) {
            console.error('Error setting originalTabId:', error);
            setStatus('Failed to set original tab.');
        }
    };

    return (
        <div>
            <button onClick={handleSetOriginalTab}>
                Set Current Tab as Original Tab
            </button>
            {status && <p>{status}</p>}
        </div>
    );
};

export default SetOriginalTabButton;
