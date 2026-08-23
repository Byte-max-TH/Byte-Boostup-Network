[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        'get-capabilities',
        'get-status',
        'get-traffic',
        'run-diagnostics',
        'benchmark-dns',
        'test-mtu',
        'scan-installed-games',
        'analyze-game-connections',
        'create-snapshot',
        'apply-dns',
        'apply-mtu',
        'repair-network',
        'optimize-adapter',
        'apply-profile',
        'restore-snapshot'
    )]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$PayloadBase64 = 'e30='
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
$InformationPreference = 'SilentlyContinue'

function Write-JsonResult {
    param([bool]$Ok, [object]$Data, [object]$ErrorObject)

    $result = [ordered]@{ ok = $Ok }
    if ($Ok) {
        $result.data = $Data
    } else {
        $result.error = $ErrorObject
    }
    $result | ConvertTo-Json -Depth 12 -Compress
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Assert-Administrator {
    if (-not (Test-IsAdministrator)) {
        throw 'Administrator permission is required for this change.'
    }
}

function Get-Payload {
    try {
        $bytes = [Convert]::FromBase64String($PayloadBase64)
        $json = [Text.Encoding]::UTF8.GetString($bytes)
        return $json | ConvertFrom-Json
    } catch {
        throw 'The native request payload is invalid.'
    }
}

function Get-PrimaryNetworkContext {
    $route = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
        Where-Object { $_.NextHop -ne '0.0.0.0' } |
        Sort-Object RouteMetric, InterfaceMetric |
        Select-Object -First 1

    if ($null -eq $route) { throw 'No active IPv4 default route was found.' }

    $adapter = Get-NetAdapter -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop
    if ($adapter.Status -ne 'Up') { throw 'The primary network adapter is not connected.' }

    $configuration = Get-NetIPConfiguration -InterfaceIndex $adapter.InterfaceIndex -Detailed -ErrorAction Stop
    $ipv4Interface = Get-NetIPInterface -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop
    $ipv6Interface = Get-NetIPInterface -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv6 -ErrorAction SilentlyContinue

    [pscustomobject]@{
        Route = $route
        Adapter = $adapter
        Configuration = $configuration
        IPv4Interface = $ipv4Interface
        IPv6Interface = $ipv6Interface
    }
}

function Assert-MutableAdapter {
    param([object]$Adapter)

    if ($Adapter.PSObject.Properties.Name -contains 'HardwareInterface') {
        if (-not [bool]$Adapter.HardwareInterface) {
            throw 'BYTE BOOST will not automatically modify a virtual or tunnel adapter.'
        }
    }
}

function Get-ConnectionType {
    param([object]$Adapter)

    $description = [string]$Adapter.InterfaceDescription
    $medium = [string]$Adapter.PhysicalMediaType
    if ($description -match 'Wi-?Fi|Wireless|802\.11' -or $medium -match '802\.11|Wireless') { return 'Wi-Fi' }
    if ($description -match 'Ethernet|GbE|LAN' -or $medium -match '802\.3') { return 'Ethernet' }
    return 'Network'
}

function Get-LinkSpeedMbps {
    param([object]$Adapter)

    if ($Adapter.PSObject.Properties.Name -contains 'ReceiveLinkSpeed' -and [double]$Adapter.ReceiveLinkSpeed -gt 0) {
        return [math]::Round(([double]$Adapter.ReceiveLinkSpeed / 1000000), 0)
    }
    $text = [string]$Adapter.LinkSpeed
    if ($text -match '([\d\.]+)\s*Gbps') { return [math]::Round(([double]$matches[1] * 1000), 0) }
    if ($text -match '([\d\.]+)\s*Mbps') { return [math]::Round([double]$matches[1], 0) }
    return $null
}

function Measure-PingTarget {
    param([string]$Target, [int]$Count = 4, [int]$TimeoutMs = 900, [int]$BufferSize = 32, [bool]$DontFragment = $false)

    $latencies = New-Object System.Collections.Generic.List[double]
    $ping = New-Object System.Net.NetworkInformation.Ping
    try {
        for ($i = 0; $i -lt $Count; $i++) {
            try {
                $buffer = New-Object byte[] $BufferSize
                $options = New-Object System.Net.NetworkInformation.PingOptions(128, $DontFragment)
                $reply = $ping.Send($Target, $TimeoutMs, $buffer, $options)
                if ($reply.Status -eq [System.Net.NetworkInformation.IPStatus]::Success) {
                    $latencies.Add([double]$reply.RoundtripTime)
                }
            } catch { }
        }
    } finally {
        $ping.Dispose()
    }

    $success = $latencies.Count
    $loss = [math]::Round((($Count - $success) / [double]$Count) * 100, 1)
    $average = $null
    $jitter = $null
    if ($success -gt 0) {
        $average = [math]::Round(($latencies | Measure-Object -Average).Average, 1)
        if ($success -gt 1) {
            $differences = for ($i = 1; $i -lt $success; $i++) { [math]::Abs($latencies[$i] - $latencies[$i - 1]) }
            $jitter = [math]::Round(($differences | Measure-Object -Average).Average, 1)
        } else {
            $jitter = 0
        }
    }

    [pscustomobject]@{
        target = $Target
        sent = $Count
        received = $success
        averageMs = $average
        jitterMs = $jitter
        packetLossPercent = $loss
        reachable = ($success -gt 0)
    }
}

function Measure-DnsServer {
    param([string]$Server)

    $durations = New-Object System.Collections.Generic.List[double]
    $failures = 0
    foreach ($name in @('www.microsoft.com', 'www.cloudflare.com')) {
        try {
            $watch = [Diagnostics.Stopwatch]::StartNew()
            Resolve-DnsName -Name $name -Server $Server -Type A -DnsOnly -NoHostsFile -QuickTimeout -ErrorAction Stop | Out-Null
            $watch.Stop()
            $durations.Add($watch.Elapsed.TotalMilliseconds)
        } catch {
            $failures++
        }
    }
    $median = $null
    if ($durations.Count -gt 0) {
        $ordered = @($durations | Sort-Object)
        $median = [math]::Round($ordered[[math]::Floor(($ordered.Count - 1) / 2)], 1)
    }
    [pscustomobject]@{ server = $Server; medianMs = $median; failures = $failures; available = ($durations.Count -gt 0) }
}

function Get-SystemStatus {
    $context = Get-PrimaryNetworkContext
    $adapter = $context.Adapter
    $config = $context.Configuration
    $dns = @(Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop).ServerAddresses
    $stats = Get-NetAdapterStatistics -Name $adapter.Name -ErrorAction Stop
    $boot = (Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).LastBootUpTime
    $gateway = [string]$context.Route.NextHop

    [pscustomobject]@{
        adapter = [pscustomobject]@{
            name = [string]$adapter.Name
            description = [string]$adapter.InterfaceDescription
            interfaceIndex = [int]$adapter.InterfaceIndex
            interfaceGuid = [string]$adapter.InterfaceGuid
            connectionType = Get-ConnectionType $adapter
            linkSpeedMbps = Get-LinkSpeedMbps $adapter
            status = [string]$adapter.Status
            hardwareInterface = if ($adapter.PSObject.Properties.Name -contains 'HardwareInterface') { [bool]$adapter.HardwareInterface } else { $null }
        }
        network = [pscustomobject]@{
            ipv4 = @($config.IPv4Address | ForEach-Object { [string]$_.IPAddress })
            gateway = $gateway
            dnsServers = $dns
            mtu = [int]$context.IPv4Interface.NlMtu
            uptimeSeconds = [math]::Max(0, [int]((Get-Date) - $boot).TotalSeconds)
        }
        counters = [pscustomobject]@{
            receivedBytes = [uint64]$stats.ReceivedBytes
            sentBytes = [uint64]$stats.SentBytes
            receivedErrors = [uint64]$stats.ReceivedPacketErrors
            outboundErrors = [uint64]$stats.OutboundPacketErrors
            timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        }
    }
}

function Get-Diagnostics {
    $status = Get-SystemStatus
    $gatewayPing = Measure-PingTarget -Target $status.network.gateway -Count 3 -TimeoutMs 700
    $internetPing = Measure-PingTarget -Target '1.1.1.1' -Count 5 -TimeoutMs 900
    $dnsServer = if ($status.network.dnsServers.Count -gt 0) { [string]$status.network.dnsServers[0] } else { '1.1.1.1' }
    $dnsResult = Measure-DnsServer -Server $dnsServer
    $tcp443 = $false
    try {
        $tcp443 = [bool](Test-NetConnection -ComputerName 'www.microsoft.com' -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue)
    } catch { }
    $routeHops = $null
    try {
        $trace = Test-NetConnection -ComputerName '1.1.1.1' -TraceRoute -WarningAction SilentlyContinue
        if ($null -ne $trace.TraceRoute) { $routeHops = @($trace.TraceRoute).Count }
    } catch { }

    $score = 100
    $issues = New-Object System.Collections.Generic.List[object]
    if (-not $gatewayPing.reachable) { $score -= 35; $issues.Add([pscustomobject]@{ id = 'gateway'; severity = 'error'; label = 'Gateway unreachable' }) }
    elseif ($gatewayPing.averageMs -gt 10) { $score -= 10; $issues.Add([pscustomobject]@{ id = 'gateway-latency'; severity = 'warning'; label = 'High gateway latency' }) }
    if (-not $internetPing.reachable -and -not $tcp443) { $score -= 35; $issues.Add([pscustomobject]@{ id = 'internet'; severity = 'error'; label = 'Internet unreachable' }) }
    if ($internetPing.packetLossPercent -gt 0) { $score -= [math]::Min(25, [int]$internetPing.packetLossPercent); $issues.Add([pscustomobject]@{ id = 'packet-loss'; severity = 'warning'; label = 'Packet loss detected' }) }
    if ($null -ne $internetPing.jitterMs -and $internetPing.jitterMs -gt 15) { $score -= 10; $issues.Add([pscustomobject]@{ id = 'jitter'; severity = 'warning'; label = 'High jitter' }) }
    if (-not $dnsResult.available) { $score -= 15; $issues.Add([pscustomobject]@{ id = 'dns'; severity = 'warning'; label = 'DNS lookup failed' }) }
    elseif ($dnsResult.medianMs -gt 80) { $score -= 8; $issues.Add([pscustomobject]@{ id = 'dns-latency'; severity = 'warning'; label = 'Slow DNS response' }) }
    $score = [math]::Max(0, $score)

    [pscustomobject]@{
        score = $score
        gateway = $gatewayPing
        internet = $internetPing
        dns = $dnsResult
        tcp443 = $tcp443
        routeHops = $routeHops
        mtu = $status.network.mtu
        issues = @($issues | ForEach-Object { $_ })
        measuredAt = (Get-Date).ToUniversalTime().ToString('o')
    }
}

function Get-DnsBenchmark {
    $policies = @()
    try { $policies = @(Get-DnsClientNrptPolicy -Effective -ErrorAction Stop) } catch { }
    $servers = @('1.1.1.1', '8.8.8.8', '9.9.9.9')
    $results = @($servers | ForEach-Object { Measure-DnsServer -Server $_ } | Sort-Object @{ Expression = { if ($null -eq $_.medianMs) { [double]::MaxValue } else { $_.medianMs } } })
    $best = $results | Where-Object { $_.available } | Select-Object -First 1
    [pscustomobject]@{
        results = $results
        recommended = if ($null -ne $best) { $best.server } else { $null }
        managedPolicyDetected = ($policies.Count -gt 0)
    }
}

function Test-PathMtu {
    $context = Get-PrimaryNetworkContext
    $upper = [math]::Min(1500, [int]$context.IPv4Interface.NlMtu)
    $lower = 1200
    $best = $null
    $replySeen = $false
    while ($lower -le $upper) {
        $candidate = [math]::Floor(($lower + $upper) / 2)
        $result = Measure-PingTarget -Target '1.1.1.1' -Count 2 -TimeoutMs 1000 -BufferSize ($candidate - 28) -DontFragment $true
        if ($result.reachable) {
            $replySeen = $true
            $best = $candidate
            $lower = $candidate + 1
        } else {
            $upper = $candidate - 1
        }
    }
    [pscustomobject]@{
        current = [int]$context.IPv4Interface.NlMtu
        recommended = $best
        reliable = ($replySeen -and $null -ne $best)
        target = '1.1.1.1'
    }
}

function Get-RegistryDnsMode {
    param([string]$InterfaceGuid)
    $key = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$InterfaceGuid"
    try {
        $nameServer = [string](Get-ItemProperty -LiteralPath $key -Name NameServer -ErrorAction SilentlyContinue).NameServer
        return [string]::IsNullOrWhiteSpace($nameServer)
    } catch {
        return $false
    }
}

function New-NetworkSnapshot {
    Assert-Administrator
    $context = Get-PrimaryNetworkContext
    $adapter = $context.Adapter
    Assert-MutableAdapter $adapter
    $dns4 = @(Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses
    $dns6 = @(Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv6 -ErrorAction SilentlyContinue).ServerAddresses
    $rss = $null
    $power = $null
    try { $rss = Get-NetAdapterRss -Name $adapter.Name -ErrorAction Stop } catch { }
    try { $power = Get-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction Stop } catch { }

    [pscustomobject]@{
        schemaVersion = 1
        createdAt = (Get-Date).ToUniversalTime().ToString('o')
        computerName = $env:COMPUTERNAME
        interfaceGuid = [string]$adapter.InterfaceGuid
        interfaceName = [string]$adapter.Name
        interfaceDescription = [string]$adapter.InterfaceDescription
        dnsV4 = $dns4
        dnsV6 = $dns6
        dnsV4Automatic = Get-RegistryDnsMode -InterfaceGuid ([string]$adapter.InterfaceGuid)
        mtuV4 = [int]$context.IPv4Interface.NlMtu
        mtuV6 = if ($null -ne $context.IPv6Interface) { [int]$context.IPv6Interface.NlMtu } else { $null }
        automaticMetricV4 = [string]$context.IPv4Interface.AutomaticMetric
        rssEnabled = if ($null -ne $rss) { [bool]$rss.Enabled } else { $null }
        selectiveSuspend = if ($null -ne $power) { [string]$power.SelectiveSuspend } else { $null }
        deviceSleepOnDisconnect = if ($null -ne $power) { [string]$power.DeviceSleepOnDisconnect } else { $null }
    }
}

function Set-DnsServerSafe {
    param([string]$Server)
    Assert-Administrator
    $parsed = $null
    if (-not [Net.IPAddress]::TryParse($Server, [ref]$parsed) -or $parsed.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
        throw 'A valid IPv4 DNS server is required.'
    }
    $context = Get-PrimaryNetworkContext
    Assert-MutableAdapter $context.Adapter
    $old = @(Get-DnsClientServerAddress -InterfaceIndex $context.Adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses
    $secondary = switch ($Server) { '1.1.1.1' { '1.0.0.1' } '8.8.8.8' { '8.8.4.4' } '9.9.9.9' { '149.112.112.112' } default { $null } }
    $addresses = @($Server)
    if ($null -ne $secondary) { $addresses += $secondary }
    try {
        Set-DnsClientServerAddress -InterfaceIndex $context.Adapter.InterfaceIndex -ServerAddresses $addresses -Confirm:$false -ErrorAction Stop
        Resolve-DnsName -Name 'www.microsoft.com' -Server $Server -DnsOnly -QuickTimeout -ErrorAction Stop | Out-Null
    } catch {
        if ($old.Count -gt 0) { Set-DnsClientServerAddress -InterfaceIndex $context.Adapter.InterfaceIndex -ServerAddresses $old -Confirm:$false -ErrorAction SilentlyContinue }
        throw
    }
    [pscustomobject]@{ changed = @([pscustomobject]@{ setting = 'DNS'; before = ($old -join ', '); after = ($addresses -join ', ') }); requiresRestart = $false }
}

function Set-MtuSafe {
    param([int]$Mtu)
    Assert-Administrator
    if ($Mtu -lt 576 -or $Mtu -gt 9000) { throw 'MTU is outside the supported range.' }
    $context = Get-PrimaryNetworkContext
    Assert-MutableAdapter $context.Adapter
    $old = [int]$context.IPv4Interface.NlMtu
    try {
        Set-NetIPInterface -InterfaceIndex $context.Adapter.InterfaceIndex -AddressFamily IPv4 -NlMtuBytes $Mtu -Confirm:$false -ErrorAction Stop
        $actual = [int](Get-NetIPInterface -InterfaceIndex $context.Adapter.InterfaceIndex -AddressFamily IPv4).NlMtu
        if ($actual -ne $Mtu) { throw 'Windows did not retain the requested MTU.' }
    } catch {
        Set-NetIPInterface -InterfaceIndex $context.Adapter.InterfaceIndex -AddressFamily IPv4 -NlMtuBytes $old -Confirm:$false -ErrorAction SilentlyContinue
        throw
    }
    [pscustomobject]@{ changed = @([pscustomobject]@{ setting = 'IPv4 MTU'; before = $old; after = $Mtu }); requiresRestart = $false }
}

function Optimize-AdapterSafe {
    Assert-Administrator
    $context = Get-PrimaryNetworkContext
    $adapter = $context.Adapter
    Assert-MutableAdapter $adapter
    $changed = New-Object System.Collections.Generic.List[object]
    try {
        $rss = Get-NetAdapterRss -Name $adapter.Name -ErrorAction Stop
        if (-not [bool]$rss.Enabled) {
            Set-NetAdapterRss -Name $adapter.Name -Enabled $true -NoRestart -Confirm:$false -ErrorAction Stop
            $changed.Add([pscustomobject]@{ setting = 'Receive Side Scaling'; before = 'Disabled'; after = 'Enabled' })
        }
    } catch { }
    try {
        $power = Get-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction Stop
        $parameters = @{ Name = $adapter.Name; NoRestart = $true; Confirm = $false; ErrorAction = 'Stop' }
        if ([string]$power.SelectiveSuspend -eq 'Enabled') { $parameters.SelectiveSuspend = 'Disabled' }
        if ([string]$power.DeviceSleepOnDisconnect -eq 'Enabled') { $parameters.DeviceSleepOnDisconnect = 'Disabled' }
        if ($parameters.ContainsKey('SelectiveSuspend') -or $parameters.ContainsKey('DeviceSleepOnDisconnect')) {
            Set-NetAdapterPowerManagement @parameters
            if ($parameters.ContainsKey('SelectiveSuspend')) { $changed.Add([pscustomobject]@{ setting = 'Selective Suspend'; before = 'Enabled'; after = 'Disabled' }) }
            if ($parameters.ContainsKey('DeviceSleepOnDisconnect')) { $changed.Add([pscustomobject]@{ setting = 'Device Sleep On Disconnect'; before = 'Enabled'; after = 'Disabled' }) }
        }
    } catch { }
    [pscustomobject]@{ changed = @($changed | ForEach-Object { $_ }); requiresRestart = ($changed.Count -gt 0) }
}

function Repair-NetworkSafe {
    Assert-Administrator
    $context = Get-PrimaryNetworkContext
    Assert-MutableAdapter $context.Adapter
    $changed = New-Object System.Collections.Generic.List[object]
    Clear-DnsClientCache -ErrorAction Stop
    $changed.Add([pscustomobject]@{ setting = 'DNS cache'; before = 'Cached'; after = 'Cleared' })
    if ([string]$context.IPv4Interface.Dhcp -eq 'Enabled') {
        & "$env:SystemRoot\System32\ipconfig.exe" /renew $context.Adapter.Name | Out-Null
        if ($LASTEXITCODE -eq 0) { $changed.Add([pscustomobject]@{ setting = 'DHCP lease'; before = 'Previous lease'; after = 'Renewed' }) }
    }
    [pscustomobject]@{ changed = @($changed | ForEach-Object { $_ }); requiresRestart = $false; advancedResetSkipped = $true }
}

function Apply-ProfileSafe {
    param([string]$Profile)
    Assert-Administrator
    if (@('1-click', 'gaming', 'download', 'streaming', 'balanced') -notcontains $Profile) { throw 'Unknown profile.' }
    if ($Profile -eq 'balanced') {
        return [pscustomobject]@{ changed = @(); requiresRestart = $false; note = 'Balanced uses the current Windows-managed settings.' }
    }
    return Optimize-AdapterSafe
}

function Restore-NetworkSnapshot {
    param([object]$Snapshot)
    Assert-Administrator
    if ($null -eq $Snapshot -or [int]$Snapshot.schemaVersion -ne 1) { throw 'The baseline snapshot is invalid.' }
    if ([string]$Snapshot.computerName -ne $env:COMPUTERNAME) { throw 'The baseline belongs to a different computer.' }
    $adapter = Get-NetAdapter | Where-Object { [string]$_.InterfaceGuid -eq [string]$Snapshot.interfaceGuid } | Select-Object -First 1
    if ($null -eq $adapter) { throw 'The adapter stored in the baseline is no longer available.' }
    Assert-MutableAdapter $adapter
    $changed = New-Object System.Collections.Generic.List[object]
    if ([bool]$Snapshot.dnsV4Automatic) {
        Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ResetServerAddresses -Confirm:$false -ErrorAction Stop
    } elseif (@($Snapshot.dnsV4).Count -gt 0) {
        Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses @($Snapshot.dnsV4) -Confirm:$false -ErrorAction Stop
    }
    $changed.Add([pscustomobject]@{ setting = 'DNS'; before = 'BYTE BOOST configuration'; after = 'Baseline' })
    Set-NetIPInterface -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -NlMtuBytes ([int]$Snapshot.mtuV4) -Confirm:$false -ErrorAction Stop
    $changed.Add([pscustomobject]@{ setting = 'IPv4 MTU'; before = 'BYTE BOOST configuration'; after = [int]$Snapshot.mtuV4 })
    if ($null -ne $Snapshot.rssEnabled) {
        Set-NetAdapterRss -Name $adapter.Name -Enabled ([bool]$Snapshot.rssEnabled) -NoRestart -Confirm:$false -ErrorAction SilentlyContinue
    }
    $powerParams = @{ Name = $adapter.Name; NoRestart = $true; Confirm = $false; ErrorAction = 'SilentlyContinue' }
    if ([string]$Snapshot.selectiveSuspend -match 'Enabled|Disabled') { $powerParams.SelectiveSuspend = [string]$Snapshot.selectiveSuspend }
    if ([string]$Snapshot.deviceSleepOnDisconnect -match 'Enabled|Disabled') { $powerParams.DeviceSleepOnDisconnect = [string]$Snapshot.deviceSleepOnDisconnect }
    if ($powerParams.ContainsKey('SelectiveSuspend') -or $powerParams.ContainsKey('DeviceSleepOnDisconnect')) { Set-NetAdapterPowerManagement @powerParams }
    [pscustomobject]@{ changed = @($changed | ForEach-Object { $_ }); requiresRestart = $true }
}

function Get-GameExecutable {
    param([string]$InstallLocation)

    if ([string]::IsNullOrWhiteSpace($InstallLocation) -or -not (Test-Path -LiteralPath $InstallLocation -PathType Container)) { return $null }
    $candidate = Get-ChildItem -LiteralPath $InstallLocation -Filter '*.exe' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '^(unins|uninstall|crash|report|launcher|setup|install|vc_redist)' } |
        Sort-Object Length -Descending |
        Select-Object -First 1
    if ($candidate) { return $candidate.FullName }
    return $null
}

function Get-InstalledGames {
    $games = New-Object System.Collections.Generic.List[object]
    $seen = @{}
    $runningPaths = @(Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
        try { if ($_.Path) { [IO.Path]::GetFullPath($_.Path) } } catch { }
    })

    $addGame = {
        param([string]$Name, [string]$Source, [string]$InstallLocation, [string]$Executable, [string]$ExternalId)
        if ([string]::IsNullOrWhiteSpace($Name) -or [string]::IsNullOrWhiteSpace($InstallLocation)) { return }
        if ($Name -match '^(Steamworks Common Redistributables|Steam Linux Runtime|Proton )') { return }
        try { $root = [IO.Path]::GetFullPath($InstallLocation).TrimEnd('\') } catch { return }
        if (-not (Test-Path -LiteralPath $root -PathType Container)) { return }
        $key = $root.ToLowerInvariant()
        if ($seen.ContainsKey($key)) { return }
        $seen[$key] = $true
        if ([string]::IsNullOrWhiteSpace($Executable)) { $Executable = Get-GameExecutable -InstallLocation $root }
        $rootPrefix = $root + '\'
        $isRunning = [bool]($runningPaths | Where-Object { $_.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase) -or $_.Equals($Executable, [StringComparison]::OrdinalIgnoreCase) } | Select-Object -First 1)
        $idBytes = [Text.Encoding]::UTF8.GetBytes($key)
        $sha = [Security.Cryptography.SHA256]::Create()
        try { $id = ([BitConverter]::ToString($sha.ComputeHash($idBytes))).Replace('-', '').Substring(0, 16).ToLowerInvariant() } finally { $sha.Dispose() }
        $games.Add([pscustomobject]@{
            id = $id
            name = $Name.Trim()
            source = $Source
            installLocation = $root
            executable = $Executable
            externalId = $ExternalId
            running = $isRunning
        })
    }

    $steamPath = $null
    try { $steamPath = [string](Get-ItemProperty -LiteralPath 'HKCU:\Software\Valve\Steam' -Name SteamPath -ErrorAction Stop).SteamPath } catch { }
    if (-not $steamPath) { try { $steamPath = [string](Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam' -Name InstallPath -ErrorAction Stop).InstallPath } catch { } }
    if (-not $steamPath) { try { $steamPath = [string](Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Valve\Steam' -Name InstallPath -ErrorAction Stop).InstallPath } catch { } }
    if ($steamPath -and (Test-Path -LiteralPath $steamPath -PathType Container)) {
        $libraries = New-Object System.Collections.Generic.List[string]
        $libraries.Add([IO.Path]::GetFullPath($steamPath))
        $libraryFile = Join-Path $steamPath 'steamapps\libraryfolders.vdf'
        if (Test-Path -LiteralPath $libraryFile -PathType Leaf) {
            $libraryText = Get-Content -LiteralPath $libraryFile -Raw -ErrorAction SilentlyContinue
            [regex]::Matches([string]$libraryText, '"path"\s+"([^"]+)"') | ForEach-Object {
                $library = $_.Groups[1].Value -replace '\\\\', '\'
                if ($library -and -not $libraries.Contains($library)) { $libraries.Add($library) }
            }
        }
        foreach ($library in $libraries) {
            $steamApps = Join-Path $library 'steamapps'
            Get-ChildItem -LiteralPath $steamApps -Filter 'appmanifest_*.acf' -File -ErrorAction SilentlyContinue | ForEach-Object {
                $manifest = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction SilentlyContinue
                $nameMatch = [regex]::Match([string]$manifest, '"name"\s+"([^"]+)"')
                $dirMatch = [regex]::Match([string]$manifest, '"installdir"\s+"([^"]+)"')
                $idMatch = [regex]::Match([string]$manifest, '"appid"\s+"([^"]+)"')
                if ($nameMatch.Success -and $dirMatch.Success) {
                    $location = Join-Path (Join-Path $steamApps 'common') $dirMatch.Groups[1].Value
                    & $addGame $nameMatch.Groups[1].Value 'Steam' $location $null $idMatch.Groups[1].Value
                }
            }
        }
    }

    $epicManifestRoot = Join-Path ([Environment]::GetFolderPath('CommonApplicationData')) 'Epic\EpicGamesLauncher\Data\Manifests'
    Get-ChildItem -LiteralPath $epicManifestRoot -Filter '*.item' -File -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $manifest = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
            if (-not $manifest.bIsIncompleteInstall -and $manifest.DisplayName -and $manifest.InstallLocation) {
                $executable = if ($manifest.LaunchExecutable) { Join-Path ([string]$manifest.InstallLocation) ([string]$manifest.LaunchExecutable) } else { $null }
                & $addGame ([string]$manifest.DisplayName) 'Epic Games' ([string]$manifest.InstallLocation) $executable ([string]$manifest.CatalogItemId)
            }
        } catch { }
    }

    @('HKLM:\SOFTWARE\WOW6432Node\GOG.com\Games', 'HKLM:\SOFTWARE\GOG.com\Games') | ForEach-Object {
        Get-ChildItem -LiteralPath $_ -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $game = Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction Stop
                $executable = if ($game.exe -and $game.path) { Join-Path ([string]$game.path) ([string]$game.exe) } else { $null }
                & $addGame ([string]$game.gameName) 'GOG' ([string]$game.path) $executable ([string]$_.PSChildName)
            } catch { }
        }
    }

    [IO.DriveInfo]::GetDrives() | Where-Object { $_.IsReady -and $_.DriveType -eq [IO.DriveType]::Fixed } | ForEach-Object {
        $xboxRoot = Join-Path $_.RootDirectory.FullName 'XboxGames'
        Get-ChildItem -LiteralPath $xboxRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $contentRoot = Join-Path $_.FullName 'Content'
            $location = if (Test-Path -LiteralPath $contentRoot -PathType Container) { $contentRoot } else { $_.FullName }
            & $addGame $_.Name 'Xbox' $location (Get-GameExecutable -InstallLocation $location) $null
        }
    }

    $uninstallRoots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
    )
    foreach ($uninstallRoot in $uninstallRoots) {
        Get-ChildItem -LiteralPath $uninstallRoot -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $entry = Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction Stop
                $location = [string]$entry.InstallLocation
                $publisher = [string]$entry.Publisher
                $likelyGamePath = $location -match '(?i)\\(games?|steamapps|epic games|gog games|ubisoft|ea games|riot games|battle\.net)\\'
                $likelyGamePublisher = $publisher -match '(?i)(Electronic Arts|EA Games|Ubisoft|Blizzard|Riot Games|Rockstar Games|CD PROJEKT|Bethesda|Valve|KRAFTON)'
                $isUtility = [string]$entry.DisplayName -match '(?i)(launcher|client|anti.?cheat|update service|online services)'
                if ($entry.DisplayName -and $location -and ($likelyGamePath -or $likelyGamePublisher) -and -not $isUtility) {
                    & $addGame ([string]$entry.DisplayName) 'Windows Registry' $location (Get-GameExecutable -InstallLocation $location) ([string]$_.PSChildName)
                }
            } catch { }
        }
    }

    $filteredGames = @($games |
        Where-Object { $_.name -notmatch '^(Riot Vanguard|GameSave|Wallpaper Engine)$' } |
        Sort-Object @{ Expression = { $_.name -replace '_\d+$', '' } }, Name, Source |
        Group-Object { $_.source + '|' + ($_.name -replace '_\d+$', '').ToLowerInvariant() } |
        ForEach-Object { $_.Group | Select-Object -First 1 })
    [pscustomobject]@{
        games = $filteredGames
        sources = @($filteredGames.Source | Sort-Object -Unique)
        scannedAt = [DateTime]::UtcNow.ToString('o')
    }
}

function Test-IsPublicGameAddress {
    param([string]$Address)
    $ip = $null
    if (-not [Net.IPAddress]::TryParse($Address, [ref]$ip)) { return $false }
    if ($ip.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetworkV6) {
        return -not ($ip.Equals([Net.IPAddress]::IPv6Loopback) -or $ip.IsIPv6LinkLocal -or $ip.IsIPv6Multicast -or $ip.IsIPv6SiteLocal)
    }
    if ($ip.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) { return $false }
    $b = $ip.GetAddressBytes()
    if ($b[0] -eq 10 -or $b[0] -eq 127 -or $b[0] -ge 224) { return $false }
    if ($b[0] -eq 169 -and $b[1] -eq 254) { return $false }
    if ($b[0] -eq 172 -and $b[1] -ge 16 -and $b[1] -le 31) { return $false }
    if ($b[0] -eq 192 -and $b[1] -eq 168) { return $false }
    return $true
}

function Test-TcpConnectLatency {
    param([string]$Address, [int]$Port, [int]$TimeoutMs = 800)
    $client = $null
    try {
        $client = [Net.Sockets.TcpClient]::new()
        $timer = [Diagnostics.Stopwatch]::StartNew()
        $task = $client.ConnectAsync($Address, $Port)
        if (-not $task.Wait($TimeoutMs) -or -not $client.Connected) {
            return [pscustomobject]@{ reachable = $false; latencyMs = $null }
        }
        $timer.Stop()
        return [pscustomobject]@{ reachable = $true; latencyMs = [Math]::Round($timer.Elapsed.TotalMilliseconds, 1) }
    } catch {
        return [pscustomobject]@{ reachable = $false; latencyMs = $null }
    } finally {
        if ($client) { $client.Dispose() }
    }
}

function Get-GameConnectionAnalysis {
    param([string]$InstallLocation, [string]$Executable)
    if ([string]::IsNullOrWhiteSpace($InstallLocation)) { throw 'A game install location is required.' }
    $root = [IO.Path]::GetFullPath($InstallLocation).TrimEnd('\')
    if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw 'The selected game installation was not found.' }
    $rootPrefix = $root + '\'
    $processes = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
        try { $_.Path -and ([IO.Path]::GetFullPath($_.Path).StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) } catch { $false }
    })
    if ($processes.Count -eq 0) {
        return [pscustomobject]@{ running = $false; processCount = 0; endpoints = @(); nearestObserved = $null; serverSelection = 'game-managed' }
    }
    $processIds = @($processes.Id)
    $preferredIds = @()
    if (-not [string]::IsNullOrWhiteSpace($Executable)) {
        try {
            $executablePath = [IO.Path]::GetFullPath($Executable)
            $preferredIds = @($processes | Where-Object { $_.Path -and ([IO.Path]::GetFullPath($_.Path).Equals($executablePath, [StringComparison]::OrdinalIgnoreCase)) } | Select-Object -ExpandProperty Id)
        } catch { }
    }
    $connections = @(Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue |
        Where-Object { $processIds -contains $_.OwningProcess -and (Test-IsPublicGameAddress -Address $_.RemoteAddress) } |
        ForEach-Object {
            $connection = $_
            $owner = $processes | Where-Object { $_.Id -eq $connection.OwningProcess } | Select-Object -First 1
            [pscustomobject]@{
                address = [string]$connection.RemoteAddress
                port = [int]$connection.RemotePort
                processId = [int]$connection.OwningProcess
                processName = if ($owner) { [string]$owner.ProcessName } else { '' }
                preferred = $preferredIds -contains $connection.OwningProcess
                auxiliary = [bool]($owner -and $owner.ProcessName -match '(?i)(launcher|updater?|crash|report|anti.?cheat|bootstrap|helper|overlay)')
            }
        } |
        Sort-Object @{ Expression = { -not $_.preferred } }, auxiliary, processName, address, port |
        Group-Object { $_.address + ':' + $_.port + ':' + $_.processId } |
        ForEach-Object { $_.Group | Select-Object -First 1 })
    if (@($connections | Where-Object preferred).Count -gt 0) {
        $connections = @($connections | Where-Object preferred)
    }
    $connections = @($connections | Select-Object -First 10)
    $endpoints = @($connections | ForEach-Object {
        $connection = $_
        $ping = Test-PingSeries -Target $connection.address -Count 2 -TimeoutMs 500
        $tcp = if ($ping.reachable) { $null } else { Test-TcpConnectLatency -Address $connection.address -Port $connection.port -TimeoutMs 800 }
        $measured = $ping.reachable -or ($tcp -and $tcp.reachable)
        [pscustomobject]@{
            address = $connection.address
            port = $connection.port
            protocol = 'TCP'
            processId = $connection.processId
            processName = $connection.processName
            auxiliary = $connection.auxiliary
            observed = $true
            reachable = $measured
            latencyMs = if ($ping.reachable) { $ping.averageMs } elseif ($tcp -and $tcp.reachable) { $tcp.latencyMs } else { $null }
            latencyMethod = if ($ping.reachable) { 'icmp' } elseif ($tcp -and $tcp.reachable) { 'tcp-connect' } else { 'unavailable' }
        }
    })
    $serverCandidates = @($endpoints | Where-Object { -not $_.auxiliary })
    if ($serverCandidates.Count -eq 0) { $serverCandidates = $endpoints }
    $nearest = $serverCandidates | Where-Object { $_.reachable } | Sort-Object latencyMs | Select-Object -First 1
    if (-not $nearest) { $nearest = $endpoints | Select-Object -First 1 }
    [pscustomobject]@{
        running = $true
        processCount = $processes.Count
        endpoints = $endpoints
        nearestObserved = $nearest
        serverSelection = 'game-managed'
        transportCoverage = 'tcp'
    }
}

try {
    $payload = Get-Payload
    $data = switch ($Action) {
        'get-capabilities' {
            [pscustomobject]@{
                supported = $true
                isAdmin = Test-IsAdministrator
                powershellVersion = $PSVersionTable.PSVersion.ToString()
                modules = [pscustomobject]@{
                    NetAdapter = [bool](Get-Module -ListAvailable NetAdapter)
                    NetTCPIP = [bool](Get-Module -ListAvailable NetTCPIP)
                    DnsClient = [bool](Get-Module -ListAvailable DnsClient)
                }
            }
        }
        'get-status' { Get-SystemStatus }
        'get-traffic' { (Get-SystemStatus).counters }
        'run-diagnostics' { Get-Diagnostics }
        'benchmark-dns' { Get-DnsBenchmark }
        'test-mtu' { Test-PathMtu }
        'scan-installed-games' { Get-InstalledGames }
        'analyze-game-connections' { Get-GameConnectionAnalysis -InstallLocation ([string]$payload.installLocation) -Executable ([string]$payload.executable) }
        'create-snapshot' { New-NetworkSnapshot }
        'apply-dns' { Set-DnsServerSafe -Server ([string]$payload.server) }
        'apply-mtu' { Set-MtuSafe -Mtu ([int]$payload.mtu) }
        'repair-network' { Repair-NetworkSafe }
        'optimize-adapter' { Optimize-AdapterSafe }
        'apply-profile' { Apply-ProfileSafe -Profile ([string]$payload.profile) }
        'restore-snapshot' { Restore-NetworkSnapshot -Snapshot $payload.snapshot }
    }
    Write-JsonResult -Ok $true -Data $data -ErrorObject $null
} catch {
    $message = $_.Exception.Message
    $code = if ($message -match 'Administrator permission') { 'ADMIN_REQUIRED' } elseif ($message -match 'No active|not connected') { 'NO_CONNECTION' } else { 'NATIVE_FAILURE' }
    Write-JsonResult -Ok $false -Data $null -ErrorObject ([pscustomobject]@{ code = $code; message = $message })
    exit 1
}
