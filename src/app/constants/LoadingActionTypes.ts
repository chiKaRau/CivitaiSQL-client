// Define action types
export const SET_GLOBAL_ISLOADING = 'SET_GLOBAL_ISLOADING';

export interface setGlobalIsLoading {
    type: typeof SET_GLOBAL_ISLOADING;
    payload: boolean;
};

export type LoadingActionTypes = setGlobalIsLoading;