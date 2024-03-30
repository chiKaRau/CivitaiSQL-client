import JSZip from 'jszip';
console.log("Calling Content Script")

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "browser-download") {
    console.log("browser-download")
    const { name, modelID, versionID, downloadFilePath, filesList } = message.data
    try {
      const zip = new JSZip();
      const promises = [];
      for (const { name, downloadUrl } of filesList) {
        const promise = await fetch(downloadUrl)
          .then((response) => response.arrayBuffer())
          .then((data) => {

            const fileName = `${modelID}_${versionID}_${name}`;
            // Create the directories in the zip archive
            const filePath = `${downloadFilePath}${fileName}`;
            const parts = filePath.split('/');
            let folder: JSZip | null = zip;

            for (const part of parts.slice(0, -1)) {
              if (folder) {
                folder = folder.folder(part);
              } else {
                console.error('JSZip instance is null');
                break;
              }
            }

            // Add the file to the appropriate directory
            if (folder) {
              folder.file(parts[parts.length - 1], data);
            } else {
              console.error('JSZip instance is null');
            }
          }).catch((error) => console.error(`Error downloading ${name}: ${error}`));
        promises.push(promise);
      }

      // Wait for all promises to complete
      await Promise.all(promises);

      // Generate the zip archive
      const zipContent = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });

      // Create a download link for the zip file
      const zipBlob = new Blob([zipContent]);
      const zipUrl = URL.createObjectURL(zipBlob);

      const downloadLink = document.createElement('a');
      downloadLink.href = zipUrl;
      downloadLink.download = `${modelID}_${versionID}_${name.split(".")[0]}.zip`;
      downloadLink.style.display = 'none';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Clean up the URL object
      URL.revokeObjectURL(zipUrl);

    } catch (e) {
      console.log("error", e);
    }
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "display-checkboxes") {
    document.querySelectorAll('.mantine-Card-root').forEach((item, index) => {

      // Create a checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `checkbox-${index}`;
      checkbox.style.position = 'absolute';
      checkbox.style.top = '10px';
      checkbox.style.right = '10px';
      checkbox.style.zIndex = '1000';
      checkbox.style.transform = "scale(2.5)";

      // Add checkbox to the item
      if (item instanceof HTMLElement) {
        item.style.position = 'relative';
        item.appendChild(checkbox);
      }

      // Event listener for the checkbox
      checkbox.addEventListener('click', function (event) {
        // Stop event from propagating to item
        event.stopPropagation();
      });

      // Checkbox change event listener
      checkbox.addEventListener('change', function () {
        console.log(checkbox.checked);

        if (!(item instanceof HTMLAnchorElement)) {
          return;
        }
        const url = item.href;

        if (checkbox.checked) {
          item.style.border = '2px solid yellow';
          chrome.runtime.sendMessage({ action: "addUrl", url: url });
        } else {
          item.style.border = '';
          chrome.runtime.sendMessage({ action: "removeUrl", url: url });
        }
      });

    });
  } else if (message.action === "uncheck-url") {
    const urlToUncheck = message.url;
    document.querySelectorAll('.mantine-Card-root').forEach(item => {
      if (!(item instanceof HTMLAnchorElement)) {
        return;
      }
      const url = item.href;
      if (url === urlToUncheck) {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox instanceof HTMLInputElement) {
          checkbox.checked = false; // Now TypeScript knows checkbox is an HTMLInputElement
          item.style.border = ''; // Remove the border style if needed
        }
      }
    });
  } else if (message.action === "remove-checkboxes") {
    // Logic to remove checkboxes and revert CSS changes
    document.querySelectorAll('.mantine-Card-root').forEach(item => {
      // Remove the checkbox
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (checkbox) {
        item.removeChild(checkbox);
      }

      // Revert any CSS changes
      if (item instanceof HTMLElement) {
        item.style.border = '';
      }
    });
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "checkSavedMode") {
    let newUrlList: string[] = []; // Explicitly define urls as an array of strings
    document.querySelectorAll('.mantine-Card-root').forEach((item) => {
      if (item instanceof HTMLAnchorElement) {
        // Check if the URL is not already in checkedUrlList
        if (message.checkedUrlList && !message.checkedUrlList.includes(item.href)) {
          newUrlList.push(item.href);
        }
      }

    });
    chrome.runtime.sendMessage({ action: "checkUrlsInDatabase", newUrlList: newUrlList });
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "checkUpdateAvaliableMode") {
    let newUrlList: string[] = []; // Explicitly define urls as an array of strings
    document.querySelectorAll('.mantine-Card-root').forEach((item) => {
      if (item instanceof HTMLAnchorElement) {
        newUrlList.push(item.href);

      }

    });
    chrome.runtime.sendMessage({ action: "checkifmodelAvaliable", newUrlList: newUrlList });
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "sortingMode") {

    console.log("sortingMode")

    let newUrlList: string[] = []; // Explicitly define urls as an array of strings
    document.querySelectorAll('.mantine-Card-root').forEach((item) => {
      if (item instanceof HTMLAnchorElement) {

      }

    });
  }
});



chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "display-saved") {
    const savedList = message.savedList;
    document.querySelectorAll('.mantine-Card-root').forEach((item) => {
      if (item instanceof HTMLAnchorElement) {
        const url = item.href;
        const savedInfo = savedList.find((info: any) => info.url === url);
        if (savedInfo) {
          // Create a label
          const label = document.createElement('div');
          label.classList.add('saved-label');
          label.textContent = savedInfo.quantity > 0 ? `Saved : ${savedInfo.quantity}` : 'Not Saved';
          label.style.position = 'absolute';
          label.style.top = '50%';
          label.style.left = '50%';
          label.style.transform = 'translate(-50%, -50%)';
          label.style.zIndex = '1001';
          label.style.backgroundColor = savedInfo.quantity > 0 ? 'lightgreen' : 'tomato'; // Example colors
          label.style.color = 'white'; // Text color
          label.style.textShadow = '0px 0px 3px black'; // Text shadow for readability
          label.style.padding = '5px';
          label.style.borderRadius = '5px';

          // Add label to the item
          if (item instanceof HTMLElement) {
            item.style.position = 'relative';
            item.appendChild(label);
          }
        }
      }
    });
  } else if (message.action === "remove-saved") {
    document.querySelectorAll('.mantine-Card-root').forEach((item) => {
      if (item instanceof HTMLAnchorElement) {
        // Remove only the label with the 'saved-label' class
        const label = item.querySelector('.saved-label');
        if (label) {
          item.removeChild(label);
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "display-update-avaliable") {
    const savedList = message.savedList;
    document.querySelectorAll('.mantine-Card-root').forEach((item) => {
      if (item instanceof HTMLAnchorElement) {
        const url = item.href;
        const savedInfo = savedList.find((info: any) => info.url === url);
        if (savedInfo.isUpdateAvaliable) {
          // Create a label
          const label = document.createElement('div');
          label.classList.add('update-label');
          label.textContent = 'Update Avaliable';
          label.style.position = 'absolute';
          label.style.top = '70%';
          label.style.left = '50%';
          label.style.transform = 'translate(-50%, -50%)';
          label.style.zIndex = '1001';
          label.style.backgroundColor = 'lightgreen'; // Example colors
          label.style.color = 'white'; // Text color
          label.style.textShadow = '0px 0px 3px black'; // Text shadow for readability
          label.style.padding = '5px';
          label.style.borderRadius = '5px';

          // Add label to the item
          if (item instanceof HTMLElement) {
            item.style.position = 'relative';
            item.appendChild(label);
          }
        }
      }
    });
  }
});


