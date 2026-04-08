/**
 * Company Name Normalization Utilities
 * Normalizes inconsistent company naming across data sources
 */

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
  'tredence': 'Tredence',
  'zerodha': 'Zerodha',
  'groww': 'Groww',
  'upstox': 'Upstox',
  'sharechat': 'ShareChat',
  'inmobi': 'InMobi',
  'glance': 'Glance',
  'razorpay': 'Razorpay',
  'zeta': 'Zeta',
  'coinswitch': 'CoinSwitch', 'coinswitch kuber': 'CoinSwitch',
  'coindcx': 'CoinDCX',
  'polygon': 'Polygon', 'matic network': 'Polygon',
  'wazirx': 'WazirX'
};


const COMPANY_LOGOS = {
  'Amazon': '🟠', 'Google': '🔵', 'Meta': '🔷', 'Microsoft': '🟦', 'Apple': '⚫', 'Netflix': '🔴', 'Uber': '⬛', 'Lyft': '🟣', 'Airbnb': '🔶', 'Adobe': '🔺', 'Bloomberg': '🟡', 'Oracle': '🔴', 'Salesforce': '☁️', 'LinkedIn': '🔵', 'Snap': '🟡', 'X (Twitter)': '⬛', 'TikTok': '🎵', 'ByteDance': '🎵', 'Goldman Sachs': '💰', 'JPMorgan': '💰', 'Morgan Stanley': '💰', 'D.E. Shaw': '💰',
  'Citadel': '📈', 'Two Sigma': '📈', 'Jane Street': '📈', 'HRT': '📈', 'Akuna Capital': '📈', 'Optiver': '📈', 'IMC Trading': '📈', 'Jump Trading': '📈', 'Tower Research': '📈',
  'Barclays': '🏦', 'Citi': '🏦', 'Bank of America': '🏦', 'Credit Suisse': '🏦', 'UBS': '🏦', 'Deutsche Bank': '🏦', 'HSBC': '🏦', 'Standard Chartered': '🏦', 'Wells Fargo': '🏦', 'Capital One': '💳', 'American Express': '💳', 'Visa': '💳', 'Mastercard': '💳',
  'Stripe': '💜', 'PayPal': '💙', 'NVIDIA': '💚', 'Intel': '🔵', 'Samsung': '🔵', 'Walmart': '🔵', 'DoorDash': '🔴', 'Robinhood': '💚', 'Databricks': '🔶', 'Palantir': '⬛', 'Coinbase': '🔵', 'Shopify': '💚', 'Atlassian': '🔵', 'Cisco': '🔵', 'VMware': '🔵', 'Snowflake': '❄️', 'Pinterest': '🔴', 'Reddit': '🟠', 'GitHub': '⬛', 'Roblox': '🔴', 'TCS': '🔵', 'Infosys': '🔵', 'Wipro': '🔵', 'HCL': '🔵', 'Cognizant': '🔵', 'Capgemini': '🔵', 'Accenture': '🟣', 'IBM': '🔵', 'Deloitte': '🟢', 'PwC': '🟠', 'EY': '🟡', 'KPMG': '🔵', 'Intuit': '💚', 'ServiceNow': '💚', 'Workday': '🔶', 'Twilio': '🔴', 'Zillow': '🔵', 'Figma': '🟣', 'Booking.com': '🔵', 'Expedia': '🔵', 'Dropbox': '🔵', 'Yahoo': '🟣', 'Qualcomm': '🔵', 'Splunk': '💚', 'Block (Square)': '⬛', 'Epic Games': '⬛', 'Riot Games': '🔴', 'Electronic Arts': '🔵', 'Activision Blizzard': '🔵', 'Twitch': '🟣', 'Yandex': '🔴',
  'Zoom': '📹', 'Slack': '💬', 'Affirm': '💸', 'Plaid': '🔗', 'Brex': '💳', 'Chime': '🏦', 'Ramp': '💳', 'Notion': '📝', 'Canva': '🖌️', 'Airtable': '📊', 'Cloudflare': '☁️', 'Fastly': '☁️', 'Akamai': '☁️', 'SendGrid': '📧', 'Auth0': '🔐', 'Okta': '🔐', 'HashiCorp': '🛠️', 'Docker': '🐳', 'GitLab': '🦊', 'Postman': '🚀', 'Vercel': '▲', 'Netlify': '🌐', 'Supabase': '⚡', 'OpenAI': '🤖', 'Anthropic': '🤖', 'Cohere': '🤖', 'Hugging Face': '🤗', 'Tesla': '🚗', 'Rivian': '🚙', 'Lucid': '🚘', 'Waymo': '🚕', 'Cruise': '🚕', 'Zoox': '🚕', 'Nuro': '🛒', 'Anduril': '🛡️', 'SpaceX': '🚀', 'Blue Origin': '🚀', 'Discord': '🎮', 'Spotify': '🎧', 'Sony': '🎮', 'Nintendo': '🍄', 'Grab': '🚕', 'Gojek': '🏍️', 'GoTo': '🛒', 'Delivery Hero': '🍔', 'Foodpanda': '🐼', 'Deliveroo': '🍔', 'Swiggy': '🍔', 'Zomato': '🍅', 'Flipkart': '🛒', 'Meesho': '🛍️', 'Udaan': '📦', 'Paytm': '💸', 'PhonePe': '💳', 'CRED': '💳', 'Razorpay': '💳', 'Zeta': '🏦', 'Dream11': '🏏', 'MPL': '🎮', 'Ola': '🚕', 'Ather Energy': '🛵', 'MakeMyTrip': '✈️', 'Cleartrip': '✈️',
  'Zoho': '🏢', 'Freshworks': '🍃', 'BrowserStack': '🌐', 'Chargebee': '🐝', 'Zenoti': '🧘', 'Mindtickle': '🧠', 'Icertis': '📄', 'Druva': '☁️', 'HighRadius': '⚡', 'Darwinbox': '📦', 'Gupshup': '💬', 'Amagi': '📺', 'LeadSquared': '📈', 'Fractal Analytics': '📊', 'Mu Sigma': '🧮', 'Tredence': '📈',
  'Zerodha': '🪁', 'Groww': '🌱', 'Upstox': '📈', 'ShareChat': '💬', 'Dailyhunt': '📰', 'InMobi': '📱', 'Glance': '📱', 'OYO': '🏨', 'Byju\'s': '📚', 'Unacademy': '🎓', 'Vedantu': '👨‍🏫', 'Physics Wallah': '📖', 'upGrad': '🎓',
  'Lenskart': '👓', 'Nykaa': '💄', 'FirstCry': '👶', 'boAt': '🎧', 'Mamaearth': '🌿', 'SUGAR Cosmetics': '💄', 'Purplle': '💜',
  'Dunzo': '🛵', 'Zepto': '🛒', 'Blinkit': '🛒', 'BigBasket': '🛒', 'Licious': '🥩', 'FreshToHome': '🐟', 'Rebel Foods': '🍔',
  'Cure.fit': '🏋️', 'HealthifyMe': '🥗', 'PharmEasy': '💊', '1mg': '💊', 'Practo': '🩺',
  'PolicyBazaar': '🛡️', 'Digit Insurance': '📱', 'Acko': '🛡️',
  'Pine Labs': '💳', 'BharatPe': '💳', 'BillDesk': '💳', 'Instamojo': '💳', 'CoinSwitch': '🪙', 'CoinDCX': '🪙', 'Polygon': '🟣', 'WazirX': '🪙',
  'Rapido': '🏍️', 'Bounce': '🛵', 'Chalo': '🚌', 'CARS24': '🚗', 'Spinny': '🚙', 'CarDekho': '🚘', 'Droom': '🏎️',
  'Urban Company': '🛠️', 'NoBroker': '🏠', 'Livspace': '🛋️',
  'Delhivery': '🚚', 'Xpressbees': '📦', 'Shadowfax': '🛵', 'Shiprocket': '🚀', 'BlackBuck': '🚛', 'Rivigo': '🚚',
  'Checkout.com': '💳', 'Revolut': '💳', 'Monzo': '🏦', 'N26': '🏦', 'Starling Bank': '🏦', 'Klarna': '🛍️', 'Adyen': '💳', 'Toast': '🍞',
  'Deel': '🌍', 'Gusto': '💰', 'Rippling': '🌊', 'Papaya Global': '🌎', 'Remote': '💻',
  'Scale AI': '⚖️', 'Adept': '🤖', 'Character.ai': '🗣️', 'Midjourney': '🎨', 'Stability AI': '🖼️', 'Inflection': '🤖', 'Runway': '🎬', 'Intercom': '💬', 'Mistral': '🌪️',
  'Miro': '🖍️', 'Coda': '📝', 'monday.com': '📅', 'Asana': '✅', 'Linear': '⚡', 'ClickUp': '☑️', 'Smartsheet': '📊', 'Flexport': '🚢'
};

function normalizeCompanyName(name) {
  if (!name) return 'Unknown';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  if (COMPANY_ALIASES[lower]) {
    return COMPANY_ALIASES[lower];
  }
  
  // Title case the original name if no alias found
  return trimmed.split(/\s+/).map(word => {
    if (word.length <= 2 && word === word.toUpperCase()) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function getCompanyEmoji(name) {
  const normalized = normalizeCompanyName(name);
  return COMPANY_LOGOS[normalized] || '🏢';
}

function getFrequencyLabel(freq) {
  if (typeof freq === 'string') {
    const lower = freq.toLowerCase();
    if (lower.includes('high') || lower === 'h') return 'High';
    if (lower.includes('med') || lower === 'm') return 'Medium';
    if (lower.includes('low') || lower === 'l') return 'Low';
    return freq;
  }
  if (typeof freq === 'number') {
    if (freq >= 70) return 'High';
    if (freq >= 30) return 'Medium';
    return 'Low';
  }
  return 'Unknown';
}

function getFrequencyScore(label) {
  switch (label) {
    case 'High': return 3;
    case 'Medium': return 2;
    case 'Low': return 1;
    default: return 0;
  }
}

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.LCCompanyNormalize = {
    normalizeCompanyName,
    getCompanyEmoji,
    getFrequencyLabel,
    getFrequencyScore,
    COMPANY_ALIASES,
    COMPANY_LOGOS
  };
}

