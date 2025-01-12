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
      width: 600,
      height: 700,
      left: 1800
    });
  }
});