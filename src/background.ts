import JSZip from 'jszip';
console.log("Calling background.ts")

function polling() {
  // console.log("polling");
  setTimeout(polling, 1000 * 30);
}

polling();

//if create a new window, make sure you delete the dist folder and let npm run build to rebuild

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openNewWindow") {
    console.log("open new window")
    chrome.windows.create({
      url: chrome.runtime.getURL('window.html'),
      type: 'popup',
      width: 1100,
      height: 750,
      left: 1450
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openOfflineWindow") {
    console.log("open offline window")
    chrome.windows.create({
      url: chrome.runtime.getURL('offlinewindow.html'),
      type: 'popup',
      width: 1400,
      height: 1075,
      left: 1800
    });
  }
});

interface ModelFile {
  name: string;
  downloadUrl: string;
}

interface ModelResource {
  type: string;
  url?: string;
}

interface ModelImage {
  url?: string;
}

interface ModelVersionObject {
  baseModel?: string;
  resources?: ModelResource[];
  images?: ModelImage[];
  // ... any other fields you need
}

interface RequestData {
  downloadFilePath: string;
  civitaiFileName: string;
  civitaiModelID: string;
  civitaiVersionID: string;
  civitaiModelFileList: ModelFile[];
  civitaiUrl: string;
  modelVersionObject: ModelVersionObject;
}

chrome.runtime.onMessage.addListener(
  async (request: { action: string; data: RequestData }, sender, sendResponse) => {
    if (request.action === "browser-download_v2_background") {
      console.log("browser-download_v2_background received in background");

      const {
        downloadFilePath,
        civitaiFileName,
        civitaiModelID,
        civitaiVersionID,
        civitaiModelFileList,
        civitaiUrl,
        modelVersionObject
      } = request.data || {};

      // 1) Basic naming
      const baseModel = modelVersionObject?.baseModel || "unknown";
      const normalizedDownloadFilePath = (downloadFilePath || "").replace(/^\/+|\/+$/g, "");
      const mainNameNoExt = civitaiFileName.replace(".safetensors", "");
      const modelName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${mainNameNoExt}`;

      try {
        //======================================================
        // (A) Create the "innerZip"
        //     Holds .safetensors, .civitai.info, .preview.png
        //======================================================
        const innerZip = new JSZip();

        // A1) Add all model files
        const filePromises = civitaiModelFileList.map(async ({ name, downloadUrl }) => {
          try {
            const resp = await fetch(downloadUrl);
            if (!resp.ok) {
              throw new Error(`HTTP error ${resp.status} - ${resp.statusText}`);
            }
            const data = await resp.arrayBuffer();
            const fileName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${name}`;
            innerZip.file(fileName, data);
          } catch (error) {
            console.error(`Error downloading ${name}:`, error);
          }
        });
        await Promise.all(filePromises);

        // A2) Add the .civitai.info
        const infoFileName = `${modelName}.civitai.info`;
        const infoContent = JSON.stringify(modelVersionObject, null, 2);
        innerZip.file(infoFileName, infoContent);

        // A3) Download a preview image or placeholder
        let previewBlob: Blob | null = null;
        const imageUrls = [
          ...(modelVersionObject.resources || [])
            .filter((r) => r.type === "image" && r.url)
            .map((r) => r.url!),
          ...(modelVersionObject.images || [])
            .filter((i) => i.url)
            .map((i) => i.url!)
        ];

        // Try actual images first
        for (const url of imageUrls) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              previewBlob = await resp.blob();
              break;
            }
          } catch (err) {
            console.error("Failed to download preview from", url, err);
          }
        }

        // Otherwise use placeholder
        if (!previewBlob) {
          try {
            const placeholderUrl = "https://placehold.co/350x450.png";
            const resp = await fetch(placeholderUrl);
            if (resp.ok) {
              previewBlob = await resp.blob();
            } else {
              console.error("Failed to download placeholder image");
            }
          } catch (err) {
            console.error("Failed to fetch placeholder image:", err);
          }
        }

        // Add preview to the innerZip if you want it *inside* as well
        if (previewBlob) {
          const innerPreviewName = `${modelName}.preview.png`;
          innerZip.file(innerPreviewName, previewBlob);
        }

        //======================================================
        // (B) Generate the "innerZip" as binary
        //======================================================
        const innerZipData = await innerZip.generateAsync({
          type: "uint8array",
          compression: "DEFLATE",
          compressionOptions: { level: 9 }
        });

        //======================================================
        // (C) Build the "outerZip"
        //     Replicate "abc/def/ghi/jkl" folder path
        //     Place {modelName}.zip and {modelName}.preview.png
        //     in that final folder. (No unique ID)
        //======================================================
        const outerZip = new JSZip();

        // C1) Create subfolders from downloadFilePath
        //     e.g. "abc/def/ghi/jkl"
        let currentFolder: JSZip = outerZip;
        if (normalizedDownloadFilePath) {
          const folders = normalizedDownloadFilePath.split("/");
          for (const folderName of folders) {
            currentFolder = currentFolder.folder(folderName) || currentFolder;
          }
        }
        // Now "currentFolder" is at the "jkl" level in your example

        // C2) Put the "innerZip" in that folder
        const innerZipFileName = `${modelName}.zip`;
        currentFolder.file(innerZipFileName, innerZipData);

        // C3) Also add the preview image at the same level
        //     (the same one used inside the inner zip, if you want duplication)
        if (previewBlob) {
          const outerPreviewName = `${modelName}.preview.png`;
          currentFolder.file(outerPreviewName, previewBlob);
        }

        //======================================================
        // (D) Generate the OUTER zip
        //======================================================
        const outerZipArrayBuffer = await outerZip.generateAsync({
          type: "arraybuffer",
          compression: "DEFLATE",
          compressionOptions: { level: 9 }
        });

        //======================================================
        // (E) Convert to data URL and download
        //======================================================
        const base64Data = arrayBufferToBase64(outerZipArrayBuffer);
        const dataUrl = `data:application/zip;base64,${base64Data}`;

        // Example final name: "123_456_unknown_model_outer.zip"
        // You can rename as you like
        const finalFilename = `${modelName}_outer.zip`;

        chrome.downloads.download(
          {
            url: dataUrl,
            filename: finalFilename,
            saveAs: false
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error("Download failed:", chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              console.log("Download started, ID:", downloadId);
              sendResponse({ success: true, downloadId });
            }
          }
        );

        return true; // indicates async response
      } catch (err) {
        console.error("Error in browser-download_v2_background:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
        return true;
      }
    }
  }
);

// Utility to convert ArrayBuffer or Uint8Array → base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let bytes: Uint8Array;
  if (buffer instanceof Uint8Array) {
    bytes = buffer;
  } else {
    bytes = new Uint8Array(buffer);
  }

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}



