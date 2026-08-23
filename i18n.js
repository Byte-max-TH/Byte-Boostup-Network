"use strict";

(() => {
    const languages = [
        ["system", "System / Windows"],
        ["en", "English"],
        ["th", "ไทย"],
        ["zh-CN", "简体中文"],
        ["zh-TW", "繁體中文"],
        ["ja", "日本語"],
        ["ko", "한국어"],
        ["es", "Español"],
        ["fr", "Français"],
        ["de", "Deutsch"],
        ["pt", "Português"],
        ["ru", "Русский"],
        ["ar", "العربية"],
        ["hi", "हिन्दी"],
        ["id", "Bahasa Indonesia"],
        ["vi", "Tiếng Việt"],
        ["it", "Italiano"],
        ["tr", "Türkçe"]
    ].map(([code, name]) => ({ code, name }));

    const en = {
        settings: "Settings", application: "Application", saved: "Saved", language: "Language",
        languageDescription: "Change the application display language",
        languageApplied: "Language changes are applied immediately and saved on this device.",
        systemLanguage: "System / Windows", profile: "Profile", lastScan: "Last Scan",
        currentProfile: "Current Profile", liveConnection: "Live Connection", feature: "Feature",
        tools: "Tools", networkHealth: "Network Health", recentChanges: "Recent Changes",
        viewDetails: "View details", profile1Click: "1 Click Optimize", profileGaming: "Gaming Mode",
        profileDownload: "Download Mode", profileStreaming: "Streaming Mode", profileBalanced: "Balanced Mode",
        toolDns: "DNS Optimizer", toolRepair: "Network Repair", toolMtu: "MTU Optimizer",
        toolAdapter: "Adapter Optimizer", toolDiagnostics: "Connection Diagnostics", toolRestore: "Restore Default",
        active: "Active", off: "Off", scanning: "Scanning...", justNow: "Just now", good: "Good",
        optimized: "Optimized", needsOptimization: "Needs Optimization", poor: "Poor", unavailable: "Unavailable",
        ready: "Ready", loading: "Loading", running: "Running", complete: "Complete", error: "Error",
        failed: "Failed", back: "Back", openSettings: "Open settings", lightTheme: "Switch to light theme",
        darkTheme: "Switch to dark theme", importLanguage: "Import language pack",
        importLanguageDescription: "Add any BCP-47 language from a BYTE BOOST JSON language pack.",
        gamingCenter: "Gaming Mode", gamingDescription: "Finds installed games and keeps a saved low-latency Windows profile for the selected game.",
        gamingAction: "Activate Gaming Profile", gamingDone: "Gaming Profile Active", gamesFound: "Games Found",
        selectGame: "Select a game", noGamesFound: "No supported launcher games were found.", running: "Running", installed: "Installed",
        gameManagedRouting: "Game-managed routing", observedServer: "Observed Server", noActiveServer: "Start the game and join a match, then check again.",
        checkServerAgain: "Check server again", udpRelayNotVisible: "No TCP server is visible. The game may be using UDP or a relay; join a match and check again.",
        server: "Server", networkTool: "Network Tool", gamingRoutingNote: "BYTE BOOST measures server connections exposed by a running game. Matchmaking and region locking remain controlled by the game.",
        findGames: "Find Games", addGame: "Add Game", manual: "Manual",
        profile1ClickDescription: "Best for daily usage and stable latency",
        noActiveProfile: "No active profile", chooseProfileHint: "Choose a mode below to apply it.", noRecentChanges: "No changes applied yet",
        profileGamingDescription: "Prioritizes low latency and stable packet routing",
        profileDownloadDescription: "Keeps supported receive-side scaling enabled",
        profileStreamingDescription: "Prioritizes a stable adapter configuration",
        profileBalancedDescription: "Uses the current Windows-managed settings",
        toolDnsDescription: "Measures real DNS lookup latency and can apply the best available resolver.",
        toolDnsAction: "Apply Fastest DNS", toolDnsDone: "DNS Applied",
        toolRepairDescription: "Clears the DNS cache and renews DHCP on the active physical adapter.",
        toolRepairAction: "Start Safe Repair", toolRepairDone: "Repair Complete",
        toolMtuDescription: "Tests Path MTU with Don't Fragment packets before offering a change.",
        toolMtuAction: "Run MTU Test", toolMtuDone: "MTU Verified",
        toolAdapterDescription: "Enables supported RSS and disables only supported latency-affecting sleep features.",
        toolAdapterAction: "Apply Supported Settings", toolAdapterDone: "Settings Applied",
        toolDiagnosticsDescription: "Checks the gateway, Internet ping, DNS, TCP 443, packet stability and route.",
        toolDiagnosticsAction: "Run Diagnostics", toolDiagnosticsDone: "Diagnostics Complete",
        toolRestoreDescription: "Restores the protected baseline captured before BYTE BOOST made its first change.",
        toolRestoreAction: "Restore Saved Baseline", toolRestoreDone: "Baseline Restored"
    };

    const packs = {
        en,
        th: {
            settings: "การตั้งค่า", application: "แอปพลิเคชัน", saved: "บันทึกแล้ว", language: "ภาษา",
            languageDescription: "เปลี่ยนภาษาที่แสดงในแอป", languageApplied: "ภาษาจะเปลี่ยนทันทีและบันทึกไว้ในอุปกรณ์นี้",
            systemLanguage: "ตามระบบ Windows", profile: "โปรไฟล์", lastScan: "สแกนล่าสุด", currentProfile: "โปรไฟล์ปัจจุบัน",
            liveConnection: "การเชื่อมต่อสด", feature: "ฟีเจอร์", tools: "เครื่องมือ", networkHealth: "สุขภาพเครือข่าย",
            recentChanges: "การเปลี่ยนแปลงล่าสุด", viewDetails: "ดูรายละเอียด", profile1Click: "ปรับแต่งในคลิกเดียว",
            profileGaming: "โหมดเกม", profileDownload: "โหมดดาวน์โหลด", profileStreaming: "โหมดสตรีม",
            profileBalanced: "โหมดสมดุล", toolDns: "ปรับแต่ง DNS", toolRepair: "ซ่อมแซมเครือข่าย",
            toolMtu: "ปรับแต่ง MTU", toolAdapter: "ปรับแต่งอะแดปเตอร์", toolDiagnostics: "วิเคราะห์การเชื่อมต่อ",
            toolRestore: "คืนค่าเริ่มต้น", active: "ใช้งาน", off: "ปิด", scanning: "กำลังสแกน...", justNow: "เมื่อสักครู่",
            good: "ดี", optimized: "ปรับแต่งแล้ว", needsOptimization: "ควรปรับแต่ง", poor: "แย่", unavailable: "ไม่พร้อมใช้งาน",
            ready: "พร้อม", loading: "กำลังโหลด", running: "กำลังทำงาน", complete: "เสร็จสิ้น", error: "ข้อผิดพลาด",
            failed: "ล้มเหลว", back: "กลับ", openSettings: "เปิดการตั้งค่า", lightTheme: "เปลี่ยนเป็นธีมสว่าง",
            darkTheme: "เปลี่ยนเป็นธีมมืด", importLanguage: "นำเข้าแพ็กภาษา",
            importLanguageDescription: "เพิ่มภาษาใดก็ได้ด้วยไฟล์ภาษา BYTE BOOST รูปแบบ JSON",
            gamingCenter: "โหมดเกม", gamingDescription: "ค้นหาเกมที่ติดตั้งและจำโปรไฟล์ Windows แบบ latency ต่ำสำหรับเกมที่เลือก",
            gamingAction: "เปิดใช้โปรไฟล์เกม", gamingDone: "เปิดใช้โปรไฟล์เกมแล้ว", gamesFound: "เกมที่พบ",
            selectGame: "เลือกเกม", noGamesFound: "ไม่พบเกมจาก Launcher ที่รองรับ", running: "กำลังทำงาน", installed: "ติดตั้งแล้ว",
            gameManagedRouting: "เกมเป็นผู้จัดการเส้นทาง", observedServer: "เซิร์ฟเวอร์ที่ตรวจพบ", noActiveServer: "เปิดเกมก่อนเพื่อตรวจการเชื่อมต่อเซิร์ฟเวอร์ปัจจุบัน",
            server: "เซิร์ฟเวอร์", networkTool: "เครื่องมือเครือข่าย", gamingRoutingNote: "BYTE BOOST จะวัดการเชื่อมต่อเซิร์ฟเวอร์ที่เกมเปิดเผย ส่วน matchmaking และการล็อกภูมิภาคยังควบคุมโดยตัวเกม",
            checkServerAgain: "ตรวจเซิร์ฟเวอร์อีกครั้ง", udpRelayNotVisible: "ไม่พบเซิร์ฟเวอร์ TCP เกมอาจใช้ UDP หรือ Relay ให้เข้าแมตช์แล้วลองตรวจอีกครั้ง",
            findGames: "ค้นหาเกม", addGame: "เพิ่มเกมเอง", manual: "เพิ่มเอง",
            profile1ClickDescription: "เหมาะกับการใช้งานประจำวันและค่า latency ที่เสถียร",
            noActiveProfile: "ยังไม่ได้เปิดใช้โปรไฟล์", chooseProfileHint: "เลือกโหมดด้านล่างเพื่อเริ่มใช้งาน", noRecentChanges: "ยังไม่มีการเปลี่ยนแปลง",
            profileGamingDescription: "ให้ความสำคัญกับ latency ต่ำและการรับส่งแพ็กเก็ตที่เสถียร",
            profileDownloadDescription: "เปิดใช้การกระจายงานรับข้อมูลที่อะแดปเตอร์รองรับ",
            profileStreamingDescription: "เน้นการตั้งค่าอะแดปเตอร์ที่เสถียรสำหรับการสตรีม",
            profileBalancedDescription: "ใช้การตั้งค่าแบบสมดุลที่ Windows จัดการ",
            toolDnsDescription: "วัดเวลา DNS จริงและเลือกใช้เซิร์ฟเวอร์ที่เร็วและพร้อมใช้งานที่สุด",
            toolDnsAction: "ใช้ DNS ที่เร็วที่สุด", toolDnsDone: "เปลี่ยน DNS แล้ว",
            toolRepairDescription: "ล้างแคช DNS และขอ DHCP ใหม่บนอะแดปเตอร์จริงที่กำลังใช้งาน",
            toolRepairAction: "เริ่มซ่อมแซมแบบปลอดภัย", toolRepairDone: "ซ่อมแซมเสร็จแล้ว",
            toolMtuDescription: "ทดสอบ Path MTU ด้วยแพ็กเก็ต Don't Fragment ก่อนเสนอให้เปลี่ยนค่า",
            toolMtuAction: "เริ่มทดสอบ MTU", toolMtuDone: "ตรวจสอบ MTU แล้ว",
            toolAdapterDescription: "เปิด RSS ที่รองรับและปิดเฉพาะฟังก์ชันพักพลังงานที่กระทบ latency",
            toolAdapterAction: "ใช้ค่าที่อะแดปเตอร์รองรับ", toolAdapterDone: "ใช้การตั้งค่าแล้ว",
            toolDiagnosticsDescription: "ตรวจ Gateway, Internet Ping, DNS, TCP 443, ความเสถียรของแพ็กเก็ต และเส้นทาง",
            toolDiagnosticsAction: "เริ่มวิเคราะห์", toolDiagnosticsDone: "วิเคราะห์เสร็จแล้ว",
            toolRestoreDescription: "คืนค่าพื้นฐานที่บันทึกไว้ก่อน BYTE BOOST ทำการเปลี่ยนแปลงครั้งแรก",
            toolRestoreAction: "คืนค่าที่บันทึกไว้", toolRestoreDone: "คืนค่าแล้ว"
        },
        "zh-CN": {
            settings: "设置", application: "应用程序", saved: "已保存", language: "语言", languageDescription: "更改应用显示语言",
            languageApplied: "语言更改会立即应用并保存在此设备上。", systemLanguage: "系统 / Windows", profile: "配置", lastScan: "上次扫描",
            currentProfile: "当前配置", liveConnection: "实时连接", feature: "功能", tools: "工具", networkHealth: "网络健康",
            recentChanges: "最近更改", viewDetails: "查看详情", profile1Click: "一键优化", profileGaming: "游戏模式",
            profileDownload: "下载模式", profileStreaming: "流媒体模式", profileBalanced: "均衡模式", toolDns: "DNS 优化器",
            toolRepair: "网络修复", toolMtu: "MTU 优化器", toolAdapter: "网卡优化器", toolDiagnostics: "连接诊断",
            toolRestore: "恢复默认", active: "启用", off: "关闭", scanning: "扫描中...", justNow: "刚刚", good: "良好",
            optimized: "已优化", needsOptimization: "需要优化", poor: "较差", unavailable: "不可用", ready: "就绪",
            loading: "加载中", running: "运行中", complete: "完成", error: "错误", failed: "失败", back: "返回",
            openSettings: "打开设置", lightTheme: "切换到浅色主题", darkTheme: "切换到深色主题"
        },
        "zh-TW": {
            settings: "設定", application: "應用程式", saved: "已儲存", language: "語言", languageDescription: "變更應用程式顯示語言",
            languageApplied: "語言變更會立即套用並儲存在此裝置。", systemLanguage: "系統 / Windows", profile: "設定檔", lastScan: "上次掃描",
            currentProfile: "目前設定檔", liveConnection: "即時連線", feature: "功能", tools: "工具", networkHealth: "網路健康",
            recentChanges: "最近變更", viewDetails: "檢視詳情", profile1Click: "一鍵最佳化", profileGaming: "遊戲模式",
            profileDownload: "下載模式", profileStreaming: "串流模式", profileBalanced: "平衡模式", toolDns: "DNS 最佳化",
            toolRepair: "網路修復", toolMtu: "MTU 最佳化", toolAdapter: "網卡最佳化", toolDiagnostics: "連線診斷",
            toolRestore: "還原預設", active: "啟用", off: "關閉", scanning: "掃描中...", justNow: "剛剛", good: "良好",
            optimized: "已最佳化", needsOptimization: "需要最佳化", poor: "不佳", unavailable: "無法使用", ready: "就緒",
            loading: "載入中", running: "執行中", complete: "完成", error: "錯誤", failed: "失敗", back: "返回",
            openSettings: "開啟設定", lightTheme: "切換至淺色主題", darkTheme: "切換至深色主題"
        },
        ja: {
            settings: "設定", application: "アプリケーション", saved: "保存済み", language: "言語", languageDescription: "アプリの表示言語を変更",
            languageApplied: "言語はすぐに適用され、このデバイスに保存されます。", systemLanguage: "システム / Windows", profile: "プロファイル",
            lastScan: "最終スキャン", currentProfile: "現在のプロファイル", liveConnection: "ライブ接続", feature: "機能", tools: "ツール",
            networkHealth: "ネットワーク状態", recentChanges: "最近の変更", viewDetails: "詳細を見る", profile1Click: "ワンクリック最適化",
            profileGaming: "ゲームモード", profileDownload: "ダウンロードモード", profileStreaming: "ストリーミングモード",
            profileBalanced: "バランスモード", toolDns: "DNS 最適化", toolRepair: "ネットワーク修復", toolMtu: "MTU 最適化",
            toolAdapter: "アダプター最適化", toolDiagnostics: "接続診断", toolRestore: "既定値に戻す", active: "有効", off: "オフ",
            scanning: "スキャン中...", justNow: "たった今", good: "良好", optimized: "最適化済み", needsOptimization: "最適化が必要",
            poor: "不良", unavailable: "利用不可", ready: "準備完了", loading: "読み込み中", running: "実行中", complete: "完了",
            error: "エラー", failed: "失敗", back: "戻る", openSettings: "設定を開く", lightTheme: "ライトテーマに切替",
            darkTheme: "ダークテーマに切替"
        },
        ko: {
            settings: "설정", application: "애플리케이션", saved: "저장됨", language: "언어", languageDescription: "앱 표시 언어 변경",
            languageApplied: "언어 변경은 즉시 적용되고 이 기기에 저장됩니다.", systemLanguage: "시스템 / Windows", profile: "프로필",
            lastScan: "마지막 검사", currentProfile: "현재 프로필", liveConnection: "실시간 연결", feature: "기능", tools: "도구",
            networkHealth: "네트워크 상태", recentChanges: "최근 변경", viewDetails: "세부 정보", profile1Click: "원클릭 최적화",
            profileGaming: "게임 모드", profileDownload: "다운로드 모드", profileStreaming: "스트리밍 모드", profileBalanced: "균형 모드",
            toolDns: "DNS 최적화", toolRepair: "네트워크 복구", toolMtu: "MTU 최적화", toolAdapter: "어댑터 최적화",
            toolDiagnostics: "연결 진단", toolRestore: "기본값 복원", active: "활성", off: "꺼짐", scanning: "검사 중...",
            justNow: "방금", good: "좋음", optimized: "최적화됨", needsOptimization: "최적화 필요", poor: "나쁨",
            unavailable: "사용 불가", ready: "준비", loading: "로딩 중", running: "실행 중", complete: "완료", error: "오류",
            failed: "실패", back: "뒤로", openSettings: "설정 열기", lightTheme: "라이트 테마로 전환", darkTheme: "다크 테마로 전환"
        },
        es: {
            settings: "Configuración", application: "Aplicación", saved: "Guardado", language: "Idioma", languageDescription: "Cambiar el idioma de la aplicación",
            languageApplied: "Los cambios se aplican al instante y se guardan en este dispositivo.", systemLanguage: "Sistema / Windows", profile: "Perfil",
            lastScan: "Último análisis", currentProfile: "Perfil actual", liveConnection: "Conexión en vivo", feature: "Funciones", tools: "Herramientas",
            networkHealth: "Estado de red", recentChanges: "Cambios recientes", viewDetails: "Ver detalles", profile1Click: "Optimizar con un clic",
            profileGaming: "Modo juego", profileDownload: "Modo descarga", profileStreaming: "Modo streaming", profileBalanced: "Modo equilibrado",
            toolDns: "Optimizador DNS", toolRepair: "Reparar red", toolMtu: "Optimizador MTU", toolAdapter: "Optimizar adaptador",
            toolDiagnostics: "Diagnóstico de conexión", toolRestore: "Restaurar valores", active: "Activo", off: "Desactivado", scanning: "Analizando...",
            justNow: "Ahora", good: "Bueno", optimized: "Optimizado", needsOptimization: "Necesita optimización", poor: "Deficiente",
            unavailable: "No disponible", ready: "Listo", loading: "Cargando", running: "Ejecutando", complete: "Completado", error: "Error",
            failed: "Falló", back: "Atrás", openSettings: "Abrir configuración", lightTheme: "Cambiar a tema claro", darkTheme: "Cambiar a tema oscuro"
        },
        fr: {
            settings: "Paramètres", application: "Application", saved: "Enregistré", language: "Langue", languageDescription: "Changer la langue d’affichage",
            languageApplied: "La langue est appliquée immédiatement et enregistrée sur cet appareil.", systemLanguage: "Système / Windows", profile: "Profil",
            lastScan: "Dernière analyse", currentProfile: "Profil actuel", liveConnection: "Connexion en direct", feature: "Fonctions", tools: "Outils",
            networkHealth: "État du réseau", recentChanges: "Modifications récentes", viewDetails: "Voir les détails", profile1Click: "Optimisation en 1 clic",
            profileGaming: "Mode jeu", profileDownload: "Mode téléchargement", profileStreaming: "Mode streaming", profileBalanced: "Mode équilibré",
            toolDns: "Optimiseur DNS", toolRepair: "Réparation réseau", toolMtu: "Optimiseur MTU", toolAdapter: "Optimiseur d’adaptateur",
            toolDiagnostics: "Diagnostic de connexion", toolRestore: "Restaurer par défaut", active: "Actif", off: "Désactivé", scanning: "Analyse...",
            justNow: "À l’instant", good: "Bon", optimized: "Optimisé", needsOptimization: "Optimisation requise", poor: "Mauvais",
            unavailable: "Indisponible", ready: "Prêt", loading: "Chargement", running: "En cours", complete: "Terminé", error: "Erreur",
            failed: "Échec", back: "Retour", openSettings: "Ouvrir les paramètres", lightTheme: "Passer au thème clair", darkTheme: "Passer au thème sombre"
        },
        de: {
            settings: "Einstellungen", application: "Anwendung", saved: "Gespeichert", language: "Sprache", languageDescription: "Anzeigesprache der App ändern",
            languageApplied: "Sprachänderungen werden sofort angewendet und auf diesem Gerät gespeichert.", systemLanguage: "System / Windows", profile: "Profil",
            lastScan: "Letzter Scan", currentProfile: "Aktuelles Profil", liveConnection: "Live-Verbindung", feature: "Funktionen", tools: "Werkzeuge",
            networkHealth: "Netzwerkzustand", recentChanges: "Letzte Änderungen", viewDetails: "Details anzeigen", profile1Click: "1-Klick-Optimierung",
            profileGaming: "Gaming-Modus", profileDownload: "Download-Modus", profileStreaming: "Streaming-Modus", profileBalanced: "Ausgeglichen",
            toolDns: "DNS-Optimierung", toolRepair: "Netzwerkreparatur", toolMtu: "MTU-Optimierung", toolAdapter: "Adapteroptimierung",
            toolDiagnostics: "Verbindungsdiagnose", toolRestore: "Standard wiederherstellen", active: "Aktiv", off: "Aus", scanning: "Scan läuft...",
            justNow: "Gerade eben", good: "Gut", optimized: "Optimiert", needsOptimization: "Optimierung nötig", poor: "Schlecht",
            unavailable: "Nicht verfügbar", ready: "Bereit", loading: "Lädt", running: "Wird ausgeführt", complete: "Fertig", error: "Fehler",
            failed: "Fehlgeschlagen", back: "Zurück", openSettings: "Einstellungen öffnen", lightTheme: "Helles Design", darkTheme: "Dunkles Design"
        },
        pt: {
            settings: "Configurações", application: "Aplicativo", saved: "Salvo", language: "Idioma", languageDescription: "Alterar o idioma do aplicativo",
            languageApplied: "A alteração é aplicada imediatamente e salva neste dispositivo.", systemLanguage: "Sistema / Windows", profile: "Perfil",
            lastScan: "Última análise", currentProfile: "Perfil atual", liveConnection: "Conexão ao vivo", feature: "Recursos", tools: "Ferramentas",
            networkHealth: "Saúde da rede", recentChanges: "Alterações recentes", viewDetails: "Ver detalhes", profile1Click: "Otimização em 1 clique",
            profileGaming: "Modo jogo", profileDownload: "Modo download", profileStreaming: "Modo streaming", profileBalanced: "Modo equilibrado",
            toolDns: "Otimizador DNS", toolRepair: "Reparo de rede", toolMtu: "Otimizador MTU", toolAdapter: "Otimizador de adaptador",
            toolDiagnostics: "Diagnóstico de conexão", toolRestore: "Restaurar padrão", active: "Ativo", off: "Desligado", scanning: "Analisando...",
            justNow: "Agora", good: "Bom", optimized: "Otimizado", needsOptimization: "Precisa otimizar", poor: "Ruim", unavailable: "Indisponível",
            ready: "Pronto", loading: "Carregando", running: "Executando", complete: "Concluído", error: "Erro", failed: "Falhou",
            back: "Voltar", openSettings: "Abrir configurações", lightTheme: "Usar tema claro", darkTheme: "Usar tema escuro"
        },
        ru: {
            settings: "Настройки", application: "Приложение", saved: "Сохранено", language: "Язык", languageDescription: "Изменить язык приложения",
            languageApplied: "Язык применяется сразу и сохраняется на этом устройстве.", systemLanguage: "Система / Windows", profile: "Профиль",
            lastScan: "Последняя проверка", currentProfile: "Текущий профиль", liveConnection: "Текущее соединение", feature: "Функции", tools: "Инструменты",
            networkHealth: "Состояние сети", recentChanges: "Последние изменения", viewDetails: "Подробнее", profile1Click: "Оптимизация в 1 клик",
            profileGaming: "Игровой режим", profileDownload: "Режим загрузки", profileStreaming: "Режим трансляции", profileBalanced: "Сбалансированный режим",
            toolDns: "Оптимизация DNS", toolRepair: "Восстановление сети", toolMtu: "Оптимизация MTU", toolAdapter: "Оптимизация адаптера",
            toolDiagnostics: "Диагностика соединения", toolRestore: "Восстановить настройки", active: "Активен", off: "Выкл.", scanning: "Проверка...",
            justNow: "Только что", good: "Хорошо", optimized: "Оптимизировано", needsOptimization: "Нужна оптимизация", poor: "Плохо",
            unavailable: "Недоступно", ready: "Готово", loading: "Загрузка", running: "Выполняется", complete: "Завершено", error: "Ошибка",
            failed: "Сбой", back: "Назад", openSettings: "Открыть настройки", lightTheme: "Светлая тема", darkTheme: "Тёмная тема"
        },
        ar: {
            settings: "الإعدادات", application: "التطبيق", saved: "تم الحفظ", language: "اللغة", languageDescription: "تغيير لغة عرض التطبيق",
            languageApplied: "يتم تطبيق تغيير اللغة فورًا وحفظه على هذا الجهاز.", systemLanguage: "النظام / Windows", profile: "ملف التعريف",
            lastScan: "آخر فحص", currentProfile: "ملف التعريف الحالي", liveConnection: "الاتصال المباشر", feature: "الميزات", tools: "الأدوات",
            networkHealth: "صحة الشبكة", recentChanges: "التغييرات الأخيرة", viewDetails: "عرض التفاصيل", profile1Click: "تحسين بنقرة واحدة",
            profileGaming: "وضع الألعاب", profileDownload: "وضع التنزيل", profileStreaming: "وضع البث", profileBalanced: "الوضع المتوازن",
            toolDns: "محسن DNS", toolRepair: "إصلاح الشبكة", toolMtu: "محسن MTU", toolAdapter: "محسن المحول",
            toolDiagnostics: "تشخيص الاتصال", toolRestore: "استعادة الافتراضي", active: "نشط", off: "متوقف", scanning: "جارٍ الفحص...",
            justNow: "الآن", good: "جيد", optimized: "محسّن", needsOptimization: "يحتاج إلى تحسين", poor: "ضعيف", unavailable: "غير متاح",
            ready: "جاهز", loading: "جارٍ التحميل", running: "قيد التشغيل", complete: "مكتمل", error: "خطأ", failed: "فشل",
            back: "رجوع", openSettings: "فتح الإعدادات", lightTheme: "التبديل إلى المظهر الفاتح", darkTheme: "التبديل إلى المظهر الداكن"
        },
        hi: {
            settings: "सेटिंग्स", application: "ऐप्लिकेशन", saved: "सहेजा गया", language: "भाषा", languageDescription: "ऐप की भाषा बदलें",
            languageApplied: "भाषा तुरंत लागू होती है और इस डिवाइस पर सहेजी जाती है।", systemLanguage: "सिस्टम / Windows", profile: "प्रोफ़ाइल",
            lastScan: "पिछला स्कैन", currentProfile: "वर्तमान प्रोफ़ाइल", liveConnection: "लाइव कनेक्शन", feature: "फ़ीचर", tools: "टूल्स",
            networkHealth: "नेटवर्क स्वास्थ्य", recentChanges: "हाल के बदलाव", viewDetails: "विवरण देखें", profile1Click: "एक क्लिक ऑप्टिमाइज़",
            profileGaming: "गेमिंग मोड", profileDownload: "डाउनलोड मोड", profileStreaming: "स्ट्रीमिंग मोड", profileBalanced: "संतुलित मोड",
            toolDns: "DNS ऑप्टिमाइज़र", toolRepair: "नेटवर्क मरम्मत", toolMtu: "MTU ऑप्टिमाइज़र", toolAdapter: "अडैप्टर ऑप्टिमाइज़र",
            toolDiagnostics: "कनेक्शन निदान", toolRestore: "डिफ़ॉल्ट बहाल करें", active: "सक्रिय", off: "बंद", scanning: "स्कैन हो रहा है...",
            justNow: "अभी", good: "अच्छा", optimized: "ऑप्टिमाइज़्ड", needsOptimization: "ऑप्टिमाइज़ेशन चाहिए", poor: "खराब",
            unavailable: "अनुपलब्ध", ready: "तैयार", loading: "लोड हो रहा है", running: "चल रहा है", complete: "पूरा", error: "त्रुटि",
            failed: "विफल", back: "वापस", openSettings: "सेटिंग्स खोलें", lightTheme: "लाइट थीम", darkTheme: "डार्क थीम"
        },
        id: {
            settings: "Pengaturan", application: "Aplikasi", saved: "Tersimpan", language: "Bahasa", languageDescription: "Ubah bahasa tampilan aplikasi",
            languageApplied: "Bahasa diterapkan langsung dan disimpan di perangkat ini.", systemLanguage: "Sistem / Windows", profile: "Profil",
            lastScan: "Pemindaian terakhir", currentProfile: "Profil saat ini", liveConnection: "Koneksi langsung", feature: "Fitur", tools: "Alat",
            networkHealth: "Kesehatan jaringan", recentChanges: "Perubahan terbaru", viewDetails: "Lihat detail", profile1Click: "Optimasi 1 klik",
            profileGaming: "Mode game", profileDownload: "Mode unduh", profileStreaming: "Mode streaming", profileBalanced: "Mode seimbang",
            toolDns: "Pengoptimal DNS", toolRepair: "Perbaikan jaringan", toolMtu: "Pengoptimal MTU", toolAdapter: "Pengoptimal adaptor",
            toolDiagnostics: "Diagnostik koneksi", toolRestore: "Pulihkan bawaan", active: "Aktif", off: "Mati", scanning: "Memindai...",
            justNow: "Baru saja", good: "Baik", optimized: "Dioptimalkan", needsOptimization: "Perlu dioptimalkan", poor: "Buruk",
            unavailable: "Tidak tersedia", ready: "Siap", loading: "Memuat", running: "Berjalan", complete: "Selesai", error: "Kesalahan",
            failed: "Gagal", back: "Kembali", openSettings: "Buka pengaturan", lightTheme: "Tema terang", darkTheme: "Tema gelap"
        },
        vi: {
            settings: "Cài đặt", application: "Ứng dụng", saved: "Đã lưu", language: "Ngôn ngữ", languageDescription: "Thay đổi ngôn ngữ hiển thị",
            languageApplied: "Ngôn ngữ được áp dụng ngay và lưu trên thiết bị này.", systemLanguage: "Hệ thống / Windows", profile: "Cấu hình",
            lastScan: "Lần quét cuối", currentProfile: "Cấu hình hiện tại", liveConnection: "Kết nối trực tiếp", feature: "Tính năng", tools: "Công cụ",
            networkHealth: "Tình trạng mạng", recentChanges: "Thay đổi gần đây", viewDetails: "Xem chi tiết", profile1Click: "Tối ưu 1 chạm",
            profileGaming: "Chế độ chơi game", profileDownload: "Chế độ tải xuống", profileStreaming: "Chế độ phát trực tuyến", profileBalanced: "Chế độ cân bằng",
            toolDns: "Tối ưu DNS", toolRepair: "Sửa chữa mạng", toolMtu: "Tối ưu MTU", toolAdapter: "Tối ưu bộ điều hợp",
            toolDiagnostics: "Chẩn đoán kết nối", toolRestore: "Khôi phục mặc định", active: "Đang bật", off: "Tắt", scanning: "Đang quét...",
            justNow: "Vừa xong", good: "Tốt", optimized: "Đã tối ưu", needsOptimization: "Cần tối ưu", poor: "Kém", unavailable: "Không khả dụng",
            ready: "Sẵn sàng", loading: "Đang tải", running: "Đang chạy", complete: "Hoàn tất", error: "Lỗi", failed: "Thất bại",
            back: "Quay lại", openSettings: "Mở cài đặt", lightTheme: "Chuyển sang giao diện sáng", darkTheme: "Chuyển sang giao diện tối"
        },
        it: {
            settings: "Impostazioni", application: "Applicazione", saved: "Salvato", language: "Lingua", languageDescription: "Cambia la lingua dell'app",
            languageApplied: "La lingua viene applicata subito e salvata sul dispositivo.", systemLanguage: "Sistema / Windows", profile: "Profilo",
            lastScan: "Ultima scansione", currentProfile: "Profilo corrente", liveConnection: "Connessione live", feature: "Funzioni", tools: "Strumenti",
            networkHealth: "Stato della rete", recentChanges: "Modifiche recenti", viewDetails: "Vedi dettagli", profile1Click: "Ottimizza in 1 clic",
            profileGaming: "Modalità gioco", profileDownload: "Modalità download", profileStreaming: "Modalità streaming", profileBalanced: "Modalità bilanciata",
            toolDns: "Ottimizzatore DNS", toolRepair: "Riparazione rete", toolMtu: "Ottimizzatore MTU", toolAdapter: "Ottimizzatore adattatore",
            toolDiagnostics: "Diagnostica connessione", toolRestore: "Ripristina predefiniti", active: "Attivo", off: "Disattivo", scanning: "Scansione...",
            justNow: "Adesso", good: "Buono", optimized: "Ottimizzato", needsOptimization: "Da ottimizzare", poor: "Scarso", unavailable: "Non disponibile",
            ready: "Pronto", loading: "Caricamento", running: "In esecuzione", complete: "Completato", error: "Errore", failed: "Non riuscito",
            back: "Indietro", openSettings: "Apri impostazioni", lightTheme: "Tema chiaro", darkTheme: "Tema scuro"
        },
        tr: {
            settings: "Ayarlar", application: "Uygulama", saved: "Kaydedildi", language: "Dil", languageDescription: "Uygulama görüntüleme dilini değiştir",
            languageApplied: "Dil değişikliği hemen uygulanır ve bu cihazda saklanır.", systemLanguage: "Sistem / Windows", profile: "Profil",
            lastScan: "Son tarama", currentProfile: "Geçerli profil", liveConnection: "Canlı bağlantı", feature: "Özellikler", tools: "Araçlar",
            networkHealth: "Ağ sağlığı", recentChanges: "Son değişiklikler", viewDetails: "Ayrıntıları gör", profile1Click: "Tek tıkla optimize et",
            profileGaming: "Oyun modu", profileDownload: "İndirme modu", profileStreaming: "Yayın modu", profileBalanced: "Dengeli mod",
            toolDns: "DNS iyileştirici", toolRepair: "Ağ onarımı", toolMtu: "MTU iyileştirici", toolAdapter: "Bağdaştırıcı iyileştirici",
            toolDiagnostics: "Bağlantı tanılama", toolRestore: "Varsayılanı geri yükle", active: "Etkin", off: "Kapalı", scanning: "Taranıyor...",
            justNow: "Az önce", good: "İyi", optimized: "İyileştirildi", needsOptimization: "İyileştirme gerekli", poor: "Zayıf",
            unavailable: "Kullanılamıyor", ready: "Hazır", loading: "Yükleniyor", running: "Çalışıyor", complete: "Tamamlandı", error: "Hata",
            failed: "Başarısız", back: "Geri", openSettings: "Ayarları aç", lightTheme: "Açık temaya geç", darkTheme: "Koyu temaya geç"
        }
    };

    function resolve(code) {
        const requested = code === "system" ? (navigator.languages?.[0] || navigator.language || "en") : code;
        if (packs[requested]) return requested;
        const base = requested.split("-")[0].toLowerCase();
        if (base === "zh") return requested.toLowerCase().includes("tw") || requested.toLowerCase().includes("hk") ? "zh-TW" : "zh-CN";
        return packs[base] ? base : "en";
    }

    function translate(key, selected = "system") {
        const resolved = resolve(selected);
        return packs[resolved]?.[key] || en[key] || key;
    }

    const rtlLanguageCodes = new Set(["ar", "fa", "he", "ur", "ps", "sd", "ug", "yi"]);

    function getDirection(code) {
        return rtlLanguageCodes.has(resolve(code).split("-")[0].toLowerCase()) ? "rtl" : "ltr";
    }

    function addLanguagePack(pack) {
        if (!pack || typeof pack !== "object" || Array.isArray(pack)) throw new Error("Language pack must be an object.");
        const code = String(pack.code || "").trim();
        const name = String(pack.name || "").trim();
        if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code)) throw new Error("Language pack code must be a valid BCP-47 tag.");
        if (!name || name.length > 80) throw new Error("Language pack name is invalid.");
        if (!pack.strings || typeof pack.strings !== "object" || Array.isArray(pack.strings)) throw new Error("Language pack strings are missing.");

        const strings = {};
        Object.entries(pack.strings).forEach(([key, value]) => {
            if (Object.hasOwn(en, key) && typeof value === "string" && value.length <= 500) strings[key] = value;
        });
        if (Object.keys(strings).length === 0) throw new Error("Language pack contains no supported strings.");

        packs[code] = strings;
        const existing = languages.find((language) => language.code === code);
        if (existing) existing.name = name;
        else languages.push({ code, name });
        return { code, name, strings };
    }

    window.byteBoostI18n = Object.freeze({ languages, translate, resolve, getDirection, addLanguagePack });
})();
