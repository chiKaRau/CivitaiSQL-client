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
      width: 600,
      height: 700,
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
      width: 1300,
      height: 1075,
      left: 1800
    });
  }
});
// background.ts (or background.js)
// Make sure you have "downloads" permission in your manifest.json:
//   "permissions": [ "downloads" ]
// and "service_worker": "background.js" (Manifest V3).

// Helper: Convert ArrayBuffer → base64 string
function arrayBufferToBase64(buffer: any) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
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

    let baseModel = modelVersionObject?.baseModel || "unknown";

    // 1) Normalize downloadFilePath to remove leading/trailing slashes
    const normalizedDownloadFilePath = (downloadFilePath || "").replace(/^\/+|\/+$/g, '');

    // 2) Strip ".safetensors" from main file name if present
    let fname = civitaiFileName.replace(".safetensors", "");

    try {
      const zip = new JSZip();
      const promises = [];

      // 3) Download all model files
      for (const { name, downloadUrl } of civitaiModelFileList || []) {
        const promise = fetch(downloadUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status} - ${response.statusText}`);
            }
            return response.arrayBuffer();
          })
          .then((data) => {
            const fileName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${name}`;
            const filePath = `${normalizedDownloadFilePath}/${fileName}`;
            const parts = filePath.split('/');
            let folder = zip;

            for (const part of parts.slice(0, -1)) {
              folder = folder.folder(part) || folder; // ensure subfolder
            }
            folder.file(parts[parts.length - 1], data);
          })
          .catch((error) => console.error(`Error downloading ${name}: ${error}`));
        promises.push(promise);
      }

      // 4) Wait for all promises to finish
      await Promise.all(promises);

      // 5) Add .info JSON file to the zip
      const infoFileName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${fname}.civitai.info`;
      const infoFilePath = `${normalizedDownloadFilePath}/${infoFileName}`;
      const infoContent = JSON.stringify(modelVersionObject, null, 2);
      zip.file(infoFilePath, infoContent);

      // 6) Attempt to download a preview image
      const imageUrlsArray = [
        ...(modelVersionObject.resources || [])
          .filter((r: any) => r.type === 'image' && r.url)
          .map((r: any) => r.url),
        ...(modelVersionObject.images || [])
          .filter((i: any) => i.url)
          .map((i: any) => i.url),
      ];

      let previewImageAdded = false;
      for (const imageUrl of imageUrlsArray) {
        try {
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            const imageFileName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${fname}.preview.png`;
            const imageFilePath = `${normalizedDownloadFilePath}/${imageFileName}`;

            zip.file(imageFilePath, imageBlob);
            previewImageAdded = true;
            break; // stop after adding the first valid image
          }
        } catch (error) {
          console.error(`Failed to download image from ${imageUrl}: ${error}`);
        }
      }

      // 7) If no valid image was found, use a placeholder
      if (!previewImageAdded) {
        try {
          const placeholderUrl = "https://placehold.co/350x450.png";
          const placeholderResponse = await fetch(placeholderUrl);
          if (placeholderResponse.ok) {
            const placeholderBlob = await placeholderResponse.blob();
            const placeholderFileName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${fname}.preview.png`;
            const placeholderFilePath = `${normalizedDownloadFilePath}/${placeholderFileName}`;
            zip.file(placeholderFilePath, placeholderBlob);
          } else {
            console.error("Failed to download the placeholder image.");
          }
        } catch (error) {
          console.error("Failed to download the placeholder image.", error);
        }
      }

      // 8) Generate the zip archive as an ArrayBuffer (service-worker friendly)
      const zipArrayBuffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      // 9) Convert ArrayBuffer → Base64 → Data URL
      const base64Data = arrayBufferToBase64(zipArrayBuffer);
      const dataUrl = `data:application/zip;base64,${base64Data}`;

      // 10) Use the chrome.downloads.download API
      //     This triggers a file download in the user's browser
      const suggestedFilename = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${civitaiFileName.split(".")[0]}.zip`;

      chrome.downloads.download({
        url: dataUrl,
        filename: suggestedFilename,
        // conflictAction: 'uniquify' or 'overwrite' if you want
        saveAs: false // false = starts download immediately
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download failed:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log("Download started, ID:", downloadId);
          sendResponse({ success: true, downloadId });
        }
      });

      // Return true to indicate we will respond asynchronously
      return true;

    } catch (e) {
      console.log("Error in browser-download_v2_background:", e);
      sendResponse({ success: false, error: e || String(e) });
      return true;
    }
  }
});

