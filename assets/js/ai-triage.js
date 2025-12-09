// ======================
// 1. 全域變數
// ======================
let recognition = null;
let isListening = false;
let ttsEnabled = true;

let pendingText = null;
let sessionTranscript = "";

// ⭐⭐ NEW：語音即時預覽泡泡元素 ⭐⭐
const previewBubble = document.getElementById("previewBubble");
const micBtn = document.getElementById("micBtn");
const micIconMic = document.getElementById("micIconMic");
const micIconStop = document.getElementById("micIconStop");

const statusText = document.getElementById("statusText");
const fakeWave = document.getElementById("fakeWave");
const chatScroller = document.getElementById("chatScroller");
const resetBtn = document.getElementById("resetBtn");
const sendBtn = document.getElementById("sendBtn");
const muteBtn = document.getElementById("muteBtn");
const quickTagButtons = document.querySelectorAll(".quick-tag-btn");
const welcomeTimeSpan = document.getElementById("welcomeTime");
const usageTip = document.getElementById("usageTip");
const closeTipBtn = document.getElementById("closeTipBtn");
const modeTag = document.getElementById("modeTag");
const recordHint = document.getElementById("recordHint");

// ======================
// 0. 共用字串換行：綠色匡匡每行 17 字
// ======================
function formatUserText(text, max = 17) {
  if (!text) return "";
  let result = "";
  let count = 0;

  for (const ch of text) {
    result += ch;
    count++;
    if (count === max) {
      result += "\n";
      count = 0;
    }
  }
  return result;
}

// ⭐⭐ 把預覽泡泡放進「靠右的列」裡，之後錄音時會加到聊天最底部 ⭐⭐
let previewRow = null;
if (previewBubble) {
  previewRow = document.createElement("div");
  previewRow.classList.add("chat-bubble-row");
  previewRow.style.display = "flex";
  previewRow.style.justifyContent = "flex-end"; // 讓預覽訊息貼齊右邊
  previewRow.appendChild(previewBubble);
}

// 歡迎時間
if (welcomeTimeSpan) {
  welcomeTimeSpan.textContent = new Date().toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

if (fakeWave) fakeWave.classList.remove("active");

function setBottomButtonsEnabled(enabled) {
  resetBtn.disabled = !enabled;
  sendBtn.disabled = !enabled;
}

setBottomButtonsEnabled(false);

// ======================
// 2. 初始化語音辨識
// ======================
function initSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    statusText.textContent = "此瀏覽器不支援語音辨識，請使用 Chrome。";
    micBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "zh-TW";
  recognition.continuous = true;
  recognition.interimResults = true;

  // ===== 開始錄音 =====
  recognition.addEventListener("start", () => {
    document.body.classList.add("listening-mode");
    isListening = true;
    startWave();
    sessionTranscript = "";
    pendingText = null;

    // 開始錄音 → 顯示預覽泡泡，並把整列移到聊天最底部
    if (previewBubble && previewRow && chatScroller) {
      previewBubble.classList.remove("hidden");
      previewBubble.textContent = formatUserText("正在聆聽…");
      chatScroller.appendChild(previewRow);
    }

    micBtn.classList.add("listening");

    // 錄音時：顯示 ■
    micIconMic.classList.add("hidden");
    micIconStop.classList.add("hidden");
    document.getElementById("micSquare").classList.remove("hidden");

    if (recordHint) recordHint.textContent = "錄音中 再按一下即可暫停";

    if (modeTag) {
      modeTag.textContent = "聲音模式 聆聽中";
      modeTag.classList.add("listening");
    }

    if (fakeWave) fakeWave.classList.add("active");

    setBottomButtonsEnabled(true);
    //  scrollToBottom();// 開始錄音時自動捲到底（整頁）
  });

  // ===== 停止錄音 =====
  recognition.addEventListener("end", () => {
    isListening = false;
    stopWave();

    // 停止錄音後，預覽泡泡保留（顯示最後聽到的內容）
    micBtn.classList.remove("listening");
    document.getElementById("micSquare").classList.add("hidden");
    micIconStop.classList.add("hidden");
    micIconMic.classList.remove("hidden");

    if (modeTag) {
      modeTag.textContent = "聲音模式";
      modeTag.classList.remove("listening");
    }
    if (fakeWave) fakeWave.classList.remove("active");

    if (!pendingText) {
      setBottomButtonsEnabled(false);
      if (recordHint) recordHint.textContent = "點擊即可說話";
    }
  });

  // ===== 語音辨識錯誤 =====
  recognition.addEventListener("error", (event) => {
    console.error("Speech recognition error:", event);

    isListening = false;
    micBtn.classList.remove("listening");

    micIconStop.classList.add("hidden");
    micIconMic.classList.remove("hidden");

    if (fakeWave) fakeWave.classList.remove("active");
    if (modeTag) {
      modeTag.textContent = "聲音模式";
      modeTag.classList.remove("listening");
    }

    statusText.textContent = "語音辨識發生問題，請再試一次。";

    if (previewBubble) previewBubble.classList.add("hidden");

    clearPending();
  });

  // ===== 語音結果（即時更新）=====
  recognition.addEventListener("result", (event) => {
    let interimText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];

      if (res.isFinal) {
        const piece = res[0].transcript.trim();
        if (piece) sessionTranscript += (sessionTranscript ? " " : "") + piece;
      } else {
        interimText = res[0].transcript;
      }
    }

    pendingText = sessionTranscript || interimText.trim();

    if (pendingText) {
      statusText.textContent = pendingText;

      // 即時更新預覽泡泡內容，並維持在最底部（每行 17 字）
      if (previewBubble && previewRow && chatScroller) {
        previewBubble.textContent = formatUserText(pendingText);
        chatScroller.appendChild(previewRow);
      }

      // scrollToBottom(); // 每次更新語音預覽時就捲到最下面
    }

    if (recordHint) recordHint.textContent = "確認內容後按傳送鍵";
  });
}

// ======================
// 2-2. 動態波
// ======================
const bars = document.querySelectorAll(".bar");
const soundWave = document.getElementById("soundWave");

let isTalking = false;
let barInterval = null;

function startWave() {
  if (isTalking) return;
  isTalking = true;

  soundWave.classList.add("active");

  barInterval = setInterval(() => {
    bars.forEach((bar) => {
      bar.style.height = `${Math.random() * 100}%`;
    });
  }, 120);
}

function stopWave() {
  isTalking = false;
  soundWave.classList.remove("active");
  clearInterval(barInterval);

  bars.forEach((bar) => {
    bar.style.height = "20%";
    bar.style.backgroundColor = "";
  });
}

// ======================
// 3. 聊天泡泡
// ======================
function addChatBubble(role, text, extraButtons = []) {
  const row = document.createElement("div");
  row.classList.add("chat-bubble-row");
  row.style.display = "flex";
  row.style.justifyContent = role === "user" ? "flex-end" : "flex-start";

  const container = document.createElement("div");

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble");
  bubble.classList.add(role === "user" ? "bubble-user" : "bubble-ai");

  // 使用者（綠匡匡）強制每行 17 字
  const bubbleText = role === "user" ? formatUserText(text) : text;
  bubble.textContent = bubbleText;

  const timeSpan = document.createElement("div");
  timeSpan.classList.add("chat-time");
  timeSpan.textContent = new Date().toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 時間依角色對齊：
  // 使用者訊息 → 貼在綠匡匡那一側（靠右）
  // AI 訊息 → 靠左
  if (role === "user") {
    timeSpan.style.textAlign = "right";
  } else {
    timeSpan.style.textAlign = "left";
  }

  container.appendChild(bubble);
  container.appendChild(timeSpan);

  if (extraButtons.length > 0) {
    const btnWrap = document.createElement("div");
    btnWrap.classList.add("bubble-btn-wrap");

    extraButtons.forEach((btnInfo) => {
      const b = document.createElement("button");
      b.classList.add("bubble-btn");
      b.textContent = btnInfo.label;
      b.addEventListener("click", () => {
        alert("導向至「" + btnInfo.dept + "」醫師掛號頁（待串接）");
      });
      btnWrap.appendChild(b);
    });

    bubble.appendChild(btnWrap); // ★★ 把按鈕塞進 bubble 裡 ★★
  }

  row.appendChild(container);
  chatScroller.appendChild(row);
  scrollToBottom(); // 新增泡泡後捲到底

  if (role === "assistant" && ttsEnabled) speakText(text);

  return row;
}

// ======================
// 聊天區及整頁捲到底
// ======================
function scrollToBottom() {
  if (!chatScroller) return;

  // 捲到聊天容器底部
  chatScroller.scrollTop = chatScroller.scrollHeight;

  // 再把整個畫面也捲到底，避免下一則訊息輸入時畫面停在上面
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth",
  });
}

// ======================
// 4. 文字轉語音
// ======================
function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-TW";

  window.speechSynthesis.speak(utter);
}

// ======================
// 5. 清除
// ======================
function clearPending() {
  pendingText = null;
  sessionTranscript = "";
  setBottomButtonsEnabled(false);

  statusText.textContent = "請說出哪裡不舒服。";

  if (recordHint) recordHint.textContent = "點擊即可說話";

  if (previewBubble) previewBubble.classList.add("hidden");

  window.speechSynthesis.cancel();
}

// ======================
// 6. AI 問診（模擬）
// ======================
async function callGptTriageApi(symptomText) {
  try {
    const mock = simulateTriage(symptomText);

    addChatBubble("assistant", mock.replyText, mock.suggestButtons);
    statusText.textContent = "分析完成，如有其他不適，再點麥克風詢問喔！";
  } catch (err) {
    console.error(err);
    addChatBubble("assistant", "抱歉，目前系統暫時無法分析，請稍後再試。");
    statusText.textContent = "系統忙碌中，請稍後再試一次。";
  }
}

// ======================
// 7. 進階科別判斷（多科別 + 關鍵字）
// ======================
function simulateTriage(text) {
  const raw = text || "";
  const t = raw.toLowerCase();
  const depts = new Set();
  const reasons = [];
  let emergencyFlag = false;

  function addDept(name, reason) {
    if (!depts.has(name)) {
      depts.add(name);
      if (reason) {
        reasons.push(`【${name}】${reason}`);
      }
    }
  }

  const emergencyKeywords = [
    "昏倒",
    "叫不醒",
    "失去意識",
    "喘不過氣",
    "呼吸不順",
    "胸痛劇烈",
    "胸口劇痛",
    "壓迫感",
    "大出血",
    "噴血",
    "吐血",
    "解黑便",
    "說話不清楚",
    "口齒不清",
    "半邊無力",
    "手腳無力突然",
    "突然視力喪失",
  ];
  if (emergencyKeywords.some((k) => t.includes(k))) {
    emergencyFlag = true;
    addDept(
      "急診醫學科",
      "出現意識改變、重度胸痛、呼吸困難、大量出血或突然無力等，屬於可能需要立即處置的狀況。"
    );
  }

  if (
    ["胸悶", "胸痛", "心悸", "心臟", "心跳快", "心跳很快", "心口痛"].some((k) =>
      t.includes(k)
    )
  ) {
    addDept(
      "心臟內科",
      "胸悶、胸痛、心悸、心跳異常等症狀，需排除心絞痛、心律不整等心血管問題。"
    );
  }

  if (
    ["咳嗽", "咳好久", "喘", "呼吸困難", "氣喘", "胸悶", "胸口悶"].some((k) =>
      t.includes(k)
    )
  ) {
    addDept(
      "胸腔內科",
      "久咳、喘、不舒服的胸悶，常與氣管、肺部或慢性阻塞性肺病等有關。"
    );
  }

  if (
    [
      "胃痛",
      "胃悶",
      "胃脹",
      "脹氣",
      "反胃",
      "胃酸",
      "胃食道逆流",
      "拉肚子",
      "腹瀉",
      "便秘",
      "肚子痛",
      "腹痛",
      "吃不下",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "肝膽腸胃內科",
      "胃痛、脹氣、腹瀉、便秘、胃酸逆流等，多與消化道相關，需要腸胃科醫師評估。"
    );
  }

  if (
    [
      "血壓高",
      "血壓",
      "高血壓",
      "糖尿病",
      "血糖",
      "高血糖",
      "高膽固醇",
      "三酸甘油酯",
      "慢性病",
      "慢性疾病",
      "疲倦",
      "沒力氣",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "內科",
      "血壓、血糖、脂肪代謝、長期疲累等，適合由一般內科評估整體身體狀況。"
    );
  }

  if (
    [
      "頭暈",
      "暈眩",
      "頭痛",
      "偏頭痛",
      "麻",
      "手麻",
      "腳麻",
      "走路不穩",
      "站不穩",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "神經內科",
      "頭暈、頭痛、四肢麻木或走路不穩，常與神經系統、血流或血壓變化有關。"
    );
  }

  if (
    [
      "膝蓋痛",
      "膝痛",
      "膝",
      "退化",
      "關節痛",
      "關節",
      "肩膀痛",
      "腰痛",
      "下背痛",
      "骨折",
      "扭到",
      "扭傷",
      "筋",
      "肌腱",
      "腳痛",
      "腳踝痛",
      "腳跟痛",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "骨科",
      "膝蓋、關節、肩頸、腰部或四肢疼痛與外傷，通常由骨科先做影像與關節評估。"
    );
    addDept(
      "復健科",
      "若已知為退化或肌肉筋膜問題，復健科可以協助運動訓練與物理治療。"
    );
  }

  if (
    [
      "全身痠痛",
      "早上僵硬",
      "關節腫",
      "關節腫脹",
      "自體免疫",
      "紅斑狼瘡",
      "類風濕",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "風濕免疫科",
      "多關節腫脹、僵硬或全身性自體免疫相關症狀，需風濕免疫專科評估。"
    );
  }

  if (
    [
      "看不清楚",
      "視力模糊",
      "眼睛痛",
      "眼睛紅",
      "眼睛癢",
      "飛蚊症",
      "閃光",
      "視野缺損",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "眼科",
      "視力模糊、眼睛紅痛或突然看不清楚，都建議由眼科評估是否有急性問題。"
    );
  }

  if (
    [
      "喉嚨痛",
      "鼻塞",
      "流鼻水",
      "耳鳴",
      "耳痛",
      "聽不清楚",
      "中耳炎",
      "鼻涕倒流",
      "打呼",
      "睡覺呼吸中止",
      "聲音沙啞",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "耳鼻喉科",
      "耳朵、鼻子、喉嚨的不適、聲音沙啞或睡覺打呼，建議掛耳鼻喉科檢查。"
    );
  }

  if (
    [
      "紅疹",
      "發疹",
      "癢",
      "皮膚癢",
      "濕疹",
      "蕁麻疹",
      "脫皮",
      "香港腳",
      "灰指甲",
      "皮膚長東西",
      "痣變大",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "皮膚科",
      "紅、腫、癢、起疹子或皮膚長不明突起，適合由皮膚科做初步判斷。"
    );
  }

  if (
    [
      "頻尿",
      "小便痛",
      "尿尿痛",
      "血尿",
      "尿不出來",
      "排尿困難",
      "夜尿",
      "攝護腺",
      "前列腺",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "泌尿科",
      "頻尿、解尿疼痛、尿流變細或血尿，多與尿路感染或攝護腺等泌尿系統相關。"
    );
  }

  if (
    ["腎臟", "腳水腫", "浮腫", "泡泡尿", "蛋白尿", "腎結石"].some((k) =>
      t.includes(k)
    )
  ) {
    addDept(
      "腎臟科",
      "腳容易水腫、尿中有泡泡或被告知腎功能不佳，適合由腎臟專科追蹤。"
    );
  }

  if (
    [
      "甲狀腺",
      "甲狀腺腫",
      "手抖",
      "體重突然增加",
      "體重突然減少",
      "怕冷",
      "怕熱",
      "骨質疏鬆",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "新陳代謝科",
      "甲狀腺、體重變化、骨質疏鬆等多屬於內分泌與代謝相關問題。"
    );
  }

  if (
    [
      "睡不著",
      "失眠",
      "焦慮",
      "緊張",
      "一直胡思亂想",
      "心情低落",
      "憂鬱",
      "想不開",
      "恐慌",
      "被害感",
      "幻覺",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "身心科 / 精神科",
      "長期失眠、焦慮、情緒低落，建議由身心科或精神科協助調整與治療。"
    );
  }

  if (
    [
      "月經不順",
      "經痛",
      "經血很多",
      "陰道分泌物",
      "陰道癢",
      "更年期",
      "懷孕",
      "產後",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "婦產科",
      "與月經、陰道分泌、更年期或懷孕相關問題，建議由婦產科進一步評估。"
    );
  }

  if (
    ["小朋友", "小孩", "兒子", "女兒", "孫子", "孫女"].some((k) =>
      t.includes(k)
    )
  ) {
    addDept(
      "小兒科",
      "若不舒服的是 18 歲以下的小朋友，通常先由小兒科醫師評估。"
    );
  }

  if (
    [
      "牙痛",
      "牙齒痛",
      "牙齦腫",
      "牙周",
      "蛀牙",
      "口腔潰瘍",
      "嘴巴破",
      "咬合不正",
    ].some((k) => t.includes(k))
  ) {
    addDept("牙科", "牙痛、牙齦腫脹、嘴巴常常破皮，多需要牙科或口腔科處理。");
  }

  if (
    [
      "全身不舒服",
      "哪裡都怪怪的",
      "不知道看哪一科",
      "健康檢查",
      "想檢查身體",
    ].some((k) => t.includes(k))
  ) {
    addDept(
      "家醫科",
      "當不確定應該看哪一科，或有多種輕微不適時，可由家醫科做整體評估再轉介。"
    );
  }

  const trimmed = raw.trim();

  if (depts.size === 0 && trimmed.length === 0) {
    return {
      replyText:
        "目前還抓不到明確的症狀描述。\n\n您可以試著說明：\n・哪一個部位不舒服（例如：胸口、肚子、膝蓋、眼睛…）\n・不舒服多久了\n・什麼時候特別明顯（走路、吃東西、睡覺時等等）\n\n我才能幫您建議比較合適的科別。",
      suggestButtons: [
        { label: "先掛一般內科", dept: "內科" },
        { label: "先掛家醫科", dept: "家醫科" },
      ],
    };
  }

  if (depts.size === 0 && trimmed.length > 0) {
    const replyText =
      "目前根據文字內容，還無法很明確地判斷是哪一個專科較合適。\n\n" +
      "建議您可以再多補充：不舒服的部位、疼痛或不適的型態（刺痛、悶痛、癢、麻）、" +
      "以及大約持續多久、在什麼情況特別明顯。\n\n" +
      "在還沒有更明確的資訊之前，您也可以考慮：\n" +
      "・先掛「一般內科」或「家醫科」，由醫師初步評估後轉介合適科別。\n" +
      "・或到現場請護理人員、櫃檯協助判斷掛號科別。\n\n" +
      "此服務僅作為掛號科別的參考，無法取代實際門診診療。";

    const suggestButtons = [
      { label: "和現場人員確認掛號", dept: "櫃檯協助" },
      { label: "先掛一般內科", dept: "內科" },
      { label: "先掛家醫科", dept: "家醫科" },
    ];

    return { replyText, suggestButtons };
  }

  const deptList = Array.from(depts);

  let reply = "";

  if (emergencyFlag) {
    reply += "從您描述的內容中，有出現「較可能需要急診處理」的警訊。\n\n";
  }

  reply +=
    "依照您目前的描述，以下科別較常處理類似狀況，提供您掛號時參考（實際仍以現場醫師評估為主）：\n\n";
  reply += "建議科別：\n";
  reply += "・" + deptList.join("\n・") + "\n\n";

  if (reasons.length > 0) {
    reply += "簡單說明：\n" + reasons.map((r) => "・" + r).join("\n") + "\n\n";
  }

  reply +=
    "若症狀突然加重（例如無法呼吸、說話困難、意識不清、大量出血等），請不要等門診，儘速前往急診或撥打當地緊急電話尋求協助。此服務僅作為掛號科別的參考建議，無法取代醫師面對面的專業診斷。";

  const suggestButtons = [
    ...deptList.map((dept) => ({ label: "掛號 " + dept, dept })),
    { label: "我還想多問問看", dept: "線上諮詢" },
  ];

  return { replyText: reply, suggestButtons };
}

// ======================
// 8. 點擊事件
// ======================
micBtn.addEventListener("click", () => {
  if (!recognition) initSpeechRecognition();
  if (!recognition) return;

  if (isListening) recognition.stop();
  else recognition.start();
});

resetBtn.addEventListener("click", clearPending);

sendBtn.addEventListener("click", () => {
  if (!pendingText) {
    alert("目前沒有內容，請先說話或選擇常見症狀。");
    return;
  }

  const textToSend = pendingText;

  // 新增正式使用者泡泡（靠右，內文已在 addChatBubble 中做 17 字換行）
  addChatBubble("user", textToSend);

  // 送出後將預覽泡泡清空並隱藏
  if (previewBubble) {
    previewBubble.textContent = "";
    previewBubble.classList.add("hidden");
  }

  pendingText = null;
  sessionTranscript = "";
  setBottomButtonsEnabled(false);

  if (recordHint) recordHint.textContent = "點擊即可說話";

  statusText.textContent = "正在分析您的狀況…";

  //  新增：傳送後一定恢復成麥克風 icon
  document.getElementById("micSquare").classList.add("hidden");
  micIconStop.classList.add("hidden");
  micIconMic.classList.remove("hidden");
  micBtn.classList.remove("listening");

  callGptTriageApi(textToSend);
});

muteBtn.addEventListener("click", () => {
  ttsEnabled = !ttsEnabled;
  if (!ttsEnabled) window.speechSynthesis.cancel();
});

quickTagButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const text = btn.getAttribute("data-text");
    pendingText = text;
    sessionTranscript = text;
    statusText.textContent = text;
    setBottomButtonsEnabled(true);

    if (recordHint) {
      recordHint.textContent = "確認內容後，按右邊傳送給 AI。";
    }

    // 選擇快捷症狀時，也自動捲到聊天底部
    scrollToBottom();
  });
});

closeTipBtn.addEventListener("click", () => {
  usageTip.style.display = "none";
});

closeTipBtn.addEventListener("click", () => {
  usageTip.classList.add("hidden");
  if (typeof updateBottomBarHeight === "function") {
    updateBottomBarHeight();
  }
});

// 關閉 usageTip（保留唯一一個 listener）
closeTipBtn.addEventListener("click", () => {
  usageTip.classList.add("hidden");
});
