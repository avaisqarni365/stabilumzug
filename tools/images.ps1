# Makes the responsive photo sizes the site uses (tools/lib.py responsive_images):
#   assets/img/photos/NAME.jpg  ->  NAME-640.jpg and NAME-1024.jpg; originals over 330 KB are recompressed at 1536 px.
# Run after adding a photo:  powershell -ExecutionPolicy Bypass -File tools\images.ps1
Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot '..\assets\img\photos'
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
function Load-Img($path) { $bytes = [System.IO.File]::ReadAllBytes($path); $ms = New-Object System.IO.MemoryStream(,$bytes); return [System.Drawing.Image]::FromStream($ms) }
function Save-Jpg($img, [int]$w, [string]$path, [long]$q) {
  if ($w -gt $img.Width) { $w = $img.Width }
  $h = [int][math]::Round($img.Height * $w / $img.Width)
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $w, $h)
  $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ep.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, $q)
  $bmp.Save($path, $codec, $ep); $g.Dispose(); $bmp.Dispose()
}
Get-ChildItem $dir -Filter *.jpg | Where-Object { $_.Name -notmatch '-(640|1024)\.jpg$' } | ForEach-Object {
  $img = Load-Img $_.FullName
  foreach ($w in 640, 1024) { Save-Jpg $img $w (Join-Path $dir "$($_.BaseName)-$w.jpg") 76 }
  if ($_.Length -gt 330KB) { Save-Jpg $img 1536 $_.FullName 78 }
  $img.Dispose()
  "$($_.Name): 640, 1024"
}
