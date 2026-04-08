$csvDir = "c:\Users\prasa\Downloads\lc\csv"
$outputFile = "c:\Users\prasa\Downloads\lc\data\local_data.json"
$allData = @{}

function Normalize-CompanyName($name) {
    if (-not $name) { return "Unknown" }
    $trimmed = $name.Trim()
    $lower = $trimmed.ToLower()
    
    $mapping = @{
        "fb" = "Meta"
        "facebook" = "Meta"
        "meta" = "Meta"
        "msft" = "Microsoft"
        "goog" = "Google"
        "amzn" = "Amazon"
        "aapl" = "Apple"
        "nflx" = "Netflix"
        "zoho" = "Zoho"
    }
    
    if ($mapping.ContainsKey($lower)) { return $mapping[$lower] }
    
    return (Get-Culture).TextInfo.ToTitleCase($lower.Replace("-", " ").Replace("_", " "))
}

Write-Host "Starting aggregation of local CSV data..."
$folders = Get-ChildItem -Path $csvDir -Directory

foreach ($folder in $folders) {
    $companyName = Normalize-CompanyName $folder.Name
    $files = Get-ChildItem -Path $folder.FullName -Filter "*.csv"
    
    foreach ($file in $files) {
        $period = "alltime"
        if ($file.Name -like "*six-month*" -or $file.Name -like "*6-month*") { $period = "6months" }
        elseif ($file.Name -like "*1-year*" -or $file.Name -like "*one-year*") { $period = "1year" }
        elseif ($file.Name -like "*2-year*" -or $file.Name -like "*two-year*") { $period = "2year" }

        $content = Get-Content -Path $file.FullName
        if ($content.Count -lt 2) { continue }

        for ($i = 1; $i -lt $content.Count; $i++) {
            $line = $content[$i].Trim()
            if (-not $line) { continue }
            
            # Simple comma split (not robust for quotes but usually okay for these CSVs)
            $fields = $line.Split(",")
            if ($fields.Count -lt 2) { continue }

            $slug = ""
            foreach ($field in $fields) {
                if ($field -match "leetcode\.com/problems/([a-z0-9-]+)") {
                    $slug = $matches[1]
                    break
                }
            }

            if (-not $slug -and $fields.Count -ge 3) {
                $title = $fields[2].Trim()
                if ($title.Length -gt 3 -and -not ($title -like "*http*")) {
                    $slug = $title.ToLower().Replace(" ", "-").Replace("'", "") -replace "[^a-z0-9-]", ""
                }
            }

            if ($slug) {
                if (-not $allData.ContainsKey($slug)) {
                    $allData[$slug] = @{
                        companies = @()
                        lastUpdated = (Get-Date).ToString("yyyy-MM-dd")
                    }
                }

                $existingComp = $allData[$slug].companies | Where-Object { $_.company -eq $companyName }
                if (-not $existingComp) {
                    $allData[$slug].companies += @{
                        company = $companyName
                        frequency = if ($period -eq "6months") { "High" } else { "Medium" }
                        timesAsked = if ($period -eq "6months") { 20 } else { 10 }
                        lastSeen = "2025"
                        source = "local"
                    }
                }
            }
        }
    }
}

$json = $allData | ConvertTo-Json -Depth 10
Set-Content -Path $outputFile -Value $json
Write-Host "Aggregation complete. Saved to $outputFile"
