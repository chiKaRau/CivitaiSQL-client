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
  if (message.action === "browser-download_v2") {
    console.log("browser-download_v2");
    const { downloadFilePath, civitaiFileName, civitaiModelID,
      civitaiVersionID, civitaiModelFileList, civitaiUrl, modelVersionObject } = message.data;

    let baseModel = modelVersionObject?.baseModel;

    // Normalize downloadFilePath to remove leading/trailing slashes
    const normalizedDownloadFilePath = downloadFilePath.replace(/^\/+|\/+$/g, '');

    let fname = civitaiFileName.replace(".safetensors", "");

    try {
      const zip = new JSZip();
      const promises = [];

      // Download all model files
      for (const { name, downloadUrl } of civitaiModelFileList) {
        const promise = fetch(downloadUrl)
          .then((response) => response.arrayBuffer())
          .then((data) => {

            const fileName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${name}`;
            const filePath = `${normalizedDownloadFilePath}/${fileName}`;
            const parts = filePath.split('/');
            let folder = zip;

            for (const part of parts.slice(0, -1)) {
              const nextFolder = folder.folder(part);
              if (nextFolder) {
                folder = nextFolder;
              } else {
                console.error('JSZip instance is null');
                break;
              }
            }

            folder.file(parts[parts.length - 1], data);
          }).catch((error) => console.error(`Error downloading ${name}: ${error}`));
        promises.push(promise);
      }

      // Wait for all promises to complete
      await Promise.all(promises);

      // Add .info file to the zip
      const infoFileName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${fname}.civitai.info`;
      const infoFilePath = `${normalizedDownloadFilePath}/${infoFileName}`;
      const infoContent = JSON.stringify(modelVersionObject, null, 2);
      zip.file(infoFilePath, infoContent);

      // Handle preview image
      // Extract image URLs in a single line
      const imageUrlsArray = [
        ...(modelVersionObject.resources || []).filter((r: any) => r.type === 'image' && r.url).map((r: any) => r.url),
        ...(modelVersionObject.images || []).filter((i: any) => i.url).map((i: any) => i.url)
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
            break; // Stop after adding the first valid image
          }
        } catch (error) {
          console.error(`Failed to download image from ${imageUrl}: ${error}`);
        }
      }

      // If no valid image was found, use a placeholder
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
          console.error("Failed to download the placeholder image.");
        }
      }

      // Generate the zip archive
      const zipContent = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });

      // Create a download link for the zip file
      const zipBlob = new Blob([zipContent]);
      const zipUrl = URL.createObjectURL(zipBlob);

      const downloadLink = document.createElement('a');
      downloadLink.href = zipUrl;
      downloadLink.download = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${civitaiFileName.split(".")[0]}.zip`;
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
    let count = 0;

    let elements = Array.from(document.querySelectorAll('.mantine-Card-root'));
    // Start from the next item after the last processed one
    let startIndex = message.lastUpdateProcessedIndex || 0;
    let host = "https://civitai.com";
    for (let i = startIndex; i < elements.length && count < message.updateCount; i++) {
      let href = elements[i].getAttribute('href');

      if (href && !message.checkedUpdateList.includes(href)) {
        newUrlList.push(host + href);
        count++;
      }
      startIndex = i + 1; // Update the last processed index
    }
    chrome.runtime.sendMessage({ action: "checkifmodelAvaliable", newUrlList: newUrlList, lastUpdateProcessedIndex: startIndex });
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "sortingMode") {
    console.log("Sorting mode activated");

    // Cast the elements to HTMLAnchorElement to access href safely
    const cards = Array.from(document.querySelectorAll('.mantine-Card-root'))
      .filter((card): card is HTMLAnchorElement => card instanceof HTMLAnchorElement)
      .map(card => ({ element: card, url: card.href.replace("-commission", "") }));

    // Reverse the characters in each URL, sort them, then reverse the sort order
    const sortedCards = cards.sort((a, b) => {
      // Reverse the URL strings
      const reverseA = a.url.split('').reverse().join('').toLowerCase();
      const reverseB = b.url.split('').reverse().join('').toLowerCase();

      // Compare the reversed URLs
      return reverseA.localeCompare(reverseB);
    });

    // Select the container holding the cards
    const container = document.querySelector('.mantine-1ofgurw');
    if (!container) {
      console.error('Card container not found.');
      return;
    }

    // Check the current order and determine if it's already sorted
    const isCurrentlyReversed = container.lastChild === cards[cards.length - 1].element;

    // Reverse the sorted cards if the current order is already sorted
    if (isCurrentlyReversed) {
      sortedCards.reverse();
    }

    // Append the sorted cards to the container
    sortedCards.forEach(({ element }) => {
      container.appendChild(element);
    });
  }
});



chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "display-saved") {
    const savedList = message.savedList;

    document.querySelectorAll('.mantine-Card-root').forEach((item) => {
      if (item instanceof HTMLAnchorElement) {
        const url = item.href;
        const savedInfo = savedList?.find((info: any) => info.url === url);
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
        console.log(url)
        const savedInfo = savedList?.find((info: any) => info.url === url);

        if (savedInfo?.isUpdateAvaliable || savedInfo?.isEarlyAccess) {
          // Create a label
          const label = document.createElement('div');
          label.classList.add('update-early-label');

          let text = '';
          let backgroundColor = '';

          if (savedInfo.isUpdateAvaliable && savedInfo.isEarlyAccess) {
            text = 'Update Available & Early Access';
            backgroundColor = 'linear-gradient(to right, lightgreen, red)';
          } else if (savedInfo.isUpdateAvaliable) {
            text = 'Update Available';
            backgroundColor = 'lightgreen';
          } else if (savedInfo.isEarlyAccess) {
            text = 'Early Access';
            backgroundColor = 'red';
          }

          label.textContent = text;
          label.style.position = 'absolute';
          label.style.top = '70%';
          label.style.left = '50%';
          label.style.transform = 'translate(-50%, -50%)';
          label.style.zIndex = '1001';
          label.style.background = backgroundColor;
          label.style.color = 'white';
          label.style.textShadow = '0px 0px 3px black';
          label.style.padding = '5px 10px';
          label.style.borderRadius = '5px';
          label.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
          label.style.fontFamily = 'Arial, sans-serif';
          label.style.fontSize = '14px';
          label.style.fontWeight = 'bold';
          label.style.letterSpacing = '1px';
          label.style.textTransform = 'uppercase';
          label.style.display = 'flex'; // Flexbox for centering
          label.style.justifyContent = 'center'; // Center horizontally
          label.style.alignItems = 'center'; // Center vertically
          label.style.textAlign = 'center'; // Center text horizontally

          // Add label to the item
          if (item instanceof HTMLElement) {
            item.style.position = 'relative';
            item.appendChild(label);
          }
        }

      }
    });
  } else if (message.action === "remove-update-saved") {
    document.querySelectorAll('.mantine-Card-root').forEach((item) => {
      if (item instanceof HTMLAnchorElement) {
        // Remove only the label with the 'update-early-label' class
        const label = item.querySelector('.update-early-label');
        if (label) {
          item.removeChild(label);
        }
      }
    });
  }
});


