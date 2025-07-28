<template>
  <q-page class="simulation-page">
    <!-- 十字路口場景模擬頁面內容 -->
    <div class="crossroad-area">
      <div class="road-label">
        <div class="road-label-bg"></div>
      </div>

      <!-- 四個轉角的紅綠燈 -->
      <!-- RoadA 往東 -->
      <div class="traffic-light bottom-left">
        <img src="/images/light/greenLight.png" alt="往東" />
      </div>
      <!-- RoadB 往西 -->
      <div class="traffic-light top-right">
        <img src="/images/light/greenLight.png" alt="往西" />
      </div>
      <!-- RoadC 往南 -->
      <div class="traffic-light top-left">
        <img src="/images/light/redLight.png" alt="往南" />
      </div>
      <!-- RoadB 往北 -->
      <div class="traffic-light bottom-right">
        <img src="/images/light/redLight.png" alt="往北" />
      </div>
      <!-- lumo 小機器人助手 -->
      <div class="robot-assistant">
        <img src="/images/lumo.png" alt="機器人助手" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
// 十字路口場景模擬頁面的邏輯
console.log('十字路口場景模擬頁面已載入')
</script>

<style scoped>
.simulation-page {
  /* padding: 20px; */
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 十字路口背景 */
.crossroad-area {
  width: 100%;
  height: calc(100vh - 110px);
  background-image: url('/images/crossroad.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 8px;
  position: relative;
}

/* 路標背景 ------------------------------------------------- */
.road-label {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, rgba(35, 80, 150, 1), rgba(35, 30, 100, 1));
  border-radius: 20px;
  border: 1px solid rgb(63, 117, 205);
  position: relative;
  top: 5%;
  left: 10%;
  box-shadow: 0 0 20px rgb(30, 30, 100);
}

.road-label::before {
  content: '模擬路口';
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translate(-50%, 0);
  color: rgb(200, 200, 200);
  border-radius: 20px;
}

.road-label-bg {
  width: 90%;
  height: 90%;
  background-image: url('/images/roadLabel.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 紅綠燈定位 ------------------------------------------------- */
.traffic-light {
  position: absolute;
  width: 85px;
  height: 50px;
}

.traffic-light img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 四個轉角的紅綠燈位置 */
/* RoadA 往東 */
.traffic-light.bottom-left {
  top: 50%;
  left: 50%;
  transform: translate(-220%, 290%) rotate(90deg);
}
.traffic-light.bottom-left::before {
  content: 'RoadA 往東 ➡️';
  width: 150px;
  font-size: 1.2rem;
  color: white;
  transform: translateX(-50%) rotate(270deg);
  position: absolute;
  top: 180%;
  left: 15%;
}

/* RoadB 往西 */
.traffic-light.top-right {
  top: 50%;
  right: 50%;
  transform: translate(220%, -390%) rotate(90deg);
}
.traffic-light.top-right::before {
  content: 'RoadB 往西 ⬅️';
  width: 150px;
  font-size: 1.2rem;
  color: white;
  transform: translateX(-50%) rotate(270deg);
  position: absolute;
  top: -180%;
  left: 85%;
}

/* RoadC 往南 */
.traffic-light.top-left {
  top: 50%;
  left: 50%;
  transform: translate(-250%, -340%);
}
.traffic-light.top-left::before {
  content: 'RoadC 往南 ⬇️';
  width: 150px;
  font-size: 1.2rem;
  color: white;
  transform: translateX(-50%);
  position: absolute;
  top: -60%;
  left: 40%;
}

/* RoadD 往北 */
.traffic-light.bottom-right {
  left: 50%;
  top: 50%;
  transform: translate(150%, 240%);
}
.traffic-light.bottom-right::before {
  content: 'RoadD 往北 ⬆️';
  width: 150px;
  font-size: 1.2rem;
  color: white;
  transform: translateX(-50%);
  position: absolute;
  top: 100%;
  left: 90%;
}

/* 小機器人助手 ------------------------------------------------- */
.robot-assistant {
  position: absolute;
  bottom: 0;
  left: 10%;
  width: 150px;
  height: 150px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.robot-assistant img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.robot-assistant:hover {
  transform: scale(1.1);
}
</style>
