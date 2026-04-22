import JSZip from 'jszip';
console.log("Calling Content Script")

/******************************************/
// Capture Card Sections
/******************************************/

const MODEL_LINK_SELECTOR = [
  'a[href^="/models/"]',
  'a[href*="://civitai.com/models/"]',
  'a[href*="://civitai.red/models/"]',
].join(', ');

const cardSelector = [
  'div.relative.flex.overflow-hidden.rounded-md.flex-col[id]',
  'div[id][style*="aspect-ratio: 7 / 9"]',
].join(', ');

const CIVITAI_GRID_SELECTOR = '[class*="MasonryGrid_grid__"]';
const CIVITAIARCHIVE_GRID_SELECTOR =
  'div.grid.grid-cols-2.md\\:grid-cols-4.lg\\:grid-cols-6.gap-4';

function isModelUrl(url: string): boolean {
  return /\/models\/\d+(?:[/?#]|$)/.test(url || '');
}

function getModelLinks(root: ParentNode = document): HTMLAnchorElement[] {
  return Array.from(root.querySelectorAll(MODEL_LINK_SELECTOR)).filter(
    (el): el is HTMLAnchorElement =>
      el instanceof HTMLAnchorElement &&
      (isModelUrl(el.getAttribute('href') || '') || isModelUrl(el.href))
  );
}

function resolveCardElement(node: HTMLElement | HTMLAnchorElement | null): HTMLElement | null {
  if (!node) return null;

  // If we were handed a card directly, keep it.
  if (node instanceof HTMLElement && node.matches(cardSelector)) {
    return node;
  }

  // Resolve the model link first.
  const link =
    node instanceof HTMLAnchorElement
      ? node
      : node.matches(MODEL_LINK_SELECTOR)
        ? (node as HTMLAnchorElement)
        : (node.querySelector(MODEL_LINK_SELECTOR) as HTMLAnchorElement | null);

  if (!link) return null;

  // 1) Existing exact-ish card matches first (preserve current behavior)
  const exactCard =
    (link.closest(cardSelector) as HTMLElement | null) ||
    (link.closest('div[id][style*="aspect-ratio"]') as HTMLElement | null) ||
    (link.closest('div.relative.flex.overflow-hidden.rounded-md') as HTMLElement | null);

  if (exactCard) return exactCard;

  // 2) Walk upward and find the nearest "card-like" ancestor.
  // This helps if they add/remove wrapper divs but keep similar internal structure.
  let current: HTMLElement | null = link.parentElement;
  let best: HTMLElement | null = null;

  while (current && current !== document.body) {
    const hrefLinks = Array.from(current.querySelectorAll(MODEL_LINK_SELECTOR)).filter(
      (el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement
    );

    const containsThisLink = hrefLinks.includes(link);
    const onlyOneModelLink = hrefLinks.length === 1;
    const hasImage = !!current.querySelector('img');
    const hasCreatorText = Array.from(current.querySelectorAll('span, p, div')).some((el) => {
      const txt = (el.textContent || '').trim();
      return /^by\s+/i.test(txt);
    });
    const hasFooterLike =
      !!current.querySelector('[class*="footer__"]') ||
      !!current.querySelector('.AspectRatioCard_footer__XmvNR') ||
      !!current.querySelector('.AspectRatioImageCard_footer__FOU7a');

    const rect = current.getBoundingClientRect();
    const looksCardSized =
      rect.width >= 120 &&
      rect.height >= 160 &&
      rect.width <= window.innerWidth * 0.95 &&
      rect.height <= window.innerHeight * 1.5;

    if (containsThisLink && onlyOneModelLink && hasImage && looksCardSized) {
      best = current;

      // Prefer a stronger match and stop early
      if (hasCreatorText || hasFooterLike || current.id) {
        return current;
      }
    }

    current = current.parentElement;
  }

  if (best) return best;

  // 3) Last-resort fallback:
  // nearest ancestor that contains the link and an image but not many model links.
  current = link.parentElement;
  while (current && current !== document.body) {
    const modelLinks = current.querySelectorAll(MODEL_LINK_SELECTOR).length;
    const hasImage = !!current.querySelector('img');

    if (hasImage && modelLinks <= 2) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function getModelContainer(): HTMLElement | null {
  const legacyGrid =
    (document.querySelector(CIVITAI_GRID_SELECTOR) as HTMLElement | null) ||
    (document.querySelector(CIVITAIARCHIVE_GRID_SELECTOR) as HTMLElement | null);

  if (legacyGrid) {
    return legacyGrid;
  }

  const firstLink = getModelLinks(document)[0];
  const firstCard = resolveCardElement(firstLink);
  if (!firstCard) return null;

  let current: HTMLElement | null = firstCard.parentElement;
  let rowCandidate: HTMLElement | null = null;

  while (current && current !== document.body) {
    if (current.hasAttribute('data-index')) {
      rowCandidate = current;
    }

    const style = current.getAttribute('style') || '';
    const hasAbsoluteHeightLayout =
      style.includes('position: relative') &&
      style.includes('height:') &&
      style.includes('width: 100%');

    if (hasAbsoluteHeightLayout) {
      return current;
    }

    current = current.parentElement;
  }

  if (rowCandidate?.parentElement) {
    return rowCandidate.parentElement as HTMLElement;
  }

  return firstCard.parentElement as HTMLElement | null;
}

function getModelCards(container?: HTMLElement | null): HTMLElement[] {
  const scope: ParentNode = container || document;
  const seen = new Set<HTMLElement>();
  const cards: HTMLElement[] = [];

  getModelLinks(scope).forEach((link) => {
    const card = resolveCardElement(link);
    if (card && !seen.has(card)) {
      seen.add(card);
      cards.push(card);
    }
  });

  return cards;
}

function getCardLink(card: HTMLElement): HTMLAnchorElement | null {
  if (card instanceof HTMLAnchorElement && isModelUrl(card.href)) {
    return card;
  }

  return (
    (card.querySelector(MODEL_LINK_SELECTOR) as HTMLAnchorElement | null) ||
    Array.from(card.querySelectorAll('a')).find(
      (a): a is HTMLAnchorElement =>
        a instanceof HTMLAnchorElement && isModelUrl(a.href)
    ) ||
    null
  );
}

function isDirectCardElement(node: HTMLElement, parentContainer: HTMLElement): boolean {
  if (!parentContainer.contains(node)) return false;

  const resolved = resolveCardElement(node);
  if (!resolved) return false;

  if (resolved === node) return true;

  return resolved.parentElement === node.parentElement;
}

/******************************************/
// Apply Card feature Section
/******************************************/

type StagedInfo = {
  action: string;
  url?: string;
  modelId?: string;
  versionId?: string;
};

const stagedInfoByUrl: Map<string, StagedInfo> = new Map();
const stagedInfoByModel: Map<string, StagedInfo> = new Map();
const stagedInfoByModelVersion: Map<string, StagedInfo> = new Map();

let lockedUrl: string = "";
let lockedNeighborManagedUrls: Set<string> = new Set();

function applyOpenInNewTab(card: HTMLElement) {
  const link = getCardLink(card);
  if (!link) return;

  link.target = "_blank";
  link.rel = "noopener noreferrer";
}

function normalizeUrl(url: string): string {
  return (url || "").replace("-commission", "");
}

function normalizeStagedUrl(url: string): string {
  const raw = (url || "").replace("-commission", "").trim();
  if (!raw) return "";

  try {
    const u = new URL(raw);

    const host = u.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^civitai\.red$/, "civitai.shared")
      .replace(/^civitai\.com$/, "civitai.shared")
      .replace(/^civitai\.green$/, "civitai.shared");

    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    const search = u.search.toLowerCase();

    return `${host}${path}${search}`;
  } catch {
    return raw.replace(/\/+$/, "").toLowerCase();
  }
}

function extractModelAndVersionFromUrl(url: string): { modelId: string; versionId: string } {
  try {
    const u = new URL(url);
    const modelId = u.pathname.match(/\/models\/(\d+)/)?.[1] || "";
    const versionId = u.searchParams.get("modelVersionId") || "";
    return { modelId, versionId };
  } catch {
    return { modelId: "", versionId: "" };
  }
}

function hydrateStagedBadgesFromStorage(): void {
  chrome.storage.local.get("stagedItems", (result) => {
    const list = Array.isArray(result?.stagedItems) ? result.stagedItems : [];

    clearStagedInfo();

    list.forEach((item: any) => {
      addStagedInfo({
        url: item.url,
        modelId: item.modelId,
        versionId: item.versionId && item.versionId !== "Selecting" ? item.versionId : "",
        action: item.action || "",
      });
    });

    displayStagedBadges();
  });
}

function bootStagedBadgeHydration(attempt = 0): void {
  const cards = getModelCards();

  if (cards.length === 0) {
    if (attempt < 20) {
      window.setTimeout(() => bootStagedBadgeHydration(attempt + 1), 500);
    }
    return;
  }

  hydrateStagedBadgesFromStorage();
}

function clearStagedInfo(): void {
  stagedInfoByUrl.clear();
  stagedInfoByModel.clear();
  stagedInfoByModelVersion.clear();
}

function addStagedInfo(item: {
  url?: string;
  modelId?: string;
  versionId?: string;
  action: string;
}): void {
  const info: StagedInfo = {
    action: item.action || "",
    url: item.url || "",
    modelId: item.modelId || "",
    versionId: item.versionId || "",
  };

  const directUrl = info.url ? normalizeStagedUrl(info.url) : "";
  if (directUrl) {
    stagedInfoByUrl.set(directUrl, info);
  }

  const parsed = info.url
    ? extractModelAndVersionFromUrl(info.url)
    : { modelId: "", versionId: "" };

  const modelId = info.modelId || parsed.modelId;
  const versionId = info.versionId || parsed.versionId;

  if (modelId && versionId) {
    stagedInfoByModelVersion.set(`${modelId}_${versionId}`, {
      ...info,
      modelId,
      versionId,
    });
  }

  if (modelId) {
    const existing = stagedInfoByModel.get(modelId);

    if (!existing) {
      stagedInfoByModel.set(modelId, {
        ...info,
        modelId,
        versionId,
      });
    } else {
      const existingHasVersion = !!existing.versionId;
      const incomingHasVersion = !!versionId;

      if (!existingHasVersion && incomingHasVersion) {
        stagedInfoByModel.set(modelId, {
          ...info,
          modelId,
          versionId,
        });
      }
    }
  }
}

function removeStagedInfo(item: {
  url?: string;
  modelId?: string;
  versionId?: string;
}): void {
  const directUrl = item.url ? normalizeStagedUrl(item.url) : "";
  if (directUrl) {
    stagedInfoByUrl.delete(directUrl);
  }

  const parsed = item.url
    ? extractModelAndVersionFromUrl(item.url)
    : { modelId: "", versionId: "" };

  const modelId = item.modelId || parsed.modelId;
  const versionId = item.versionId || parsed.versionId;

  if (modelId && versionId) {
    stagedInfoByModelVersion.delete(`${modelId}_${versionId}`);
  }

  if (modelId) {
    stagedInfoByModel.delete(modelId);
  }
}

function findStagedInfoForUrl(url: string): StagedInfo | undefined {
  const direct = stagedInfoByUrl.get(normalizeStagedUrl(url));
  if (direct) return direct;

  const { modelId, versionId } = extractModelAndVersionFromUrl(url);

  if (modelId && versionId) {
    const exactVersion = stagedInfoByModelVersion.get(`${modelId}_${versionId}`);
    if (exactVersion) return exactVersion;
  }

  if (modelId) {
    return stagedInfoByModel.get(modelId);
  }

  return undefined;
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

  const info = findStagedInfoForUrl(a.href);

  if (info) upsertStagedBadge(card, info.action);
  else removeStagedBadge(card);
}

function displayStagedBadges(): void {
  const cards = getModelCards();
  cards.forEach((card) => applyStagedForCard(card));
}

function removeAllStagedBadges(): void {
  const cards = getModelCards();
  cards.forEach((card) => removeStagedBadge(card));
}

function upsertLockedBadge(card: HTMLElement) {
  let badge = card.querySelector('.locked-badge') as HTMLDivElement | null;

  if (!badge) {
    badge = document.createElement('div');
    badge.classList.add('locked-badge');

    Object.assign(badge.style, {
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '1003',
      backgroundColor: '#2563eb',
      color: 'white',
      textShadow: '0px 0px 3px black',
      padding: '6px 12px',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      letterSpacing: '0.6px',
      pointerEvents: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      border: '2px solid #60a5fa',
      boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.20)',
    });

    if (!card.style.position) card.style.position = 'relative';
    card.appendChild(badge);
  }

  badge.textContent = 'LOCKED';

  card.style.outline = '3px solid #2563eb';
  card.style.outlineOffset = '-3px';
  card.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.28)';
}

function removeLockedBadge(card: HTMLElement) {
  const badge = card.querySelector('.locked-badge') as HTMLElement | null;
  if (badge) badge.remove();

  card.style.outline = '';
  card.style.outlineOffset = '';
  card.style.boxShadow = '';
}

function applyLockedForCard(card: HTMLElement) {
  const a = getCardLink(card);
  if (!a?.href) return;

  const normalized = normalizeUrl(a.href);
  if (lockedUrl && normalized === normalizeUrl(lockedUrl)) {
    upsertLockedBadge(card);
  } else {
    removeLockedBadge(card);
  }
}

function displayLockedBadge(): void {
  const cards = getModelCards();
  cards.forEach((card) => applyLockedForCard(card));
}

function clearLockedBadge(): void {
  const cards = getModelCards();
  cards.forEach((card) => removeLockedBadge(card));
}

const pendingCreatorButtonMap = new Map<string, { button: HTMLButtonElement; originalText: string }>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "addCreatorResult") {
    const { requestId, status, reason } = message;
    const pending = pendingCreatorButtonMap.get(requestId);

    if (pending) {
      const { button, originalText } = pending;

      if (status === "success") {
        displayTemporaryMessage(button, "Success", originalText, message.rating || "N/A");
      } else {
        displayTemporaryMessage(button, "Failed", originalText);
      }

      pendingCreatorButtonMap.delete(requestId);
    }
  }
});

chrome.runtime.onMessage.addListener(
  async (
    message: {
      action: string;
      url?: string;
      lockedUrl?: string;
      direction?: "prev" | "next";
      count?: number;
    },
    sender,
    sendResponse
  ) => {
    if (message.action === "set-locked-url") {
      lockedUrl = message.url || "";
      displayLockedBadge();
      return true;
    }

    if (message.action === "clear-locked-url") {
      lockedUrl = "";
      lockedNeighborManagedUrls.clear();
      clearLockedBadge();
      return true;
    }

    if (message.action === "add-around-locked") {
      const anchorUrl = normalizeUrl(message.lockedUrl || "");
      const direction = message.direction || "next";
      const count = Math.max(1, Number(message.count || 1));

      const container = getModelContainer();
      if (!container || !anchorUrl) return true;

      const cards = getModelCards(container);

      const anchorIndex = cards.findIndex((card) => {
        const a = getCardLink(card);
        return !!a?.href && normalizeUrl(a.href) === anchorUrl;
      });

      if (anchorIndex === -1) {
        console.warn("Locked card not found on page:", anchorUrl);
        return true;
      }

      const targetCards: HTMLElement[] = [];

      if (direction === "next") {
        for (let i = anchorIndex + 1; i < cards.length && targetCards.length < count; i++) {
          targetCards.push(cards[i]);
        }
      } else {
        for (let i = anchorIndex - 1; i >= 0 && targetCards.length < count; i--) {
          targetCards.push(cards[i]);
        }
      }

      const nextManagedUrls = new Set<string>();

      // 1) build the new desired set
      targetCards.forEach((card) => {
        const linkElement = getCardLink(card);
        if (!linkElement?.href) return;
        nextManagedUrls.add(normalizeUrl(linkElement.href));
      });

      // 2) remove ones that were previously managed but are no longer desired
      cards.forEach((card) => {
        const linkElement = getCardLink(card);
        if (!linkElement?.href) return;

        const normalized = normalizeUrl(linkElement.href);
        const checkbox = card.querySelector('input[type="checkbox"].model-card-checkbox') as HTMLInputElement | null;

        if (lockedNeighborManagedUrls.has(normalized) && !nextManagedUrls.has(normalized)) {
          if (checkbox && checkbox.checked) {
            checkbox.checked = false;
            card.style.border = '';
            checkedUrlSet.delete(normalized);
            chrome.runtime.sendMessage({ action: 'removeUrl', url: linkElement.href });
          }
        }
      });

      // 3) add/check desired ones
      targetCards.forEach((card) => {
        addCardCheckbox(card);

        const linkElement = getCardLink(card);
        if (!linkElement?.href) return;

        const url = linkElement.href;
        const normalized = normalizeUrl(url);

        const checkbox = card.querySelector('input[type="checkbox"].model-card-checkbox') as HTMLInputElement | null;
        const imgEl = linkElement.querySelector('img') as HTMLImageElement | null;
        const imgSrc = imgEl?.currentSrc || imgEl?.src || "";

        if (checkbox && !checkbox.checked) {
          checkbox.checked = true;
          card.style.border = '2px solid yellow';
          checkedUrlSet.add(normalized);
          chrome.runtime.sendMessage({ action: 'addUrl', url, imgSrc });
        }

        lockedNeighborManagedUrls.add(normalized);
      });

      // 4) replace managed memory with exact current desired set
      lockedNeighborManagedUrls = nextManagedUrls;

      return true;
    }

    return true;
  }
);

chrome.runtime.onMessage.addListener(
  async (
    message: {
      action: string;
      stagedList?: Array<{
        url: string;
        modelId?: string;
        versionId?: string;
        action: string;
      }>;
      url?: string;
      modelId?: string;
      versionId?: string;
      stageAction?: string;
    },
    sender,
    sendResponse
  ) => {
    if (message.action === "display-staged") {
      if (!message.stagedList) return true;

      clearStagedInfo();
      message.stagedList.forEach((x) => {
        addStagedInfo(x);
      });

      displayStagedBadges();
      return true;
    }

    if (message.action === "remove-staged") {
      clearStagedInfo();
      removeAllStagedBadges();
      return true;
    }

    if (message.action === "stage-url" && message.url) {
      addStagedInfo({
        url: message.url,
        modelId: message.modelId,
        versionId: message.versionId,
        action: message.stageAction || "",
      });
      displayStagedBadges();
      return true;
    }

    if (message.action === "unstage-url" && message.url) {
      removeStagedInfo({
        url: message.url,
        modelId: message.modelId,
        versionId: message.versionId,
      });
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

function applyCheckedStateForCard(item: HTMLElement) {
  const linkElement = getCardLink(item);
  if (!linkElement?.href) return;

  const normalized = normalizeUrl(linkElement.href);
  const checkbox = item.querySelector('input[type="checkbox"].model-card-checkbox') as HTMLInputElement | null;

  if (!checkbox) return;

  const shouldBeChecked = checkedUrlSet.has(normalized);
  checkbox.checked = shouldBeChecked;
  item.style.border = shouldBeChecked ? '2px solid yellow' : '';
}

function addCardCheckbox(item: HTMLElement, index?: number) {
  let checkbox = item.querySelector('input[type="checkbox"].model-card-checkbox') as HTMLInputElement | null;

  if (!checkbox) {
    checkbox = document.createElement('input');
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
      if (!linkElement?.href) return;

      const url = linkElement.href;
      const normalized = normalizeUrl(url);

      const imgEl = linkElement.querySelector('img') as HTMLImageElement | null;
      const imgSrc = imgEl?.currentSrc || imgEl?.src || "";

      if (checkbox!.checked) {
        checkedUrlSet.add(normalized);
        item.style.border = '2px solid yellow';
        chrome.runtime.sendMessage({ action: 'addUrl', url, imgSrc });
      } else {
        checkedUrlSet.delete(normalized);
        item.style.border = '';
        chrome.runtime.sendMessage({ action: 'removeUrl', url });
      }
    });
  }

  applyCheckedStateForCard(item);
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
    const cardElements = getModelCards();

    if (cardElements.length === 0) {
      console.warn("Model cards not found.");
      return;
    }

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
          checkedUrlSet.delete(normalizeUrl(urlToUncheck));

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
          checkedUrlSet.add(normalizeUrl(urlToCheck));

          const checkbox: HTMLInputElement | null = item.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.checked = true;
            item.style.border = '2px solid yellow';
          }
        }
      });
    } else if (message.action === "remove-checkboxes") {
      checkedUrlSet.clear();
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
      const childCards = getModelCards();

      if (childCards.length > 0) {

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
const checkedUrlSet: Set<string> = new Set();
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

function initializeHrefMap(): void {
  const cardDivs = getModelCards();
  if (cardDivs.length === 0) {
    console.error('Model cards not found.');
    return;
  }

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

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.stagedItems) return;

  bootStagedBadgeHydration();
});

chrome.runtime.onMessage.addListener(
  async (
    message: { action: string; savedList?: Array<{ url: string; quantity: number }> },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "display-saved" || message.action === "remove-saved") {
      const cardElements = getModelCards();

      if (cardElements.length === 0) {
        console.warn("Model cards not found.");
        return;
      }

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
      const cardElements = getModelCards();

      if (cardElements.length === 0) {
        console.warn("Model cards not found.");
        return;
      }

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
    const cardElements = getModelCards();

    if (cardElements.length === 0) {
      console.warn("Model cards not found.");
      return;
    }

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
    const cardElements = getModelCards();

    if (cardElements.length === 0) {
      console.warn("Model cards not found.");
      return;
    }

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
  const cardElements = getModelCards();

  if (cardElements.length === 0) {
    console.warn("Model cards not found.");
    return;
  }

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
  const cardElements = getModelCards();

  if (cardElements.length === 0) {
    console.warn("Model cards not found.");
    return;
  }

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

function displayTemporaryMessage(
  button: HTMLButtonElement,
  message: string,
  originalText: string,
  extraText?: string
) {
  button.textContent = extraText ? `${message} : ${extraText}` : message;

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
    Array.from(card.querySelectorAll('span, p')).find((el) =>
      (el.textContent || '').trim().startsWith('by ')
    );

  if (!creatorElement) return;

  const rawCreatorText = creatorElement.textContent?.trim() || 'Unknown';
  const creatorName = rawCreatorText.replace(/^by\s+/i, '').trim() || 'Unknown';

  const button = document.createElement('button');
  button.classList.add('add-creator-button');

  const originalText = `Add ${creatorName} to list`;
  button.textContent = originalText;

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const requestId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    button.textContent = "Processing...";
    pendingCreatorButtonMap.set(requestId, { button, originalText });

    chrome.runtime.sendMessage({
      action: "addCreator",
      creator: creatorName,
      requestId
    });
  });

  const footer =
    card.querySelector('.AspectRatioCard_footer__XmvNR') ||
    card.querySelector('.AspectRatioImageCard_footer__FOU7a') ||
    card.querySelector('[class*="AspectRatioCard_footer__"]') ||
    card.querySelector('[class*="AspectRatioImageCard_footer__"]');

  if (footer) {
    const footerContent =
      footer.querySelector('div.flex.w-full.flex-col.items-start.gap-1') ||
      footer;

    footerContent.appendChild(button);
    button.style.display = 'block';
    button.style.marginTop = '10px';
    return;
  }

  const bottomOverlay = Array.from(card.querySelectorAll('div')).find((el) =>
    (el.className || '').toString().includes('bg-gradient-to-t')
  ) as HTMLElement | undefined;

  if (bottomOverlay) {
    bottomOverlay.appendChild(button);
    button.style.display = 'block';
    button.style.marginTop = '10px';
  }
}

function initMutationObserver(parentContainer: HTMLElement) {
  const callback: MutationCallback = (mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type !== 'childList') continue;

      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          const directCard = resolveCardElement(node);

          if (directCard && isDirectCardElement(directCard, parentContainer)) {
            const anchor = getCardLink(directCard);

            if (anchor) {
              const suffixUrl = anchor.href;

              chrome.runtime.sendMessage({
                action: "checkUrlsInDatabase",
                newUrlList: [suffixUrl],
              });

              const divId = directCard.id;
              const processedUrl = anchor.href.replace("-commission", "");

              if (divId) {
                hrefMap.set(divId, processedUrl);
                console.log(`Added href to hrefMap: [${divId}] ${processedUrl}`);
              }

              if (updateInfoMap.has(processedUrl) || updateInfoMap.has(anchor.href)) {
                handleNewCard(directCard);
              }

              observeCardItem(directCard);
              applyOpenInNewTab(directCard);
              addCreatorButton(directCard);
              addCardCheckbox(directCard);
              applyStagedForCard(directCard);
              applyLockedForCard(directCard);
            }
          }

          observeCardItem(node);
        });
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
              applyLockedForCard(cardEl);

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

  const initialUrls: string[] = [];

  cardItems.forEach((item) => {
    observeCardItem(item);
    applyOpenInNewTab(item);
    addCreatorButton(item);
    addCardCheckbox(item);
    applyStagedForCard(item);
    applyLockedForCard(item);

    const anchor = getCardLink(item);
    if (anchor?.href) {
      initialUrls.push(anchor.href);

      if (item.id) {
        hrefMap.set(item.id, anchor.href.replace("-commission", ""));
      }
    }
  });

  if (initialUrls.length > 0) {
    chrome.runtime.sendMessage({
      action: "checkUrlsInDatabase",
      newUrlList: initialUrls,
    });
  }
}

function waitForModelCards(timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (getModelCards().length > 0) {
        resolve();
        return;
      }

      if (Date.now() - start >= timeout) {
        reject(new Error(`Model cards not found within ${timeout}ms.`));
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

async function main() {
  injectButtonStyles();

  try {
    await waitForModelCards(15000);

    const parentContainer = getModelContainer() || document.body;

    initMutationObserver(parentContainer);
    processExistingCards(parentContainer);
    initializeHrefMap();
    bootStagedBadgeHydration();
  } catch (error) {
    console.error(error);
  }
}

main();