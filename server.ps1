$path = $PSScriptRoot
$port = 8000

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "application/javascript; charset=utf-8"
    ".jpeg" = "image/jpeg"
    ".jpg" = "image/jpeg"
    ".png" = "image/png"
    ".svg" = "image/svg+xml"
    ".mp4" = "video/mp4"
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "Server started on http://localhost:$port/"

function Send-Response {
    param (
        [System.Net.Sockets.NetworkStream]$Stream,
        [string]$Status,
        [string]$ContentType,
        [byte[]]$Body
    )

    $headers = "HTTP/1.1 $Status`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    $Stream.Write($Body, 0, $Body.Length)
}

function Handle-Client {
    param (
        [System.Net.Sockets.TcpClient]$Client
    )

    $stream = $null
    try {
        $Client.ReceiveTimeout = 5000
        $Client.SendTimeout = 5000
        $stream = $Client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)

        $requestLine = $reader.ReadLine()
        while ($reader.ReadLine()) { }

        $status = "200 OK"
        $body = $null
        $contentType = "text/plain; charset=utf-8"

        if (-not $requestLine -or (-not $requestLine.StartsWith("GET ") -and -not $requestLine.StartsWith("HEAD "))) {
            $status = "405 Method Not Allowed"
            $body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
        } else {
            $urlPath = $requestLine.Split(" ")[1].Split("?")[0]
            if ($urlPath -eq "/") { $urlPath = "/index.html" }

            $relativePath = [System.Uri]::UnescapeDataString($urlPath.TrimStart("/")).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($path, $relativePath))
            $rootPath = [System.IO.Path]::GetFullPath($path)

            if ($filePath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase) -and [System.IO.File]::Exists($filePath)) {
                $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                if ($mimeTypes.ContainsKey($extension)) {
                    $contentType = $mimeTypes[$extension]
                }
                $body = [System.IO.File]::ReadAllBytes($filePath)
            } else {
                $status = "404 Not Found"
                $body = [System.Text.Encoding]::UTF8.GetBytes("File not found")
            }
        }

        Send-Response -Stream $stream -Status $status -ContentType $contentType -Body $body
    } catch {
        Write-Host "Request failed: $($_.Exception.Message)"
    } finally {
        if ($stream) { $stream.Close() }
        $Client.Close()
    }
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        Handle-Client -Client $client
    }
} finally {
    $listener.Stop()
}
