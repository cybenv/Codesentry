chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('CodeSentry: First install, setting up defaults');
    const defaultConfig = {
      enabled: true,
      protectionMethods: ['attribute', 'class', 'shadow', 'convert'],
      detectElements: [
        { type: 'tag', selector: 'pre' },
        { type: 'tag', selector: 'code' },
        { type: 'class', selector: '.highlight' },
        { type: 'class', selector: '.codeblock' },
        { type: 'class', selector: '.syntaxhighlighter' }
      ],
      specialSiteRules: {
        'github.com': ['table.js-file-line-container', '.blob-code'],
        'stackoverflow.com': ['.s-code-block']
      },
      enableAdvancedDetection: false,
      excludedDomains: [],
      debugMode: false
    };
    chrome.storage.sync.set({ config: defaultConfig });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getConfig') {
    chrome.storage.sync.get('config', result => {
      sendResponse(result.config);
    });
    return true;
  } 
  else if (message.action === 'updateConfig') {
    chrome.storage.sync.set({ config: message.config }, () => {
      chrome.tabs.query({}, tabs => {
        for (let i = 0; i < tabs.length; i++) {
          const tab = tabs[i];
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateConfig',
            config: message.config
          }).catch(() => {});
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }
  return false;
});
