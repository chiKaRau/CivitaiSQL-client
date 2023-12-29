// actions/userActions.js
import {
    UPDATE_ISINDATABASE, UPDATE_DATABASE_MODEL_OBJECT
} from '../constants/DatabaseModelActionTypes';

export const UpdateIsInDatabase = (isInDatabase: boolean) => ({
    type: UPDATE_ISINDATABASE,
    payload: isInDatabase,
});

export const UpdateDatabaseModelObject = (newDatabaseModelObject: object) => ({
    type: UPDATE_DATABASE_MODEL_OBJECT,
    payload: newDatabaseModelObject,
});

