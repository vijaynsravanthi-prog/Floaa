$files = @('index.html','shop.html','earrings.html','necklaces.html','bracelets.html','rings.html','about.html','contact.html')
$base = 'http://localhost:8000/'
$seen = @{}
$results = @()

foreach ($file in $files) {
    if (-not (Test-Path $file)) { continue }
    $content = Get-Content $file -Raw
    # find img src with double quotes
    foreach ($m in [regex]::Matches($content, 'src="([^"]+)"')) {
        $url = $m.Groups[1].Value
        if (-not $seen.ContainsKey($url)) { $seen[$url] = $true }
    }
    # find img src with single quotes
    foreach ($m in [regex]::Matches($content, "src='([^']+)'") ) {
        $url = $m.Groups[1].Value
        if (-not $seen.ContainsKey($url)) { $seen[$url] = $true }
    }
    # find background-image urls with double quotes
    foreach ($m in [regex]::Matches($content, 'url\("([^"]+)"\)')) {
        $url = $m.Groups[1].Value
        if (-not $seen.ContainsKey($url)) { $seen[$url] = $true }
    }
    # find background-image urls with single quotes
    foreach ($m in [regex]::Matches($content, "url\('([^']+)'\)")) {
        $url = $m.Groups[1].Value
        if (-not $seen.ContainsKey($url)) { $seen[$url] = $true }
    }
    # find bare url(...) without quotes
    foreach ($m in [regex]::Matches($content, 'url\(([^\\)]+)\)')) {
        $url = $m.Groups[1].Value
        $url = $url.Trim()
        if ($url.Length -gt 0) {
            if ($url.StartsWith('"') -or $url.StartsWith("'")) { $url = $url.Substring(1) }
            if ($url.EndsWith('"') -or $url.EndsWith("'")) { $url = $url.Substring(0, $url.Length - 1) }
            if (-not $seen.ContainsKey($url)) { $seen[$url] = $true }
        }
    }
}

foreach ($k in $seen.Keys) {
    $raw = $k
    if ($raw -match '^https?://') { $url = $raw } else {
        $path = $raw.TrimStart('/')
        $url = $base + $path
    }
    try {
        $resp = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
        $status = $resp.StatusCode
        $len = $resp.Headers['Content-Length']
    } catch {
        # try GET as fallback
        try {
            $resp = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
            $status = $resp.StatusCode
            $len = $resp.Headers['Content-Length']
        } catch {
            $status = 'ERROR'
            $len = $null
        }
    }
    $results += [pscustomobject]@{url=$url; raw=$raw; status=$status; length=$len}
}

# write a plain UTF8 TSV for easier parsing
$outPath = 'tools\image_check_results.txt'
"url\traw\tstatus\tlength" | Out-File -FilePath $outPath -Encoding UTF8
foreach ($r in ($results | Sort-Object status, url)) {
    "{0}`t{1}`t{2}`t{3}" -f $r.url, $r.raw, $r.status, ($r.length -as [string]) | Out-File -FilePath $outPath -Encoding UTF8 -Append
}
Write-Output "Wrote $outPath"