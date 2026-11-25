# Sonda del Centro en vivo. La lanza src/sistema.js y lee una línea JSON cada 2 s:
#   app delante (proceso + nombre + título), segundos sin tocar teclado/ratón,
#   procesos que más CPU/RAM gastan (cada 4 s) y bytes de red acumulados.
# El título solo se usa en Node para sacar el proyecto de VS Code; no se guarda.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Sonda {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [StructLayout(LayoutKind.Sequential)] struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
  [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO i);
  public static uint Pid() { uint p; GetWindowThreadProcessId(GetForegroundWindow(), out p); return p; }
  public static string Titulo() { var s = new StringBuilder(512); GetWindowText(GetForegroundWindow(), s, 512); return s.ToString(); }
  public static double Inactivo() {
    var i = new LASTINPUTINFO(); i.cbSize = (uint)Marshal.SizeOf(i); GetLastInputInfo(ref i);
    return ((uint)Environment.TickCount - i.dwTime) / 1000.0;
  }
}
"@

$nucleos = [Environment]::ProcessorCount
$nombres = @{}          # proceso -> nombre bonito (descripción del ejecutable)
$cpuAntes = @{}         # pid -> segundos de CPU en la vuelta anterior
$tAntes = Get-Date
$vuelta = 0

function Nombre-De($p) {
  if (-not $p) { return $null }
  if (-not $nombres.ContainsKey($p.ProcessName)) {
    $d = $null
    try { $d = $p.MainModule.FileVersionInfo.FileDescription } catch {}
    if (-not $d) { $d = $p.ProcessName }
    $nombres[$p.ProcessName] = $d.Trim()
  }
  return $nombres[$p.ProcessName]
}

while ($true) {
  $vuelta++
  $pidDelante = [Sonda]::Pid()
  $p = Get-Process -Id $pidDelante
  $salida = [ordered]@{
    t = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    inactivo = [math]::Round([Sonda]::Inactivo(), 1)
    app = if ($p) { [ordered]@{ proceso = $p.ProcessName; nombre = (Nombre-De $p); titulo = [Sonda]::Titulo() } } else { $null }
  }

  # Red: bytes acumulados de las interfaces activas (Node calcula la velocidad).
  $rx = 0; $tx = 0
  foreach ($n in [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
    if ($n.OperationalStatus -eq 'Up' -and $n.NetworkInterfaceType -ne 'Loopback') {
      $s = $n.GetIPStatistics(); $rx += $s.BytesReceived; $tx += $s.BytesSent
    }
  }
  $salida.red = @{ rx = $rx; tx = $tx }

  # Procesos cada 4 s: % de CPU desde la vuelta anterior, agrupado por nombre.
  if ($vuelta % 2 -eq 0) {
    $ahora = Get-Date
    $seg = ($ahora - $tAntes).TotalSeconds
    $grupos = @{}
    $cpuNuevo = @{}
    foreach ($q in Get-Process) {
      $c = $q.TotalProcessorTime.TotalSeconds
      $cpuNuevo[$q.Id] = $c
      $d = 0
      if ($cpuAntes.ContainsKey($q.Id)) { $d = $c - $cpuAntes[$q.Id] }
      if (-not $grupos.ContainsKey($q.ProcessName)) { $grupos[$q.ProcessName] = @{ cpu = 0.0; ram = 0; n = 0 } }
      $g = $grupos[$q.ProcessName]; $g.cpu += $d; $g.ram += $q.WorkingSet64; $g.n++
    }
    $cpuAntes = $cpuNuevo; $tAntes = $ahora
    $lista = foreach ($k in $grupos.Keys) {
      $g = $grupos[$k]
      [ordered]@{ proceso = $k; cpu = [math]::Round(100 * $g.cpu / ($seg * $nucleos), 1); ramMB = [math]::Round($g.ram / 1MB); n = $g.n }
    }
    $salida.procesos = @($lista | Where-Object { $_.proceso -ne 'Idle' } | Sort-Object { $_.cpu } -Descending | Select-Object -First 8)
    $salida.memoria = @($lista | Sort-Object { $_.ramMB } -Descending | Select-Object -First 8)
  }

  [Console]::Out.WriteLine(($salida | ConvertTo-Json -Compress -Depth 4))
  [Console]::Out.Flush()
  Start-Sleep -Seconds 2
}
