// Define action types
export const SET_ERROR = 'SET_ERROR';
export const CLEAR_ERROR = 'CLEAR_ERROR';

export interface SetErrorAction {
    type: typeof SET_ERROR;
    payload: {
        hasError: boolean;
        errorMessage: string;
    };
}

export interface ClearErrorAction {
    type: typeof CLEAR_ERROR;
}


export type ErrorsActionTypes = SetErrorAction | ClearErrorAction 