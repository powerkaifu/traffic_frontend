/**
 * trafficConfig.js - 交通模擬系統配置文件
 *
 * 這個檔案專門處理交通流量和車輛類型相關的設定
 * 與 vehicleConfig.js 配合使用，分別負責不同層面的配置管理
 * 遵循「單一事實來源 (Single Source of Truth)」原則
 *
 * 📋 配置分工：
 * - trafficConfig.js：車輛類型、速度範圍、交通燈時間
 * - vehicleConfig.js：行為邏輯、動畫參數、碰撞檢測
 */

// ===== 車輛速度配置 =====
/**
 * 🚗 車輛類型速度設定 (公里/小時)
 *
 * 💡 調整建議：
 * - 城市道路：建議 25-60 km/h
 * - 快速道路：建議 40-80 km/h
 * - 擁擠路段：建議降低最高速度 10-15 km/h
 *
 * ⚠️ 注意：min 不可大於 max，avg 會自動計算
 */
export const speedConfig = {
  // 🚛 大型車輛（巴士、卡車、聯結車等）
  large: {
    min: 25, // 最低速度 - 起步較慢，載重影響
    max: 35, // 最高速度 - 考量安全與法規限制
  },

  // 🚗 小型車輛（轎車、休旅車、掀背車等）
  small: {
    min: 30, // 最低速度 - 較靈活的加速性能
    max: 50, // 最高速度 - 較高的速度上限
  },

  // 🏍️ 機車（重機、速克達、輕型機車等）
  motor: {
    min: 35, // 最低速度 - 起步快但市區限速
    max: 60, // 最高速度 - 考量安全因素
  },

  // 🚑 救護車（緊急車輛）
  ambulance: {
    min: 40, // 最低速度 - 大幅降低以符合視覺需求
    max: 60, // 最高速度 - 確保救護車不會過快
  },
}

// 📊 高速設定（測試用 - 取消註解可啟用）
// 用於測試車輛在高速狀態下的行為表現
/*
export const speedConfig = {
  large: { min: 125, max: 135 }, // 大型車高速範圍
  small: { min: 130, max: 150 }, // 小型車高速範圍
  motor: { min: 130, max: 160 }, // 機車高速範圍
}
*/

// 🧮 自動計算平均值
// 為每個速度範圍計算平均值，方便其他模組直接使用
Object.values(speedConfig).forEach((range) => {
  range.avg = Math.round((range.min + range.max) / 2)
})

// ===== 交通燈配置 =====
/**
 * 🚦 交通燈時間控制設定 (毫秒)
 *
 * 🎛️ 調整指南：
 * - 繁忙路口：增加綠燈時間，減少紅燈時間
 * - 行人較多：增加 allRed（行人穿越緩衝時間）
 * - 夜間模式：整體縮短週期時間
 *
 * 📊 建議比例：
 * - 綠燈：紅燈 ≈ 1:1.2 到 1:0.8（依車流量調整）
 * - 黃燈：固定 3 秒（符合交通法規）
 * - 全紅燈：1-3 秒（清空路口緩衝時間）
 */
export const lightConfig = {
  // 🌅 正常時段配置（白天一般車流）
  normalCycle: {
    red: 30000, // 紅燈 30 秒 - 標準等待時間
    yellow: 3000, // 黃燈 3 秒 - 法規標準時間
    green: 25000, // 綠燈 25 秒 - 充足通行時間
    allRed: 2000, // 全紅燈 2 秒 - 路口清空緩衝
  },

  // 🌙 夜間配置（深夜車流較少）
  nightCycle: {
    red: 20000, // 紅燈 20 秒 - 縮短等待時間
    yellow: 3000, // 黃燈 3 秒 - 維持標準時間
    green: 15000, // 綠燈 15 秒 - 適度縮短通行時間
    allRed: 2000, // 全紅燈 2 秒 - 維持安全緩衝
  },

  // 🕐 尖峰時段配置（上下班繁忙時間）
  rushHourCycle: {
    red: 35000, // 紅燈 35 秒 - 因車流大需較長等待
    yellow: 3000, // 黃燈 3 秒 - 維持標準
    green: 30000, // 綠燈 30 秒 - 延長通行時間
    allRed: 2500, // 全紅燈 2.5 秒 - 增加清空時間
  },
}

// ===== 交通燈顏色配置 =====
/**
 * 🎨 交通燈顏色設定
 *
 * 用於界面倒數計時器文字顏色對應燈號狀態
 * 遵循標準交通燈號顏色規範
 */
export const lightColorConfig = {
  // 🔴 紅燈相關狀態 - 紅色
  red: '#FF4444',
  allRed: '#FF4444',

  // 🟡 黃燈狀態 - 黃色
  yellow: '#FFD700',

  // 🟢 綠燈相關狀態 - 綠色
  green: '#00FF88',
  leftTurnGreen: '#00FF88',

  // 🎨 其他視覺效果
  textShadow: {
    red: '0 0 10px rgba(255, 68, 68, 0.6)',
    yellow: '0 0 10px rgba(255, 215, 0, 0.6)',
    green: '0 0 10px rgba(0, 255, 136, 0.6)',
  },
}

// ===== 車輛生成配置 =====
/**
 * 🏭 車輛產生器設定
 *
 * 🎲 機率說明：
 * - 數值為 0-1 之間的機率值
 * - 總和建議為 1.0，確保機率分布合理
 * - 可根據實際道路狀況調整比例
 */
export const vehicleGenerationConfig = {
  // 📊 車輛類型機率分布
  probability: {
    large: 0.15, // 15% - 大型車輛（巴士、卡車）
    small: 0.7, // 70% - 小型車輛（主要車流）
    motor: 0.15, // 15% - 機車
  },

  // ⏱️ 生成時間間隔設定 (毫秒)
  spawnInterval: {
    normal: 2000, // 正常時段：每 2 秒生成一輛車
    busy: 1200, // 繁忙時段：每 1.2 秒生成一輛車
    light: 3500, // 車流稀少：每 3.5 秒生成一輛車
  },
}

// ===== 道路幾何配置 =====
/**
 * 🛣️ 道路佈局和幾何參數
 *
 * 📏 單位說明：
 * - 所有距離單位為像素 (px)
 * - 角度單位為度 (degrees)
 * - 座標系以畫面左上角為原點
 */
export const roadConfig = {
  // 🛣️ 車道寬度設定
  laneWidth: 80, // 標準車道寬度（像素）

  // 🚧 路口幾何參數
  intersection: {
    centerX: 400, // 路口中心 X 座標
    centerY: 300, // 路口中心 Y 座標
    width: 160, // 路口寬度
    height: 160, // 路口高度
  },

  // 📐 轉彎半徑設定
  turningRadius: {
    rightTurn: 30, // 右轉半徑
    leftTurn: 50, // 左轉半徑（較大避免對向衝突）
  },
}

// ===== 停止線配置 =====
/**
 * 🛑 停止線位置和行為設定
 *
 * 🎯 設計理念：
 * - 基於 IndexPage.vue 中央參考矩形 (.central-reference) 計算
 * - 中央矩形代表十字路口的核心區域
 * - 停止線位於路口邊界，車輛不可越過紅燈
 *
 * 📐 座標計算邏輯：
 * - 東向車輛：停在中央矩形的左邊界 (centralX)
 * - 西向車輛：停在中央矩形的右邊界 (centralX + centralWidth)
 * - 南向車輛：停在中央矩形的上邊界 (centralY + offset)
 * - 北向車輛：停在中央矩形的下邊界 (centralY + centralHeight - offset)
 *
 * 💡 調整建議：
 * - 增加 offset 值：車輛停得離路口更遠，更安全但可能影響流量
 * - 減少 offset 值：車輛停得更接近路口，提高路口使用效率
 * - 調整後建議在不同方向都測試車輛停車行為
 */
export const stopLineConfig = {
  // 🎯 中央參考矩形設定（對應 IndexPage.vue 中的 .central-reference）
  centralReference: {
    // 📏 矩形尺寸（與 IndexPage.vue 中的 CSS 保持一致）
    width: 225, // 對應 CSS: width: 225px
    height: 225, // 對應 CSS: height: 225px

    // 🎨 視覺樣式設定
    borderStyle: '1px dashed #cccccc', // 虛線淺灰色邊框
    opacity: 1, // 透明度（1=完全可見，0=完全透明）
  },

  // 🛑 各方向停止線偏移設定（相對於中央矩形邊界的像素偏移）
  directionOffsets: {
    // ➡️ 東向車輛停止線（停在路口左側邊界）
    east: {
      offsetX: 0, // X軸偏移：0 表示直接停在中央矩形左邊界
      offsetY: null, // 東西向車輛不需要 Y 軸偏移
      description: '東向車輛停在中央路口左邊界，車頭不可越過此線',
    },

    // ⬅️ 西向車輛停止線（停在路口右側邊界）
    west: {
      offsetX: 0, // X軸偏移：0 表示直接停在中央矩形右邊界
      offsetY: null, // 東西向車輛不需要 Y 軸偏移
      description: '西向車輛停在中央路口右邊界，車頭不可越過此線',
    },

    // ⬇️ 南向車輛停止線（停在路口上側邊界）
    south: {
      offsetX: null, // 南北向車輛不需要 X 軸偏移
      offsetY: -10, // Y軸偏移：0 表示車頭停在矩形上邊界
      description: '南向車輛停在中央路口上邊界，車頭不可越過此線',
    },

    // ⬆️ 北向車輛停止線（停在路口下側邊界）
    north: {
      offsetX: null, // 南北向車輛不需要 X 軸偏移
      offsetY: -10, // Y軸偏移：0 表示車頭停在矩形下邊界
      description: '北向車輛停在中央路口下邊界，車頭不可越過此線',
    },
  },

  // 🔧 停止線檢測靈敏度設定
  detection: {
    // 📏 車頭位置檢測精度（像素）
    headPositionTolerance: 2, // 車頭位置計算的容錯範圍

    // ⚡ 停止線觸發靈敏度
    triggerSensitivity: 1, // 距離停止線多少像素內觸發停車邏輯

    // 🛡️ 防抖動設定
    stabilizationTime: 100, // 車輛在停止線區域需穩定多少毫秒才確認停車
  },

  // 📊 停止線狀態顯示設定（調試用）
  debug: {
    showStopLines: false, // 是否在畫面上顯示停止線標記
    showVehicleHead: false, // 是否顯示車輛車頭位置標記
    logStopLineEvents: false, // 是否在控制台記錄停止線事件
    stopLineColor: '#ff0000', // 停止線標記顏色（調試時使用）
    headMarkerColor: '#00ff00', // 車頭標記顏色（調試時使用）
  },
}
