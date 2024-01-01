// actions/userActions.js
import {
    UPDATE_IS_IN_DATABASE, UPDATE_DATABASE_MODEL_OBJECT
} from '../constants/DatabaseModelActionTypes';

export const UpdateIsInDatabase = (newIsInDatabase: boolean) => ({
    type: UPDATE_IS_IN_DATABASE,
    payload: newIsInDatabase,
});

export const UpdateDatabaseModelObject = (newDatabaseModelObject: object) => ({
    type: UPDATE_DATABASE_MODEL_OBJECT,
    payload: newDatabaseModelObject,
});

