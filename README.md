# BYTE BOOST

BYTE BOOST is a Windows desktop network diagnostics and optimization utility built with Electron and PowerShell.

## Features

- Network health scan with ping, jitter, packet loss, DNS, MTU, and adapter information
- Gaming, download, streaming, balanced, and one-click profiles
- Installed-game discovery and observed game-server connection analysis
- DNS, MTU, adapter, connection repair, diagnostics, and restore tools
- Dark/light themes and built-in multilingual UI

## Development

```powershell
npm install
npm start
```

Run validation and tests:

```powershell
npm run check
npm test
```

Build the Windows installer:

```powershell
npm run dist
```

Network-changing operations require administrator permission. BYTE BOOST saves a baseline before supported changes so they can be restored later.
