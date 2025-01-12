import {
    updateBookmarkID, setIsBookmarked,
    updateSelectedCategory, updateDownloadFilePath,
    updateDownloadMethod, updateOfflineMode, updateSelectedFilteredCategoriesList
} from "../store/actions/chromeActions"

export const setupBookmark = (modelType: string, activeURL: string, dispatch: any) => {
    chrome.bookmarks.getChildren(findBookmarkfolderbyModelType(modelType), (results) => {
        const bookmark = results.find((bookmark) => {
            if (bookmark.url === activeURL) {
                return bookmark
            }
        });

        if (bookmark) {
            dispatch(updateBookmarkID(bookmark.id));
            dispatch(setIsBookmarked(true));
        }
    });
}

export const bookmarkThisModel = (modelType: string, dispatch: any) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
            const currentTab = tabs[0];
            const bookmarkData = {
                title: currentTab.title,
                url: currentTab.url,
                parentId: findBookmarkfolderbyModelType(modelType) // Specify the ID of the parent folder where you want to place the bookmark
            };
            chrome.bookmarks.create(bookmarkData, function (bookmark) {
                dispatch(updateBookmarkID(bookmark.id));
                dispatch(setIsBookmarked(true));
            });
        }
    });
}

export const bookmarkThisUrl = (modelType: string, url: string, title: string) => {
    const bookmarkData = {
        title: title,
        url: url,
        parentId: findBookmarkfolderbyModelType(modelType) // Specify the ID of the parent folder where you want to place the bookmark
    };
    chrome.bookmarks.create(bookmarkData, function (bookmark) {
        // Bookmark created, no further action taken
    });
}

export const unBookmarkThisModel = (bookmarkId: string, dispatch: any, listmode: boolean) => {
    chrome.bookmarks.remove(bookmarkId, () => {
        dispatch(updateBookmarkID(""));
        dispatch(setIsBookmarked(false));
    });
}

export const removeBookmarkByUrl = (url: string, dispatch: any, listmode: boolean, windowMode: boolean) => {

    if (windowMode) {
        const modelId = url.match(/\/models\/(\d+)/)?.[1] || '';

        const baseUrl = `https://civitai.com/models/${modelId}`; // Construct base URL for the model

        // Search for all bookmarks and filter by matching URLs
        chrome.bookmarks.search({}, function (bookmarks) {
            const matchingBookmarks = bookmarks.filter((bookmark) =>
                bookmark.url?.startsWith(baseUrl) // Check if the URL starts with the base URL
            );

            // Remove all matching bookmarks
            matchingBookmarks.forEach((bookmark) => {
                chrome.bookmarks.remove(bookmark.id, function () {
                    // Perform actions after each bookmark is removed
                    if (!listmode) {
                        dispatch(updateBookmarkID(""));
                        dispatch(setIsBookmarked(false));
                    }
                });
            });
        });
    } else {
        chrome.bookmarks.search({ url }, function (bookmarks) {
            if (bookmarks.length > 0) {
                const bookmarkId = bookmarks[0].id;
                chrome.bookmarks.remove(bookmarkId, function () {
                    // Update your state or perform any other actions after removing the bookmark
                    if (!listmode) {
                        dispatch(updateBookmarkID(""));
                        dispatch(setIsBookmarked(false));
                    }
                });
            }
        });
    }
};

export const findBookmarkfolderbyModelType = (modelType: string) => {
    if (modelType.includes("lora")) {
        return "5";
    } else if (modelType.includes("checkpoint")) {
        return "9833"
    } else if (modelType.includes("textual")) {
        return "5925"
    } else {
        return "5"
    }
}

export const initializeDatafromChromeStorage = (dispatch: any) => {
    // Retrieve the last selected sheet option from Chrome storage
    chrome.storage.sync.get(['selectedCategory'], (result) => {
        if (result.selectedCategory) {
            dispatch(updateSelectedCategory(result.selectedCategory))
        }
    });

    // Retrieve the last downloadFilePath value from Chrome storage
    chrome.storage.sync.get(['downloadFilePath'], (result) => {
        if (result.downloadFilePath) {
            dispatch(updateDownloadFilePath(result.downloadFilePath))
        }
    });

    // Retrieve the last selected sheet option from Chrome storage
    chrome.storage.sync.get(['downloadMethod'], (result) => {
        if (result.downloadMethod) {
            dispatch(updateDownloadMethod(result.downloadMethod))
        }
    });

    // Retrieve the last selected sheet option from Chrome storage
    chrome.storage.sync.get(['selectedFilteredCategoriesList'], (result) => {
        if (result.selectedFilteredCategoriesList) {
            dispatch(updateSelectedFilteredCategoriesList(result.selectedFilteredCategoriesList))
        }
    });

    // Retrieve the last downloadFilePath value from Chrome storage
    chrome.storage.sync.get(['offlineMode'], (result) => {
        dispatch(updateOfflineMode(result.offlineMode))
    });
}

export const updateOfflineModeIntoChromeStorage = (offlineMode: boolean, dispatch: any) => {
    dispatch(updateOfflineMode(offlineMode))
    chrome.storage.sync.set({ offlineMode });
}

export const updateSelectedCategoryIntoChromeStorage = (selectedCategory: string) => {
    chrome.storage.sync.set({ selectedCategory });
}

export const updateDownloadFilePathIntoChromeStorage = (downloadFilePath: string) => {
    chrome.storage.sync.set({ downloadFilePath });
}

export const updateDownloadMethodIntoChromeStorage = (downloadMethod: string) => {
    chrome.storage.sync.set({ downloadMethod });
}

export const updateSelectedFilteredCategoriesListIntoChromeStorage = (selectedFilteredCategoriesList: any[]) => {
    chrome.storage.sync.set({ selectedFilteredCategoriesList: JSON.stringify(selectedFilteredCategoriesList) });
    //chrome.storage.sync.set({ selectedFilteredCategoriesList: null });
    //if doesn't update, uncomment above code
}

export const callChromeBrowserDownload = (data: any) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.url) {
            chrome.tabs.sendMessage(tabs[0].id as number, { action: "browser-download", data: data });
        }
    });
}

export const callChromeBrowserDownload_v2 = (data: any) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.url) {
            chrome.tabs.sendMessage(tabs[0].id as number, { action: "browser-download_v2", data: data });
        }
    });
}