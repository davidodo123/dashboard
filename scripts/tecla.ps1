# Tecla global del sistema: Win+Esc trae la ventana "Centro" al frente desde cualquier app o juego.
# Si la ventana no está abierta escribe "abrir" para que el servidor la abra. La lanza src/ventana.js.
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class Tecla {
  [StructLayout(LayoutKind.Sequential)] public struct MSG { public IntPtr h; public uint msg; public IntPtr w; public IntPtr l; public uint t; public int x; public int y; }
  [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr h, int id, uint mods, uint vk);
  [DllImport("user32.dll")] static extern int GetMessage(out MSG m, IntPtr h, uint a, uint b);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);

  public static IntPtr Buscar() {
    foreach (var p in Process.GetProcessesByName("msedge")) {
      if (p.MainWindowHandle != IntPtr.Zero && p.MainWindowTitle == "Centro") return p.MainWindowHandle;
    }
    return IntPtr.Zero;
  }

  public static void Escuchar() {
    // MOD_WIN 8 | MOD_NOREPEAT 0x4000 ; VK_ESCAPE 0x1B  (Ctrl+Alt+Espacio la usa otra app en este PC)
    if (!RegisterHotKey(IntPtr.Zero, 1, 0x4008, 0x1B)) { Console.WriteLine("ocupada"); Console.Out.Flush(); return; }
    MSG m;
    while (GetMessage(out m, IntPtr.Zero, 0, 0) > 0) {
      if (m.msg != 0x0312) continue;
      IntPtr h = Buscar();
      if (h == IntPtr.Zero) { Console.WriteLine("abrir"); Console.Out.Flush(); continue; }
      if (IsIconic(h)) ShowWindow(h, 9);
      SetForegroundWindow(h);
      Console.WriteLine("frente"); Console.Out.Flush();
    }
  }
}
"@
[Tecla]::Escuchar()
