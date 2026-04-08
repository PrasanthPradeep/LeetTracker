/**
 * LeetTracker - Content Script
 * Detects LeetCode problem pages, extracts slug, fetches data, and renders the UI panel
 */

(function () {
  'use strict';

  // Prevent double initialization
  if (window.__lctInitialized) return;
  window.__lctInitialized = true;

  // ============================================================
  // STATE
  // ============================================================
  let currentSlug = null;
  let panelVisible = false;
  let companyData = null;
  let filterText = '';
  let sortMode = 'count'; // 'count', 'name', 'frequency', 'recent'
  let sortDirection = 'desc'; // 'desc', 'asc'
  let selectedSources = new Set(['leetcode', 'github', 'local', 'fallback']);
  let isLoading = false;
  let settings = { enabled: true, showEstimated: true };

  // Directory State
  let isProblemset = false;
  let globalCompanies = [];
  let selectedCompany = null; // string name of the company selected
  let selectedCompanyProblems = null; // array of problems

  const { normalizeCompanyName, getCompanyEmoji, getFrequencyLabel, getFrequencyScore } = window.LCCompanyNormalize || {};
  const { estimateCompanies } = window.LCHeuristics || {};

  // ============================================================
  // SLUG DETECTION
  // ============================================================

  function extractProblemSlug() {
    const match = window.location.pathname.match(/\/problems\/([a-z0-9-]+)/);
    return match ? match[1] : null;
  }

  function checkIsProblemset() {
    return window.location.pathname.startsWith('/problemset/');
  }

  function getProblemTitle() {
    // Try multiple selectors for LeetCode's changing DOM
    const selectors = [
      '[data-cy="question-title"]',
      '.css-v3d350',
      'div[class*="title"] a',
      'h4[class*="title"]',
      'div[class*="question-title"]',
      'a[class*="title-link"]'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }

    // Fallback: derive from slug
    const slug = extractProblemSlug();
    if (slug) {
      return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return 'Unknown Problem';
  }

  // ============================================================
  // DATA FETCHING
  // ============================================================

  async function fetchCompanyData(slug) {
    isLoading = true;
    renderPanel();

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'GET_COMPANY_DATA', slug },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response && response.success) {
        companyData = response.data;

        // If no companies found, use heuristic estimation
        if ((!companyData.companies || companyData.companies.length === 0) && estimateCompanies) {
          const difficulty = companyData.difficulty || guessDifficulty();
          const topicTags = companyData.topicTags || [];

          const estimated = estimateCompanies({
            difficulty,
            tags: topicTags,
            acceptanceRate: 50,
            totalSubmissions: 100000
          });

          companyData.companies = estimated;
          companyData.isEstimated = true;
        }
      } else {
        companyData = { companies: [], isEstimated: true, error: response?.error || 'Failed to fetch data' };
      }
    } catch (error) {
      console.error('[LCTracker] Error fetching data:', error);
      companyData = { companies: [], isEstimated: true, error: error.message };
    }

    isLoading = false;
    renderPanel();
  }

  async function fetchGlobalDirectory() {
    isLoading = true;
    renderPanel();
    try {
      const response = await new Promise(res => chrome.runtime.sendMessage({ type: 'GET_ALL_COMPANIES' }, res));
      if (response && response.success) {
        globalCompanies = response.data || [];
      } else {
        globalCompanies = [];
      }
    } catch (e) {
      console.error(e);
      globalCompanies = [];
    }
    isLoading = false;
    renderPanel();
  }

  async function fetchProblemsForCompany(companyName) {
    isLoading = true;
    selectedCompany = companyName;
    renderPanel();
    try {
      const response = await new Promise(res => chrome.runtime.sendMessage({ type: 'GET_COMPANY_PROBLEMS', company: companyName }, res));
      if (response && response.success) {
        selectedCompanyProblems = response.data || [];
      } else {
        selectedCompanyProblems = [];
      }
    } catch (e) {
      console.error(e);
      selectedCompanyProblems = [];
    }
    isLoading = false;
    renderPanel();
  }

  function guessDifficulty() {
    // Try to read difficulty from the page DOM
    const diffEl = document.querySelector('[class*="difficulty"]');
    if (diffEl) {
      const text = diffEl.textContent.toLowerCase();
      if (text.includes('easy')) return 'Easy';
      if (text.includes('medium')) return 'Medium';
      if (text.includes('hard')) return 'Hard';
    }

    // Check for colored difficulty badge
    const badges = document.querySelectorAll('[class*="text-difficulty"]');
    for (const badge of badges) {
      const text = badge.textContent.toLowerCase();
      if (text.includes('easy')) return 'Easy';
      if (text.includes('medium')) return 'Medium';
      if (text.includes('hard')) return 'Hard';
    }

    return 'Medium';
  }

  // ============================================================
  // SETTINGS
  // ============================================================

  async function loadSettings() {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, resolve);
      });
      if (response && response.settings) {
        settings = response.settings;
      }
    } catch (e) {
      console.log('[LCTracker] Could not load settings');
    }
  }

  // ============================================================
  // UI RENDERING
  // ============================================================
  
  function setSafeHTML(element, htmlString) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    element.replaceChildren(...doc.body.childNodes);
  }

  function createPanel() {
    // Remove existing panel if any
    const existing = document.getElementById('lct-panel');
    if (existing) existing.remove();
    const existingBtn = document.getElementById('lct-toggle-btn');
    if (existingBtn) existingBtn.remove();

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'lct-toggle-btn';
    setSafeHTML(toggleBtn, `<img src="${chrome.runtime.getURL('icons/leetTracker_Logo.png')}" alt="LT" style="width:24px;height:24px;border-radius:50%;">`);
    toggleBtn.title = 'Toggle LeetTracker';
    toggleBtn.addEventListener('click', togglePanel);
    document.body.appendChild(toggleBtn);

    // Create panel
    const panel = document.createElement('div');
    panel.id = 'lct-panel';
    setSafeHTML(panel, getPanelHTML());
    document.body.appendChild(panel);

    // Attach event listeners
    attachPanelEvents();

    return panel;
  }

  function getPanelHTML() {
    if (isProblemset) {
      return getDirectoryPanelHTML();
    }
    const title = getProblemTitle();
    const difficulty = companyData?.difficulty || guessDifficulty();
    const diffClass = difficulty ? `lct-badge-${difficulty.toLowerCase()}` : '';

    return `
      <div class="lct-header">
        <div class="lct-header-left">
          <img class="lct-logo" src="${chrome.runtime.getURL('icons/leetTracker_Logo.png')}" alt="LT">
          <span class="lct-title">LeetTracker</span>
        </div>
        <div class="lct-header-actions">
          <button class="lct-btn-icon" id="lct-refresh-btn" title="Refresh data">↻</button>
          <button class="lct-btn-icon" id="lct-close-btn" title="Close panel">✕</button>
        </div>
      </div>

      <div class="lct-problem-info">
        <div class="lct-problem-title">${escapeHtml(title)}</div>
        <div class="lct-problem-meta">
          ${difficulty ? `<span class="lct-badge ${diffClass}">${difficulty}</span>` : ''}
          ${companyData?.isEstimated ? '<span class="lct-badge lct-badge-estimated">⚡ Estimated</span>' : ''}
          ${getSourceBadge()}
          ${companyData?.companies?.length ? `<span class="lct-count-badge">${companyData.companies.length}</span>` : ''}
        </div>
      </div>

      ${getTrendingHTML()}

      <div class="lct-controls">
        <div style="display:flex; width:100%; gap:8px;">
          <input type="text" class="lct-search" id="lct-search" placeholder="Filter companies..." value="${escapeHtml(filterText)}">
          <button class="lct-sort-btn lct-active" id="lct-sort-btn" title="Click to cycle sort">
            ${getSortLabel()}
          </button>
        </div>
      </div>

      <div class="lct-companies" id="lct-companies">
        ${getCompaniesHTML()}
      </div>

      <div class="lct-footer">
        <span class="lct-footer-text">
          ${companyData?.lastUpdated ? `Updated: ${companyData.lastUpdated}` : 'Loading...'}
        </span>
        <span class="lct-footer-text" style="opacity: 0.5;">LeetTracker v1.1.0</span>
      </div>
    `;
  }

  // ============================================================
  // DIRECTORY UI
  // ============================================================

  function formatSlugAsTitle(slug) {
    if (!slug) return '';
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function getDirectoryPanelHTML() {
    if (selectedCompany) {
      return getDirectoryProblemsHTML();
    }

    return `
      <div class="lct-header">
        <div class="lct-header-left">
          <img class="lct-logo" src="${chrome.runtime.getURL('icons/leetTracker_Logo.png')}" alt="LT">
          <span class="lct-title">Company Directory</span>
        </div>
        <div class="lct-header-actions">
          <button class="lct-btn-icon" id="lct-refresh-btn" title="Refresh data">↻</button>
          <button class="lct-btn-icon" id="lct-close-btn" title="Close panel">✕</button>
        </div>
      </div>

      <div class="lct-problem-info" style="border-bottom:none; padding-bottom:0;">
        <div class="lct-problem-meta" style="margin-bottom:10px;">
          <span class="lct-badge lct-badge-source">🌐 Global Directory</span>
          <span class="lct-count-badge">${globalCompanies.length} tracked</span>
        </div>
      </div>

      <div class="lct-controls">
        <div style="display:flex; width:100%; gap:8px;">
          <input type="text" class="lct-search" id="lct-search" placeholder="Search companies..." value="${escapeHtml(filterText)}">
          <button class="lct-sort-btn lct-active" id="lct-sort-btn" title="Click to cycle sort">
            ${getSortLabel()}
          </button>
        </div>
      </div>

      <div class="lct-companies" id="lct-companies">
        ${getGlobalCompaniesHTML()}
      </div>

      <div class="lct-footer">
        <span class="lct-footer-text">Global Dataset</span>
        <span class="lct-footer-text" style="opacity: 0.5;">LeetTracker v1.1.0</span>
      </div>
    `;
  }

  function getGlobalCompaniesHTML() {
    if (isLoading) return getSkeletonHTML();
    if (!globalCompanies.length) return getEmptyHTML();

    let comps = [...globalCompanies];
    if (filterText) {
      const lower = filterText.toLowerCase();
      comps = comps.filter(c => c.company.toLowerCase().includes(lower));
    }

    // Sort by Count or Name
    comps.sort((a, b) => {
      let result = 0;
      if (sortMode === 'count') {
        result = b.count - a.count; // High counts first
      } else if (sortMode === 'name') {
        result = a.company.localeCompare(b.company); // A-Z first
      }
      return sortDirection === 'desc' ? result : -result;
    });

    if (comps.length === 0) {
      return `
        <div class="lct-empty">
          <div class="lct-empty-icon">🔍</div>
          <div class="lct-empty-title">No matches</div>
          <div class="lct-empty-text">No companies match your search</div>
        </div>
      `;
    }

    return comps.map(c => `
      <div class="lct-company-card lct-clickable-card" data-company="${escapeHtml(c.company)}">
        <div class="lct-card-top" style="margin-bottom:0; align-items:center; gap:12px;">
          <div class="lct-card-company" style="min-width:0; flex:1; overflow:hidden;">
            <div class="lct-company-icon">${getCompanyEmoji ? getCompanyEmoji(c.company) : '🏢'}</div>
            <div style="min-width:0; overflow:hidden;">
              <div class="lct-company-name">${escapeHtml(c.company)}</div>
            </div>
          </div>
          <span class="lct-count-badge" style="flex-shrink:0;">${c.count} problems</span>
        </div>
      </div>
    `).join('');
  }

  function getDirectoryProblemsHTML() {
    return `
      <div class="lct-header">
        <div class="lct-header-left">
          <button class="lct-btn-icon" id="lct-back-btn" title="Back to Directory" style="margin-right:8px;">←</button>
          <div class="lct-logo">${getCompanyEmoji ? getCompanyEmoji(selectedCompany) : '🏢'}</div>
          <span class="lct-title">${escapeHtml(selectedCompany)}</span>
        </div>
        <div class="lct-header-actions">
          <button class="lct-btn-icon" id="lct-close-btn" title="Close panel">✕</button>
        </div>
      </div>

      <div class="lct-controls">
        <div style="display:flex; width:100%; gap:8px;">
          <input type="text" class="lct-search" id="lct-search" placeholder="Search problems..." value="${escapeHtml(filterText)}">
          <button class="lct-sort-btn lct-active" id="lct-sort-btn" title="Click to cycle sort">
            ${getSortLabel()}
          </button>
        </div>
      </div>

      <div class="lct-companies" id="lct-companies">
        ${getCompanyProblemsListHTML()}
      </div>

      <div class="lct-footer">
        <span class="lct-footer-text">Total: ${selectedCompanyProblems ? selectedCompanyProblems.length : 0} problems</span>
      </div>
    `;
  }

  function getCompanyProblemsListHTML() {
    if (isLoading) return getSkeletonHTML();
    if (!selectedCompanyProblems || !selectedCompanyProblems.length) return getEmptyHTML();

    let probs = [...selectedCompanyProblems];
    
    // Filter by Search Text
    if (filterText) {
      const lower = filterText.toLowerCase();
      probs = probs.filter(p => p.slug.toLowerCase().replace(/-/g, ' ').includes(lower));
    }

    // Filter by Source
    probs = probs.filter(p => {
      const pSources = (p.source || '').split(', ').map(s => s.toLowerCase());
      return pSources.some(s => selectedSources.has(s));
    });

    if (probs.length === 0) {
      return `<div class="lct-empty"><div class="lct-empty-icon">🔍</div><div class="lct-empty-title">No matches</div></div>`;
    }

    return probs.map(p => {
      const freqClass = `lct-freq-${(p.frequency || 'low').toLowerCase()}`;
      const sources = (p.source || 'Unknown').split(', ');
      
      return `
        <a href="https://leetcode.com/problems/${p.slug}/" target="_blank" class="lct-company-card lct-problem-link" style="text-decoration:none; display:block;">
          <div class="lct-card-top" style="gap:12px;">
            <div class="lct-card-company" style="min-width:0; flex:1; overflow:hidden;">
              <div style="min-width:0; overflow:hidden;">
                <div class="lct-company-name" style="color:#eff1f6;">${formatSlugAsTitle(p.slug)}</div>
                <div class="lct-company-asked" style="margin-top:4px; display:flex; align-items:center; gap:6px;">
                  ${p.timesAsked > 0 ? `<span>Asked ${p.timesAsked}×</span>` : ''} 
                  ${p.lastSeen && p.lastSeen !== 'Past' ? `<span>· ${p.lastSeen}</span>` : ''}
                  <div class="lct-problem-sources">
                    ${sources.map(s => `<span class="lct-source-mini-tag" title="Source: ${s}">${getSourceIcon(s.toLowerCase())}</span>`).join('')}
                  </div>
                </div>
              </div>
            </div>
            <span class="lct-freq-badge ${freqClass}" style="flex-shrink:0;">${p.frequency || 'Unknown'}</span>
          </div>
        </a>
      `;
    }).join('');
  }

  function getSourceBadge() {
    if (!companyData?.companies?.length) return '';
    const sources = new Set(companyData.companies.map(c => c.source));
    if (sources.has('leetcode')) return '<span class="lct-badge lct-badge-source">🎯 LeetCode</span>';
    if (sources.has('github')) return '<span class="lct-badge lct-badge-source">📦 GitHub</span>';
    if (sources.has('fallback')) return '<span class="lct-badge lct-badge-source">📋 Cached</span>';
    if (sources.has('heuristic')) return '<span class="lct-badge lct-badge-source">🧠 Heuristic</span>';
    return '';
  }

  function getTrendingHTML() {
    if (!companyData?.companies?.length) return '';

    // Top 3 companies = trending
    const top3 = companyData.companies
      .filter(c => c.frequency === 'High' || c.timesAsked >= 15)
      .slice(0, 3);

    if (top3.length === 0) return '';

    const chips = top3.map((c, i) => `
      <span class="lct-trending-chip">
        <span class="lct-chip-rank">#${i + 1}</span>
        ${getCompanyEmoji ? getCompanyEmoji(c.company) : '🏢'} ${escapeHtml(c.company)}
      </span>
    `).join('');

    return `
      <div class="lct-trending-section">
        <div class="lct-trending-title">Trending Companies</div>
        <div class="lct-trending-chips">${chips}</div>
      </div>
      <div class="lct-divider"></div>
    `;
  }

  function getCompaniesHTML() {
    if (isLoading) return getSkeletonHTML();
    if (companyData?.error && (!companyData.companies || companyData.companies.length === 0)) return getErrorHTML(companyData.error);
    if (!companyData?.companies?.length) return getEmptyHTML();

    let companies = [...companyData.companies];

    // Apply filter
    if (filterText) {
      const lower = filterText.toLowerCase();
      companies = companies.filter(c =>
        c.company.toLowerCase().includes(lower)
      );
    }

    // Apply sort
    switch (sortMode) {
      case 'frequency':
        companies.sort((a, b) => {
          const freqA = getFrequencyScore ? getFrequencyScore(a.frequency) : 0;
          const freqB = getFrequencyScore ? getFrequencyScore(b.frequency) : 0;
          return freqB - freqA || b.timesAsked - a.timesAsked;
        });
        break;
      case 'name':
        companies.sort((a, b) => a.company.localeCompare(b.company));
        break;
      case 'confidence':
        companies.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        break;
      case 'recent':
        companies.sort((a, b) => {
          const recentA = a.periods?.['6months'] ? 3 : a.periods?.['1year'] ? 2 : a.periods?.['2year'] ? 1 : 0;
          const recentB = b.periods?.['6months'] ? 3 : b.periods?.['1year'] ? 2 : b.periods?.['2year'] ? 1 : 0;
          return recentB - recentA || b.timesAsked - a.timesAsked;
        });
        break;
    }

    if (companies.length === 0) {
      return `
        <div class="lct-empty">
          <div class="lct-empty-icon">🔍</div>
          <div class="lct-empty-title">No matches</div>
          <div class="lct-empty-text">No companies match your filter</div>
        </div>
      `;
    }

    return companies.map(c => getCompanyCardHTML(c)).join('');
  }

  function getCompanyCardHTML(company) {
    const emoji = getCompanyEmoji ? getCompanyEmoji(company.company) : '🏢';
    const freqClass = `lct-freq-${(company.frequency || 'low').toLowerCase()}`;
    const confidencePct = Math.round((company.confidence || 0) * 100);
    const confClass = confidencePct >= 70 ? 'lct-confidence-high' :
      confidencePct >= 40 ? 'lct-confidence-medium' : 'lct-confidence-low';

    const periodTags = [];
    if (company.periods?.['6months']) periodTags.push('6mo');
    if (company.periods?.['1year']) periodTags.push('1yr');
    if (company.periods?.['2year']) periodTags.push('2yr');
    if (company.periods?.alltime && periodTags.length === 0) periodTags.push('all');

    return `
      <div class="lct-company-card">
        <div class="lct-card-top" style="gap:12px;">
          <div class="lct-card-company" style="min-width:0; flex:1; overflow:hidden;">
            <div class="lct-company-icon">${emoji}</div>
            <div style="min-width:0; overflow:hidden;">
              <div class="lct-company-name">${escapeHtml(company.company)}</div>
              <div class="lct-company-asked">
                ${company.timesAsked > 0 ? `Asked ${company.timesAsked}× ` : ''}
                ${company.lastSeen && company.lastSeen !== 'Past' ? `· Last: ${company.lastSeen}` : ''}
              </div>
            </div>
          </div>
          <span class="lct-freq-badge ${freqClass}" style="flex-shrink:0;">
            ${company.frequency || 'Unknown'}
          </span>
        </div>
        <div class="lct-card-details">
          ${periodTags.map(p => `
            <span class="lct-detail-tag">
              <span class="lct-tag-dot"></span>
              ${p}
            </span>
          `).join('')}
          <span class="lct-detail-tag" title="Data source: ${company.source || 'unknown'}">
            ${getSourceIcon(company.source)} ${company.source || 'unknown'}
          </span>
          <div class="lct-confidence-bar" title="Confidence: ${confidencePct}%">
            <div class="lct-confidence-fill ${confClass}" style="width: ${confidencePct}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  function getSourceIcon(source) {
    switch (source) {
      case 'leetcode': return '🎯';
      case 'github': return '📦';
      case 'local': return '📂';
      case 'fallback': return '📋';
      case 'heuristic': return '🧠';
      default: return '📊';
    }
  }

  function getSkeletonHTML() {
    return `
      <div class="lct-skeleton">
        ${Array(5).fill('').map(() => `
          <div class="lct-skeleton-card">
            <div class="lct-skeleton-line lct-sk-medium"></div>
            <div class="lct-skeleton-line lct-sk-short"></div>
            <div class="lct-skeleton-line lct-sk-xs"></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function getEmptyHTML() {
    return `
      <div class="lct-empty">
        <div class="lct-empty-icon">📭</div>
        <div class="lct-empty-title">No data found</div>
        <div class="lct-empty-text">No problem frequency data is currently available here. Try refreshing or check back later!</div>
      </div>
    `;
  }


  function getErrorHTML(message) {
    return `
      <div class="lct-error">
        <div class="lct-error-icon">⚠️</div>
        <div class="lct-error-title">Data Unavailable</div>
        <div class="lct-error-text">${escapeHtml(message || 'Could not fetch company data')}</div>
        <button class="lct-retry-btn" id="lct-retry-btn">Retry</button>
      </div>
    `;
  }

  function getSortLabel() {
    const dirIcon = sortDirection === 'desc' ? '↓' : '↑';
    switch (sortMode) {
      case 'count': return `${dirIcon} Count`;
      case 'name': return `${dirIcon} Name`;
      case 'frequency': return `${dirIcon} Freq`;
      case 'confidence': return `${dirIcon} Conf`;
      case 'recent': return `${dirIcon} Recent`;
      default: return `${dirIcon} Sort`;
    }
  }

  function renderPanel() {
    const panel = document.getElementById('lct-panel');
    if (!panel) return;
    setSafeHTML(panel, getPanelHTML());
    attachPanelEvents();
  }

  // ============================================================
  // EVENT HANDLING
  // ============================================================

  function attachPanelEvents() {
    const closeBtn = document.getElementById('lct-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', togglePanel);

    const refreshBtn = document.getElementById('lct-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
      if (isProblemset) {
        if (selectedCompany) fetchProblemsForCompany(selectedCompany);
        else fetchGlobalDirectory();
      } else {
        const slug = extractProblemSlug();
        if (slug) fetchCompanyData(slug);
      }
    });

    const searchInput = document.getElementById('lct-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterText = e.target.value;
        const companiesEl = document.getElementById('lct-companies');
        if (companiesEl) {
          if (isProblemset) {
            setSafeHTML(companiesEl, selectedCompany ? getCompanyProblemsListHTML() : getGlobalCompaniesHTML());
            attachDirectoryClickHandlers();
          } else {
            setSafeHTML(companiesEl, getCompaniesHTML());
            attachRetryHandler();
          }
        }
      });
    }

    const sortBtn = document.getElementById('lct-sort-btn');
    if (sortBtn) {
      sortBtn.addEventListener('click', () => {
        // Global Directory mode vs Company Detail mode
        const modes = (isProblemset && !selectedCompany) 
          ? ['count', 'name'] 
          : ['frequency', 'name', 'confidence', 'recent'];
        
        const currentIdx = modes.indexOf(sortMode);
        
        if (currentIdx === -1) {
          sortMode = modes[0];
          sortDirection = 'desc';
        } else {
          // Cycle direction if count/name, else cycle modes
          if (sortDirection === 'desc') {
            sortDirection = 'asc';
          } else {
            sortDirection = 'desc';
            sortMode = modes[(currentIdx + 1) % modes.length];
          }
        }

        renderPanel();
      });
    }

    if (isProblemset) {
      const backBtn = document.getElementById('lct-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          selectedCompany = null;
          selectedCompanyProblems = null;
          filterText = '';
          renderPanel();
        });
      }
      attachDirectoryClickHandlers();
    } else {
      attachRetryHandler();
    }
  }

  function attachDirectoryClickHandlers() {
    if (!selectedCompany) {
      document.querySelectorAll('.lct-clickable-card').forEach(card => {
        card.addEventListener('click', () => {
          const comp = card.dataset.company;
          if (comp) {
            filterText = '';
            fetchProblemsForCompany(comp);
          }
        });
      });
    }
  }

  function attachRetryHandler() {
    const retryBtn = document.getElementById('lct-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        const slug = extractProblemSlug();
        if (slug) fetchCompanyData(slug);
      });
    }
  }

  function togglePanel() {
    const panel = document.getElementById('lct-panel');
    const toggleBtn = document.getElementById('lct-toggle-btn');

    if (!panel) return;

    panelVisible = !panelVisible;

    if (panelVisible) {
      panel.classList.add('lct-visible');
      toggleBtn?.classList.add('lct-panel-open');
    } else {
      panel.classList.remove('lct-visible');
      toggleBtn?.classList.remove('lct-panel-open');
    }
  }

  // ============================================================
  // URL CHANGE DETECTION (SPA)
  // ============================================================

  function checkForProblemChange() {
    const nowProblemset = checkIsProblemset();
    const slug = extractProblemSlug();

    // Transition to/from problemset
    if (nowProblemset !== isProblemset) {
      isProblemset = nowProblemset;
      currentSlug = null;
      filterText = '';
      selectedCompany = null;
      selectedCompanyProblems = null;
      isLoading = false;
      initPanel();
    }
    // Transition between problems
    else if (!isProblemset && slug && slug !== currentSlug) {
      currentSlug = slug;
      companyData = null;
      filterText = '';
      isLoading = false;
      initPanel();
    }
  }

  // Watch for URL changes (LeetCode is a SPA)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(checkForProblemChange, 500);
    }
  });

  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Also check on popstate
  window.addEventListener('popstate', () => {
    setTimeout(checkForProblemChange, 500);
  });

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async function initPanel() {
    await loadSettings();

    if (!settings.enabled) {
      // Remove panel if disabled
      const panel = document.getElementById('lct-panel');
      const toggleBtn = document.getElementById('lct-toggle-btn');
      if (panel) panel.remove();
      if (toggleBtn) toggleBtn.remove();
      return;
    }

    const slug = extractProblemSlug();
    isProblemset = checkIsProblemset();

    if (!slug && !isProblemset) return;

    currentSlug = slug;
    createPanel();

    // Auto-show panel
    setTimeout(() => {
      const panel = document.getElementById('lct-panel');
      if (panel && !panelVisible) {
        panelVisible = true;
        panel.classList.add('lct-visible');
        document.getElementById('lct-toggle-btn')?.classList.add('lct-panel-open');
      }
    }, 800);

    // Fetch data based on page type
    if (isProblemset) {
      await fetchGlobalDirectory();
    } else if (slug) {
      await fetchCompanyData(slug);
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // START
  // ============================================================

  // Wait for DOM to be ready, then init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initPanel, 1000));
  } else {
    setTimeout(initPanel, 1000);
  }

})();
