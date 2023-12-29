// actions/userActions.js
import {
    UPDATE_URL, UPDATE_MODELID, UPDATE_VERSIONID,
    UPDATE_SELECTED_CATEGORY, UPDATE_CATEGORY_LIST, UPDATE_MODEL_OBJECT,
    UPDATE_BOOKMARKID, SET_ISBOOKMARKED
} from '../constants/CivitaiModelActionTypes';

export const updateUrl = (newUrl: string) => ({
    type: UPDATE_URL,
    payload: newUrl,
});

export const updateModelID = (newModelID: string) => ({
    type: UPDATE_MODELID,
    payload: newModelID,
});

export const updateVersionID = (newVersionID: string) => ({
    type: UPDATE_VERSIONID,
    payload: newVersionID,
});

export const updateSelectedCategory = (newSelectedCategory: string) => ({
    type: UPDATE_SELECTED_CATEGORY,
    payload: newSelectedCategory,
});

export const updateCategoryList = (newCategoryList: string[]) => ({
    type: UPDATE_CATEGORY_LIST,
    payload: newCategoryList,
});

export const updateModelObject = (newModelObject: object) => ({
    type: UPDATE_MODEL_OBJECT,
    payload: newModelObject,
});

export const updateBookmarkID = (newBookmarkID: string) => ({
    type: UPDATE_BOOKMARKID,
    payload: newBookmarkID,
});

export const setIsBookmarked = (newIsBookmarked: boolean) => ({
    type: SET_ISBOOKMARKED,
    payload: newIsBookmarked
});
