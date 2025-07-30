# Car.js 使用說明

## 功能概述

Car.js 是一個使用 GSAP 動畫庫實現的車輛類別，支援：

- 四種車輛類型：機車(M)、小型車(S)、大型車(L)、聯結車(T)
- 四個移動方向：東(east)、西(west)、南(south)、北(north)
- 平滑的 GSAP 動畫移動
- 淡入淡出效果
- 車輛管理功能

## 基本使用方法

### 1. 創建車輛

```javascript
import Car from './classes/Car.js'

const car = new Car({
  id: 'car1',
  laneID: 1,
  direction: 'east',
  position: { x: -50, y: 300 },
  speed: 40,
  type: 'S',
})
```

### 2. 添加到頁面

```javascript
const container = document.querySelector('.crossroad-area')
car.addToContainer(container)
```

### 3. 移動車輛

```javascript
// 移動到指定位置
await car.moveTo({ x: 650, y: 300 }, 5) // 5秒移動到目標位置

// 停止移動
car.stop()

// 繼續移動
car.resume()
```

## 在 IndexPage.vue 中的使用

### 控制面板功能

- **生成小車**：在東向創建一輛小型車
- **生成機車**：在西向創建一輛機車
- **生成大車**：在南向創建一輛大型車
- **批量生成**：一次生成多輛隨機車輛
- **自動模式**：持續自動生成車輛
- **清除所有**：移除所有車輛

### 瀏覽器控制台命令

打開瀏覽器開發者工具，在控制台中可以使用：

```javascript
// 創建單輛車
carTest.createCar('east', 'S') // 東向小車
carTest.createCar('west', 'M') // 西向機車
carTest.createCar('south', 'L') // 南向大車
carTest.createCar('north', 'T') // 北向聯結車

// 批量創建
carTest.createMultiple(5) // 創建5輛隨機車輛

// 自動模式
carTest.startAuto() // 開始自動生成
carTest.stopAuto() // 停止自動生成

// 清除
carTest.clear() // 清除所有車輛
```

## 車輛參數說明

### 車輛類型 (type)

- `'M'`: 機車 - 25x15px, 最高速度70km/h
- `'S'`: 小型車 - 35x20px, 最高速度80km/h
- `'L'`: 大型車 - 50x25px, 最高速度60km/h
- `'T'`: 聯結車 - 60x30px, 最高速度50km/h

### 移動方向 (direction)

- `'east'`: 往東 (從左到右)
- `'west'`: 往西 (從右到左)
- `'south'`: 往南 (從上到下)
- `'north'`: 往北 (從下到上)

### 位置坐標 (position)

- `{ x: number, y: number }` - 像素坐標
- 路口中心約為 `{ x: 300, y: 300 }`

#### 往東方向車道位置 (已測試確認)

| 車道     | CSS位置     | X座標 | Y座標 |
| -------- | ----------- | ----- | ----- |
| 第一車道 | top: 52%    | 100   | 255   |
| 第二車道 | top: 55.5%  | 100   | 282   |
| 第三車道 | top: 59%    | 100   | 309   |
| 第四車道 | top: 62.25% | 100   | 335   |

**往東車道設定：**

- 起始X座標：100 (西側起點)
- 目標X座標：650 (東側終點)
- 車道間距：約 27-28 像素
- 移動方向：從左到右

## 動畫效果

### 移動動畫

- 使用 GSAP 的 `gsap.to()` 實現平滑移動
- 支援自定義緩動函數 (ease)
- 可調整移動時間 (duration)

### 視覺效果

- **淡入**: `car.fadeIn()` - 車輛出現時的放大淡入效果
- **淡出**: `car.fadeOut()` - 車輛消失時的縮小淡出效果
- **閃爍**: `car.blink()` - 可用於警示效果

## 注意事項

1. **GSAP 依賴**: 確保已安裝 `npm install gsap`
2. **容器需求**: 車輛需要添加到有定位的容器中
3. **性能考量**: 大量車輛時注意清理已離開的車輛
4. **圖片資源**: 確保 `/images/car/` 目錄下有對應的車輛圖片

## 擴展功能

可以進一步擴展的功能：

- 車輛碰撞檢測
- 紅綠燈停車邏輯
- 車道變換動畫
- 轉彎動畫
- 車速變化效果
- 車輛跟隨邏輯
