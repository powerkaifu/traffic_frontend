#!/usr/bin/env node

/**
 * 🔍 配置參數使用情況分析工具
 *
 * 用途：掃描項目中所有配置文件，識別未使用的參數
 * 執行：node analyze-config-usage.js
 *
 * 輸出：
 * 1. 所有導出的配置列表
 * 2. 每個配置的使用位置和次數
 * 3. 未使用的配置清單
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 配置掃描的目錄
const CONFIG_DIR = path.join(__dirname, 'src/classes/config')
const SOURCE_DIR = path.join(__dirname, 'src')

// 記錄結果
const results = {
  configs: {}, // 所有找到的配置
  usage: {}, // 使用情況
  unused: [], // 未使用的配置
  summary: {}, // 摘要統計
}

/**
 * 第 1 步：掃描配置文件中的所有 export const
 */
function scanConfigFiles() {
  console.log('📁 第 1 步：掃描配置文件中的所有導出常數...\n')

  const configFiles = fs
    .readdirSync(CONFIG_DIR)
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.join(CONFIG_DIR, file))

  configFiles.forEach((filePath) => {
    const fileName = path.basename(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')

    results.configs[fileName] = []

    // 正則表達式匹配 export const XXX = {
    const regex = /^export const\s+([A-Z_][A-Z0-9_]*)\s*=/gm
    let match

    while ((match = regex.exec(content)) !== null) {
      const configName = match[1]
      const lineNumber = content.substring(0, match.index).split('\n').length

      results.configs[fileName].push({
        name: configName,
        line: lineNumber,
        file: filePath,
      })

      // 初始化使用計數
      results.usage[configName] = {
        count: 0,
        locations: [],
        isUsed: false,
      }
    }

    // 也記錄導出的子項（如果有 export const 在主配置文件中）
    console.log(`✅ ${fileName}: ${results.configs[fileName].length} 個導出`)
    results.configs[fileName].forEach((item) => {
      console.log(`   - ${item.name} (Line ${item.line})`)
    })
  })

  console.log(`\n📊 共找到 ${Object.keys(results.usage).length} 個導出常數\n`)
}

/**
 * 第 2 步：對每個配置進行全項目搜尋
 */
function searchConfigUsage() {
  console.log('🔎 第 2 步：搜尋每個配置的使用情況...\n')

  const configNames = Object.keys(results.usage)

  configNames.forEach((configName, index) => {
    process.stdout.write(`\r進度: ${index + 1}/${configNames.length}`)

    try {
      // 使用 grep 搜尋（Windows 上使用 findstr）
      let searchCommand
      if (process.platform === 'win32') {
        searchCommand = `findstr /R /S "${configName}" "${SOURCE_DIR}" 2>nul`
      } else {
        searchCommand = `grep -r "${configName}" "${SOURCE_DIR}" 2>/dev/null`
      }

      const output = execSync(searchCommand, { encoding: 'utf-8', stdio: 'pipe' }).trim()

      if (output) {
        const lines = output.split('\n').filter((line) => line.trim())

        // 過濾掉在配置文件本身中的定義
        const usageLines = lines.filter((line) => {
          // 忽略導出定義行
          if (line.includes(`export const ${configName}`)) return false
          // 忽略註解中的引用
          if (line.trim().startsWith('//')) return false
          return true
        })

        if (usageLines.length > 0) {
          results.usage[configName].count = usageLines.length
          results.usage[configName].locations = usageLines.slice(0, 5) // 只記錄前 5 個
          results.usage[configName].isUsed = true
        }
      }
    } catch {
      // 搜尋失敗（可能找不到或沒有結果）
      // 繼續進行
    }
  })

  console.log('\n✅ 搜尋完成\n')
}

/**
 * 第 3 步：生成報告
 */
function generateReport() {
  console.log('📋 第 3 步：生成分析報告...\n')

  // 分類配置
  const used = []
  const unused = []

  Object.entries(results.usage).forEach(([name, info]) => {
    if (info.isUsed) {
      used.push({ name, count: info.count })
    } else {
      unused.push(name)
      results.unused.push(name)
    }
  })

  // 排序
  used.sort((a, b) => b.count - a.count)
  unused.sort()

  // 統計
  results.summary = {
    total: Object.keys(results.usage).length,
    used: used.length,
    unused: unused.length,
    usageRate: ((used.length / Object.keys(results.usage).length) * 100).toFixed(1),
  }

  // 輸出報告
  console.log('═'.repeat(70))
  console.log('📊 配置使用情況統計')
  console.log('═'.repeat(70))
  console.log(`\n📈 統計信息：`)
  console.log(`   總配置數: ${results.summary.total}`)
  console.log(`   已使用:   ${results.summary.used} (${results.summary.usageRate}%)`)
  console.log(`   未使用:   ${results.summary.unused}`)

  // 已使用的配置（按使用次數排序）
  console.log(`\n✅ 已使用的配置 (按使用次數倒序):\n`)
  console.log('┌─────────────────────────┬────────┬─────────────────────────────┐')
  console.log('│ 配置名稱                │ 使用次數 │ 首次出現位置              │')
  console.log('├─────────────────────────┼────────┼─────────────────────────────┤')

  used.forEach((item) => {
    const location = results.usage[item.name].locations[0] || 'N/A'
    const truncated = location.substring(0, 27).padEnd(27)
    console.log(`│ ${item.name.padEnd(23)} │ ${item.count.toString().padStart(6)} │ ${truncated} │`)
  })

  console.log('└─────────────────────────┴────────┴─────────────────────────────┘')

  // 未使用的配置
  if (unused.length > 0) {
    console.log(`\n❌ 未使用的配置 (${unused.length} 個):\n`)
    console.log('┌─────────────────────────────────────────┐')
    console.log('│ 配置名稱                              │')
    console.log('├─────────────────────────────────────────┤')

    unused.forEach((name) => {
      console.log(`│ ${name.padEnd(39)} │`)
    })

    console.log('└─────────────────────────────────────────┘')

    console.log(`\n⚠️ 建議檢查清單：\n`)
    unused.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`)
    })
  } else {
    console.log(`\n✨ 所有配置都被使用了！\n`)
  }
}

/**
 * 第 4 步：導出詳細報告
 */
function exportDetailedReport() {
  console.log('\n💾 第 4 步：導出詳細報告...\n')

  const reportPath = path.join(__dirname, 'config-usage-report.json')

  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8')

  console.log(`✅ 詳細報告已保存至: ${reportPath}`)
  console.log(`   您可以用文本編輯器或 VS Code 查看\n`)
}

/**
 * 生成 CSV 格式報告（便於導入 Excel）
 */
function exportCSVReport() {
  const csvPath = path.join(__dirname, 'config-usage-report.csv')

  let csv = '配置名稱,使用次數,是否使用,首次使用位置\n'

  Object.entries(results.usage).forEach(([name, info]) => {
    const location = info.locations[0]?.substring(0, 50) || 'N/A'
    const status = info.isUsed ? '是' : '否'
    csv += `"${name}",${info.count},"${status}","${location}"\n`
  })

  fs.writeFileSync(csvPath, csv, 'utf-8')

  console.log(`✅ CSV 報告已保存至: ${csvPath}`)
}

/**
 * 主函數
 */
function main() {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║      🔍 配置參數使用情況分析工具                              ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  try {
    scanConfigFiles()
    searchConfigUsage()
    generateReport()
    exportDetailedReport()
    exportCSVReport()

    console.log('\n╔════════════════════════════════════════════════════════════════╗')
    console.log('║      ✨ 分析完成！                                            ║')
    console.log('╚════════════════════════════════════════════════════════════════╝\n')

    // 輸出建議
    if (results.unused.length > 0) {
      console.log('🎯 下一步建議：\n')
      console.log('1. 查看生成的報告：config-usage-report.json')
      console.log('2. 對每個未使用的配置進行人工審查')
      console.log('3. 確認它們確實不需要後再刪除')
      console.log('4. 刪除前備份原始值')
      console.log('5. 刪除後進行完整測試\n')
    }
  } catch (error) {
    console.error('❌ 分析過程出錯:', error.message)
    process.exit(1)
  }
}

// 執行
main()
