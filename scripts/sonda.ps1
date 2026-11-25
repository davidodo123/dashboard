# Sonda del Centro en vivo. La lanza src/sistema.js y lee una línea JSON cada 2 s:
#   app delante (proceso + nombre + título), segundos sin tocar teclado/ratón,
#   procesos que más CPU/RAM gastan (cada 4 s) y bytes de red acumulados.
# El título solo se usa en Node para sacar el proyecto de VS Code; no se guarda.
# Además escucha la tecla global Win+Esc mientras espera entre vueltas (un proceso en vez de dos):
#   si la ventana "Centro" existe la trae al frente; si no, escribe {"evento":"abrir"} para que el servidor la abra.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

Add-Type @"
using System;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class Sonda {
  [StructLayout(LayoutKind.Sequential)] struct MSG { public IntPtr h; public uint msg; public IntPtr w; public IntPtr l; public uint t; public int x; public int y; }
  [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr h, int id, uint mods, uint vk);
  [DllImport("user32.dll")] static extern bool PeekMessage(out MSG m, IntPtr h, uint a, uint b, uint quitar);
  [DllImport("user32.dll")] static extern uint MsgWaitForMultipleObjects(uint n, IntPtr[] h, bool todos, uint ms, uint mascara);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);

  // MOD_WIN 8 | MOD_NOREPEAT 0x4000 ; VK_ESCAPE 0x1B  (Ctrl+Alt+Espacio la usa otra app en este PC)
  public static bool RegistrarTecla() { return RegisterHotKey(IntPtr.Zero, 1, 0x4008, 0x1B); }

  static IntPtr VentanaCentro() {
    foreach (var p in Process.GetProcessesByName("msedge"))
      if (p.MainWindowHandle != IntPtr.Zero && p.MainWindowTitle == "Centro") return p.MainWindowHandle;
    return IntPtr.Zero;
  }

  // Espera ms milisegundos atendiendo los mensajes del hilo. Devuelve "abrir" si se pulsó la tecla
  // y no hay ventana, "frente" si la trajo al frente, o null si no pasó nada.
  public static string Esperar(int ms) {
    string evento = null;
    int fin = Environment.TickCount + ms;
    while (true) {
      int queda = fin - Environment.TickCount;
      if (queda <= 0) break;
      MsgWaitForMultipleObjects(0, null, false, (uint)queda, 0x04FF); // QS_ALLINPUT
      MSG m;
      while (PeekMessage(out m, IntPtr.Zero, 0, 0, 1)) {
        if (m.msg != 0x0312) continue; // WM_HOTKEY
        IntPtr h = VentanaCentro();
        if (h == IntPtr.Zero) { evento = "abrir"; continue; }
        if (IsIconic(h)) ShowWindow(h, 9);
        SetForegroundWindow(h);
        evento = "frente";
      }
    }
    return evento;
  }
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

if (-not [Sonda]::RegistrarTecla()) { [Console]::Out.WriteLine('{"evento":"tecla-ocupada"}'); [Console]::Out.Flush() }

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
  # En vez de dormir, espera 2 s atendiendo la tecla global.
  $evento = [Sonda]::Esperar(2000)
  if ($evento) { [Console]::Out.WriteLine((@{ evento = $evento } | ConvertTo-Json -Compress)); [Console]::Out.Flush() }
}
