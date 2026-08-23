# BYTE BOOST — Windows Network Optimizer

[![Latest release](https://img.shields.io/github/v/release/Byte-max-TH/Byte-Boostup-Network?label=latest&color=20a9e5)](https://github.com/Byte-max-TH/Byte-Boostup-Network/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Byte-max-TH/Byte-Boostup-Network/total?color=26d7a0)](https://github.com/Byte-max-TH/Byte-Boostup-Network/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-0078d4)](https://github.com/Byte-max-TH/Byte-Boostup-Network/releases/latest)
[![Electron](https://img.shields.io/badge/Electron-43-47848f)](https://www.electronjs.org/)

BYTE BOOST is a Windows network optimizer and network diagnostics desktop app built with Electron and PowerShell. It measures ping, jitter, packet loss, DNS latency, MTU, gateway latency, and adapter status, then provides safe Windows network optimization tools.

BYTE BOOST คือโปรแกรมปรับแต่งเน็ตและตรวจสอบเครือข่ายสำหรับ Windows ช่วยตรวจ Ping, Jitter, Packet Loss, DNS, MTU และสถานะ Network Adapter พร้อมโหมดสำหรับเล่นเกม ดาวน์โหลด สตรีม และใช้งานทั่วไป

## Download

**[Download the latest BYTE BOOST installer for Windows](https://github.com/Byte-max-TH/Byte-Boostup-Network/releases/latest)**

ดาวน์โหลดตัวติดตั้ง Windows รุ่นล่าสุดได้จากหน้า [Releases](https://github.com/Byte-max-TH/Byte-Boostup-Network/releases) โดยไม่ต้องติดตั้ง Node.js หรือ PowerShell เพิ่ม

## Features

- **Network health scan** — ping, jitter, packet loss, DNS latency, gateway, route, MTU, and link speed
- **Gaming Mode** — installed-game discovery and observed game-server connection analysis
- **Optimization profiles** — gaming, download, streaming, balanced, and one-click optimization
- **DNS Optimizer** — benchmark supported DNS providers and apply a reliable result
- **MTU Optimizer** — test and apply an appropriate MTU value
- **Adapter Optimizer** — adjust supported network-adapter and power-saving settings
- **Network Repair** — DNS flush, IP renewal, and supported Windows network repairs
- **Connection Diagnostics** — inspect Internet, gateway, DNS, TCP, and packet stability
- **Restore Default** — restore the baseline captured before BYTE BOOST changes
- **Multilingual desktop UI** — dark/light themes and built-in language packs

## Gaming and latency

BYTE BOOST can inspect public TCP endpoints opened by a running game, display the remote IP address, port, process, and observed latency, and fall back to a TCP handshake when a server blocks ICMP ping. UDP endpoints, relay routing, matchmaking, and region locks remain controlled by each game.

Common search terms: Windows network optimizer, gaming ping optimizer, low latency mode, DNS optimizer, MTU optimizer, packet loss diagnostics, network repair tool, Internet optimizer, โปรแกรมลดปิง, โปรแกรมปรับเน็ต, แก้ Packet Loss.

## Requirements

- Windows desktop
- Administrator permission for network-changing operations
- An active network adapter for diagnostics

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

## Safety

Read-only scans do not require elevation. Operations that change Windows network settings request administrator permission, validate inputs, serialize mutations, and capture a restorable baseline before supported changes.

## Credits

Special thanks to **LY Corporation and the LINE Seed team** for creating [LINE Seed Sans TH](https://seed.line.me/index_th.html), the typeface used throughout the BYTE BOOST interface. Its clear and friendly Thai letterforms help make the application easier and more enjoyable to use.

ขอขอบคุณ **LY Corporation และทีมผู้พัฒนา LINE Seed** สำหรับฟอนต์ [LINE Seed Sans TH](https://seed.line.me/index_th.html) ที่ใช้เป็นแบบอักษรหลักใน BYTE BOOST ช่วยให้ข้อความภาษาไทยอ่านง่าย สวยงาม และเป็นมิตรกับผู้ใช้งาน

LINE Seed fonts are distributed under the [SIL Open Font License 1.1](https://openfontlicense.org/).
