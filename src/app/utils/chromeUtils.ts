import {
    updateBookmarkID, setIsBookmarked,
    updateSelectedCategory, updateDownloadFilePath, updateDownloadMethod
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

export const unBookmarkThisModel = (bookmarkId: string, dispatch: any) => {
    chrome.bookmarks.remove(bookmarkId, () => {
        dispatch(updateBookmarkID(""));
        dispatch(setIsBookmarked(false));
    });
}

export const removeBookmarkByUrl = (url: string, dispatch: any) => {
    chrome.bookmarks.search({ url }, function (bookmarks) {
        if (bookmarks.length > 0) {
            const bookmarkId = bookmarks[0].id;
            chrome.bookmarks.remove(bookmarkId, function () {
                // Update your state or perform any other actions after removing the bookmark
                dispatch(updateBookmarkID(""));
                dispatch(setIsBookmarked(false));
            });
        }
    });
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
            console.log("get the ", result.selectedCategory)
            dispatch(updateSelectedCategory(result.selectedCategory))
        }
    });

    // Retrieve the last downloadFilePath value from Chrome storage
    chrome.storage.sync.get(['downloadFilePath'], (result) => {
        if (result.downloadFilePath) {
            console.log("get the ", result.downloadFilePath)
            dispatch(updateDownloadFilePath(result.downloadFilePath))
        }
    });

    // Retrieve the last selected sheet option from Chrome storage
    chrome.storage.sync.get(['downloadMethod'], (result) => {
        if (result.downloadMethod) {
            console.log("get the ", result.downloadMethod)
            dispatch(updateDownloadMethod(result.downloadMethod))
        }
    });

}

export const updateSelectedCategoryIntoChromeStorage = (selectedCategory: string) => {
    chrome.storage.sync.set({ selectedCategory });

    chrome.storage.sync.get(null, (result) => {
        for (const key in result) {
            const value = result[key];
            console.log(`Key: ${key}, Value:`, value);
        }
    });

}