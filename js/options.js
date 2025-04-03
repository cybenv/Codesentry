const PROTECTION_METHODS = [
  {
    id: 'attribute',
    name: 'Attribute Protection',
    description: 'Add translate="no" attribute (most compatible)',
    defaultEnabled: true
  },
  {
    id: 'class',
    name: 'Class Protection',
    description: 'Add notranslate class to elements',
    defaultEnabled: true
  },
  {
    id: 'shadow',
    name: 'Shadow DOM',
    description: 'Use Shadow DOM for strong isolation (best for DeepL)',
    defaultEnabled: true
  },
  {
    id: 'convert',
    name: 'Element Conversion',
    description: 'Convert code to specially marked spans',
    defaultEnabled: true
  }
];

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
  enableAdvancedDetection: false,
  excludedDomains: [],
  debugMode: false
};

let currentConfig = { ...DEFAULT_CONFIG };
const enableExtension = document.getElementById('enableExtension');
const enableAdvancedDetection = document.getElementById('enableAdvancedDetection');
const debugMode = document.getElementById('debugMode');
const protectionMethodsList = document.getElementById('protectionMethodsList');
const elementsList = document.getElementById('elementsList');
const excludedDomainsList = document.getElementById('excludedDomainsList');
const newDomainInput = document.getElementById('newDomainInput');
const addDomainBtn = document.getElementById('addDomainBtn');
const addElementBtn = document.getElementById('addElementBtn');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
const protectionMethodTemplate = document.getElementById('protectionMethodTemplate');
const elementTemplate = document.getElementById('elementTemplate');
const domainTemplate = document.getElementById('domainTemplate');

function init() {
  chrome.storage.sync.get('config', result => {
    if (result.config) {
      currentConfig = { ...DEFAULT_CONFIG, ...result.config };
    }
    updateUI();
    setupEventListeners();
  });
}

function updateUI() {
  enableExtension.checked = currentConfig.enabled;
  enableAdvancedDetection.checked = currentConfig.enableAdvancedDetection;
  debugMode.checked = currentConfig.debugMode;
  renderProtectionMethods();
  renderElementsToProtect();
  renderExcludedDomains();
}

function renderProtectionMethods() {
  protectionMethodsList.innerHTML = '';
  const sortedMethods = [...PROTECTION_METHODS].sort((a, b) => {
    const indexA = currentConfig.protectionMethods.indexOf(a.id);
    const indexB = currentConfig.protectionMethods.indexOf(b.id);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  sortedMethods.forEach(method => {
    const clone = document.importNode(protectionMethodTemplate.content, true);
    clone.querySelector('.method-name').textContent = method.name;
    clone.querySelector('.method-description').textContent = method.description;
    const checkbox = clone.querySelector('.method-checkbox');
    checkbox.checked = currentConfig.protectionMethods.includes(method.id);
    checkbox.dataset.methodId = method.id;
    protectionMethodsList.appendChild(clone);
  });
}

function renderElementsToProtect() {
  elementsList.innerHTML = '';
  currentConfig.detectElements.forEach((element, index) => {
    const clone = document.importNode(elementTemplate.content, true);
    clone.querySelector('.element-type').textContent = element.type;
    clone.querySelector('.element-selector').textContent = element.selector;
    const deleteBtn = clone.querySelector('.delete-btn');
    deleteBtn.dataset.index = index;
    elementsList.appendChild(clone);
  });
}

function renderExcludedDomains() {
  excludedDomainsList.innerHTML = '';
  currentConfig.excludedDomains.forEach((domain, index) => {
    const clone = document.importNode(domainTemplate.content, true);
    clone.querySelector('.domain-name').textContent = domain;
    const deleteBtn = clone.querySelector('.delete-btn');
    deleteBtn.dataset.index = index;
    excludedDomainsList.appendChild(clone);
  });
}

function setupEventListeners() {
  enableExtension.addEventListener('change', () => {
    currentConfig.enabled = enableExtension.checked;
  });
  enableAdvancedDetection.addEventListener('change', () => {
    currentConfig.enableAdvancedDetection = enableAdvancedDetection.checked;
  });
  debugMode.addEventListener('change', () => {
    currentConfig.debugMode = debugMode.checked;
  });
  setupProtectionMethodsDragAndDrop(); 
  protectionMethodsList.addEventListener('change', (event) => {
    if (event.target.classList.contains('method-checkbox')) {
      const methodId = event.target.dataset.methodId;
      if (event.target.checked) {
        if (!currentConfig.protectionMethods.includes(methodId)) {
          currentConfig.protectionMethods.push(methodId);
        }
      } else {
        currentConfig.protectionMethods = currentConfig.protectionMethods.filter(id => id !== methodId);
      }
    }
  });
  
  elementsList.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
      const index = parseInt(event.target.dataset.index, 10);
      currentConfig.detectElements.splice(index, 1);
      renderElementsToProtect();
    }
  });
  
  addElementBtn.addEventListener('click', () => {
    const type = prompt('Enter element type (tag, class, id):');
    if (!type) return;
    const selector = prompt('Enter selector (e.g., pre, .code, #editor):');
    if (!selector) return;
    currentConfig.detectElements.push({
      type: type.toLowerCase(),
      selector: selector
    });
    renderElementsToProtect();
  });
  
  addDomainBtn.addEventListener('click', () => {
    const domain = newDomainInput.value.trim();
    if (domain) {
      if (!currentConfig.excludedDomains.includes(domain)) {
        currentConfig.excludedDomains.push(domain);
        renderExcludedDomains();
        newDomainInput.value = '';
      }
    }
  });
  
  excludedDomainsList.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
      const index = parseInt(event.target.dataset.index, 10);
      currentConfig.excludedDomains.splice(index, 1);
      renderExcludedDomains();
    }
  });
  
  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      const requiredElements = [
        { type: 'class', selector: '.highlight' },
        { type: 'class', selector: '.codeblock' },
        { type: 'class', selector: '.syntaxhighlighter' }
      ];
      requiredElements.forEach(requiredElement => {
        const exists = currentConfig.detectElements.some(element => 
          element.type === requiredElement.type && element.selector === requiredElement.selector
        );
        if (!exists) {
          currentConfig.detectElements.push(requiredElement);
        }
      });
      updateUI();
    }
  });

  saveBtn.addEventListener('click', () => {
    saveChanges();
  });
}

function saveChanges() {
  chrome.runtime.sendMessage({
    action: 'updateConfig',
    config: currentConfig
  }, response => {
    if (response && response.success) {
      const message = document.createElement('div');
      message.textContent = 'Settings saved successfully!';
      message.style.position = 'fixed';
      message.style.top = '20px';
      message.style.left = '50%';
      message.style.transform = 'translateX(-50%)';
      message.style.background = '#4CAF50';
      message.style.color = 'white';
      message.style.padding = '10px 20px';
      message.style.borderRadius = '4px';
      message.style.zIndex = '9999';
      document.body.appendChild(message);
      setTimeout(() => {
        document.body.removeChild(message);
      }, 3000);
    }
  });
}

function setupProtectionMethodsDragAndDrop() {
  let draggedItem = null;
  function getMethodId(item) {
    return item.querySelector('.method-checkbox').dataset.methodId;
  }
  function updateMethodsOrder() {
    const items = protectionMethodsList.querySelectorAll('.protection-method-item');
    const newOrder = Array.from(items).map(item => getMethodId(item));
    const checkedMethods = currentConfig.protectionMethods.filter(id => 
      newOrder.includes(id)
    );
    newOrder.forEach(id => {
      const isChecked = protectionMethodsList.querySelector(`.method-checkbox[data-method-id="${id}"]`).checked;
      if (isChecked && !checkedMethods.includes(id)) {
        checkedMethods.push(id);
      }
    });
    currentConfig.protectionMethods = checkedMethods;
  }

  function addDragListeners() {
    const items = protectionMethodsList.querySelectorAll('.protection-method-item');
    items.forEach(item => {
      const dragHandle = item.querySelector('.drag-handle');
      dragHandle.addEventListener('mousedown', () => {
        item.classList.add('dragging');
        draggedItem = item;
      });
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', '');
        e.dataTransfer.effectAllowed = 'move';
        const dragImage = document.createElement('div');
        dragImage.style.display = 'none';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        document.body.removeChild(dragImage);
        setTimeout(() => {
          item.classList.add('dragging');
        }, 0);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
        updateMethodsOrder();
      });
    });
    items.forEach(item => {
      item.setAttribute('draggable', 'true');
    });
  }
  
  protectionMethodsList.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedItem) return;
    const items = Array.from(protectionMethodsList.querySelectorAll('.protection-method-item:not(.dragging)'));
    const mouseY = e.clientY;
    let closestItem = null;
    let closestDistance = Number.NEGATIVE_INFINITY;
    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      const itemMiddle = rect.top + rect.height / 2;
      const distance = mouseY - itemMiddle;
      if (distance < 0 && distance > closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });
    if (closestItem) {
      protectionMethodsList.insertBefore(draggedItem, closestItem);
    } else {
      protectionMethodsList.appendChild(draggedItem);
    }
  });
  addDragListeners();
  const originalRenderProtectionMethods = renderProtectionMethods;
  renderProtectionMethods = function() {
    originalRenderProtectionMethods();
    addDragListeners();
  };
}

document.addEventListener('DOMContentLoaded', init);
