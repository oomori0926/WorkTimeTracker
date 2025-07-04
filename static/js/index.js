const openedProjects = {};
const modal = document.getElementById("modal");
const projectLogsDiv = document.getElementById("projectLogs");
const settings = JSON.parse(localStorage.getItem("project_settings") || "[]");

let logs = JSON.parse(localStorage.getItem("project_logs") || "[]");
let sortable = null;
let sortMode = false;
let editIndex = null;
let activeProject = null;
let selectedLogIndex = null;
let activeTimers = {};


// モーダル関数(開く)
function openModal(projectId) {
    document.getElementById("modalTitle").textContent = `Work Record - ${projectId}`;
    activeProject = projectId;
    selectedProjectId = projectId;
    modal.classList.remove("hidden");
}


// モーダル関数(閉じる)
function closeModal() {
    modal.classList.add("hidden");
    activeProject = null;
    editIndex = null;
    document.getElementById("workDate").value = "";
    document.getElementById("workHours").value = "";
    document.getElementById("workMemo").value = "";
}


// 詳細表示関数
function toggleDetail(projectId) {
    openedProjects[projectId] = !openedProjects[projectId];

    // 再選択のために選択中のログ情報を保存
    const selectedLog = logs[selectedLogIndex];
    const selectedLogKey = selectedLog
    ? `${selectedLog.project}|${selectedLog.date}|${selectedLog.hours}|${selectedLog.memo}`
    : null;

    renderLogs();

    // 再描画後、同じログがまだ存在していたら再チェック
    if (selectedLogKey && selectedLog?.project !== projectId) {
        const index = logs.findIndex(log =>
            `${log.project}|${log.date}|${log.hours}|${log.memo}` === selectedLogKey
        );
        if (index !== -1) {
            const checkbox = document.getElementById(`log-${index}`);
            if (checkbox) {
                checkbox.checked = true;
                checkbox.closest(".log-row")?.classList.add("bg-blue-100");
                selectedLogIndex = index;
                updateActionButtons();
            }
        } else {
            selectedLogIndex = null;
            updateActionButtons();
        }
    }
}


// 保存関数
function saveLogs() {
    localStorage.setItem("project_logs", JSON.stringify(logs));
    renderLogs();
}


// 登録関数
function submitLog() {
    const date = document.getElementById("workDate").value;
    const hours = parseFloat(document.getElementById("workHours").value);
    const memo = document.getElementById("workMemo").value;
    if (!activeProject || !date || isNaN(hours)) return alert("必須項目を入力してください。");

    const newEntry = { project: activeProject, date, hours, memo };
    if (editIndex !== null) {
        logs[editIndex] = newEntry;
    } else {
        logs.push(newEntry);
    }
    closeModal();
    saveLogs();
}


// 編集関数
function editLog(index) {
    const log = logs[index];
    if (!log) return;
    activeProject = log.project;
    editIndex = index;
    document.getElementById("workDate").value = log.date;
    document.getElementById("workHours").value = log.hours;
    document.getElementById("workMemo").value = log.memo;
    modal.classList.remove("hidden");
}

function editSelectedLog() {
    if (selectedLogIndex !== null) editLog(selectedLogIndex);
}


// 削除関数
function deleteLog(index) {
    if (!confirm("この作業記録を削除しますか？")) return;
    logs.splice(index, 1);
    saveLogs();
}

function deleteSelectedLog() {
    if (selectedLogIndex !== null) deleteLog(selectedLogIndex);
}


// 表示関数
function renderLogs() {
    projectLogsDiv.innerHTML = "";
    selectedLogIndex = null;

    settings.forEach(project => {
        const projectLogs = logs.filter(l => l.project === project.id);
        const totalHours = projectLogs.reduce((sum, l) => sum + l.hours, 0);

        // 工数色設定(%)
        let progressColor = "bg-gray-500";
        if (project.estimate) {
            const ratio = totalHours / project.estimate;
            if (ratio >= 0.9) progressColor = "bg-red-500";
            else if (ratio >= 0.7) progressColor = "bg-orange-400";
            else progressColor = "bg-green-500";
        }
        // 納期色設定(日)
        let dueColor = "bg-gray-500";
        let dueText = project.due ?? "ー";
        if (project.due) {
            const daysLeft = Math.ceil((new Date(project.due) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 5) dueColor = "bg-red-500";
            else if (daysLeft <= 15) dueColor = "bg-orange-400";
            else dueColor = "bg-green-500";
            dueText += ` (${daysLeft}日)`;
        }

        const wrapper = document.createElement("div");
        wrapper.dataset.id = project.id;
        wrapper.className = `bg-white p-4 pt-3 pb-3 rounded-xl shadow log-wrapper`;

        // 詳細トグル
        const isOpen = openedProjects[project.id] ?? false;
        const showDetailBtn = totalHours > 0
        ? `<button onclick="toggleDetail('${project.id}')" class="text-sm text-blue-600 hover:text-blue-900 underline">
            ${isOpen ? '▲ Hide Detail' : '▼ Show Detail'}
        </button>`
        : "";

        // 工数・納期表示
        wrapper.innerHTML = `
        <div class="flex justify-between items-start">
            <p class="font-bold text-gray-800 text-lg">
                ${project.id} <span class='text-sm text-gray-500 ml-2'>${project.name ?? ''}</span>
            </p>
            <div class="flex gap-2">
            <button onclick="openModal('${project.id}')" class="text-sm text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded">
                <i class="ri-add-line"></i>
            </button>
            <button onclick="toggleTimer('${project.id}')" class="${activeTimers[project.id] ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white px-2 py-1 rounded text-sm">
                ${activeTimers[project.id] ? 'Stop' : 'Start'}
            </button>
        </div>
        </div>
        <div class="flex justify-between items-center mt-1">
            <div class="flex items-center gap-2">
                <span class="text-xs text-white px-2 py-0.5 rounded ${progressColor}">
                    工数
                </span>
                <p class="text-sm">
                    Total：${totalHours.toFixed(2)}H /
                    <span class="text-sm text-gray-600">Estimate：${project.estimate ?? " ー "}H</span>
                </p>
            </div>
        </div>
        <div class="flex justify-between items-center mt-1">
            <div class="flex items-center gap-2">
                <span class="text-xs text-white px-2 py-0.5 rounded ${dueColor}">
                    納期
                </span>
                <p class="text-sm text-gray-600">Due ：${dueText}</p>
            </div>
            ${showDetailBtn}
        </div>
        `;

        const detailDiv = document.createElement("div");
        detailDiv.className = `${isOpen ? '' : 'hidden'} mt-1 space-y-2 pt-2`;

        projectLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((log, i) => {
            const globalIndex = logs.indexOf(log);
            const row = document.createElement("div");
            row.className = "log-row flex justify-between items-center bg-white border p-2 rounded";

            // 詳細表示
            row.innerHTML = `
            <div class="flex items-center gap-2">
                <input type="checkbox" id="log-${globalIndex}" name="logSelect" onclick="selectLog(${globalIndex})" />
                <p class="text-sm font-medium">
                    ${log.date} - ${log.hours}H
                    <span class="text-gray-500">${log.memo ? ` - ${log.memo}` : ""}</span>
                </p>
            </div>
            `;
            detailDiv.appendChild(row);
        });
        wrapper.appendChild(detailDiv);
        projectLogsDiv.appendChild(wrapper);
    });
    updateActionButtons();
}


// 選択関数
function selectLog(index) {
    document.querySelectorAll('input[name="logSelect"]').forEach(el => {
        el.checked = false;
        el.closest(".log-row")?.classList.remove("bg-blue-100");
    });

    const checkbox = document.getElementById(`log-${index}`);
    const row = checkbox.closest(".log-row");

    if (selectedLogIndex === index) {
        selectedLogIndex = null;
    } else {
        checkbox.checked = true;
        selectedLogIndex = index;
        row?.classList.add("bg-blue-100");
    }
    updateActionButtons();
}


// 選択・ボタンの状態更新関数
function updateActionButtons() {
    const editBtn = document.getElementById("btnEdit");
    const deleteBtn = document.getElementById("btnDelete");
    const hasSelection = selectedLogIndex !== null;
    editBtn.disabled = !hasSelection;
    deleteBtn.disabled = !hasSelection;
}


// 並び替え関数
function toggleSortMode() {
    sortMode = !sortMode;

    const btn = document.getElementById("sortModeBtn");
    const icon = document.getElementById("sortModeIcon");

    if (sortMode) {
        btn.classList.remove("bg-slate-500", "hover:bg-slate-600", "text-white");
        btn.classList.add("bg-sky-500", "hover:bg-sky-600", "ring-2", "ring-offset-1", "ring-sky-400", "shadow-inner", "text-white");
        icon.className = "ri-checkbox-line";

        sortable = new Sortable(document.getElementById("projectLogs"), {
            animation: 150,
            handle: ".log-wrapper",
            onEnd: () => {
                const newOrder = Array.from(document.querySelectorAll("#projectLogs .log-wrapper")).map(div => div.dataset.id);
                settings.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                localStorage.setItem("project_settings", JSON.stringify(settings));
                renderLogs();
            }
        });
    } else {
        btn.classList.remove("bg-sky-500", "hover:bg-sky-600", "ring-2", "ring-offset-1", "ring-sky-400", "shadow-inner");
        btn.classList.add("bg-slate-500", "hover:bg-slate-600", "text-white");
        icon.className = "ri-list-settings-line";

        if (sortable) sortable.destroy();
        renderLogs();
    }
}


// 現在の日付（YYYY-MM-DD）
function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


// 本日の合計作業時間を取得
function getTodayTotalHours() {
    const today = getTodayDate();
    return logs.filter(l => l.date === today).reduce((sum, l) => sum + l.hours, 0);
}


// 指定されたプロジェクトの自動タイマーを切り替える
function toggleTimer(projectId) {
    const now = new Date();
    const today = getTodayDate();

    // すでに他で計測中なら停止して切り替え
    const currentActive = Object.keys(activeTimers)[0];
    if (currentActive && currentActive !== projectId) {
        stopTimer(currentActive);
    }

    if (activeTimers[projectId]) {
        stopTimer(projectId);
    } else {
        activeTimers = { [projectId]: now };
    }
    updateFooter();
    renderLogs();
}


// プロジェクトの計測終了し、logに記録する
function stopTimer(projectId) {
    const start = activeTimers[projectId];
    if (!start) return;

    const end = new Date();
    const diffMinutes = Math.floor((end - start) / (1000 * 60));
    if (diffMinutes < 1) {
        delete activeTimers[projectId];
        updateFooter();
        renderLogs();
        return alert("1分未満の記録は無視されます。");
    }

    const hours = +(diffMinutes / 60).toFixed(2);
    const today = getTodayDate();

    // 既存ログに同じ日＆プロジェクト＆メモ("Auto Timer")があるか探す
    const existing = logs.find(l => l.project === projectId && l.date === today && l.memo === "Auto Timer");

    if (existing) {
        // 合算して小数第2位まで
        existing.hours = +(existing.hours + hours).toFixed(2);
    } else {
        logs.push({ project: projectId, date: today, hours, memo: "Auto Timer" });
    }
    saveLogs();
    delete activeTimers[projectId];
    updateFooter();
    renderLogs();
}


// フッター表示更新
function updateFooter() {
    const footer = document.getElementById("timerFooter");
    const left = document.getElementById("footerToday");
    const right = document.getElementById("footerStatus");

    const todayHours = getTodayTotalHours();
    left.textContent = `作業時間合計 (${getTodayDate()})：${todayHours.toFixed(2)}H`;

    const [projectId, startTime] = Object.entries(activeTimers)[0] ?? [];
    if (projectId && startTime) {
        const diff = new Date() - startTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const hms = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        right.textContent = `計測中：${projectId}　${hms}`;
    } else {
        right.textContent = "作業が開始されていません";
    }
    footer.classList.remove("hidden");
}


// タイマー作動中のページ離脱警告
window.addEventListener("beforeunload", (event) => {
    const [projectId] = Object.entries(activeTimers)[0] ?? [];
    if (projectId) {
        event.preventDefault();
        event.returnValue = "";
    }
});


// フッターの自動更新ループ
function startFooterLoop() {
    let lastSecond = null;

    function tick() {
        const now = new Date();
        const currentSecond = now.getSeconds();
        if (currentSecond !== lastSecond) {
            updateFooter();
            lastSecond = currentSecond;
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}


// 初期化（load時）
window.addEventListener("load", () => {
    updateFooter();
    startFooterLoop();
});


renderLogs();