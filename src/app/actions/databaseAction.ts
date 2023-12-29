// actions/userActions.js
import {
    UPDATE_ISINDATABASE, UPDATE_DATABASE_MODEL_OBJECT
} from '../constants/DatabaseActionTypes copy';

export const UpdateIsInDatabase = (isInDatabase: string) => ({
    type: UPDATE_ISINDATABASE,
    payload: isInDatabase,
});

export const UpdateDatabaseModelObject = (newDatabaseModelObject: object) => ({
    type: UPDATE_DATABASE_MODEL_OBJECT,
    payload: newDatabaseModelObject,
});

