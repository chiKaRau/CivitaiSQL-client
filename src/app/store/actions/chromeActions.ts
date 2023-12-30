// actions/userActions.js
import { UPDATE_BOOKMARKID, SET_ISBOOKMARKED } from '../constants/ChromeActionTypes';

export const updateBookmarkID = (newBookmarkID: string) => ({
    type: UPDATE_BOOKMARKID,
    payload: newBookmarkID,
});

export const setIsBookmarked = (newIsBookmarked: boolean) => ({
    type: SET_ISBOOKMARKED,
    payload: newIsBookmarked
});
