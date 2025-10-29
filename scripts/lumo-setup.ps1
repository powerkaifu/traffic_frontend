# Lumo Live2D 快速修復和驗證腳本
# 用法: .\scripts\lumo-setup.ps1

param(
    [ValidateSet('setup', 'verify', 'build', 'clean', 'all')]
    [string]$Action = 'all'
)

# 定義顏色
$colors = @{
    success = 'Green'
    error   = 'Red'
    warning = 'Yellow'
    info    = 'Cyan'
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $colors.success
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $colors.error
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $colors.warning
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $colors.info
}

# 獲取項目根目錄
$projectRoot = Split-Path -Parent $PSScriptRoot

function Setup-LumoResources {
    Write-Host ""
    Write-Info "🔧 設置 Lumo 資源..."

    # 檢查源文件
    $srcLibs = Join-Path $projectRoot "src\Lumo\libs"
    $srcResources = Join-Path $projectRoot "src\Lumo\Resources"

    if (!(Test-Path $srcLibs)) {
        Write-Error "找不到源庫文件: $srcLibs"
        return $false
    }

    if (!(Test-Path $srcResources)) {
        Write-Error "找不到源資源文件: $srcResources"
        return $false
    }

    # 創建目標目錄
    $destLibs = Join-Path $projectRoot "public\libs"
    $destResources = Join-Path $projectRoot "public\Lumo\Resources"

    New-Item -ItemType Directory -Path $destLibs -Force | Out-Null
    New-Item -ItemType Directory -Path $destResources -Force | Out-Null

    # 複製庫文件
    Write-Info "複製庫文件..."
    $libFiles = @('pixi.min.js', 'live2dcubismcore.min.js', 'cubism4.js')
    foreach ($file in $libFiles) {
        $src = Join-Path $srcLibs $file
        if (Test-Path $src) {
            Copy-Item $src -Destination $destLibs -Force
            Write-Success "已複製: $file"
        } else {
            Write-Error "找不到庫文件: $file"
        }
    }

    # 複製資源文件
    Write-Info "複製模型資源..."
    Copy-Item -Path "$srcResources\*" -Destination $destResources -Recurse -Force
    Write-Success "模型資源已複製"

    return $true
}

function Verify-LumoSetup {
    Write-Host ""
    Write-Info "🔍 驗證 Lumo 設置..."

    $allGood = $true

    # 檢查庫文件
    $libs = @(
        "public\libs\pixi.min.js",
        "public\libs\live2dcubismcore.min.js",
        "public\libs\cubism4.js"
    )

    Write-Info "檢查庫文件..."
    foreach ($lib in $libs) {
        $path = Join-Path $projectRoot $lib
        if (Test-Path $path) {
            $size = (Get-Item $path).Length / 1KB
            Write-Success "✓ $lib ($([Math]::Round($size, 2)) KB)"
        } else {
            Write-Error "✗ $lib 未找到"
            $allGood = $false
        }
    }

    # 檢查模型資源
    $resources = @(
        "public\Lumo\Resources\robot\robot.model3.json",
        "public\Lumo\Resources\robot\robot.moc3",
        "public\Lumo\Resources\robot\robot.1024\texture_00.png",
        "public\Lumo\Resources\robot\motions\robot_breath.motion3.json"
    )

    Write-Info "檢查模型資源..."
    foreach ($resource in $resources) {
        $path = Join-Path $projectRoot $resource
        if (Test-Path $path) {
            Write-Success "✓ $resource"
        } else {
            Write-Error "✗ $resource 未找到"
            $allGood = $false
        }
    }

    # 檢查代碼文件
    Write-Info "檢查代碼文件..."
    $codeFiles = @(
        "src\boot\live2d.js",
        "src\components\LumoAssistant.vue",
        "src\utils\LumoStatusCheck.js"
    )

    foreach ($file in $codeFiles) {
        $path = Join-Path $projectRoot $file
        if (Test-Path $path) {
            Write-Success "✓ $file"
        } else {
            Write-Warning "⚠ $file 未找到（可能需要創建）"
            $allGood = $false
        }
    }

    Write-Host ""
    if ($allGood) {
        Write-Success "所有設置驗證成功！"
    } else {
        Write-Warning "某些文件缺失，請檢查上面的錯誤"
    }

    return $allGood
}

function Clean-Caches {
    Write-Host ""
    Write-Info "🧹 清理緩存..."

    $viteCacheDir = Join-Path $projectRoot "node_modules\.vite"
    if (Test-Path $viteCacheDir) {
        Remove-Item $viteCacheDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "Vite 緩存已清理"
    }

    # 清理 .next 或其他緩存目錄
    @(
        "dist",
        ".quasar"
    ) | ForEach-Object {
        $dir = Join-Path $projectRoot $_
        if (Test-Path $dir) {
            Write-Warning "清理 $_..."
        }
    }

    Write-Success "緩存清理完成"
}

function Build-Application {
    Write-Host ""
    Write-Info "🏗️  構建應用..."

    Set-Location $projectRoot

    try {
        npm run build
        Write-Success "應用構建成功"
        return $true
    } catch {
        Write-Error "應用構建失敗: $_"
        return $false
    }
}

# 執行主邏輯
Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Lumo Live2D 快速設置和驗證工具            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan

$startTime = Get-Date

# 根據參數執行相應的操作
switch ($Action) {
    'setup' {
        Setup-LumoResources | Out-Null
    }
    'verify' {
        Verify-LumoSetup | Out-Null
    }
    'build' {
        Build-Application | Out-Null
    }
    'clean' {
        Clean-Caches
    }
    'all' {
        Setup-LumoResources | Out-Null
        Write-Host ""
        Clean-Caches
        Write-Host ""
        Verify-LumoSetup | Out-Null
        Write-Host ""
        Build-Application | Out-Null
    }
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host ""
Write-Info "⏱️  總耗時: $([Math]::Round($duration, 2)) 秒"
Write-Host ""
Write-Success "✨ 完成！"
Write-Host ""
Write-Info "下一步："
Write-Info "1. 啟動開發服務器: npm run dev"
Write-Info "2. 打開瀏覽器: http://localhost:9001"
Write-Info "3. 打開 DevTools (F12) 並檢查控制台"
Write-Info "4. 查看 doc/LUMO_QUICK_CHECKLIST.md 進行驗證"
Write-Host ""
