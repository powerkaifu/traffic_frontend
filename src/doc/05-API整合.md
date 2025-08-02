# API 整合說明

## 🔗 API 架構概覽

本系統採用前後端分離架構，前端負責交通模擬和視覺化，後端提供 AI 驅動的智能決策。兩者透過標準化的 REST API 進行通訊。

## 📡 通訊協議

### HTTP 協議規範

- **協議**：HTTP/HTTPS
- **方法**：POST（主要用於數據提交）
- **格式**：JSON
- **編碼**：UTF-8
- **超時**：5000ms

### API 端點配置

```javascript
const API_CONFIG = {
  baseURL: process.env.VUE_APP_API_BASE_URL || 'http://localhost:8000',
  endpoints: {
    trafficControl: '/api/traffic/control',
    dataAnalysis: '/api/traffic/analysis',
    optimization: '/api/traffic/optimize',
  },
  timeout: 5000,
  retryAttempts: 3,
}
```

## 📤 數據輸出格式

### 標準交通數據格式（VD Format）

系統向 AI 後端發送的標準數據格式：

```javascript
const intersectionData = {
  // 時間戳記
  timestamp: 1703872800000,

  // 車輛分佈數據（按方向和類型統計）
  vehicles: {
    north: {
      motor: 2, // 機車數量
      small: 5, // 小型車數量
      large: 1, // 大型車數量
    },
    south: {
      motor: 1,
      small: 3,
      large: 0,
    },
    east: {
      motor: 3,
      small: 4,
      large: 2,
    },
    west: {
      motor: 0,
      small: 2,
      large: 1,
    },
  },

  // 當前燈號狀態
  currentLights: {
    north: 'green',
    south: 'green',
    east: 'red',
    west: 'red',
  },

  // 場景類型
  scene: '一般',

  // 額外統計資訊
  statistics: {
    totalVehicles: 18,
    averageWaitTime: 15.5,
    throughput: 45,
    congestionLevel: 'low',
  },
}
```

### 車輛類型映射

```javascript
const VEHICLE_TYPE_MAPPING = {
  // 前端類型 → 後端 VD 格式
  small: 'small', // 小型車（乘用車、計程車）
  motor: 'motor', // 機車、摩托車
  large: 'large', // 大型車（公車、卡車）
}
```

### 方向對應關係

```javascript
const DIRECTION_MAPPING = {
  top: 'north', // 上方 → 北向
  bottom: 'south', // 下方 → 南向
  left: 'west', // 左方 → 西向
  right: 'east', // 右方 → 東向
}
```

## 📥 數據輸入格式

### AI 決策回應格式

後端 AI 系統回傳的燈號控制建議：

```javascript
const aiResponse = {
  // 回應狀態
  status: 'success',

  // 建議的燈號狀態
  recommendedLights: {
    north: 'red',
    south: 'red',
    east: 'green',
    west: 'green',
  },

  // 建議的持續時間（秒）
  duration: 30,

  // AI 決策信心度（0-1）
  confidence: 0.85,

  // 預期效果
  expectedImprovement: {
    waitTimeReduction: 15, // 等待時間減少百分比
    throughputIncrease: 8, // 通過量增加百分比
    congestionReduction: 12, // 擁堵減少百分比
  },

  // 決策原因
  reasoning: '東西向車流密度較高，建議優先通行',

  // 時間戳記
  timestamp: 1703872830000,
}
```

### 錯誤回應格式

```javascript
const errorResponse = {
  status: 'error',
  error: {
    code: 'INVALID_DATA',
    message: '車輛數據格式不正確',
    details: 'vehicles.north.motor 必須為非負整數',
  },
  timestamp: 1703872800000,
}
```

## 🔄 API 調用流程

### 1. 數據收集階段

```javascript
// TrafficLightController.js
collectIntersectionData() {
    const vehicleData = {};

    // 統計各方向車輛
    ['north', 'south', 'east', 'west'].forEach(direction => {
        vehicleData[direction] = { motor: 0, small: 0, large: 0 };

        this.vehicles.forEach(vehicle => {
            if (vehicle.direction === direction && vehicle.currentState === 'waiting') {
                vehicleData[direction][vehicle.type]++;
            }
        });
    });

    return {
        timestamp: Date.now(),
        vehicles: vehicleData,
        currentLights: this.getCurrentLightStates(),
        scene: '一般'
    };
}
```

### 2. API 請求發送

```javascript
async sendDataToAI() {
    try {
        const data = this.collectIntersectionData();

        const response = await axios.post(
            `${API_CONFIG.baseURL}${API_CONFIG.endpoints.trafficControl}`,
            data,
            {
                timeout: API_CONFIG.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Version': '1.0.0'
                }
            }
        );

        if (response.data.status === 'success') {
            this.handleAIResponse(response.data);
        } else {
            this.handleAPIError(response.data.error);
        }
    } catch (error) {
        this.handleNetworkError(error);
    }
}
```

### 3. 回應處理

```javascript
handleAIResponse(aiResponse) {
    // 驗證回應格式
    if (!this.validateAIResponse(aiResponse)) {
        console.error('AI 回應格式無效');
        return;
    }

    // 應用燈號建議
    if (aiResponse.confidence > 0.7) {
        this.updateTrafficLights(aiResponse.recommendedLights);
        this.scheduleNextSwitch(aiResponse.duration * 1000);
    }

    // 記錄決策資訊
    this.logDecision(aiResponse);
}
```

## 🛡️ 錯誤處理機制

### 網路連線錯誤

```javascript
handleNetworkError(error) {
    console.error('API 連線錯誤:', error.message);

    // 自動重試機制
    if (this.retryCount < API_CONFIG.retryAttempts) {
        this.retryCount++;
        setTimeout(() => {
            this.sendDataToAI();
        }, 2000 * this.retryCount);
    } else {
        // 切換到本地模式
        this.switchToLocalMode();
    }
}
```

### 數據驗證錯誤

```javascript
validateIntersectionData(data) {
    // 檢查必要欄位
    if (!data.timestamp || !data.vehicles || !data.currentLights) {
        return false;
    }

    // 檢查車輛數據格式
    for (const direction of ['north', 'south', 'east', 'west']) {
        const vehicleData = data.vehicles[direction];
        if (!vehicleData || typeof vehicleData !== 'object') {
            return false;
        }

        for (const type of ['motor', 'small', 'large']) {
            if (typeof vehicleData[type] !== 'number' || vehicleData[type] < 0) {
                return false;
            }
        }
    }

    return true;
}
```

## 📊 API 效能監控

### 回應時間監控

```javascript
class APIMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      errorCount: 0,
      lastResponseTime: 0,
    }
  }

  recordRequest(startTime, success) {
    const responseTime = Date.now() - startTime

    this.metrics.requestCount++
    this.metrics.totalResponseTime += responseTime
    this.metrics.lastResponseTime = responseTime

    if (!success) {
      this.metrics.errorCount++
    }

    // 報告效能指標
    if (this.metrics.requestCount % 10 === 0) {
      this.reportMetrics()
    }
  }

  getAverageResponseTime() {
    return this.metrics.totalResponseTime / this.metrics.requestCount
  }
}
```

### 數據品質監控

```javascript
monitorDataQuality(data) {
    const quality = {
        completeness: this.checkDataCompleteness(data),
        accuracy: this.checkDataAccuracy(data),
        freshness: this.checkDataFreshness(data),
        consistency: this.checkDataConsistency(data)
    };

    const overallScore = Object.values(quality).reduce((a, b) => a + b) / 4;

    if (overallScore < 0.8) {
        console.warn('數據品質偏低:', quality);
    }

    return quality;
}
```

## 🔧 配置與部署

### 環境配置

```javascript
// .env.development
VUE_APP_API_BASE_URL=http://localhost:8000
VUE_APP_API_TIMEOUT=5000
VUE_APP_RETRY_ATTEMPTS=3

// .env.production
VUE_APP_API_BASE_URL=https://api.traffic-ai.com
VUE_APP_API_TIMEOUT=3000
VUE_APP_RETRY_ATTEMPTS=2
```

### CORS 配置

```javascript
// 後端 CORS 設定
const corsOptions = {
  origin: ['http://localhost:9000', 'https://traffic-sim.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Client-Version'],
  credentials: true,
}
```

這個 API 整合設計確保了前後端的高效通訊，同時提供了完善的錯誤處理和效能監控機制，為系統的穩定運行提供了可靠保障。
