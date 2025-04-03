const DEFAULT_CONFIG = {
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
  enableAdvancedDetection: true,
  excludedDomains: [],
  debugMode: false
};

let userConfig = { ...DEFAULT_CONFIG };

const init = async () => {
  await loadUserConfig();
  if (!shouldRunOnCurrentDomain()) {
    return;
  }
  if (userConfig.debugMode) {
    console.log('CodeSentry: Initializing...', new Date().toISOString());
  }
  protectExistingCodeElements();
  setupMutationObserver();
  setupMessageListener();
};

const loadUserConfig = async () => {
  try {
    const result = await chrome.storage.sync.get('config');
    if (result.config) {
      userConfig = { ...DEFAULT_CONFIG, ...result.config };
    }
  } catch (error) {
    console.error('CodeSentry: Error loading configuration', error);
  }
};

const shouldRunOnCurrentDomain = () => {
  if (!userConfig.enabled) return false;
  const currentDomain = window.location.hostname;
  return !userConfig.excludedDomains.includes(currentDomain);
};

function getAllSelectors() {
  const selectors = [];
  userConfig.detectElements.forEach(element => {
    selectors.push(element.selector);
  });
  const currentDomain = window.location.hostname;
  for (const site in userConfig.specialSiteRules) {
    if (currentDomain.includes(site)) {
      selectors.push(...userConfig.specialSiteRules[site]);
    }
  }
  return selectors;
}

const protectExistingCodeElements = () => {
  const selectors = getAllSelectors(); 
  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(element => {
        protectElement(element);
      });
    } catch (error) {
      if (userConfig.debugMode) {
        console.error(`CodeSentry: Error with selector "${selector}"`, error);
      }
    }
  });
  if (userConfig.enableAdvancedDetection) {
    detectCodeInText();
  }
};

const collectAddedElements = (mutations) => {
  const addedNodes = new Set();
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          addedNodes.add(node);
        }
      });
    }
  });
  return Array.from(addedNodes);
};

const checkNodeForMatches = (node, selectors) => {
  selectors.forEach(selector => {
    if (node.matches && node.matches(selector)) {
      protectElement(node);
    }
  });
};

const checkChildrenForMatches = (node, selectors) => {
  selectors.forEach(selector => {
    try {
      node.querySelectorAll(selector).forEach(element => {
        protectElement(element);
      });
    } catch (error) {
      if (userConfig.debugMode) {
        console.error(`CodeSentry: Error with selector "${selector}"`, error);
      }
    }
  });
};

const processAddedNodes = (nodes) => {
  const selectors = getAllSelectors();
  nodes.forEach(node => {
    checkNodeForMatches(node, selectors);
    checkChildrenForMatches(node, selectors);
  });
  if (userConfig.enableAdvancedDetection) {
    detectCodeInText();
  }
};

const setupMutationObserver = () => {
  const observer = new MutationObserver(mutations => {
    const addedNodes = collectAddedElements(mutations);
    if (addedNodes.length > 0) {
      setTimeout(() => processAddedNodes(addedNodes), 50);
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  return observer;
};

const protectElement = (element) => {
  if (isElementProtected(element)) {
    return;
  }
  if (isNestedInProtectedElement(element)) {
    return;
  }
  for (const method of userConfig.protectionMethods) {
    switch (method) {
      case 'attribute':
        protectWithAttribute(element);
        return;
      case 'class':
        protectWithClass(element);
        return;
      case 'shadow':
        protectWithShadowDOM(element);
        return;
      case 'convert':
        convertToSpan(element);
        return;
    }
  }
  protectWithAttribute(element);
};

const setupMessageListener = () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getStatus') {
      sendResponse({
        enabled: userConfig.enabled,
        domain: window.location.hostname,
        protected: document.querySelectorAll('[data-codesentry]').length
      });
    } else if (message.action === 'updateConfig') {
      userConfig = { ...userConfig, ...message.config };
      if (message.config.enabled !== undefined) {
        if (message.config.enabled) {
          protectExistingCodeElements();
        } else {
        }
      }
      
      sendResponse({ success: true });
    }
    return true;
  });
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
