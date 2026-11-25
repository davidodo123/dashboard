# Catálogo de apps del menú Inicio para el sistema de arranque.
# Lee los accesos directos (.lnk) del menú Inicio (todos los usuarios + el tuyo), resuelve su destino,
# quita desinstaladores y documentación, y guarda el icono de cada app como PNG.
# Uso: powershell -File catalogo.ps1 <carpeta-de-iconos>   -> imprime un JSON con la lista.
param([Parameter(Mandatory = $true)][string]$Iconos)
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Iconos | Out-Null

$raices = @(
  [Environment]::GetFolderPath('CommonPrograms'),
  [Environment]::GetFolderPath('Programs')
)
$shell = New-Object -ComObject WScript.Shell
$fuera = '(?i)(uninstall|desinstal|readme|l[eé]ame|help|ayuda|manual|documentation|website|sitio web|release notes|license|licencia|changelog|support|soporte)'
$vistos = @{}
$lista = foreach ($raiz in $raices) {
  Get-ChildItem -Path $raiz -Recurse -Filter *.lnk | ForEach-Object {
    $nombre = $_.BaseName
    if ($nombre -match $fuera) { return }
    $l = $shell.CreateShortcut($_.FullName)
    $destino = $l.TargetPath
    # Apps de la Store y accesos sin destino de archivo: se lanzan igual por el .lnk
    if ($destino -and $destino -match '(?i)\.(chm|txt|pdf|html?|url)$') { return }
    $clave = if ($destino) { $destino.ToLower() } else { $nombre.ToLower() }
    if ($vistos.ContainsKey($clave)) { return }
    $vistos[$clave] = $true

    # Icono: el del propio acceso directo si lo define; si no, el del ejecutable.
    $id = [BitConverter]::ToString([Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($clave))).Replace('-', '').Substring(0, 16).ToLower()
    $png = Join-Path $Iconos "$id.png"
    if (-not (Test-Path $png)) {
      $origen = $destino
      if ($l.IconLocation -and $l.IconLocation -notmatch '^,') {
        $p = ($l.IconLocation -split ',')[0]
        if ($p -and (Test-Path ([Environment]::ExpandEnvironmentVariables($p)))) { $origen = [Environment]::ExpandEnvironmentVariables($p) }
      }
      if (-not $origen -or -not (Test-Path $origen)) { $origen = $_.FullName }
      try {
        $ico = [Drawing.Icon]::ExtractAssociatedIcon($origen)
        if ($ico) { $ico.ToBitmap().Save($png, [Drawing.Imaging.ImageFormat]::Png) }
      } catch {}
    }
    [ordered]@{
      id = $id
      nombre = $nombre
      lnk = $_.FullName
      destino = $destino
      proceso = if ($destino) { [IO.Path]::GetFileNameWithoutExtension($destino) } else { $null }
      carpeta = $_.Directory.Name
      icono = if (Test-Path $png) { "$id.png" } else { $null }
    }
  }
}
# Apps de la Microsoft Store (Spotify, WhatsApp, Terminal…): no tienen .lnk; se lanzan con shell:AppsFolder\<AppID>.
$tienda = foreach ($a in (Get-StartApps | Where-Object { $_.AppID -like '*!*' })) {
  if ($a.Name -match $fuera) { continue }
  $familia, $appId = $a.AppID -split '!', 2
  $clave = $a.AppID.ToLower()
  if ($vistos.ContainsKey($clave)) { continue }
  $vistos[$clave] = $true
  $id = [BitConverter]::ToString([Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($clave))).Replace('-', '').Substring(0, 16).ToLower()
  $png = Join-Path $Iconos "$id.png"
  $proceso = $null
  $paquete = Get-AppxPackage | Where-Object { $_.PackageFamilyName -eq $familia } | Select-Object -First 1
  if ($paquete) {
    try {
      [xml]$m = Get-Content (Join-Path $paquete.InstallLocation 'AppxManifest.xml') -Raw
      $app = @($m.Package.Applications.Application) | Where-Object { $_.Id -eq $appId } | Select-Object -First 1
      if ($app.Executable) { $proceso = [IO.Path]::GetFileNameWithoutExtension($app.Executable) }
      if (-not (Test-Path $png)) {
        $ve = $app.VisualElements
        $logo = if ($ve.Square150x150Logo) { $ve.Square150x150Logo } else { $ve.Square44x44Logo }
        if ($logo) {
          $base = Join-Path $paquete.InstallLocation $logo
          $dir = Split-Path $base -Parent
          $patron = [IO.Path]::GetFileNameWithoutExtension($base) + '*' + [IO.Path]::GetExtension($base)
          # Hay varias escalas (scale-100, scale-200, targetsize-256…): la más grande.
          $mejor = Get-ChildItem -Path $dir -Filter $patron | Where-Object { $_.Name -notmatch 'contrast' } | Sort-Object Length -Descending | Select-Object -First 1
          if ($mejor) { Copy-Item $mejor.FullName $png }
        }
      }
    } catch {}
  }
  [ordered]@{
    id = $id
    nombre = $a.Name
    lnk = "shell:AppsFolder\$($a.AppID)"
    destino = $null
    proceso = $proceso
    carpeta = 'Microsoft Store'
    icono = if (Test-Path $png) { "$id.png" } else { $null }
  }
}
[Console]::Out.Write((@($lista) + @($tienda) | ConvertTo-Json -Compress -Depth 3))
