// Define action types
export const UPDATE_CIVITAI_URL = 'UPDATE_CIVITAI_URL';
export const UPDATE_CIVITAI_MODELID = 'UPDATE_CIVITAI_MODELID';
export const UPDATE_CIVITAI_VERSIONID = 'UPDATE_CIVITAI_VERSIONID';
export const UPDATE_CIVITAI_MODEL_OBJECT = 'UPDATE_CIVITAI_MODEL_OBJECT';

export interface UpdateCivtaiUrlAction {
    type: typeof UPDATE_CIVITAI_URL;
    payload: string;
}

export interface UpdateCivitaiModeIDAction {
    type: typeof UPDATE_CIVITAI_MODELID;
    payload: string;
}

export interface UpdateCivitaiVersionIDAction {
    type: typeof UPDATE_CIVITAI_VERSIONID;
    payload: string;
}

export interface UpdateCivitaiModelObject {
    type: typeof UPDATE_CIVITAI_MODEL_OBJECT;
    payload: object;
}

export type CivitaiModelActionTypes = UpdateCivtaiUrlAction | UpdateCivitaiModeIDAction
    | UpdateCivitaiVersionIDAction | UpdateCivitaiModelObject;