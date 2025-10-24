// 在瀏覽器 Console 中執行此代碼，檢查實際發送的數據
// 1. 找到 sendDataToBackend 函數的調用
// 2. 在 fetch 前添加詳細的日誌

// 檢查 window.currentGeneratedVDData 的結構
console.log('=== 檢查前端生成的數據結構 ===')
console.log('window.currentGeneratedVDData:', window.currentGeneratedVDData)

// 檢查 apiVDData 的類型和內容
if (window.currentGeneratedVDData?.apiVDData) {
  const data = window.currentGeneratedVDData.apiVDData
  console.log('apiVDData 類型:', Array.isArray(data) ? '陣列' : '物件')
  console.log('apiVDData 內容:', data)

  if (Array.isArray(data)) {
    console.log('陣列長度:', data.length)
    console.log('第一筆數據:', data[0])
  } else {
    console.log('這是單筆物件')
  }
}

// 檢查 collectIntersectionData 返回的數據
console.log('=== 檢查本地收集的數據結構 ===')
// 注：這個需要在交通控制器中執行
