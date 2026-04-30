chrome.runtime.onInstalled.addListener(() => {
  console.log("SmartJobFilter Extension Installed");
  
  chrome.storage.local.get(['filterEnabled'], (result) => {
    if (result.filterEnabled === undefined) {
      chrome.storage.local.set({ filterEnabled: true });
    }
  });
});
