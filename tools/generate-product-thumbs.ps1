Add-Type -AssemblyName System.Drawing

$sourceDir = Join-Path (Get-Location) "assets\floaa-jew-pics"
$maxWidth = 720
$maxHeight = 720
$jpegQuality = 74L

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" }

if (-not $jpegCodec) {
    throw "JPEG codec not available."
}

$imageFiles = Get-ChildItem -Path $sourceDir -File |
    Where-Object {
        $_.BaseName -notlike "*-thumb" -and
        @(".jpg", ".jpeg", ".png") -contains $_.Extension.ToLowerInvariant()
    }

foreach ($file in $imageFiles) {
    $thumbPath = Join-Path $file.DirectoryName ($file.BaseName + "-thumb.jpg")

    try {
        $image = [System.Drawing.Image]::FromFile($file.FullName)
        $ratio = [Math]::Min($maxWidth / $image.Width, $maxHeight / $image.Height)
        $ratio = [Math]::Min($ratio, 1)
        $targetWidth = [Math]::Max([int]([Math]::Round($image.Width * $ratio)), 1)
        $targetHeight = [Math]::Max([int]([Math]::Round($image.Height * $ratio)), 1)

        $bitmap = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::White)
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.DrawImage($image, 0, 0, $targetWidth, $targetHeight)

                $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
                $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
                    [System.Drawing.Imaging.Encoder]::Quality,
                    $jpegQuality
                )

                $bitmap.Save($thumbPath, $jpegCodec, $encoderParams)
                $encoderParams.Dispose()
            } finally {
                $graphics.Dispose()
            }
        } finally {
            $bitmap.Dispose()
        }
    } catch {
        Write-Warning ("Skipping {0}: {1}" -f $file.Name, $_.Exception.Message)
    } finally {
        if ($image) {
            $image.Dispose()
        }
    }
}
