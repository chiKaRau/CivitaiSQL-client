import axios from "axios"
import config from "../config/config.json"
import { setError, clearError } from '../store/actions/errorsActions';

export const fetchVerifyConnectingDatabase = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/verify-connecting-database`);
        if (response.status >= 200 && response.status < 300) {
            return response.data.success
        } else {
            // Handle the case when response is false
            throw new Error("Failed Connecting to Database");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


//dispatch cannot be used inside the functional components or custoom hook, async function is not allowed.
export const fetchCivitaiModelInfoFromCivitaiByModelID = async (modelID: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-civitaiModel-info-by-modelID`, { modelID: modelID });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            return responseData.payload.model;
        } else {
            // Handle the case when success is false
            throw new Error("Retriving Civitai model info from Civitai failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDatabaseModelInfoByModelID = async (modelID: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-list-of-models-dto-from-all-table-by-modelID`, { modelID: modelID });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.modelsList;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDatabaseRelatedModelsByName = async (name: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-list-of-models-dto-from-all-table-by-name`, { name: name });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.modelsList;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDatabaseLatestAddedModelsPanel = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/find-latest-three-models-dto-from-all-tables`);
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.modelsList;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving latest model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchAddRecordToDatabase = async (selectedCategory: string, url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/create-record-to-all-tables`,
            { category: selectedCategory, url: url });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed adding record into Database.");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            throw new Error("Failed adding record into Database.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchRemoveRecordFromDatabaseByID = async (id: number, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/delete-record-to-all-tables`,
            { id: id });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed removing record into Database.");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            throw new Error("Failed removing record into Database.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchUpdateRecordAtDatabase = async (id: number, url: string, selectedCategory: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/update-record-to-all-tables`,
            { id: id, url: url, category: selectedCategory });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed updating record into Database.");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            throw new Error("Failed updating record into Database.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchGetCategoriesList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/get-categories-list`);
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.categoriesList;
            }
        } else {
            // Handle the case when response is false
            throw new Error("Retriving Categories List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchGetFoldersList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/get_folders_list`);
        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.foldersList;
        } else {
            // Handle the case when response is false
            throw new Error("Retriving Folders List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchOpenDownloadDirectory = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/open-download-directory`);
        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed opening download directory.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDownloadFilesByServer = async (url: string, name: string,
    modelID: string, versionID: string, downloadFilePath: string,
    filesList: { name: string; downloadUrl: string }[], dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/download-file-server`, {
            url: url, name: name,
            modelID: modelID, versionID: versionID,
            downloadFilePath: downloadFilePath,
            filesList: filesList
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed download files by server.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDownloadFilesByBrowser = async (url: string, downloadFilePath: string, dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/download-file-browser`, {
            url: url, downloadFilePath: downloadFilePath,
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed download files by browser.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchCheckCartList = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-cart-list`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.isCarted;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}