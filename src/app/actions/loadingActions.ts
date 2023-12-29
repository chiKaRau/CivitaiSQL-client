// actions/counterActions.ts
import { SET_GLOBAL_ISLOADING } from '../constants/LoadingActionTypes';

export const setGlobalIsLoading = (newGlobalIsLoading: boolean) => ({
    type: SET_GLOBAL_ISLOADING,
    payload: newGlobalIsLoading,
});
