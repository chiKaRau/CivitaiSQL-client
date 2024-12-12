function polling() {
  // console.log("polling");
  setTimeout(polling, 1000 * 30);
}

polling();

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