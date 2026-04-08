const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '..', 'csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'local_data.json');

function normalizeCompanyName(name) {
  if (!name) return 'Unknown';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  // Basic manual mapping for directory folder names to canonical names
  const mapping = {
    'fb': 'Meta', 'facebook': 'Meta', 'meta': 'Meta',
    'msft': 'Microsoft', 'goog': 'Google', 'amzn': 'Amazon',
    'aapl': 'Apple', 'nflx': 'Netflix'
  };
  
  if (mapping[lower]) return mapping[lower];
  
  // Sentence case otherwise
  return trimmed.split(/[-_\s]+/).map(w => 
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
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

const allData = {};

function aggregate() {
  console.log('Starting aggregation of local CSV data...');
  const companies = fs.readdirSync(CSV_DIR);
  let totalProblems = 0;

  for (const companyFolder of companies) {
    const companyPath = path.join(CSV_DIR, companyFolder);
    if (!fs.statSync(companyPath).isDirectory()) continue;

    const companyName = normalizeCompanyName(companyFolder);
    const files = fs.readdirSync(companyPath).filter(f => f.endsWith('.csv'));

    for (const file of files) {
      const filePath = path.join(companyPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      if (lines.length < 2) continue;

      // Detect period from filename
      const period = file.includes('six-month') || file.includes('6-month') ? '6months' :
                     file.includes('1-year') || file.includes('one-year') ? '1year' :
                     file.includes('2-year') || file.includes('two-year') ? '2year' : 'alltime';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const fields = parseCSVLine(line);
        if (fields.length < 2) continue;

        let slug = '';
        // Look for slug in URL
        for (const field of fields) {
          const urlMatch = field.match(/leetcode\.com\/problems\/([a-z0-9-]+)/);
          if (urlMatch) {
            slug = urlMatch[1];
            break;
          }
        }

        // If no URL, try to derive from title (usually 3rd field)
        if (!slug && fields.length >= 3) {
           const title = fields[2];
           if (title && title.length > 3 && !title.includes('http')) {
              slug = title.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
           }
        }

        if (slug) {
          if (!allData[slug]) {
            allData[slug] = { companies: [], lastUpdated: new Date().toISOString().split('T')[0] };
          }

          const existingComp = allData[slug].companies.find(c => c.company === companyName);
          if (existingComp) {
            // Update period/frequency if this file is more specific
            if (period === '6months') existingComp.frequency = 'High';
          } else {
            allData[slug].companies.push({
              company: companyName,
              frequency: period === '6months' ? 'High' : 'Medium',
              timesAsked: period === '6months' ? 20 : 10,
              lastSeen: '2025',
              source: 'local'
            });
          }
          totalProblems++;
        }
      }
    }
  }

  console.log(`Aggregation complete. Found ${totalProblems} entries across companies.`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
  console.log(`Saved to ${OUTPUT_FILE}`);
}

aggregate();
