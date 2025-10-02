# 停止线对齐问题修复说明

## 问题描述
车辆在遇到红灯停止时，无法精确对齐停止线，停车位置不准确。

## 根本原因分析

1. **检测灵敏度过低**
   - 原设置：`SENSITIVITY: 2px`
   - 问题：车辆动画更新频率可能跳过 2px 的检测范围
   
2. **停车位置计算不精确**
   - 原方法：直接暂停动画，不调整位置
   - 问题：车辆停在触发检测的位置，不是精确的停止线位置

3. **目标位置有偏移**
   - 原设置：停止线前 5px
   - 问题：车辆总是停在停止线前 5px，而不是刚好对齐

## 解决方案

### 修改 1: 增加新方法 `alignToStopLine()`
**文件**: `src/classes/vehicle_utils/StopLineController.js`

新增方法用于精确计算并调整车辆位置：

```javascript
alignToStopLine() {
  const stopLine = this.getStopLinePosition()
  if (!stopLine.x && !stopLine.y) return false

  const currentPos = this.vehicle.getCurrentPosition()
  const vehicleConfig = this.vehicle.getVehicleConfig()
  const size = { width: vehicleConfig.width, height: vehicleConfig.height }

  // 計算車輛應該停在的位置（車輛左上角座標）
  let targetX = currentPos.x
  let targetY = currentPos.y

  switch (this.vehicle.direction) {
    case 'east':
      // 東向：車頭（右側）應該對齊停止線
      targetX = stopLine.x - size.width
      break
    case 'west':
      // 西向：車頭（左側）應該對齊停止線
      targetX = stopLine.x
      break
    case 'north':
      // 北向：車頭（上方）應該對齊停止線
      targetY = stopLine.y
      break
    case 'south':
      // 南向：車頭（下方）應該對齊停止線
      targetY = stopLine.y - size.height
      break
  }

  // 使用 GSAP 平滑地調整到精確位置
  const gsap = window.gsap
  if (gsap) {
    gsap.to(this.vehicle.element, {
      x: targetX,
      y: targetY,
      duration: 0.1,
      ease: 'power2.out',
    })
    return true
  }

  return false
}
```

**关键点**：
- 根据车辆方向和尺寸，精确计算车辆左上角应该在的位置
- 使用 GSAP 平滑动画（0.1秒）调整到目标位置
- 确保车头（而非车辆中心或左上角）精确对齐停止线

### 修改 2: 更新 `stopMovement()` 方法
**文件**: `src/classes/Vehicle.js`

在停车时调用对齐方法：

```javascript
stopMovement() {
  if (this.movementTimeline) {
    // 暫停動畫
    this.movementTimeline.pause()

    // 精確對齊到停止線位置
    if (this.stopLineController) {
      this.stopLineController.alignToStopLine()
    }

    if (this.currentState !== 'waitingForVehicle' && this.currentState !== 'waiting') {
      this.currentState = 'waiting'
    }

    // 標記已經到達停止線
    this.isAtStopLine = true
  }
}
```

**改进**：
- 停车后立即调用 `alignToStopLine()` 方法
- 确保每次停车都能精确对齐

### 修改 3: 优化配置参数
**文件**: `src/classes/config/stopLineConfig.js`

```javascript
export const STOP_LINE_CONFIG = {
  DETECTION: {
    SENSITIVITY: 10, // 提高到 10px，确保能检测到
    ADJUSTMENT_THRESHOLD: 0.5,
  },

  TARGET_POSITION: {
    EAST: 0,  // 改为 0，精确对齐
    WEST: 0,  // 改为 0，精确对齐
    NORTH: 0, // 改为 0，精确对齐
    SOUTH: 0, // 改为 0，精确对齐
  },
  // ...
}
```

**改进**：
- `SENSITIVITY` 从 2px 提高到 10px，提高检测可靠性
- `TARGET_POSITION` 从 5px 改为 0px，实现精确对齐

## 工作原理

### 停车流程：

1. **检测阶段** (10px 范围内)
   ```
   车辆行驶 → 距离停止线 10px → shouldStopAtLine() 返回 true
   ```

2. **停止阶段**
   ```
   stopMovement() 被调用 → movementTimeline.pause()
   ```

3. **对齐阶段**
   ```
   alignToStopLine() 被调用 → 计算精确位置 → GSAP 动画调整
   ```

4. **最终结果**
   ```
   车头精确对齐停止线（误差 < 0.5px）
   ```

### 各方向的对齐计算：

```
东向 (→): targetX = stopLine.x - vehicleWidth
西向 (←): targetX = stopLine.x
北向 (↑): targetY = stopLine.y
南向 (↓): targetY = stopLine.y - vehicleHeight
```

## 预期效果

1. ✅ 车辆在距离停止线 10px 时开始检测
2. ✅ 停车后自动调整到精确位置
3. ✅ 车头刚好对齐停止线（0px 偏移）
4. ✅ 使用平滑动画避免突兀跳跃
5. ✅ 适用于所有方向（东、西、南、北）

## 测试建议

1. **基本对齐测试**
   - 启动项目观察车辆停车
   - 检查车头是否精确对齐停止线

2. **多方向测试**
   - 测试东、西、南、北四个方向
   - 确认所有方向都能精确对齐

3. **多车道测试**
   - 测试车道 1-4
   - 确认不同车道的车辆都能对齐

4. **不同车型测试**
   - 测试 large、small、motor 三种车型
   - 确认不同尺寸的车辆都能正确对齐

## 如何启动测试

```bash
cd D:\01.Project\traffic\traffic_project\frontend\traffic
npm run dev
# 或
quasar dev
```

浏览器访问: `http://localhost:9000`

## 可能的调整

如果停车位置仍需微调，可以调整以下参数：

1. **检测灵敏度** (`stopLineConfig.js`)
   ```javascript
   SENSITIVITY: 10, // 增加此值可更早检测，减少可更晚检测
   ```

2. **调整动画时长** (`StopLineController.js`)
   ```javascript
   duration: 0.1, // 增加时长使对齐更平滑，减少使对齐更快速
   ```

3. **停车偏移** (`stopLineConfig.js`)
   ```javascript
   TARGET_POSITION: {
     EAST: 0,  // 可设置为负值（提前停车）或正值（延后停车）
     // ...
   }
   ```

## 技术细节

- **坐标系统**: 使用车辆元素左上角作为定位参考点
- **动画库**: 使用 GSAP 进行位置调整动画
- **精度**: 计算精度到小数点，GSAP 处理亚像素定位
- **性能**: 0.1秒的调整动画不影响整体性能

## 修改文件清单

1. ✅ `src/classes/vehicle_utils/StopLineController.js`
2. ✅ `src/classes/Vehicle.js`
3. ✅ `src/classes/config/stopLineConfig.js`

---

修复完成时间: 2025-01-03
版本: v1.0
