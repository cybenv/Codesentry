document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enableToggle');
  const statusText = document.getElementById('statusText');
  const protectedCount = document.getElementById('protectedCount');
  const currentDomain = document.getElementById('currentDomain');
  const optionsBtn = document.getElementById('optionsBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  getCurrentTab().then(tab => {
    loadStatus(tab);
    enableToggle.addEventListener('change', () => {
      toggleExtension(tab, enableToggle.checked);
    });
    refreshBtn.addEventListener('click', () => {
      refreshProtection(tab);
    });
    optionsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  });
});

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function loadStatus(tab) {
  chrome.storage.sync.get('config', result => {
    const config = result.config || { enabled: true };
    enableToggle.checked = config.enabled;
    statusText.textContent = config.enabled ? 'Enabled' : 'Disabled';
    chrome.tabs.sendMessage(tab.id, { action: 'getStatus' })
      .then(response => {
        if (response) {
          protectedCount.textContent = response.protected || '0';
          currentDomain.textContent = response.domain || 'unknown';
        }
      })
      .catch(error => {
        console.error('Error getting status:', error);
        protectedCount.textContent = 'N/A';
        currentDomain.textContent = 'N/A'; 
      });
  });
}

function toggleExtension(tab, enabled) {
  chrome.storage.sync.get('config', result => {
    const config = result.config || {};
    config.enabled = enabled;
    chrome.runtime.sendMessage({
      action: 'updateConfig',
      config: config
    }, () => {
      statusText.textContent = enabled ? 'Enabled' : 'Disabled';
      try {
        const hostname = new URL(tab.url).hostname;
        if (hostname && (hostname.includes('translate.google.com') || hostname.includes('deepl.com'))) {
          chrome.tabs.reload(tab.id);
        }
      } catch (e) {
        console.warn('Could not parse tab URL for reload check:', tab.url, e);
      }
    });
  });
}

function refreshProtection(tab) {
  chrome.tabs.sendMessage(tab.id, { 
    action: 'updateConfig',
    config: { refresh: true } 
  })
  .then(response => {
    if (response && response.success) {
      loadStatus(tab);
    }
  })
  .catch(error => {
    console.error('Error refreshing protection:', error);
  });
}
