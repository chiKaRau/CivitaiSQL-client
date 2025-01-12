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

//dispatch cannot be used inside the functional components or custoom hook, async function is not allowed.
export const fetchCivitaiModelInfoFromCivitaiByVersionID = async (versionID: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-civitaiModel-info-by-versionID`, { versionID: versionID });
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

export const fetchDatabaseRelatedModelsByTagsList = async (tagsList: string[], dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-list-of-models-dto-from-all-table-by-tagsList`, { tagsList });
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

export const fetchGetTagsList = async (dispatch: any, selectedPrefix: string) => {
    try {
        // Clear any previous errors
        dispatch(clearError());

        // Construct the URL with the prefix as a query parameter if it's provided
        let url = `${config.domain}/api/get_tags_list`;
        if (selectedPrefix) {
            // Encode the prefix to handle special characters
            const encodedPrefix = encodeURIComponent(selectedPrefix);
            url += `?prefix=${encodedPrefix}`;
        }

        const response = await axios.get(url);

        if (response.status >= 200 && response.status < 300) {
            const { topTags, recentTags } = response.data.payload;

            // Return both topTags and recentTags
            return { topTags, recentTags };
        } else {
            // Handle the case when response status is not successful
            throw new Error("Retrieving Tags List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Tags List retrieval:", error.message);
        // Dispatch the error to the state
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchGetCategoriesPrefixsList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());

        const response = await axios.get(`${config.domain}/api/get_categories_prefix_list`);

        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.categoriesPrefixsList;
        } else {
            // Handle the case when response status is not successful
            throw new Error("Retrieving Categories Prefixs List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Categories Prefixs List retrieval:", error.message);
        // Dispatch the error to the state
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchGetFilePathCategoriesList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());

        const response = await axios.get(`${config.domain}/api/get_filePath_categories_list`);

        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.filePathCategoriesList;

        } else {
            // Handle the case when response status is not successful
            throw new Error("Retrieving FilePath Categories List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during FilePath Categories List retrieval:", error.message);
        // Dispatch the error to the state
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

export const fetchAppendToMustAddList = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/append-to-must-add-list`, {
            url: url
        });
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

export const fetchDownloadFilesByServer_v2 = async (
    modelObject: {
        downloadFilePath: string, civitaiFileName: string, civitaiModelID: string,
        civitaiVersionID: string, civitaiModelFileList: { name: string; downloadUrl: string }[], civitaiUrl: string
    }
    , dispatch: any) => {


    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/download-file-server-v2`, {
            modelObject
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

export const fetchOfflineDownloadList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());

        // Make the GET request to the backend
        const response = await axios.get(`${config.domain}/api/get_offline_download_list`);

        // Check if the response status is in the 2xx range
        if (response.status >= 200 && response.status < 300) {
            const responseData = response.data;
            return responseData?.payload?.offlineDownloadList;
        } else {
            // Handle unexpected HTTP status codes
            throw new Error('Unexpected response status: ' + response.status);
        }

    } catch (error: any) {
        // Log the error to the console
        console.error("Error during offline download list retrieval:", error.message);

        // Dispatch the error to the Redux store
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
};

export const fetchAddOfflineDownloadFileIntoOfflineDownloadList = async (
    modelObject: {
        downloadFilePath: string, civitaiFileName: string, civitaiModelID: string,
        civitaiVersionID: string, civitaiModelFileList: { name: string; downloadUrl: string }[], civitaiUrl: string, selectedCategory: string
    }, isModifyMode: boolean
    , dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/add-offline-download-file-into-offline-download-list`, {
            modelObject, isModifyMode
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed adding offline download file into offline download list by server.");
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

export const fetchDownloadFilesByBrowser_v2 = async (url: string, downloadFilePath: string, dispatch: any) => {

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

export const fetchCheckIfUrlExistInDatabase = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-if-url-exist-in-database`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.isSaved;
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

export const fetchCheckQuantityOfOfflinedownloadList = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-quantity-of-offlinedownload-list`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.quantity;
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

export const fetchCheckQuantityofUrlinDatabaseByUrl = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-quantity-of-url-in-database-by-url`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.quantity;
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

export const fetchCheckQuantityofUrlinDatabaseByModelID = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-quantity-of-url-in-database-by-modelID`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.quantity;
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

export const fetchCheckIfModelUpdateAvaliable = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-if-model-update-avaliable`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return { isUpdateAvaliable: responseData.payload.isUpdateAvaliable, isEarlyAccess: responseData.payload.isEarlyAccess };
            } else {
                // Handle the case when success is false
                throw new Error("Retriving related model info from Database failed.");
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

export const fetchFindVersionNumbersForModel = async (modelId: string, versionIds: any, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-version-numbers-for-model`, {
            modelNumber: modelId,
            versionNumbers: versionIds
        });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return new Set(response.data.payload.existedVersionsList.map(String));
            } else {

                if ("No models found with the given model number" !== responseData.message) {

                    // Handle the case when success is false
                    throw new Error("Retriving related model info from Database failed.");
                }
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