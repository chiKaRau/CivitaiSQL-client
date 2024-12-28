import JSZip from 'jszip';
console.log("Calling Content Script")

const cardSelector =
  '.relative.flex.overflow-hidden.rounded-md.border-gray-3.bg-gray-0.shadow-gray-4.dark\\:border-dark-4.dark\\:bg-dark-6.dark\\:shadow-dark-8.flex-col';

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



chrome.runtime.onMessage.addListener(
  async (
    message: {
      action: string;
      savedList?: Array<{
        url: string;
        quantity?: number;
        isUpdateAvaliable?: boolean;
        isEarlyAccess?: boolean
      }>;
      url?: string;
    },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    // Select the parent container with class 'mantine-1ofgurw'
    const parentContainer: HTMLElement | null = document.querySelector('.mantine-1ofgurw');

    if (!parentContainer) {
      console.warn("Container with class 'mantine-1ofgurw' not found.");
      return;
    }

    // Select only the direct child divs of the parent container
    const cardElements: NodeListOf<HTMLDivElement> = parentContainer.querySelectorAll(':scope > div');

    if (message.action === "display-checkboxes") {
      cardElements.forEach((item: HTMLDivElement, index: number) => {
        // Create a checkbox element
        const checkbox: HTMLInputElement = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `checkbox-${index}`;
        checkbox.style.position = 'absolute';
        checkbox.style.top = '10px';
        checkbox.style.right = '10px';
        checkbox.style.zIndex = '1000';
        checkbox.style.transform = "scale(2.5)";

        // Add checkbox to the item
        item.style.position = 'relative';
        item.appendChild(checkbox);

        // Event listener to prevent event propagation when clicking the checkbox
        checkbox.addEventListener('click', (event: MouseEvent) => {
          event.stopPropagation(); // Prevents the click from triggering other event listeners on parent elements
        });

        // Checkbox change event listener
        checkbox.addEventListener('change', () => {
          const linkElement: HTMLAnchorElement | null = item.querySelector('a');

          if (linkElement && linkElement.href) {
            const url: string = linkElement.href;

            if (checkbox.checked) {
              item.style.border = '2px solid yellow';
              chrome.runtime.sendMessage({ action: "addUrl", url: url });
            } else {
              item.style.border = '';
              chrome.runtime.sendMessage({ action: "removeUrl", url: url });
            }
          }
        });
      });
    } else if (message.action === "uncheck-url") {
      const urlToUncheck: string | undefined = message.url;

      if (!urlToUncheck) {
        console.warn("urlToUncheck is undefined or null.");
        return;
      }

      cardElements.forEach((item: HTMLDivElement) => {
        const linkElement: HTMLAnchorElement | null = item.querySelector('a');

        if (linkElement && linkElement.href === urlToUncheck) {
          const checkbox: HTMLInputElement | null = item.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.checked = false;
            item.style.border = '';
          }
        }
      });
    } else if (message.action === "check-url") {
      const urlToCheck: string | undefined = message.url;

      if (!urlToCheck) {
        console.warn("urlToCheck is undefined or null.");
        return;
      }

      cardElements.forEach((item: HTMLDivElement) => {
        const linkElement: HTMLAnchorElement | null = item.querySelector('a');

        if (linkElement && linkElement.href === urlToCheck) {
          const checkbox: HTMLInputElement | null = item.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.checked = true;
            item.style.border = '2px solid yellow';
          }
        }
      });
    } else if (message.action === "remove-checkboxes") {
      cardElements.forEach((item: HTMLDivElement) => {
        const checkbox: HTMLInputElement | null = item.querySelector('input[type="checkbox"]');

        if (checkbox) {
          item.removeChild(checkbox);
        }

        // Revert any CSS changes
        item.style.border = '';
      });
    }

    // Indicate that the response is handled asynchronously
    return true;
  }
);



chrome.runtime.onMessage.addListener(
  async (
    message: { action: string; checkedUrlList?: string[] },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "checkSavedMode") {
      const newUrlList: string[] = [];

      // Select the parent container with class 'mantine-1ofgurw'
      const parentContainer: HTMLElement | null = document.querySelector('.mantine-1ofgurw');

      if (parentContainer) {
        // Select only the direct child divs of the parent
        const childDivs: NodeListOf<HTMLDivElement> = parentContainer.querySelectorAll(':scope > div');

        childDivs.forEach((item: HTMLDivElement) => {
          // Optionally, ensure the div has an 'id'
          // if (!item.id) return;

          // Find the first <a> element within the current div
          const linkElement: HTMLAnchorElement | null = item.querySelector('a');
          console.log
          if (linkElement && linkElement.href) {
            // Check if 'checkedUrlList' exists and does not include the current href
            if (message.checkedUrlList && !message.checkedUrlList.includes(linkElement.href)) {
              newUrlList.push(linkElement.href);
            }
          }
        });

        // Send the list of new URLs back for further processing
        chrome.runtime.sendMessage({
          action: "checkUrlsInDatabase",
          newUrlList: newUrlList,
        });
      } else {
        console.warn("Parent container with class 'mantine-1ofgurw' not found.");
      }
    }

    // Indicate that the response is handled asynchronously
    return true;
  }
);


chrome.runtime.onMessage.addListener(async (message: any, sender, sendResponse) => {
  if (message.action === "checkUpdateAvaliableMode") {
    const newUrlList: string[] = [];

    // Select the parent container with class 'mantine-1ofgurw'
    const parentContainer: HTMLElement | null = document.querySelector('.mantine-1ofgurw');

    if (parentContainer) {
      // Select only the direct child divs of the parent
      const childDivs: NodeListOf<HTMLDivElement> = parentContainer.querySelectorAll(':scope > div');

      childDivs.forEach((item: HTMLDivElement) => {
        // Optionally, ensure the div has an 'id'
        // if (!item.id) return;

        // Find the first <a> element within the current div
        const linkElement: HTMLAnchorElement | null = item.querySelector('a');
        if (linkElement && linkElement.href) {
          // Check if 'checkedUrlList' exists and does not include the current href
          if (linkElement.href && !message.checkedUpdateList.includes(linkElement.href)) {
            newUrlList.push(linkElement.href);
          }
        }
      });
    }

    chrome.runtime.sendMessage({
      action: "checkifmodelAvaliable",
      newUrlList: newUrlList,
    });
  }
});


// Create a Map to cache hrefs associated with each div's unique id
const hrefMap: Map<string, string> = new Map();

// Flag to track the current sort order (true for ascending, false for descending)
let isSortedAscending: boolean = true;

// Function to sort the divs based on cached hrefs
function sortDivs(container: HTMLElement): void {
  // Select all child divs within the container
  const cardDivs = Array.from(container.children).filter(child => child instanceof HTMLElement) as HTMLElement[];

  // Map each div to its cached href
  const sortableCards: { element: HTMLElement; url: string }[] = cardDivs.map(div => {
    const divId: string = div.id;
    let url: string = hrefMap.get(divId) || "";

    // If the div currently has an <a>, update the cache
    const anchor = div.querySelector('a') as HTMLAnchorElement | null;
    if (anchor) {
      url = anchor.href.replace("-commission", "");
      hrefMap.set(divId, url);
    }

    // If there's still no URL, assign a default value to ensure consistent sorting
    if (!url) {
      url = isSortedAscending ? "zzz-default" : ""; // Adjust as needed
    }

    return { element: div, url };
  });

  console.log("test-sortableCards")
  console.log(sortableCards);

  // Sort the cards based on the reversed URL strings
  sortableCards.sort((a, b) => {
    const reverseA: string = a.url.split('').reverse().join('').toLowerCase();
    const reverseB: string = b.url.split('').reverse().join('').toLowerCase();
    return reverseA.localeCompare(reverseB);
  });

  // If the current sort is descending, reverse the sorted array to make it ascending
  if (!isSortedAscending) {
    sortableCards.reverse();
  }

  // Create a DocumentFragment to optimize DOM manipulation
  const fragment: DocumentFragment = document.createDocumentFragment();
  sortableCards.forEach(card => {
    fragment.appendChild(card.element); // Move the existing <div> into the fragment
  });

  // Append the sorted elements back to the container
  container.appendChild(fragment);

  // Toggle the sort state for the next activation
  isSortedAscending = !isSortedAscending;

  console.log(`Cards have been sorted in ${isSortedAscending ? 'ascending' : 'descending'} order.`);
}

// Listener for messages from the Chrome extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sortingMode") {
    console.log("Sorting mode activated");

    // Select the container holding the card divs
    const container = document.querySelector('.mantine-1ofgurw') as HTMLElement | null;
    if (!container) {
      console.error('Card container with class "mantine-1ofgurw" not found.');
      return;
    }

    // Perform the sorting based on the updated hrefMap
    sortDivs(container);
  }
});

// Initialize the hrefMap with existing <a> elements
initializeHrefMap();

// Function to scan and cache hrefs from existing divs on page load
function initializeHrefMap(): void {
  // Select the container holding the card divs
  const container = document.querySelector('.mantine-1ofgurw') as HTMLElement | null;
  if (!container) {
    console.error('Card container with class "mantine-1ofgurw" not found.');
    return;
  }

  // Select all child divs within the container
  const cardDivs = Array.from(container.children).filter(child => child instanceof HTMLElement) as HTMLElement[];

  cardDivs.forEach(div => {
    const divId: string = div.id;
    const anchor = div.querySelector('a') as HTMLAnchorElement | null;

    if (anchor) {
      // Process the href by removing "-commission" as per your original logic
      const processedUrl: string = anchor.href.replace("-commission", "");
      hrefMap.set(divId, processedUrl);
    }
  });

  console.log(`Initialized hrefMap with ${hrefMap.size} entries.`);
}

chrome.runtime.onMessage.addListener(
  async (
    message: { action: string; savedList?: Array<{ url: string; quantity: number }> },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "display-saved" || message.action === "remove-saved") {
      // Select the parent container with class 'mantine-1ofgurw'
      const container: HTMLElement | null = document.querySelector('.mantine-1ofgurw');

      if (!container) {
        console.warn("Container with class 'mantine-1ofgurw' not found.");
        return;
      }

      // Select only the direct child divs of the container
      const cardElements: NodeListOf<HTMLDivElement> = container.querySelectorAll(':scope > div');

      console.log(`Number of first-level card elements: ${cardElements.length}`);

      if (message.action === "display-saved") {
        const savedList: Array<{ url: string; quantity: number }> | undefined = message.savedList;

        // If savedList is not defined, just return
        if (!savedList) {
          console.warn("savedList is undefined or null.");
          return;
        }

        cardElements.forEach((item: HTMLDivElement) => {
          // Find the first <a> element inside the card
          const linkElement: HTMLAnchorElement | null = item.querySelector('a');

          if (linkElement && linkElement.href) {
            const url: string = linkElement.href;
            // Find the corresponding saved info for the URL
            const savedInfo = savedList.find((info) => info.url === url);

            if (savedInfo) {
              // Check if a label already exists to avoid duplicates
              const existingLabel = item.querySelector('.saved-label') as HTMLDivElement | null;

              if (!existingLabel) {
                // Create a label element
                const label: HTMLDivElement = document.createElement('div');
                label.classList.add('saved-label');
                label.textContent = savedInfo.quantity > 0 ? `Saved: ${savedInfo.quantity}` : 'Not Saved';

                // Style the label
                Object.assign(label.style, {
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: '1001',
                  backgroundColor: savedInfo.quantity > 0 ? 'lightgreen' : 'tomato',
                  color: 'white',
                  textShadow: '0px 0px 3px black',
                  padding: '5px',
                  borderRadius: '5px',
                  pointerEvents: 'none', // Prevents the label from interfering with user interactions
                });

                // Ensure the parent has relative positioning
                item.style.position = 'relative';
                item.appendChild(label);
              } else {
                // **Else Block: Update Existing Label**

                // Update the text content based on savedInfo.quantity
                existingLabel.textContent = savedInfo.quantity > 0 ? `Saved: ${savedInfo.quantity}` : 'Not Saved';

                // Update the background color based on savedInfo.quantity
                existingLabel.style.backgroundColor = savedInfo.quantity > 0 ? 'lightgreen' : 'tomato';

                // Optional: If other styles need to be updated based on savedInfo, do it here
                // For example:
                // existingLabel.style.borderColor = savedInfo.quantity > 0 ? 'green' : 'red';
              }
            }

          }
        });
      } else if (message.action === "remove-saved") {
        console.log("Removing saved labels...");

        cardElements.forEach((item: HTMLDivElement) => {
          // Find the saved label within the card
          const label: HTMLElement | null = item.querySelector('.saved-label');

          if (label) {
            console.log("Removing saved label from:", item);
            label.remove(); // Remove the label element directly
          }
        });
      }
    }

    // Indicate that the response is handled asynchronously
    return true;
  }
);



chrome.runtime.onMessage.addListener(
  async (
    message: { action: string; savedList?: Array<{ url: string; quantity?: number; isUpdateAvaliable?: boolean; isEarlyAccess?: boolean }> },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    const parentContainer: HTMLElement | null = document.querySelector('.mantine-1ofgurw');

    if (!parentContainer) {
      console.warn("Container with class 'mantine-1ofgurw' not found.");
      return;
    }

    // Select only the direct child divs of the parent container
    const cardElements: NodeListOf<HTMLDivElement> = parentContainer.querySelectorAll(':scope > div');

    if (message.action === "display-update-avaliable") {
      const savedList: Array<{ url: string; quantity?: number; isUpdateAvaliable?: boolean; isEarlyAccess?: boolean }> | undefined = message.savedList;

      if (!savedList) {
        console.warn("savedList is undefined or null.");
        return;
      }

      cardElements.forEach((item: HTMLDivElement) => {
        // Find the first <a> element inside the card
        const linkElement: HTMLAnchorElement | null = item.querySelector('a');

        if (linkElement && linkElement.href) {
          const url: string = linkElement.href;
          // Find the corresponding saved info for the URL
          const savedInfo = savedList.find((info) => info.url === url);

          if (savedInfo?.isUpdateAvaliable || savedInfo?.isEarlyAccess) {
            // Check if the label already exists to avoid duplicates
            if (!item.querySelector('.update-early-label')) {
              // Create a label element
              const label: HTMLDivElement = document.createElement('div');
              label.classList.add('update-early-label');

              let text: string = '';
              let backgroundColor: string = '';

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

              // Apply label styles
              label.textContent = text;
              Object.assign(label.style, {
                position: 'absolute',
                top: '70%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: '1001',
                background: backgroundColor,
                color: 'white',
                textShadow: '0px 0px 3px black',
                padding: '5px 10px',
                borderRadius: '5px',
                boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
              });

              // Ensure the parent has relative positioning
              item.style.position = 'relative';
              item.appendChild(label);
            }
          }
        }
      });
    } else if (message.action === "remove-update-saved") {
      console.log("Removing update and early access labels...");

      cardElements.forEach((item: HTMLDivElement) => {
        // Remove only the label with the 'update-early-label' class
        const label: HTMLElement | null = item.querySelector('.update-early-label');
        if (label) {
          console.log("Removing update label from:", item);
          label.remove(); // Remove the label element directly
        }
      });
    }

    // Indicate that the response is handled asynchronously
    return true;
  }
);

// contentScript.ts

// Utility function to wait for the parent container to be available
function waitForElement(selector: string, timeout = 10000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element as HTMLElement);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el as HTMLElement);
        obs.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms.`));
    }, timeout);
  });
}

// Function to initialize the MutationObserver
function initMutationObserver(parentContainer: HTMLElement) {
  // console.log("Initializing MutationObserver on parent container:", parentContainer);

  // Callback function to execute when mutations are observed
  const callback: MutationCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      // Handle added nodes
      if (mutation.type === 'childList') {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // console.log("New node added:", node);

              // Check if the added node is a card item (direct child div)
              if (node.matches(':scope > div')) {
                // console.log("New card item detected:", node);

                if (node.tagName.toLowerCase() === 'a') {
                  const anchor = node as HTMLAnchorElement;
                  //console.log("New <a> tag detected within card item:", anchor);

                  // If node.href is already absolute, use it directly
                  // Otherwise, construct the absolute URL using getAttribute
                  const suffixUrl = anchor.href; // Or use new URL(anchor.getAttribute('href')!, 'https://civitai.com').href;

                  chrome.runtime.sendMessage({
                    action: "checkUrlsInDatabase",
                    newUrlList: [suffixUrl],
                  });

                  const divParent = anchor.closest('div[id]') as HTMLElement | null;
                  if (divParent) {
                    const divId = divParent.id;
                    const processedUrl = anchor.href.replace("-commission", "");

                    // Update the hrefMap with the new href
                    hrefMap.set(divId, processedUrl);
                    console.log(`Added href to hrefMap: [${divId}] ${processedUrl}`);
                  }

                }

                // Optionally, process the new card item here
              }

              // Additionally, observe any nested changes within the added node
              observeCardItem(node);
            }
          });
        }

        if (mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // console.log("Node removed:", node);
              // Optionally, handle the removal of card items here
            }
          });
        }
      }

      // Optionally, handle attribute changes if needed
      if (mutation.type === 'attributes') {
        // console.log(`Attribute "${mutation.attributeName}" modified on:`, mutation.target);
      }
    }
  };

  // Create a MutationObserver instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Configuration of the observer:
  // - childList: true => Observe addition and removal of child nodes
  // - subtree: true => Observe changes within all descendants
  // This is important for detecting when content within card items is added dynamically
  observer.observe(parentContainer, {
    childList: true,
    subtree: true,
  });

  // console.log("MutationObserver initialized and now watching for changes.");
}

// Function to observe nested changes within a card item (e.g., when <a> tags are added)
function observeCardItem(cardItem: HTMLElement) {
  // Check if the card item already has an observer to prevent multiple observers
  if (cardItem.hasAttribute('data-observed')) {
    return;
  }

  // Mark the card item as observed
  cardItem.setAttribute('data-observed', 'true');

  // Callback for nested mutations within the card item
  const nestedCallback: MutationCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // console.log("Nested node added within card item:", node);
            // Check if an <a> tag is added
            if (node.tagName.toLowerCase() === 'a') {
              const anchor = node as HTMLAnchorElement;
              //console.log("New <a> tag detected within card item:", anchor);

              // If node.href is already absolute, use it directly
              // Otherwise, construct the absolute URL using getAttribute
              const suffixUrl = anchor.href; // Or use new URL(anchor.getAttribute('href')!, 'https://civitai.com').href;

              chrome.runtime.sendMessage({
                action: "checkUrlsInDatabase",
                newUrlList: [suffixUrl],
              });

              const divParent = anchor.closest('div[id]') as HTMLElement | null;
              if (divParent) {
                const divId = divParent.id;
                const processedUrl = anchor.href.replace("-commission", "");

                // Update the hrefMap with the new href
                hrefMap.set(divId, processedUrl);
                console.log(`Added href to hrefMap: [${divId}] ${processedUrl}`);
              }
            }
          }
        });
      }

      if (mutation.type === 'attributes') {
        // console.log(`Attribute "${mutation.attributeName}" modified on:`, mutation.target);
      }
    }
  };

  // Create a MutationObserver for the card item
  const nestedObserver = new MutationObserver(nestedCallback);

  // Start observing the card item for child additions and attribute changes
  nestedObserver.observe(cardItem, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  // console.log("Nested MutationObserver initialized for card item:", cardItem);
}

// Function to process existing card items on initial load
function processExistingCards(parentContainer: HTMLElement) {
  const cardItems = parentContainer.querySelectorAll(':scope > div');
  // console.log(`Processing ${cardItems.length} existing card items.`);

  cardItems.forEach((item) => {
    // console.log("Existing card item:", item);
    // Optionally, process each card item (e.g., extract URLs, apply labels)
    observeCardItem(item as HTMLElement);
  });
}

// Main function to initialize the content script
async function main() {
  const parentContainerSelector = '[class^="mantine-1ofgurw"]'; // Adjust this selector as needed

  try {
    const parentContainer = await waitForElement(parentContainerSelector, 15000); // Wait up to 15 seconds
    // console.log("Parent container found:", parentContainer);

    // Initialize the MutationObserver on the parent container
    initMutationObserver(parentContainer);

    // Process existing card items
    processExistingCards(parentContainer);
  } catch (error) {
    console.error(error);
  }
}

// Run the main function once the script is loaded
main();




