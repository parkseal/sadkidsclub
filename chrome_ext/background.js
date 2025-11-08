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
    
    // Store temporarily and open popup
    chrome.storage.local.set({ pendingContent: contentData }, () => {
      chrome.windows.create({
        url: "popup.html",
        type: "popup",
        width: 500,
        height: 700
      });
    });

  } else if (info.menuItemId === "saveQuote") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        
        const container = document.createElement('div');
        const contents = sel.getRangeAt(0).cloneContents();
        container.appendChild(contents);
        
        // Check if the cloned content itself contains any block-level elements.
        const hasBlockElement = !!container.querySelector('p, div, pre, blockquote, li, h1, h2, h3, h4, h5, h6, table, ul, ol');
        
        let html = container.innerHTML;
        
        // If the selection does NOT contain block-level elements
        // (meaning it's likely just text nodes, <br>, <span>, <em>, etc.),
        // wrap it in a <pre> tag to force preservation of line breaks
        // and leading/multiple spaces.
        if (!hasBlockElement) {
          // Use pre-wrap to respect whitespace AND wrap long lines.
          html = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${html}</pre>`;
        }
        
        return html;
      }
    }).then(results => {
      
      // Check if script injection worked and got a result
      let quoteHtml;
      if (results && results[0] && results[0].result) {
        quoteHtml = results[0].result; // Use the rich HTML
      } else {
        // Fallback: Use plain text but wrap it in <pre>
        // to preserve the newlines that selectionText provides.
        quoteHtml = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${info.selectionText}</pre>`;
      }
      
      contentData = {
        type: "quote",
        quote: quoteHtml,
        pageUrl: info.pageUrl,
        pageTitle: tab.title
      };
      
      chrome.storage.local.set({ pendingContent: contentData }, () => {
        chrome.windows.create({
          url: "popup.html",
          type: "popup",
          width: 500,
          height: 700
        });
      });
    });
  }
});