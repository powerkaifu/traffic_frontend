# Quasar App (traffic)

A Quasar Project

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

# AI 智慧交通控制信號

Quasar 框架為基礎，使用 Vue 3、JavaScript 開發，
模擬一個十字路口交通信號燈的控制系統，
根據實時交通流量自動調整紅綠燈的時長，以達到最佳的通行效率，
每當紅燈倒數到十秒時，可以收集四個路口的 VD（Vehicle Detection）數據，將數據傳給後端，
後端會根據模型計算出最佳綠燈秒數返回前端。

我目前知道有紅綠燈、車子類別，我需要再增加一個路口控制器類別來管理這些角色的行為嗎？

我想根據以下數據先規劃紅綠燈、車子的類別，先幫我定義這些類別的基本屬性和方法。

- 格式如下：

```json
// 南京東路有兩支 VD_ID 監測東、西向車流量
// 松江路只有一支 VD_ID 監測南、北向車流量
roadData = [
	// 南京東路(往東)
	// VD_ID: VLRJX20
	// LinkID: 6001190200010A
	{
		VD_ID: 'VLRJX20',
		DayOfWeek: 1, // 星期一
		Hour: 18, // 小時
		Minute: 0, // 分鐘
		Second: 0, // 秒
		IsPeakHour: 1, // 是否尖峰時段
		LaneID: 0, // 車道ID
		LaneType: 1, // 車道類型
		Speed: 53, // 平均速度(需計算)
		Occupancy: 4, // 佔用率(需計算)
		Volume_M: 1, // 機車數量
		Speed_M: 63, // 機車平均速度(需計算)
		Volume_S: 2, // 小型車數量
		Speed_S: 40, // 小型車平均速度(需計算)
		Volume_L: 0, // 大型車數量
		Speed_L: 0, // 大型車平均速度(需計算)
		Volume_T: 0, // 聯結車數量
		Speed_T: 0 // 聯結車平均速度(需計算)
	},
	// 南京東路(往西)
	// VD_ID: VLRJM60
	// LinkID: 6001190600010A
	{
		VD_ID: 'VLRJM60',
		DayOfWeek: 1,
		Hour: 0,
		Minute: 0,
		Second: 0,
		IsPeakHour: 0,
		LaneID: 0,
		LaneType: 1,
		Speed: 64,
		Occupancy: 5,
		Volume_M: 2,
		Speed_M: 53,
		Volume_S: 3,
		Speed_S: 45,
		Volume_L: 0,
		Speed_L: 0,
		Volume_T: 0,
		Speed_T: 0
	},
	// 松江路(往南)
	// VD_ID: VLRJX00
	// LinkID: 6004930400060A
	{
		VD_ID: 'VLRJX00',
		DayOfWeek: 1,
		Hour: 0,
		Minute: 0,
		Second: 0,
		IsPeakHour: 0,
		LaneID: 0,
		LaneType: 1,
		Speed: 0,
		Occupancy: 0,
		Volume_M: 0,
		Speed_M: 0,
		Volume_S: 0,
		Speed_S: 0,
		Volume_L: 0,
		Speed_L: 0,
		Volume_T: 0,
		Speed_T: 0
	},
	// 松江路(往北)
	// VD_ID: VLRJX00
	// LinkID: 6004930000080A
	{
		VD_ID: 'VLRJX00',
		DayOfWeek: 1,
		Hour: 0,
		Minute: 0,
		Second: 0,
		IsPeakHour: 0,
		LaneID: 0,
		LaneType: 1,
		Speed: 0,
		Occupancy: 0,
		Volume_M: 0,
		Speed_M: 0,
		Volume_S: 0,
		Speed_S: 0,
		Volume_L: 0,
		Speed_L: 0,
		Volume_T: 0,
		Speed_T: 0
	}
]
```

我目前想到十字路口的角色有車子、紅綠燈，需要路口控制器來管理這些角色的行為嗎？
還有 VD 數據我也是要用路口控制器來產生分配給各個車子嗎？

- 十字路口分為東、西、南、北四個車道，每個車道有紅綠燈控制。
- 紅綠燈會有時相，紅燈、綠燈、黃燈變化。
- 車子會根據紅綠燈的狀態行駛或停下。
- 出子會偵測彼此間的距離停下，避免碰撞。
