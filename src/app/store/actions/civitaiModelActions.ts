// actions/userActions.js
import {
    UPDATE_CIVITAI_URL, UPDATE_CIVITAI_MODELID, UPDATE_CIVITAI_VERSIONID,
    UPDATE_CIVITAI_MODEL_OBJECT,
} from '../constants/CivitaiModelActionTypes';

export const updateCivitaiUrl = (newCivitaiUrl: string) => ({
    type: UPDATE_CIVITAI_URL,
    payload: newCivitaiUrl,
});

export const updateCivitaiModelID = (newCivitaiModelID: string) => ({
    type: UPDATE_CIVITAI_MODELID,
    payload: newCivitaiModelID,
});

export const updateCivitaiVersionID = (newCivitaiVersionID: string) => ({
    type: UPDATE_CIVITAI_VERSIONID,
    payload: newCivitaiVersionID,
});

export const updateCivitaiModelObject = (newCivitaiModelObject: object) => ({
    type: UPDATE_CIVITAI_MODEL_OBJECT,
    payload: newCivitaiModelObject,
});
