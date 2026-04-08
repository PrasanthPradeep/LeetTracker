/**
 * LeetTracker - Background Service Worker
 * Handles data fetching from LeetCode GraphQL API, GitHub datasets, and caching
 */

// ============================================================
// CONSTANTS
// ============================================================

const GITHUB_REPOS = [
  {
    name: 'PrasanthPradeep',
    baseUrl: 'https://raw.githubusercontent.com/PrasanthPradeep/leetcode-companywise-questions/main',
    apiUrl: 'https://api.github.com/repos/PrasanthPradeep/leetcode-companywise-questions/git/trees/main?recursive=1',
    type: 'csv'
  }
];

const TOP_COMPANIES = [
  'amazon', 'google', 'facebook', 'microsoft', 'apple', 'bloomberg', 'uber', 'adobe', 'oracle', 'linkedin', 'salesforce', 'netflix', 'twitter', 'tiktok', 'bytedance', 'snap', 'goldman-sachs', 'jpmorgan', 'morgan-stanley', 'walmart', 'doordash', 'stripe', 'paypal', 'nvidia', 'intuit', 'cisco', 'vmware', 'airbnb', 'lyft', 'robinhood', 'coinbase', 'databricks', 'palantir', 'shopify', 'atlassian', 'servicenow', 'snowflake', 'pinterest', 'reddit', 'splunk', 'twilio', 'zillow', 'dropbox', 'citadel', 'two-sigma', 'jane-street', 'hudson-river-trading', 'akuna-capital', 'optiver', 'imc', 'jump-trading', 'tower-research', 'barclays', 'citi', 'bank-of-america', 'credit-suisse', 'ubs', 'deutsche-bank', 'hsbc', 'standard-chartered', 'wells-fargo', 'capital-one', 'american-express', 'visa', 'mastercard', 'zoom', 'slack', 'affirm', 'plaid', 'brex', 'chime', 'ramp', 'notion', 'canva', 'airtable', 'cloudflare', 'fastly', 'akamai', 'sendgrid', 'auth0', 'okta', 'hashicorp', 'docker', 'gitlab', 'postman', 'vercel', 'netlify', 'supabase', 'openai', 'anthropic', 'cohere', 'hugging-face', 'tesla', 'rivian', 'lucid', 'waymo', 'cruise', 'zoox', 'nuro', 'anduril', 'spacex', 'blue-origin', 'discord', 'spotify', 'sony', 'nintendo', 'grab', 'gojek', 'delivery-hero', 'foodpanda', 'deliveroo', 'swiggy', 'zomato', 'flipkart', 'meesho', 'udaan', 'paytm', 'phonepe', 'cred', 'razorpay', 'zeta', 'dream11', 'mpl', 'ola', 'ather-energy', 'makemytrip', 'cleartrip', 'tcs', 'infosys', 'wipro', 'hcl', 'cognizant', 'capgemini', 'accenture', 'ibm', 'deloitte', 'pwc', 'ey', 'kpmg'
];

const CACHE_KEY = 'lc_company_data';
const CACHE_TIMESTAMP_KEY = 'lc_company_data_timestamp';
const GITHUB_CACHE_KEY = 'lc_github_data';
const LOCAL_DATA_KEY = 'lc_local_data';
const SETTINGS_KEY = 'lc_settings';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const ALARM_NAME = 'lc-data-refresh';

// Company name aliases (duplicated for service worker context since content script normalize.js isn't available here)
const COMPANY_ALIASES = {
  'fb': 'Meta', 'facebook': 'Meta', 'meta platforms': 'Meta', 'meta platforms inc': 'Meta',
  'msft': 'Microsoft', 'ms': 'Microsoft',
  'goog': 'Google', 'googl': 'Google', 'alphabet': 'Google', 'alphabet inc': 'Google',
  'amzn': 'Amazon', 'aws': 'Amazon', 'amazon web services': 'Amazon',
  'aapl': 'Apple', 'apple inc': 'Apple',
  'nflx': 'Netflix', 'netflix inc': 'Netflix',
  'uber technologies': 'Uber',
  'lyft inc': 'Lyft',
  'airbnb inc': 'Airbnb',
  'snap inc': 'Snap', 'snapchat': 'Snap',
  'twitter': 'X (Twitter)', 'x corp': 'X (Twitter)',
  'linkedin corporation': 'LinkedIn',
  'salesforce.com': 'Salesforce', 'salesforce inc': 'Salesforce',
  'vmware': 'VMware',
  'tiktok': 'TikTok', 'bytedance': 'ByteDance', 'byte dance': 'ByteDance',
  'oracle corporation': 'Oracle', 'oracle corp': 'Oracle',
  'ibm corporation': 'IBM', 'ibm corp': 'IBM',
  'goldman sachs': 'Goldman Sachs', 'goldman-sachs': 'Goldman Sachs', 'gs': 'Goldman Sachs',
  'jp morgan': 'JPMorgan', 'jpmorgan chase': 'JPMorgan', 'jpmorgan': 'JPMorgan',
  'morgan stanley': 'Morgan Stanley', 'morgan-stanley': 'Morgan Stanley',
  'de shaw': 'D.E. Shaw', 'd. e. shaw': 'D.E. Shaw', 'deshaw': 'D.E. Shaw',
  'citadel': 'Citadel', 'citadel securities': 'Citadel',
  'two sigma': 'Two Sigma', 'two sigma investments': 'Two Sigma',
  'jane street': 'Jane Street', 'jane street capital': 'Jane Street',
  'hudson river trading': 'HRT', 'hrt': 'HRT',
  'akuna capital': 'Akuna Capital', 'akuna': 'Akuna Capital',
  'optiver': 'Optiver',
  'imc': 'IMC Trading', 'imc trading': 'IMC Trading',
  'jump trading': 'Jump Trading', 'jump': 'Jump Trading',
  'tower research': 'Tower Research', 'tower research capital': 'Tower Research',
  'adobe inc': 'Adobe', 'adobe systems': 'Adobe',
  'intuit inc': 'Intuit',
  'cisco systems': 'Cisco', 'cisco': 'Cisco',
  'nvidia corporation': 'NVIDIA', 'nvidia corp': 'NVIDIA', 'nvidia': 'NVIDIA',
  'paypal holdings': 'PayPal', 'paypal': 'PayPal',
  'walmart labs': 'Walmart', 'walmart': 'Walmart', 'walmart global tech': 'Walmart',
  'doordash': 'DoorDash', 'door dash': 'DoorDash',
  'robinhood': 'Robinhood', 'robinhood markets': 'Robinhood',
  'stripe inc': 'Stripe', 'stripe': 'Stripe',
  'databricks': 'Databricks',
  'palantir': 'Palantir', 'palantir technologies': 'Palantir',
  'twilio': 'Twilio', 'twilio inc': 'Twilio',
  'zillow': 'Zillow', 'zillow group': 'Zillow',
  'servicenow': 'ServiceNow', 'service now': 'ServiceNow',
  'workday': 'Workday', 'workday inc': 'Workday',
  'snowflake': 'Snowflake', 'snowflake inc': 'Snowflake',
  'splunk': 'Splunk', 'splunk inc': 'Splunk',
  'tcs': 'TCS', 'tata consultancy services': 'TCS',
  'infosys limited': 'Infosys', 'infosys': 'Infosys',
  'wipro': 'Wipro', 'wipro limited': 'Wipro',
  'hcl technologies': 'HCL', 'hcl': 'HCL',
  'cognizant': 'Cognizant', 'cognizant technology solutions': 'Cognizant',
  'capgemini': 'Capgemini',
  'accenture': 'Accenture',
  'deloitte': 'Deloitte', 'pwc': 'PwC', 'pricewaterhousecoopers': 'PwC', 'ey': 'EY', 'ernst & young': 'EY', 'kpmg': 'KPMG',
  'samsung electronics': 'Samsung', 'samsung': 'Samsung',
  'qualcomm': 'Qualcomm', 'qualcomm inc': 'Qualcomm',
  'intel corporation': 'Intel', 'intel corp': 'Intel', 'intel': 'Intel',
  'yahoo': 'Yahoo', 'yahoo inc': 'Yahoo',
  'yandex': 'Yandex',
  'booking.com': 'Booking.com', 'booking': 'Booking.com',
  'expedia': 'Expedia', 'expedia group': 'Expedia',
  'atlassian': 'Atlassian', 'atlassian inc': 'Atlassian',
  'shopify': 'Shopify', 'shopify inc': 'Shopify',
  'square': 'Block (Square)', 'block inc': 'Block (Square)', 'block': 'Block (Square)',
  'coinbase': 'Coinbase', 'coinbase global': 'Coinbase',
  'pinterest': 'Pinterest', 'pinterest inc': 'Pinterest',
  'dropbox': 'Dropbox', 'dropbox inc': 'Dropbox',
  'twitch': 'Twitch',
  'reddit': 'Reddit', 'reddit inc': 'Reddit',
  'github': 'GitHub', 'github inc': 'GitHub',
  'figma': 'Figma', 'figma inc': 'Figma',
  'roblox': 'Roblox', 'roblox corporation': 'Roblox',
  'epic games': 'Epic Games',
  'riot games': 'Riot Games',
  'activision blizzard': 'Activision Blizzard', 'blizzard': 'Activision Blizzard',
  'ea': 'Electronic Arts', 'electronic arts': 'Electronic Arts',
  'zoom': 'Zoom', 'zoom video communications': 'Zoom',
  'slack': 'Slack', 'slack technologies': 'Slack',
  'affirm': 'Affirm', 'affirm holdings': 'Affirm',
  'plaid': 'Plaid',
  'brex': 'Brex',
  'chime': 'Chime',
  'ramp': 'Ramp',
  'notion': 'Notion', 'notion labs': 'Notion',
  'canva': 'Canva',
  'airtable': 'Airtable',
  'cloudflare': 'Cloudflare', 'cloudflare inc': 'Cloudflare',
  'fastly': 'Fastly', 'fastly inc': 'Fastly',
  'akamai': 'Akamai', 'akamai technologies': 'Akamai',
  'sendgrid': 'SendGrid',
  'auth0': 'Auth0',
  'okta': 'Okta', 'okta inc': 'Okta',
  'hashicorp': 'HashiCorp',
  'docker': 'Docker', 'docker inc': 'Docker',
  'gitlab': 'GitLab', 'gitlab inc': 'GitLab',
  'postman': 'Postman',
  'vercel': 'Vercel',
  'netlify': 'Netlify',
  'supabase': 'Supabase',
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'cohere': 'Cohere',
  'hugging face': 'Hugging Face', 'huggingface': 'Hugging Face',
  'tesla': 'Tesla', 'tesla motors': 'Tesla',
  'rivian': 'Rivian', 'rivian automotive': 'Rivian',
  'lucid': 'Lucid', 'lucid motors': 'Lucid',
  'waymo': 'Waymo',
  'cruise': 'Cruise', 'cruise automation': 'Cruise',
  'zoox': 'Zoox',
  'nuro': 'Nuro',
  'anduril': 'Anduril', 'anduril industries': 'Anduril',
  'spacex': 'SpaceX', 'space exploration technologies': 'SpaceX',
  'blue origin': 'Blue Origin',
  'discord': 'Discord', 'discord inc': 'Discord',
  'spotify': 'Spotify', 'spotify technology': 'Spotify',
  'sony': 'Sony',
  'nintendo': 'Nintendo',
  'grab': 'Grab', 'grab holdings': 'Grab',
  'gojek': 'Gojek', 'goto': 'GoTo', 'goto group': 'GoTo',
  'delivery hero': 'Delivery Hero',
  'foodpanda': 'Foodpanda',
  'deliveroo': 'Deliveroo',
  'swiggy': 'Swiggy',
  'zomato': 'Zomato',
  'flipkart': 'Flipkart',
  'meesho': 'Meesho',
  'udaan': 'Udaan',
  'paytm': 'Paytm', 'one97 communications': 'Paytm',
  'phonepe': 'PhonePe',
  'cred': 'CRED',
  'razorpay': 'Razorpay',
  'zeta': 'Zeta',
  'dream11': 'Dream11',
  'mpl': 'MPL', 'mobile premier league': 'MPL',
  'ola': 'Ola', 'ola cabs': 'Ola',
  'ather energy': 'Ather Energy',
  'makemytrip': 'MakeMyTrip',
  'cleartrip': 'Cleartrip',
  'barclays': 'Barclays',
  'citi': 'Citi', 'citigroup': 'Citi',
  'bank of america': 'Bank of America', 'bofa': 'Bank of America',
  'credit suisse': 'Credit Suisse',
  'ubs': 'UBS', 'ubs group': 'UBS',
  'deutsche bank': 'Deutsche Bank',
  'hsbc': 'HSBC', 'hsbc holdings': 'HSBC',
  'standard chartered': 'Standard Chartered',
  'wells fargo': 'Wells Fargo',
  'capital one': 'Capital One',
  'american express': 'American Express', 'amex': 'American Express',
  'visa': 'Visa', 'visa inc': 'Visa',
  'mastercard': 'Mastercard', 'mastercard incorporated': 'Mastercard',
  'zoho': 'Zoho', 'zoho corporation': 'Zoho',
  'freshworks': 'Freshworks', 'freshdesk': 'Freshworks',
  'browserstack': 'BrowserStack',
  'chargebee': 'Chargebee',
  'zenoti': 'Zenoti',
  'mindtickle': 'Mindtickle',
  'icertis': 'Icertis',
  'druva': 'Druva',
  'highradius': 'HighRadius',
  'darwinbox': 'Darwinbox',
  'gupshup': 'Gupshup',
  'amagi': 'Amagi',
  'leadsquared': 'LeadSquared',
  'fractal': 'Fractal Analytics', 'fractal analytics': 'Fractal Analytics',
  'mu sigma': 'Mu Sigma', 'musigma': 'Mu Sigma',
  'tredence': 'Tredence',
  'zerodha': 'Zerodha',
  'groww': 'Groww',
  'upstox': 'Upstox',
  'sharechat': 'ShareChat',
  'dailyhunt': 'Dailyhunt',
  'inmobi': 'InMobi',
  'glance': 'Glance',
  'oyo': 'OYO', 'oyo rooms': 'OYO',
  'byjus': 'Byju\'s', 'byju\'s': 'Byju\'s',
  'unacademy': 'Unacademy',
  'vedantu': 'Vedantu',
  'physics wallah': 'Physics Wallah', 'physicswallah': 'Physics Wallah', 'pw': 'Physics Wallah',
  'upgrad': 'upGrad',
  'lenskart': 'Lenskart',
  'nykaa': 'Nykaa',
  'firstcry': 'FirstCry',
  'boat': 'boAt',
  'mamaearth': 'Mamaearth',
  'sugar cosmetics': 'SUGAR Cosmetics',
  'purplle': 'Purplle',
  'dunzo': 'Dunzo',
  'zepto': 'Zepto',
  'blinkit': 'Blinkit', 'grofers': 'Blinkit',
  'bigbasket': 'BigBasket',
  'licious': 'Licious',
  'freshtohome': 'FreshToHome',
  'rebel foods': 'Rebel Foods', 'faasos': 'Rebel Foods',
  'curefit': 'Cure.fit', 'cure.fit': 'Cure.fit', 'cult.fit': 'Cure.fit', 'cultfit': 'Cure.fit',
  'healthifyme': 'HealthifyMe',
  'pharmeasy': 'PharmEasy',
  '1mg': '1mg', 'tata 1mg': '1mg',
  'practo': 'Practo',
  'policybazaar': 'PolicyBazaar', 'policy bazaar': 'PolicyBazaar',
  'digit insurance': 'Digit Insurance', 'godigit': 'Digit Insurance',
  'acko': 'Acko',
  'pine labs': 'Pine Labs', 'pinelabs': 'Pine Labs',
  'bharatpe': 'BharatPe',
  'billdesk': 'BillDesk',
  'instamojo': 'Instamojo',
  'coinswitch': 'CoinSwitch', 'coinswitch kuber': 'CoinSwitch',
  'coindcx': 'CoinDCX',
  'polygon': 'Polygon', 'matic network': 'Polygon',
  'wazirx': 'WazirX',
  'rapido': 'Rapido',
  'bounce': 'Bounce',
  'chalo': 'Chalo',
  'cars24': 'CARS24',
  'spinny': 'Spinny',
  'cardekho': 'CarDekho', 'girnarsoft': 'CarDekho',
  'droom': 'Droom',
  'urban company': 'Urban Company', 'urbanclap': 'Urban Company',
  'nobroker': 'NoBroker',
  'livspace': 'Livspace',
  'delhivery': 'Delhivery',
  'xpressbees': 'Xpressbees',
  'shadowfax': 'Shadowfax',
  'shiprocket': 'Shiprocket',
  'blackbuck': 'BlackBuck',
  'rivigo': 'Rivigo',
  'checkout.com': 'Checkout.com', 'checkout': 'Checkout.com',
  'revolut': 'Revolut',
  'monzo': 'Monzo',
  'n26': 'N26',
  'starling bank': 'Starling Bank',
  'klarna': 'Klarna',
  'adyen': 'Adyen',
  'toast': 'Toast',
  'deel': 'Deel',
  'gusto': 'Gusto',
  'rippling': 'Rippling',
  'papaya global': 'Papaya Global',
  'remote': 'Remote',
  'scale ai': 'Scale AI', 'scale': 'Scale AI',
  'adept': 'Adept', 'adept ai': 'Adept',
  'character.ai': 'Character.ai', 'character ai': 'Character.ai',
  'midjourney': 'Midjourney',
  'stability ai': 'Stability AI',
  'inflection': 'Inflection', 'inflection ai': 'Inflection',
  'runway': 'Runway',
  'mistral': 'Mistral', 'mistral ai': 'Mistral',
  'miro': 'Miro',
  'coda': 'Coda',
  'monday.com': 'monday.com', 'monday': 'monday.com',
  'asana': 'Asana',
  'linear': 'Linear',
  'clickup': 'ClickUp',
  'smartsheet': 'Smartsheet',
  'flexport': 'Flexport'
};

function normalizeCompanyName(name) {
  if (!name) return 'Unknown';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (COMPANY_ALIASES[lower]) return COMPANY_ALIASES[lower];
  return trimmed.split(/\s+/).map(w => {
    if (w.length <= 2 && w === w.toUpperCase()) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}


// ============================================================
// LEETCODE GRAPHQL API — PRIMARY DATA SOURCE
// ============================================================

async function fetchLeetCodeCompanyTags(slug) {
  try {
    // Query 1: Get company tags for a specific question
    const response = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': `https://leetcode.com/problems/${slug}/`,
        'Origin': 'https://leetcode.com'
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          query questionCompanyTags($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              companyTags {
                name
                slug
                imgUrl
              }
              companyTagStats
              stats
              difficulty
              topicTags {
                name
                slug
              }
              title
              titleSlug
              likes
              dislikes
              acRate
            }
          }
        `,
        variables: { titleSlug: slug }
      })
    });

    if (!response.ok) {
      console.log(`[LCTracker] LeetCode GraphQL returned ${response.status} for ${slug}`);
      return null;
    }

    const data = await response.json();
    if (!data?.data?.question) return null;

    const question = data.data.question;
    const companies = [];

    // Parse companyTagStats (JSON string with frequency data)
    if (question.companyTagStats) {
      try {
        const stats = typeof question.companyTagStats === 'string'
          ? JSON.parse(question.companyTagStats)
          : question.companyTagStats;

        // Stats is typically { "1": [...], "2": [...], "3": [...] }
        // 1 = last 6 months, 2 = last 1 year, 3 = last 2 years
        const periodMap = { '1': '6months', '2': '1year', '3': '2year' };
        const companyMap = {};

        for (const [periodKey, companyList] of Object.entries(stats)) {
          const periodName = periodMap[periodKey] || 'alltime';
          if (Array.isArray(companyList)) {
            for (const entry of companyList) {
              const name = normalizeCompanyName(entry.name || entry.slug || '');
              if (!companyMap[name]) {
                companyMap[name] = {
                  company: name,
                  timesAsked: 0,
                  periods: {},
                  confidence: 0.95,
                  source: 'leetcode'
                };
              }
              companyMap[name].periods[periodName] = true;
              companyMap[name].timesAsked += (entry.timesEncountered || entry.frequency || 1);
            }
          }
        }

        for (const comp of Object.values(companyMap)) {
          // Determine frequency label
          if (comp.timesAsked >= 20) comp.frequency = 'High';
          else if (comp.timesAsked >= 5) comp.frequency = 'Medium';
          else comp.frequency = 'Low';

          // Determine lastSeen
          if (comp.periods['6months']) comp.lastSeen = '2025';
          else if (comp.periods['1year']) comp.lastSeen = '2024';
          else if (comp.periods['2year']) comp.lastSeen = '2023';
          else comp.lastSeen = 'Past';

          comp.periods.alltime = true;
          companies.push(comp);
        }
      } catch (e) {
        console.log('[LCTracker] Error parsing companyTagStats:', e);
      }
    }

    // Fallback: use companyTags list if companyTagStats was empty
    if (companies.length === 0 && question.companyTags) {
      for (const tag of question.companyTags) {
        companies.push({
          company: normalizeCompanyName(tag.name),
          frequency: 'Medium',
          timesAsked: 1,
          periods: { alltime: true },
          lastSeen: 'Past',
          confidence: 0.8,
          source: 'leetcode'
        });
      }
    }

    // Sort by timesAsked descending
    companies.sort((a, b) => b.timesAsked - a.timesAsked);

    return {
      companies,
      difficulty: question.difficulty,
      topicTags: question.topicTags || [],
      title: question.title,
      acRate: question.acRate,
      stats: question.stats
    };
  } catch (error) {
    console.log('[LCTracker] LeetCode GraphQL fetch error:', error.message);
    return null;
  }
}


// ============================================================
// GITHUB CSV DATA — SECONDARY DATA SOURCE
// ============================================================

async function fetchGitHubDatasets() {
  console.log('[LCTracker] Starting GitHub dataset fetch...');
  const allData = {};

  for (const repo of GITHUB_REPOS) {
    try {
      await fetchRepoData(repo, allData);
    } catch (error) {
      console.log(`[LCTracker] Error fetching from ${repo.name}:`, error.message);
    }
  }

  if (Object.keys(allData).length > 0) {
    await chrome.storage.local.set({
      [GITHUB_CACHE_KEY]: allData,
      [CACHE_TIMESTAMP_KEY]: Date.now()
    });
    console.log(`[LCTracker] Cached ${Object.keys(allData).length} problems from GitHub`);
  }

  return allData;
}

async function fetchRepoData(repo, allData) {
  // Fetch list of CSV files from the repo
  let files = [];

  try {
    const resp = await fetch(repo.apiUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    if (resp.ok) {
      const respData = await resp.json();
      if (respData.tree) {
        files = respData.tree
          .filter(f => f.path.endsWith('.csv'))
          .map(f => {
            let name = f.path.replace('.csv', '').replace(/_/g, ' ');
            // If the CSV is in a folder (e.g. companies/Amazon/6 Months.csv)
            if (name.includes('/')) {
              const parts = name.split('/');
              if (parts.length >= 2) {
                // Use the parent folder name as the company name
                name = parts[parts.length - 2];
              }
            }
            return {
              name: normalizeCompanyName(name),
              url: `${repo.baseUrl}/${f.path}`
            };
          });
      }
    }
  } catch (e) {
    console.log(`[LCTracker] Could not list files from ${repo.name}:`, e.message);
  }

  // Fetch and parse all CSVs in batches
  const filesToFetch = files;
  const batchSize = 15;

  for (let i = 0; i < filesToFetch.length; i += batchSize) {
    const batch = filesToFetch.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(f => fetchAndParseCSV(f, repo.name))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const { companyName, problems } = result.value;
        for (const problem of problems) {
          const slug = problem.slug;
          if (!slug) continue;

          if (!allData[slug]) {
            allData[slug] = { companies: [], isEstimated: false, lastUpdated: new Date().toISOString().split('T')[0] };
          }

          // Check if company already exists for this problem
          const existing = allData[slug].companies.find(c => c.company === companyName);
          if (existing) {
            existing.timesAsked = Math.max(existing.timesAsked, problem.frequency || 1);
          } else {
            allData[slug].companies.push({
              company: companyName,
              frequency: getFreqLabel(problem.frequency),
              timesAsked: problem.frequency || 1,
              periods: parsePeriod(problem.period),
              lastSeen: 'Past',
              confidence: 0.75,
              source: 'github'
            });
          }
        }
      }
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < filesToFetch.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

async function fetchAndParseCSV(file, repoName) {
  try {
    const resp = await fetch(file.url);
    if (!resp.ok) return null;

    const text = await resp.text();
    const lines = text.split('\n');
    if (lines.length < 2) return null;

    const header = lines[0].toLowerCase();
    const problems = [];
    const companyName = file.name;
    const urlLower = file.url.toLowerCase();
    const period = (urlLower.includes('6month') || urlLower.includes('six-month') || urlLower.includes('6-month')) ? '6months' :
                   (urlLower.includes('1year')  || urlLower.includes('one-year') || urlLower.includes('1-year')) ? '1year' :
                   (urlLower.includes('2year')  || urlLower.includes('two-year')) ? '2year' : 'alltime';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle quoted fields)
      const fields = parseCSVLine(line);
      if (fields.length < 2) continue;

      // Try to extract slug from URL or title
      let slug = '';
      let freq = 0;

      for (const field of fields) {
        // Check if field is a LeetCode URL
        const urlMatch = field.match(/leetcode\.com\/problems\/([a-z0-9-]+)/);
        if (urlMatch) {
          slug = urlMatch[1];
        }
        // Check if it's a numeric frequency
        const numMatch = field.match(/^(\d+\.?\d*)$/);
        if (numMatch) {
          freq = Math.max(freq, parseFloat(numMatch[1]));
        }
      }

      // If no URL found, try to derive slug from title
      if (!slug && fields.length >= 2) {
        // Assume the first or second field is the title
        const titleField = fields.find(f => f.length > 3 && !f.match(/^\d+$/) && !f.includes('http'));
        if (titleField) {
          slug = titleField.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        }
      }

      if (slug) {
        problems.push({ slug, frequency: freq, period });
      }
    }

    return { companyName, problems };
  } catch (e) {
    return null;
  }
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function getFreqLabel(freq) {
  if (typeof freq === 'number') {
    if (freq >= 50) return 'High';
    if (freq >= 15) return 'Medium';
    return 'Low';
  }
  return 'Medium';
}

function parsePeriod(period) {
  const periods = { alltime: true };
  if (period === '6months') { periods['6months'] = true; periods['1year'] = true; periods['2year'] = true; }
  if (period === '1year') { periods['1year'] = true; periods['2year'] = true; }
  if (period === '2year') { periods['2year'] = true; }
  return periods;
}


// ============================================================
// DATA MERGING & LOOKUP
// ============================================================

async function getCompanyData(slug) {
  // 1. Try LeetCode GraphQL (primary)
  const leetcodeData = await fetchLeetCodeCompanyTags(slug);

  // 2. Get cached GitHub data
  const cached = await chrome.storage.local.get([GITHUB_CACHE_KEY]);
  const githubData = cached[GITHUB_CACHE_KEY] || {};
  const githubEntry = githubData[slug];

  // 3. Get bundled fallback
  let fallbackData = null;
  try {
    const resp = await fetch(chrome.runtime.getURL('data/fallback_data.json'));
    const fallback = await resp.json();
    fallbackData = fallback[slug];
  } catch (e) {
    console.log('[LCTracker] Could not load fallback data:', e.message);
  }

  // Merge results
  const mergedCompanies = {};
  let isEstimated = false;
  let difficulty = null;
  let topicTags = [];

  // Source 1: LeetCode (highest priority)
  if (leetcodeData && leetcodeData.companies.length > 0) {
    difficulty = leetcodeData.difficulty;
    topicTags = leetcodeData.topicTags;
    for (const comp of leetcodeData.companies) {
      mergedCompanies[comp.company] = { ...comp };
    }
  }

  // Source 2: GitHub (supplement)
  if (githubEntry && githubEntry.companies) {
    for (const comp of githubEntry.companies) {
      if (!mergedCompanies[comp.company]) {
        mergedCompanies[comp.company] = { ...comp };
      } else {
        // Merge: keep higher confidence data but augment periods
        const existing = mergedCompanies[comp.company];
        existing.periods = { ...comp.periods, ...existing.periods };
        existing.timesAsked = Math.max(existing.timesAsked, comp.timesAsked);
      }
    }
  }

  // Source 3: Fallback
  if (Object.keys(mergedCompanies).length === 0 && fallbackData) {
    for (const comp of fallbackData.companies) {
      mergedCompanies[comp.company] = { ...comp };
    }
  }

  // Source 4: Heuristic estimation
  if (Object.keys(mergedCompanies).length === 0) {
    isEstimated = true;
    // We'll let the content script handle heuristic estimation
    // since it has the heuristics.js loaded
  }

  const companies = Object.values(mergedCompanies);
  companies.sort((a, b) => b.timesAsked - a.timesAsked);

  return {
    companies,
    isEstimated,
    lastUpdated: new Date().toISOString().split('T')[0],
    difficulty,
    topicTags,
    slug
  };
}


// ============================================================
// DIRECTORY API (PROBLEMSET)
// ============================================================

async function buildCompanyDirectory() {
  const cached = await chrome.storage.local.get([GITHUB_CACHE_KEY, CACHE_KEY, LOCAL_DATA_KEY]);
  const githubData = cached[GITHUB_CACHE_KEY] || {};
  const lcData = cached[CACHE_KEY] || {};
  const localData = cached[LOCAL_DATA_KEY] || {};

  let fallbackData = {};
  try {
    const resp = await fetch(chrome.runtime.getURL('data/fallback_data.json'));
    fallbackData = await resp.json();
  } catch (e) {
    console.log('[LCTracker] Could not load fallback data for directory');
  }

  const companyMap = {};

  const processSlug = (slug, entry, source = 'Unknown') => {
    if (!slug || !entry || !entry.companies || !Array.isArray(entry.companies)) return;
    
    for (const comp of entry.companies) {
      const name = normalizeCompanyName(comp.company);
      if (!name || name === 'Unknown' || name.length < 2) continue;

      if (!companyMap[name]) {
        companyMap[name] = { company: name, problems: [] };
      }

      const existingProblem = companyMap[name].problems.find(p => p.slug === slug);
      if (!existingProblem) {
        companyMap[name].problems.push({
          slug,
          frequency: comp.frequency || 'Low',
          timesAsked: comp.timesAsked || 1,
          lastSeen: comp.lastSeen || 'Past',
          source: comp.source || source
        });
      } else {
        // Update frequency if higher
        const freqOrder = { 'High': 3, 'Medium': 2, 'Low': 1, 'Unknown': 0 };
        const newFreq = comp.frequency || 'Low';
        const oldFreq = existingProblem.frequency || 'Low';
        if (freqOrder[newFreq] > freqOrder[oldFreq]) {
          existingProblem.frequency = newFreq;
        }
        existingProblem.timesAsked = Math.max(existingProblem.timesAsked, comp.timesAsked || 0);
        
        // Add source to list of sources if not present
        const currentSource = comp.source || source;
        const sources = existingProblem.source.split(', ');
        if (!sources.includes(currentSource)) {
          existingProblem.source = [...sources, currentSource].join(', ');
        }
      }
    }
  };

  // Process all data sources
  for (const [slug, entry] of Object.entries(githubData)) {
    processSlug(slug, entry, 'GitHub');
  }
  for (const [slug, entry] of Object.entries(lcData)) {
    processSlug(slug, entry, 'LeetCode');
  }
  for (const [slug, entry] of Object.entries(localData)) {
    processSlug(slug, entry, 'Local');
  }
  for (const [slug, entry] of Object.entries(fallbackData)) {
    processSlug(slug, entry, 'Fallback');
  }

  return companyMap;
}

async function getAllCompanies() {
  const map = await buildCompanyDirectory();
  const list = Object.values(map)
    .filter(c => c.problems && c.problems.length > 0)
    .map(c => ({
      company: c.company,
      count: c.problems.length
    }));
  return list.sort((a, b) => b.count - a.count);
}

async function getCompanyProblems(companyName) {
  const map = await buildCompanyDirectory();
  const lowerName = companyName.toLowerCase();

  // Find key case-insensitively
  const key = Object.keys(map).find(k => k.toLowerCase() === lowerName);

  if (!key || !map[key]) return [];

  return map[key].problems.sort((a, b) => b.timesAsked - a.timesAsked);
}


// ============================================================
// CACHE MANAGEMENT
// ============================================================

async function isCacheStale() {
  const result = await chrome.storage.local.get([CACHE_TIMESTAMP_KEY]);
  const timestamp = result[CACHE_TIMESTAMP_KEY];
  if (!timestamp) return true;
  return (Date.now() - timestamp) > CACHE_DURATION;
}

async function refreshDataIfNeeded() {
  const stale = await isCacheStale();
  if (stale) {
    console.log('[LCTracker] Cache is stale, refreshing GitHub data...');
    await fetchGitHubDatasets();
  } else {
    console.log('[LCTracker] Cache is fresh, skipping refresh');
  }
}


// ============================================================
// EVENT LISTENERS
// ============================================================

// On install: fetch data and set up periodic refresh
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[LCTracker] Extension installed/updated:', details.reason);

  // Set default settings
  const settings = await chrome.storage.local.get([SETTINGS_KEY]);
  if (!settings[SETTINGS_KEY]) {
    await chrome.storage.local.set({
      [SETTINGS_KEY]: {
        enabled: true,
        showEstimated: true,
        autoRefresh: true,
        theme: 'dark'
      }
    });
  }

  // Set up 24-hour alarm for data refresh
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 24 * 60
  });

  // Initial data fetch
  loadLocalData();
  fetchGitHubDatasets();
});

async function loadLocalData() {
  try {
    const resp = await fetch(chrome.runtime.getURL('data/local_data.json'));
    if (!resp.ok) return;
    const data = await resp.json();
    await chrome.storage.local.set({ [LOCAL_DATA_KEY]: data });
    console.log('[LCTracker] Local baseline data loaded successfully');
  } catch (e) {
    console.error('[LCTracker] Error loading local baseline data:', e);
  }
}

// Alarm handler: periodic data refresh
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[LCTracker] Alarm triggered: refreshing data');
    await fetchGitHubDatasets();
  }
});

// Message handler: respond to content script requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_COMPANY_DATA') {
    getCompanyData(message.slug).then(data => {
      sendResponse({ success: true, data });
    }).catch(error => {
      console.error('[LCTracker] Error getting company data:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_ALL_COMPANIES') {
    getAllCompanies().then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_COMPANY_PROBLEMS') {
    getCompanyProblems(message.company).then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'REFRESH_DATA') {
    fetchGitHubDatasets().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message.type === 'CLEAR_ALL_CACHE') {
    chrome.storage.local.remove([CACHE_KEY, GITHUB_CACHE_KEY, LOCAL_DATA_KEY, CACHE_TIMESTAMP_KEY]).then(() => {
      // Reload local data after clear
      loadLocalData();
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get([SETTINGS_KEY]).then(result => {
      sendResponse({ settings: result[SETTINGS_KEY] || { enabled: true, showEstimated: true, autoRefresh: true, theme: 'dark' } });
    });
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ [SETTINGS_KEY]: message.settings }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_CACHE_STATUS') {
    Promise.all([
      chrome.storage.local.get([CACHE_TIMESTAMP_KEY, GITHUB_CACHE_KEY, CACHE_KEY, LOCAL_DATA_KEY])
    ]).then(async ([data]) => {
      const timestamp = data[CACHE_TIMESTAMP_KEY];
      const githubData = data[GITHUB_CACHE_KEY] || {};
      const lcData = data[CACHE_KEY] || {};
      const localData = data[LOCAL_DATA_KEY] || {};
      
      let fallbackData = {};
      try {
        const resp = await fetch(chrome.runtime.getURL('data/fallback_data.json'));
        fallbackData = await resp.json();
      } catch(e) {}

      const countProblems = (d) => {
        let count = 0;
        Object.values(d).forEach(e => {
          if (e.companies) count += e.companies.length;
        });
        return count;
      };

      sendResponse({
        lastUpdated: timestamp ? new Date(timestamp).toLocaleString() : 'Never',
        githubCount: countProblems(githubData),
        leetcodeCount: countProblems(lcData),
        localCount: countProblems(localData),
        fallbackCount: countProblems(fallbackData),
        isStale: timestamp ? (Date.now() - timestamp) > CACHE_DURATION : true
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_CACHE') {
    chrome.storage.local.remove([CACHE_KEY, CACHE_TIMESTAMP_KEY, GITHUB_CACHE_KEY]).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// On startup: check if data needs refresh
chrome.runtime.onStartup?.addListener(async () => {
  console.log('[LCTracker] Browser started, checking cache...');
  await refreshDataIfNeeded();
});
