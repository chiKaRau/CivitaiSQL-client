// Define action types
export const UPDATE_BOOKMARKID = 'UPDATE_BOOKMARKID';
export const SET_ISBOOKMARKED = 'SET_ISBOOKMARKED';

export interface UpdateBookmarkID {
    type: typeof UPDATE_BOOKMARKID;
    payload: string;
}

export interface SetIsBookmarked {
    type: typeof SET_ISBOOKMARKED;
    payload: boolean;
};

export type ChromeActionTypes = UpdateBookmarkID | SetIsBookmarked;