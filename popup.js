/**
 * LeetTracker - Popup Script
 * Handles settings, cache management, and status display
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ---- Load Settings ----
  const response = await sendMessage({ type: 'GET_SETTINGS' });
  const settings = response?.settings || {
    enabled: true,
    showEstimated: true,
    autoRefresh: true,
    theme: 'dark'
  };

  // Apply settings to UI
  document.getElementById('toggle-enabled').checked = settings.enabled;
  document.getElementById('toggle-estimated').checked = settings.showEstimated;
  document.getElementById('toggle-refresh').checked = settings.autoRefresh;

  // ---- Load Cache Status ----
  await updateCacheStatus();

  // ---- Toggle Event Handlers ----
  document.getElementById('toggle-enabled').addEventListener('change', async (e) => {
    settings.enabled = e.target.checked;
    await sendMessage({ type: 'SAVE_SETTINGS', settings });
    updateStatusIndicator(settings.enabled);
  });

  document.getElementById('toggle-estimated').addEventListener('change', async (e) => {
    settings.showEstimated = e.target.checked;
    await sendMessage({ type: 'SAVE_SETTINGS', settings });
  });

  document.getElementById('toggle-refresh').addEventListener('change', async (e) => {
    settings.autoRefresh = e.target.checked;
    await sendMessage({ type: 'SAVE_SETTINGS', settings });
  });

  // ---- Button Handlers ----
  const refreshBtn = document.getElementById('btn-refresh');
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<span class="popup-btn-icon">⏳</span> Refreshing...';

    try {
      await sendMessage({ type: 'REFRESH_DATA' });
      await updateCacheStatus();
      showToast('Data refreshed successfully!');
    } catch (e) {
      showToast('Failed to refresh data', true);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<span class="popup-btn-icon">↻</span> Refresh Data Now';
    }
  });

  const clearBtn = document.getElementById('btn-clear-cache');
  clearBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all cached data? This will requiring a full refresh.')) return;
    
    clearBtn.disabled = true;
    clearBtn.innerHTML = '<span class="popup-btn-icon">⏳</span> Clearing...';

    try {
      await sendMessage({ type: 'CLEAR_ALL_CACHE' });
      await updateCacheStatus();
      showToast('Cache cleared! Starting fresh sync...');
      
      // Automatically trigger a refresh after clear
      refreshBtn.click();
    } catch (e) {
      showToast('Failed to clear cache', true);
    } finally {
      clearBtn.disabled = false;
      clearBtn.innerHTML = '<span class="popup-btn-icon">🗑</span> Clear Cache';
    }
  });
});

// ---- Helper Functions ----

async function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

async function updateCacheStatus() {
  try {
    const status = await sendMessage({ type: 'GET_CACHE_STATUS' });
    if (status) {
      const totalProblems = (status.githubCount || 0) + (status.leetcodeCount || 0) + (status.localCount || 0) + (status.fallbackCount || 0);
      document.getElementById('cached-count').textContent =
        totalProblems > 0 ? `${totalProblems} problems total` : 'No data';

      document.getElementById('last-updated').textContent = status.lastUpdated || 'Never';

      if (status.leetcodeCount !== undefined) document.getElementById('count-leetcode').textContent = `${status.leetcodeCount} problems tracked`;
      if (status.githubCount !== undefined) document.getElementById('count-github').textContent = `${status.githubCount} problems tracked`;
      if (status.localCount !== undefined) document.getElementById('count-local').textContent = `${status.localCount} problems tracked`;
      if (status.fallbackCount !== undefined) document.getElementById('count-fallback').textContent = `${status.fallbackCount} problems tracked`;

      const cacheStatusEl = document.getElementById('cache-status');
      if (status.isStale) {
        cacheStatusEl.innerHTML = '<span class="status-dot stale"></span> Stale';
      } else {
        cacheStatusEl.innerHTML = '<span class="status-dot active"></span> Fresh';
      }
    }
  } catch (e) {
    console.log('Failed to get cache status:', e);
  }
}    

function updateStatusIndicator(enabled) {
  const statusEl = document.getElementById('status-indicator');
  if (enabled) {
    statusEl.innerHTML = '<span class="status-dot active"></span> Active';
  } else {
    statusEl.innerHTML = '<span class="status-dot"></span> Disabled';
  }
}

function showToast(message, isError = false) {
  // Remove existing toast
  const existing = document.querySelector('.popup-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `popup-toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
