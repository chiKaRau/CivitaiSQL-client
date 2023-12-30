import { updateBookmarkID, setIsBookmarked } from "../store/actions/chromeActions"

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

export const initializeDatafromChromeStorage = () => {

}