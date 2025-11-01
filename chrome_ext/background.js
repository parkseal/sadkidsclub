// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveImage",
    title: "Save to sadkidsclub",
    contexts: ["image"]
  });
  
  chrome.contextMenus.create({
    id: "saveQuote",
    title: "Save to sadkidsclub",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let contentData = {};
  
  if (info.menuItemId === "saveImage") {
    contentData = {
      type: "image",
      url: info.srcUrl,
      pageUrl: info.pageUrl
    };
  } else if (info.menuItemId === "saveQuote") {
    contentData = {
      type: "quote",
      quote: info.selectionText,
      pageUrl: info.pageUrl,
      pageTitle: tab.title
    };
  }
  
  // Store temporarily and open popup
  chrome.storage.local.set({ pendingContent: contentData }, () => {
    chrome.windows.create({
      url: "popup.html",
      type: "popup",
      width: 500,
      height: 700
    });
  });
});