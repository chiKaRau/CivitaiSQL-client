import JSZip from 'jszip';
console.log("Calling Content Script")

const cardSelector =
  '.relative.flex.overflow-hidden.rounded-md.border-gray-3.bg-gray-0.shadow-gray-4.dark\\:border-dark-4.dark\\:bg-dark-6.dark\\:shadow-dark-8.flex-col';

const CIVITAI_GRID_SELECTOR = '[class^="MasonryGrid_grid__6QtWa"]';
const CIVITAIARCHIVE_GRID_SELECTOR =
  'div.grid.grid-cols-2.md\\:grid-cols-4.lg\\:grid-cols-6.gap-4';

const stagedInfoMap: Map<string, { action: string }> = new Map();

function normalizeUrl(url: string): string {
  return (url || "").replace("-commission", "");
}

function getModelContainer(): HTMLElement | null {
  return (
    document.querySelector(CIVITAI_GRID_SELECTOR) as HTMLElement | null ||
    document.querySelector(CIVITAIARCHIVE_GRID_SELECTOR) as HTMLElement | null
  );
}

function getModelCards(container?: HTMLElement | null): HTMLElement[] {
  const root = container || getModelContainer();
  if (!root) return [];

  return Array.from(root.children).filter((child): child is HTMLElement => {
    return child instanceof HTMLElement;
  });
}

function getCardLink(card: HTMLElement): HTMLAnchorElement | null {
  if (card.tagName.toLowerCase() === 'a') {
    return card as HTMLAnchorElement;
  }
  return card.querySelector('a') as HTMLAnchorElement | null;
}

function isDirectCardElement(node: HTMLElement, parentContainer: HTMLElement): boolean {
  if (node.parentElement !== parentContainer) return false;

  const tag = node.tagName.toLowerCase();
  return tag === 'div' || tag === 'a';
}

function applyOpenInNewTab(card: HTMLElement) {
  const link = getCardLink(card);
  if (!link) return;

  link.target = "_blank";
  link.rel = "noopener noreferrer";
}

function upsertStagedBadge(card: HTMLElement, action: string) {
  let badge = card.querySelector('.staged-badge') as HTMLDivElement | null;

  const text = action ? `STAGED (${action.toUpperCase()})` : "STAGED";

  if (!badge) {
    badge = document.createElement('div');
    badge.classList.add('staged-badge');

    Object.assign(badge.style, {
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: '1002',
      backgroundColor: '#7c3aed',
      color: 'white',
      textShadow: '0px 0px 3px black',
      padding: '4px 8px',
      borderRadius: '6px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      letterSpacing: '0.5px',
      pointerEvents: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
    });

    if (!card.style.position) card.style.position = 'relative';
    card.appendChild(badge);
  }

  badge.textContent = text;

  if (action === "offline") badge.style.backgroundColor = '#2563eb';
  else if (action === "bundle") badge.style.backgroundColor = '#16a34a';
  else badge.style.backgroundColor = '#7c3aed';
}

function removeStagedBadge(card: HTMLElement) {
  const badge = card.querySelector('.staged-badge') as HTMLElement | null;
  if (badge) badge.remove();
}

function applyStagedForCard(card: HTMLElement) {
  const a = getCardLink(card);
  if (!a?.href) return;

  const url = normalizeUrl(a.href);
  const info = stagedInfoMap.get(url);

  if (info) upsertStagedBadge(card, info.action);
  else removeStagedBadge(card);
}

function displayStagedBadges(): void {
  const container = getModelContainer();
  if (!container) return;

  const cards = getModelCards(container);
  cards.forEach((card) => applyStagedForCard(card));
}

function removeAllStagedBadges(): void {
  const container = getModelContainer();
  if (!container) return;

  const cards = getModelCards(container);
  cards.forEach((card) => removeStagedBadge(card));
}

chrome.runtime.onMessage.addListener(
  async (
    message: {
      action: string;
      stagedList?: Array<{ url: string; action: string }>;
      url?: string;
      stageAction?: string;
    },
    sender,
    sendResponse
  ) => {
    if (message.action === "display-staged") {
      if (!message.stagedList) return true;

      stagedInfoMap.clear();
      message.stagedList.forEach((x) => {
        stagedInfoMap.set(normalizeUrl(x.url), { action: x.action });
      });

      displayStagedBadges();
      return true;
    }

    if (message.action === "remove-staged") {
      stagedInfoMap.clear();
      removeAllStagedBadges();
      return true;
    }

    if (message.action === "stage-url" && message.url) {
      stagedInfoMap.set(normalizeUrl(message.url), { action: message.stageAction || "" });
      displayStagedBadges();
      return true;
    }

    if (message.action === "unstage-url" && message.url) {
      stagedInfoMap.delete(normalizeUrl(message.url));
      displayStagedBadges();
      return true;
    }

    return true;
  }
);

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

            if (folder) {
              folder.file(parts[parts.length - 1], data);
            } else {
              console.error('JSZip instance is null');
            }
          }).catch((error) => console.error(`Error downloading ${name}: ${error}`));
        promises.push(promise);
      }

      await Promise.all(promises);

      const zipContent = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });

      const zipBlob = new Blob([zipContent]);
      const zipUrl = URL.createObjectURL(zipBlob);

      const downloadLink = document.createElement('a');
      downloadLink.href = zipUrl;
      downloadLink.download = `${modelID}_${versionID}_${name.split(".")[0]}.zip`;
      downloadLink.style.display = 'none';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      URL.revokeObjectURL(zipUrl);

    } catch (e) {
      console.log("error", e);
    }
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "browser-download_v2") {
    console.log("browser-download_v2");

    const {
      downloadFilePath,
      civitaiFileName,
      civitaiModelID,
      civitaiVersionID,
      civitaiModelFileList,
      civitaiUrl,
      modelVersionObject
    } = message.data;

    const baseModel = modelVersionObject?.baseModel || "unknown";
    const normalizedDownloadFilePath = (downloadFilePath || "").replace(/^\/+|\/+$/g, '');
    const mainNameNoExt = civitaiFileName.replace(".safetensors", "");
    const modelName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${mainNameNoExt}`;

    try {
      const innerZip = new JSZip();

      const filePromises = civitaiModelFileList.map(({ name, downloadUrl }: { name: string, downloadUrl: string }) =>
        fetch(downloadUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status} - ${response.statusText}`);
            }
            return response.arrayBuffer();
          })
          .then((data) => {
            const fileName = `${civitaiModelID}_${civitaiVersionID}_${baseModel}_${name}`;
            innerZip.file(fileName, data);
          })
          .catch((error) => {
            console.error(`Error downloading ${name}:`, error);
          })
      );
      await Promise.all(filePromises);

      const infoFileName = `${modelName}.civitai.info`;
      const infoContent = JSON.stringify(modelVersionObject, null, 2);
      innerZip.file(infoFileName, infoContent);

      const imageUrlsArray = [
        ...(modelVersionObject.resources || [])
          .filter((r: any) => r.type === 'image' && r.url)
          .map((r: any) => r.url),
        ...(modelVersionObject.images || [])
          .filter((i: any) => i.url)
          .map((i: any) => i.url)
      ];

      let previewBlob = null;
      for (const imageUrl of imageUrlsArray) {
        try {
          const resp = await fetch(imageUrl);
          if (resp.ok) {
            previewBlob = await resp.blob();
            break;
          }
        } catch (e) {
          console.error(`Failed to download preview image ${imageUrl}: `, e);
        }
      }

      if (!previewBlob) {
        try {
          const placeholderUrl = "https://placehold.co/350x450.png";
          const placeholderResp = await fetch(placeholderUrl);
          if (placeholderResp.ok) {
            previewBlob = await placeholderResp.blob();
          } else {
            console.error("Failed to download placeholder image.");
          }
        } catch (e) {
          console.error("Failed to fetch placeholder image:", e);
        }
      }

      if (previewBlob) {
        const previewInsideName = `${modelName}.preview.png`;
        innerZip.file(previewInsideName, previewBlob);
      }

      const innerZipData = await innerZip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      const outerZip = new JSZip();

      let currentFolder = outerZip;
      if (normalizedDownloadFilePath) {
        const parts = normalizedDownloadFilePath.split('/');
        for (const part of parts) {
          currentFolder = currentFolder.folder(part) || currentFolder;
        }
      }

      const innerZipFileName = `${modelName}.zip`;
      currentFolder.file(innerZipFileName, innerZipData);

      if (previewBlob) {
        const previewOutsideName = `${modelName}.preview.png`;
        currentFolder.file(previewOutsideName, previewBlob);
      }

      const outerZipBlob = await outerZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      const zipUrl = URL.createObjectURL(outerZipBlob);
      const downloadLink = document.createElement('a');
      const finalZipFilename = `${modelName}_outer.zip`;

      downloadLink.href = zipUrl;
      downloadLink.download = finalZipFilename;
      downloadLink.style.display = 'none';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      URL.revokeObjectURL(zipUrl);

    } catch (e) {
      console.error("Error:", e);
    }
  }
});

function addCardCheckbox(item: HTMLElement, index?: number) {
  if (item.querySelector('input[type="checkbox"].model-card-checkbox')) return;

  const checkbox: HTMLInputElement = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'model-card-checkbox';
  if (index != null) checkbox.id = `checkbox-${index}`;

  checkbox.style.position = 'absolute';
  checkbox.style.top = '10px';
  checkbox.style.right = '10px';
  checkbox.style.zIndex = '1000';
  checkbox.style.transform = 'scale(2.5)';

  if (!item.style.position) item.style.position = 'relative';
  item.appendChild(checkbox);

  checkbox.addEventListener('click', (event: MouseEvent) => {
    event.stopPropagation();
  });

  checkbox.addEventListener('change', () => {
    const linkElement = getCardLink(item);
    if (linkElement?.href) {
      const url = linkElement.href;

      const imgEl = linkElement.querySelector('img') as HTMLImageElement | null;
      const imgSrc = imgEl?.currentSrc || imgEl?.src || "";

      if (checkbox.checked) {
        item.style.border = '2px solid yellow';
        chrome.runtime.sendMessage({ action: 'addUrl', url, imgSrc });
      } else {
        item.style.border = '';
        chrome.runtime.sendMessage({ action: 'removeUrl', url });
      }
    }
  });
}

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
    const parentContainer: HTMLElement | null = getModelContainer();

    if (!parentContainer) {
      console.warn("Model container not found.");
      return;
    }

    const cardElements = getModelCards(parentContainer);

    if (message.action === "display-checkboxes") {
      cardElements.forEach((item: HTMLElement, index: number) => {
        addCardCheckbox(item, index);
      });
    } else if (message.action === "uncheck-url") {
      const urlToUncheck: string | undefined = message.url;

      if (!urlToUncheck) {
        console.warn("urlToUncheck is undefined or null.");
        return;
      }

      cardElements.forEach((item: HTMLElement) => {
        const linkElement = getCardLink(item);

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

      cardElements.forEach((item: HTMLElement) => {
        const linkElement = getCardLink(item);

        if (linkElement && linkElement.href === urlToCheck) {
          const checkbox: HTMLInputElement | null = item.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.checked = true;
            item.style.border = '2px solid yellow';
          }
        }
      });
    } else if (message.action === "remove-checkboxes") {
      cardElements.forEach((item: HTMLElement) => {
        const checkbox: HTMLInputElement | null = item.querySelector('input[type="checkbox"]');

        if (checkbox) {
          item.removeChild(checkbox);
        }

        item.style.border = '';
      });
    }

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
      const parentContainer: HTMLElement | null = getModelContainer();

      if (parentContainer) {
        const childCards = getModelCards(parentContainer);

        childCards.forEach((item: HTMLElement) => {
          const linkElement = getCardLink(item);
          console.log
          if (linkElement && linkElement.href) {
            if (message.checkedUrlList && !message.checkedUrlList.includes(linkElement.href)) {
              newUrlList.push(linkElement.href);
            }
          }
        });

        chrome.runtime.sendMessage({
          action: "checkUrlsInDatabase",
          newUrlList: newUrlList,
        });
      } else {
        console.warn("Model container not found.");
      }
    }

    return true;
  }
);

chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  if (message.action === "checkUpdateAvaliableMode") {
    const newUrlList: string[] = [];
    const checkedSet = new Set<string>(message.checkedUpdateList);

    hrefMap.forEach((href: string) => {
      if (!checkedSet.has(href)) {
        newUrlList.push(href);
      }
    });

    chrome.runtime.sendMessage({
      action: "checkifmodelAvaliable",
      newUrlList: newUrlList,
    });

    console.log(`checkUpdateAvaliableMode: Found ${newUrlList.length} new URLs to check.`);
  }
});

const hrefMap: Map<string, string> = new Map();
const updateInfoMap: Map<string, { quantity: number; isUpdateAvaliable: boolean; isEarlyAccess: boolean }> = new Map();
let isSortedAscending: boolean = true;

function sortDivs(container: HTMLElement): void {
  const cardDivs = getModelCards(container);

  const sortableCards: { element: HTMLElement; url: string }[] = cardDivs.map(div => {
    const divId: string = div.id;
    let url: string = hrefMap.get(divId) || "";

    const anchor = getCardLink(div);
    if (anchor) {
      url = anchor.href.replace("-commission", "");
      if (divId) {
        hrefMap.set(divId, url);
      }
    }

    if (!url) {
      url = isSortedAscending ? "zzz-default" : "";
    }

    return { element: div, url };
  });

  console.log("test-sortableCards")
  console.log(sortableCards);

  sortableCards.sort((a, b) => {
    const reverseA: string = a.url.split('').reverse().join('').toLowerCase();
    const reverseB: string = b.url.split('').reverse().join('').toLowerCase();
    return reverseA.localeCompare(reverseB);
  });

  if (!isSortedAscending) {
    sortableCards.reverse();
  }

  const fragment: DocumentFragment = document.createDocumentFragment();
  sortableCards.forEach(card => {
    fragment.appendChild(card.element);
  });

  container.appendChild(fragment);
  isSortedAscending = !isSortedAscending;

  console.log(`Cards have been sorted in ${isSortedAscending ? 'ascending' : 'descending'} order.`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sortingMode") {
    console.log("Sorting mode activated");

    const container = getModelContainer();
    if (!container) {
      console.error('Model container not found.');
      return;
    }

    sortDivs(container);
  }
});

initializeHrefMap();

function initializeHrefMap(): void {
  const container = getModelContainer();
  if (!container) {
    console.error('Model container not found.');
    return;
  }

  const cardDivs = getModelCards(container);

  cardDivs.forEach(div => {
    const divId: string = div.id;
    const anchor = getCardLink(div);

    if (anchor) {
      const processedUrl: string = anchor.href.replace("-commission", "");
      if (divId) {
        hrefMap.set(divId, processedUrl);
      }
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
      const container: HTMLElement | null = getModelContainer();

      if (!container) {
        console.warn("Model container not found.");
        return;
      }

      const cardElements = getModelCards(container);

      console.log(`Number of first-level card elements: ${cardElements.length}`);

      if (message.action === "display-saved") {
        const savedList: Array<{ url: string; quantity: number }> | undefined = message.savedList;

        if (!savedList) {
          console.warn("savedList is undefined or null.");
          return;
        }

        cardElements.forEach((item: HTMLElement) => {
          const linkElement = getCardLink(item);

          if (linkElement && linkElement.href) {
            const url: string = linkElement.href;
            const savedInfo = savedList.find((info) => info.url === url);

            if (savedInfo) {
              const existingLabel = item.querySelector('.saved-label') as HTMLDivElement | null;

              if (!existingLabel) {
                const label: HTMLDivElement = document.createElement('div');
                label.classList.add('saved-label');
                label.textContent = savedInfo.quantity > 0 ? `Saved: ${savedInfo.quantity}` : 'Not Saved';

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
                  pointerEvents: 'none',
                });

                item.style.position = 'relative';
                item.appendChild(label);
              } else {
                existingLabel.textContent = savedInfo.quantity > 0 ? `Saved: ${savedInfo.quantity}` : 'Not Saved';
                existingLabel.style.backgroundColor = savedInfo.quantity > 0 ? 'lightgreen' : 'tomato';
              }
            }
          }
        });
      } else if (message.action === "remove-saved") {
        console.log("Removing saved labels...");

        cardElements.forEach((item: HTMLElement) => {
          const label: HTMLElement | null = item.querySelector('.saved-label');

          if (label) {
            console.log("Removing saved label from:", item);
            label.remove();
          }
        });
      }
    }

    return true;
  }
);

chrome.runtime.onMessage.addListener(
  async (
    message: { action: string; offlineList?: Array<{ url: string; quantity: number }> },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "display-offline" || message.action === "remove-offline") {
      const container: HTMLElement | null = getModelContainer();

      if (!container) {
        console.warn("Model container not found.");
        return;
      }

      const cardElements = getModelCards(container);

      console.log(`Number of first-level card elements: ${cardElements.length}`);

      if (message.action === "display-offline") {
        const offlinelist: Array<{ url: string; quantity: number }> | undefined = message.offlineList;

        if (!offlinelist) {
          console.warn("offlineList is undefined or null.");
          return;
        }

        cardElements.forEach((item: HTMLElement) => {
          const linkElement = getCardLink(item);

          if (linkElement && linkElement.href) {
            const url: string = linkElement.href;
            const offlineInfo = offlinelist.find((info) => info.url === url);

            if (offlineInfo) {
              const existingLabel = item.querySelector('.offline-label') as HTMLDivElement | null;

              if (offlineInfo.quantity > 0) {
                if (!existingLabel) {
                  const label: HTMLDivElement = document.createElement('div');
                  label.classList.add('offline-label');
                  label.textContent = `Offline: ${offlineInfo.quantity}`;

                  Object.assign(label.style, {
                    position: 'absolute',
                    top: '40%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: '1001',
                    backgroundColor: 'blue',
                    color: 'white',
                    textShadow: '0px 0px 3px black',
                    padding: '5px',
                    borderRadius: '5px',
                    pointerEvents: 'none',
                  });

                  item.style.position = 'relative';
                  item.appendChild(label);
                } else {
                  existingLabel.textContent = `Offline: ${offlineInfo.quantity}`;
                  existingLabel.style.backgroundColor = 'blue';
                }
              } else {
                if (existingLabel) {
                  existingLabel.remove();
                }
              }
            }
          }
        });
      } else if (message.action === "remove-offline") {
        console.log("Removing offline labels...");

        cardElements.forEach((item: HTMLElement) => {
          const label: HTMLElement | null = item.querySelector('.offline-label');

          if (label) {
            console.log("Removing offline label from:", item);
            label.remove();
          }
        });
      }
    }

    return true;
  }
);

chrome.runtime.onMessage.addListener(
  async (
    message: { action: string; savedList?: Array<{ url: string; quantity: number; isUpdateAvaliable: boolean; isEarlyAccess: boolean }> },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    const parentContainer: HTMLElement | null = getModelContainer();

    if (!parentContainer) {
      console.warn("Model container not found.");
      return;
    }

    const cardElements = getModelCards(parentContainer);

    if (message.action === "display-update-avaliable") {
      const savedList: Array<{ url: string; quantity: number; isUpdateAvaliable: boolean; isEarlyAccess: boolean }> | undefined = message.savedList;

      if (!savedList) {
        console.warn("savedList is undefined or null.");
        return;
      }

      savedList.forEach(item => {
        updateInfoMap.set(item.url, {
          quantity: item.quantity || 0,
          isUpdateAvaliable: item.isUpdateAvaliable || false,
          isEarlyAccess: item.isEarlyAccess || false,
        });
      });

      console.log(`display-update-avaliable: Stored update information for ${updateInfoMap.size} URLs.`);
      displayUpdateLabels();
    } else if (message.action === "remove-update-saved") {
      console.log("Removing update and early access labels...");
      removeUpdateLabels();
    }

    return true;
  }
);

chrome.runtime.onMessage.addListener(
  async (
    message: {
      action: string;
    },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    const parentContainer: HTMLElement | null = getModelContainer();

    if (!parentContainer) {
      console.warn("Model container not found.");
      return;
    }

    const cardElements = getModelCards(parentContainer);

    if (message.action === "display-creator-button") {
      cardElements.forEach((card: HTMLElement) => {
        addCreatorButton(card);
      });
      console.log("Creator URL buttons added to all cards.");
      sendResponse({ status: "success", message: "Creator URL buttons added." });
    }

    return true;
  }
);

function displayUpdateLabels(): void {
  const parentContainer: HTMLElement | null = getModelContainer();

  if (!parentContainer) {
    console.warn("Model container not found.");
    return;
  }

  const cardElements = getModelCards(parentContainer);

  cardElements.forEach((item: HTMLElement) => {
    const linkElement = getCardLink(item);

    if (linkElement && linkElement.href) {
      const url: string = linkElement.href;
      const updateInfo = updateInfoMap.get(url);

      if (updateInfo?.isUpdateAvaliable || updateInfo?.isEarlyAccess) {
        if (!item.querySelector('.update-early-label')) {
          const label: HTMLDivElement = document.createElement('div');
          label.classList.add('update-early-label');

          let text: string = '';
          let backgroundColor: string = '';

          if (updateInfo.isUpdateAvaliable && updateInfo.isEarlyAccess) {
            text = 'Update Available & Early Access';
            backgroundColor = 'linear-gradient(to right, lightgreen, red)';
          } else if (updateInfo.isUpdateAvaliable) {
            text = 'Update Available';
            backgroundColor = 'lightgreen';
          } else if (updateInfo.isEarlyAccess) {
            text = 'Early Access';
            backgroundColor = 'red';
          }

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
            pointerEvents: 'none',
          });

          item.style.position = 'relative';
          item.appendChild(label);
        }
      }
    }
  });

  console.log("Displayed update labels based on updateInfoMap.");
}

function removeUpdateLabels(): void {
  const parentContainer: HTMLElement | null = getModelContainer();

  if (!parentContainer) {
    console.warn("Model container not found.");
    return;
  }

  const cardElements = getModelCards(parentContainer);

  cardElements.forEach((item: HTMLElement) => {
    const label: HTMLElement | null = item.querySelector('.update-early-label');
    if (label) {
      console.log("Removing update label from:", item);
      label.remove();
    }
  });

  console.log("Removed all update labels from card elements.");
}

function handleNewCard(cardItem: HTMLElement): void {
  const linkElement = getCardLink(cardItem);

  if (linkElement && linkElement.href) {
    const url: string = linkElement.href;
    const updateInfo = updateInfoMap.get(url);

    if (updateInfo?.isUpdateAvaliable || updateInfo?.isEarlyAccess) {
      if (!cardItem.querySelector('.update-early-label')) {
        const label: HTMLDivElement = document.createElement('div');
        label.classList.add('update-early-label');

        let text: string = '';
        let backgroundColor: string = '';

        if (updateInfo.isUpdateAvaliable && updateInfo.isEarlyAccess) {
          text = 'Update Available & Early Access';
          backgroundColor = 'linear-gradient(to right, lightgreen, red)';
        } else if (updateInfo.isUpdateAvaliable) {
          text = 'Update Available';
          backgroundColor = 'lightgreen';
        } else if (updateInfo.isEarlyAccess) {
          text = 'Early Access';
          backgroundColor = 'red';
        }

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
          pointerEvents: 'none',
        });

        cardItem.style.position = 'relative';
        cardItem.appendChild(label);
      }
    }
  }
}

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

function injectButtonStyles() {
  if (document.getElementById("creator-button-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "creator-button-styles";
  style.innerHTML = `
    .add-creator-button {
      margin-left: 10px;
      padding: 5px 10px;
      height: 40px;
      font-size: 14px;
      border: none;
      border-radius: 4px;
      background-color: #1976d2;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      transition: background-color 0.5s ease, box-shadow 0.5s ease;
    }
    .add-creator-button:hover {
      background-color: #115293;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }
    .add-creator-button.success {
      background-color: #4caf50;
    }
    .add-creator-button.failed {
      background-color: #f44336;
    }
  `;
  document.head.appendChild(style);
}

function sendActionToReact(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      console.log("sendMessage callback response:", response, "lastError:", chrome.runtime.lastError);
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

function displayTemporaryMessage(button: HTMLButtonElement, message: string, originalText: string) {
  button.textContent = message;

  if (message === "Success") {
    button.classList.add('success');
  } else if (message === "Failed") {
    button.classList.add('failed');
  }

  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('success');
    button.classList.remove('failed');
  }, 1000);
}

function addCreatorButton(card: HTMLElement) {
  if (card.querySelector('.add-creator-button')) {
    return;
  }

  const creatorElement =
    card.querySelector('.UserAvatarSimple_username__1HunV') ||
    Array.from(card.querySelectorAll('span')).find((el) => (el.textContent || '').trim().startsWith('by '));

  if (creatorElement) {
    const rawCreatorText = creatorElement.textContent?.trim() || 'Unknown';
    const creatorName = rawCreatorText.replace(/^by\s+/i, '').trim() || 'Unknown';

    const button = document.createElement('button');
    button.classList.add('add-creator-button');
    const originalText = `Add ${creatorName} to list`;
    button.textContent = originalText;

    button.addEventListener('click', async () => {
      button.textContent = "Processing...";
      try {
        const response = await sendActionToReact({ action: "addCreator", creator: creatorName });
        console.log("response");
        console.log(response);

        if (response && response.status === "success") {
          displayTemporaryMessage(button, "Success", originalText);
        } else {
          displayTemporaryMessage(button, "Failed", originalText);
        }
      } catch (error) {
        displayTemporaryMessage(button, "Failed", originalText);
      }
    });

    const footer = card.querySelector('.AspectRatioImageCard_footer__FOU7a');
    if (footer) {
      const footerContent = footer.querySelector('div.flex.w-full.flex-col.items-start.gap-1');
      if (footerContent) {
        footerContent.appendChild(button);
      } else {
        footer.appendChild(button);
      }

      button.style.display = 'block';
      button.style.marginTop = '10px';
      return;
    }

    // civitaiarchive fallback
    const bottomOverlay = Array.from(card.querySelectorAll('div')).find((el) =>
      (el.className || '').toString().includes('bg-gradient-to-t')
    ) as HTMLElement | undefined;

    if (bottomOverlay) {
      bottomOverlay.appendChild(button);
      button.style.display = 'block';
      button.style.marginTop = '10px';
    }
  }
}

function initMutationObserver(parentContainer: HTMLElement) {
  const callback: MutationCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (isDirectCardElement(node, parentContainer)) {
                const anchor = getCardLink(node);
                if (anchor) {
                  const suffixUrl = anchor.href;

                  chrome.runtime.sendMessage({
                    action: "checkUrlsInDatabase",
                    newUrlList: [suffixUrl],
                  });

                  const cardEl = node;
                  const divId = cardEl.id;
                  const processedUrl = anchor.href.replace("-commission", "");

                  if (divId) {
                    hrefMap.set(divId, processedUrl);
                    console.log(`Added href to hrefMap: [${divId}] ${processedUrl}`);
                  }

                  if (updateInfoMap.has(processedUrl) || updateInfoMap.has(anchor.href)) {
                    handleNewCard(cardEl);
                  }

                  applyOpenInNewTab(cardEl);
                  addCreatorButton(cardEl);
                  addCardCheckbox(cardEl);
                  applyStagedForCard(cardEl);
                }
              }

              observeCardItem(node);
            }
          });
        }

        if (mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
            }
          });
        }
      }

      if (mutation.type === 'attributes') {
      }
    }
  };

  const observer = new MutationObserver(callback);

  observer.observe(parentContainer, {
    childList: true,
    subtree: true,
  });
}

function observeCardItem(cardItem: HTMLElement) {
  if (cardItem.hasAttribute('data-observed')) {
    return;
  }

  cardItem.setAttribute('data-observed', 'true');

  const nestedCallback: MutationCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const anchor =
              node.tagName.toLowerCase() === 'a'
                ? (node as HTMLAnchorElement)
                : (node.querySelector('a') as HTMLAnchorElement | null);

            if (anchor) {
              const suffixUrl = anchor.href;

              chrome.runtime.sendMessage({
                action: "checkUrlsInDatabase",
                newUrlList: [suffixUrl],
              });

              const directCard = anchor.closest('a, div') as HTMLElement | null;
              const cardEl = directCard || cardItem;
              const divId = cardEl.id;
              const processedUrl = anchor.href.replace("-commission", "");

              if (divId) {
                hrefMap.set(divId, processedUrl);
                console.log(`Added href to hrefMap: [${divId}] ${processedUrl}`);
              }

              if (updateInfoMap.has(processedUrl) || updateInfoMap.has(anchor.href)) {
                handleNewCard(cardEl);
              }

              applyOpenInNewTab(cardEl);
              addCreatorButton(cardEl);
              addCardCheckbox(cardEl);
              applyStagedForCard(cardEl);
            }
          }
        });
      }

      if (mutation.type === 'attributes') {
      }
    }
  };

  const nestedObserver = new MutationObserver(nestedCallback);

  nestedObserver.observe(cardItem, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}

function processExistingCards(parentContainer: HTMLElement) {
  const cardItems = getModelCards(parentContainer);

  cardItems.forEach((item) => {
    observeCardItem(item as HTMLElement);
    applyOpenInNewTab(item as HTMLElement);
    applyStagedForCard(item as HTMLElement);
  });
}

async function main() {
  injectButtonStyles();

  const parentContainerSelector =
    `${CIVITAI_GRID_SELECTOR}, ${CIVITAIARCHIVE_GRID_SELECTOR}`;

  try {
    const parentContainer = await waitForElement(parentContainerSelector, 15000);

    initMutationObserver(parentContainer);
    processExistingCards(parentContainer);
  } catch (error) {
    console.error(error);
  }
}

main();