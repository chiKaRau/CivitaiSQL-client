// actions/userActions.js
import {
    UPDATE_BOOKMARKID, SET_ISBOOKMARKED,
    UPDATE_SELECTED_CATEGORY, UPDATE_CATEGORIES_LIST,
    UPDATE_DOWNLOAD_FILEPATH, UPDATE_DOWNLOAD_METHOD,
    UPDATE_SELECTED_FILTERED_CATEGORIES_LIST
} from '../constants/ChromeActionTypes';

export const updateBookmarkID = (newBookmarkID: string) => ({
    type: UPDATE_BOOKMARKID,
    payload: newBookmarkID,
});

export const setIsBookmarked = (newIsBookmarked: boolean) => ({
    type: SET_ISBOOKMARKED,
    payload: newIsBookmarked
});

export const updateSelectedCategory = (newSelectedCategory: string) => ({
    type: UPDATE_SELECTED_CATEGORY,
    payload: newSelectedCategory,
});

export const updateCategoriesList = (newCategoriesList: string[]) => ({
    type: UPDATE_CATEGORIES_LIST,
    payload: newCategoriesList,
});

export const updateDownloadFilePath = (newDownloadFilePath: string) => ({
    type: UPDATE_DOWNLOAD_FILEPATH,
    payload: newDownloadFilePath,
});

export const updateDownloadMethod = (newDownloadMethod: string) => ({
    type: UPDATE_DOWNLOAD_METHOD,
    payload: newDownloadMethod,
});

export const UpdateSelectedFilteredCategoriesList = (newSelectedFilteredCategoriesList: string) => ({
    type: UPDATE_SELECTED_FILTERED_CATEGORIES_LIST,
    payload: newSelectedFilteredCategoriesList,
});
