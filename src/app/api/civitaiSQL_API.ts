import axios from "axios"
import config from "../config/config.json"
import { setError, clearError } from '../store/actions/errorsActions';

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
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
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
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
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
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDatabaseLastestAddedModelsPanel = async (dispatch: any) => {
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
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const addRecordToDatabase = async (selectedCategory: string, url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/create-record-to-all-tables`,
            { category: selectedCategory, url: url });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when success is false
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const removeRecordFromDatabaseByID = async (id: number, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/delete-record-to-all-tables`,
            { id: id });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when success is false
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const updateRecordAtDatabase = async (id: number, url: string, selectedCategory: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/update-record-to-all-tables`,
            { id: id, url: url, category: selectedCategory });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when success is false
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const getCategoriesList = async (dispatch: any) => {
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
            // Handle the case when success is false
            console.error("Civitai Info retrieval failed. Message:", responseData.message);
            // Optionally, you can throw an error or return a specific value
            throw new Error("Civitai Info retrieval failed");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const openDownloadDirectory = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/open-download-directory`);
        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when success is false
            throw new Error("Civitai Info retrieval failed");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const downloadFilesByServer = async (url: string, name: string,
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
            // Handle the case when success is false
            throw new Error("Civitai Info retrieval failed");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const downloadFilesByBrowser = async (url: string, downloadFilePath: string, dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/download-file-browser`, {
            url: url, downloadFilePath: downloadFilePath,
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when success is false
            throw new Error("Civitai Info retrieval failed");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}