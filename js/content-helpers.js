function isElementProtected(element) {
  return element.hasAttribute('data-codesentry') || 
         element.getAttribute('translate') === 'no' || 
         element.classList.contains('notranslate');
}

const isNestedInProtectedElement = (element) => {
  let parent = element.parentElement;
  while (parent) {
    if (isElementProtected(parent)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
};

const protectWithAttribute = (element) => {
  element.setAttribute('translate', 'no');
  element.setAttribute('data-codesentry', 'attribute');
};

const protectWithClass = (element) => {
  element.classList.add('notranslate');
  element.setAttribute('data-codesentry', 'class');
};

const protectWithShadowDOM = (element) => {
  if (element.textContent.length > 1000) {
    return protectWithAttribute(element);
  }
  const computedStyle = window.getComputedStyle(element);
  const wrapper = document.createElement('div');
  wrapper.classList.add('codesentry-shadow-wrapper');
  wrapper.style.display = computedStyle.display;
  const propsToKeep = [
    'background-color', 'color', 'font-family', 'font-size', 
    'padding', 'margin', 'border', 'border-radius'
  ];
  for (let i = 0; i < propsToKeep.length; i++) {
    const prop = propsToKeep[i];
    wrapper.style[prop] = computedStyle[prop];
  } 
  const shadow = wrapper.attachShadow({ mode: 'closed' });
  shadow.innerHTML = element.outerHTML;
  element.parentNode.replaceChild(wrapper, element);
  wrapper.setAttribute('data-codesentry', 'shadow');
};

const convertToSpan = (element) => {
  if (element.tagName.toLowerCase() !== 'code' || 
      window.getComputedStyle(element).display !== 'inline') {
    return protectWithAttribute(element);
  }
  const computedStyle = window.getComputedStyle(element);
  const span = document.createElement('span');
  span.innerHTML = element.innerHTML;
  span.classList.add('codesentry-span', 'notranslate');
  Array.from(element.attributes).forEach(attr => {
    if (attr.name !== 'class') {
      span.setAttribute(attr.name, attr.value);
    }
  });
  span.style.cssText = computedStyle.cssText;
  element.parentNode.replaceChild(span, element);
  span.setAttribute('data-codesentry', 'convert');
};

function detectCodeInText() {
  const textNodes = document.querySelectorAll('p, li, td, div:not([data-codesentry-scanned])');
  const codePatterns = [
    /`([^`]+)`/g,
    /(const|let|var|function|class|import|export|from|require)\s+[\w\d_$]+/g,
    /(https?:\/\/[^\s]+)|(\/[\w\d\.\-\_\/]+\.(js|py|java|c|cpp|rb|go|rs|php|html|css))/g,
    /(npm|pip|yarn|git|docker)\s+(install|run|build|init|clone)\s+[\w\d\-\_\/]+/g
  ];
  let count = 0;
  textNodes.forEach(node => {
    node.setAttribute('data-codesentry-scanned', 'true');
    if (node.textContent.length < 10) {
      return;
    }
    let html = node.innerHTML;
    let changed = false;
    for (let i = 0; i < codePatterns.length; i++) {
      const pattern = codePatterns[i];
      html = html.replace(pattern, match => {
        changed = true;
        count++;
        return `<span class="notranslate codesentry-detected" data-codesentry="detected">${match}</span>`;
      });
    }
    if (changed) {
      node.innerHTML = html;
    }
  });
  
  if (count > 0 && typeof userConfig !== 'undefined' && userConfig.debugMode) {
    console.log(`CodeSentry: Found ${count} code patterns in text`);
  }
};
