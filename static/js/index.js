const now = new Date();
const openedProjects = {};
const expandedMonthLogs = {};
const selectedMonthByProject = {};
const modalTitle = document.getElementById("modalTitle");
const inputDate = document.getElementById("workDate");
const inputHours = document.getElementById("workHours");
const inputMemo = document.getElementById("workMemo");
const projectLogsDiv = document.getElementById("projectLogs");
const footerToday = document.getElementById("footerToday");
const settings = JSON.parse(localStorage.getItem("project_settings") || "[]");


let isTooltipFixed = false;
let sortMode = false;
let sortable = null;
let editIndex = null;
let activeProject = null;
let selectedLogIndex = null;
let activeTimers = {};
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth() + 1;
let logs = JSON.parse(localStorage.getItem("project_logs") || "[]");


// ===================================
// --- Window ------------------------
// ===================================

// 初期化（load時）
window.addEventListener("load", () => {
    renderLogs();
    updateFooter();
    startFooterLoop();
});

// リサイズ時に固定ツールチップ再計算
window.addEventListener("resize", () => {
    if (isTooltipFixed) {
        refreshTooltip();
    }
});

// タイマー作動中のページ離脱警告
window.addEventListener("beforeunload", (event) => {
    const [projectId] = Object.entries(activeTimers)[0] ?? [];
    if (projectId) {
        event.preventDefault();
        event.returnValue = "";
    }
});

// ツールチップ表示
footerToday.addEventListener("mouseenter", () => {
    if (isTooltipFixed || footerToday._tooltip) return;
    showTooltip(false);
});

// ツールチップ削除
footerToday.addEventListener("mouseleave", () => {
    if (isTooltipFixed) return;
    removeTooltip();
});

// ツールチップ固定切替
footerToday.addEventListener("click", () => {
    if (!isTooltipFixed) {
        showTooltip(true);
    } else {
        removeTooltip();
    }
});


// ===================================
// --- Modal -------------------------
// ===================================

// モーダル関数(開く)
function openModal(projectId) {
    modalTitle.textContent = `Work Record - ${projectId}`;
    editIndex = null;
    activeProject = projectId;
    selectedProjectId = projectId;
    inputDate.value = getTodayDate();
    inputHours.value = "";
    inputMemo.value = "";
    updateWorkMemoSuggestions();
    modal.classList.remove("hidden");
}

// モーダル関数(閉じる)
function closeModal() {
    modal.classList.add("hidden");
    editIndex = null;
    activeProject = null;
}

// 入力候補を取得
function updateWorkMemoSuggestions() {
    const datalist = document.getElementById("workMemoSuggestions");
    datalist.innerHTML = "";

    const seen = new Set();
    const recentMemos = [];

    // 最新順でユニークな作業内容を抽出(Auto Timer除外)
    [...logs].reverse().forEach(log => {
        if (log.memo && log.memo !== "Auto Timer" && !seen.has(log.memo)) {
            seen.add(log.memo);
            recentMemos.push(log.memo);
        }
    });
    // ここで取得件数調整
    recentMemos.slice(0, 5).forEach(memo => {
        const option = document.createElement("option");
        option.value = memo;
        datalist.appendChild(option);
    });
}


// ===================================
// --- Main --------------------------
// ===================================

// 保存
function saveLogs(triggerType = "manual") {
    localStorage.setItem("project_logs", JSON.stringify(logs));
    closeModal();
    renderLogs(triggerType);
    refreshTooltip();
}


// 登録
function submitLog() {
    const date = inputDate.value;
    const hours = parseFloat(inputHours.value);
    const memo = inputMemo.value;
    if (!activeProject || !date || isNaN(hours)) {
        return alert("必須項目を入力してください。");
    }

    const newEntry = { project: activeProject, date, hours, memo };
    if (editIndex !== null) {
        logs[editIndex] = newEntry;
    } else {
        logs.push(newEntry);
    }
    saveLogs("submitLog");
}

// 編集
function editLog(index) {
    const log = logs[index];
    if (!log) return;
    editIndex = index;
    activeProject = log.project;
    inputDate.value = log.date;
    inputHours.value = log.hours;
    inputMemo.value = log.memo;
    updateWorkMemoSuggestions();
    modal.classList.remove("hidden");
}

function editSelectedLog() {
    if (selectedLogIndex === null) return;
    editLog(selectedLogIndex);
}

// 削除
function deleteLog(index) {
    if (!confirm("この作業記録を削除しますか？")) return;
    logs.splice(index, 1);
    saveLogs("deleteLog");
}

function deleteSelectedLog() {
    if (selectedLogIndex === null) return;
    deleteLog(selectedLogIndex);
}

// 選択
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
    updateButtons("btnEdit", "btnDelete", selectedLogIndex !== null);
}

// 並び替え
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

// 月詳細切替
function toggleExpandMonth(projectId, month) {
    if (!expandedMonthLogs[projectId]) expandedMonthLogs[projectId] = {};
    expandedMonthLogs[projectId][month] = !expandedMonthLogs[projectId][month];
    renderLogs();
}

// 表示月変更
function changeSelectedMonth(projectId, month) {
    selectedMonthByProject[projectId] = month;
    if (expandedMonthLogs[projectId]) {
        delete expandedMonthLogs[projectId];
    }
    renderLogs();
}

// 表示
function renderLogs(triggerType = "manual") {
    projectLogsDiv.innerHTML = "";
    selectedLogIndex = null;
    updateButtons("btnEdit", "btnDelete", selectedLogIndex !== null);

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
            dueText += `（残り：${daysLeft}日）`;
        }

        const wrapper = document.createElement("div");
        wrapper.dataset.id = project.id;
        wrapper.className = "bg-white px-4 py-3 rounded-md shadow log-wrapper";

        // 詳細トグル
        const isOpen = openedProjects[project.id] ?? false;
        const showDetailBtn = projectLogs.length > 0
        ? `<button onclick="toggleDetail('${project.id}')" class="toggle-detail-btn text-sm text-blue-600 hover:text-blue-900 underline">
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
                    Total：<strong>${totalHours.toFixed(2)}H</strong>
                    ${project.estimate != null ? `<span class="text-gray-600"> / Estimate：${project.estimate}H</span>` : ""}
                </p>
            </div>
        </div>
        <div class="flex justify-between items-center mt-1">
            <div class="flex items-center gap-2">
                <span class="text-xs text-white px-2 py-0.5 rounded ${dueColor}">
                    納期
                </span>
                <p class="text-sm text-gray-600">${dueText}</p>
            </div>
            ${showDetailBtn}
        </div>
        `;

        const detailDiv = document.createElement("div");
        detailDiv.className = `${isOpen ? '' : 'hidden'} mt-1 space-y-2 pt-2`;

        const groupedByMonth = {};
        projectLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(log => {
            const monthKey = log.date.slice(0, 7);
            if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
            groupedByMonth[monthKey].push(log);
        });

        const monthKeys = Object.keys(groupedByMonth).sort().reverse();
        const latestMonth = monthKeys[0];
        const currentSelected = selectedMonthByProject[project.id];
        // 再描画のトリガー分岐
        if (triggerType === "submitLog" || triggerType === "stopTimer") {
            if (!isOpen) {
                selectedMonthByProject[project.id] = latestMonth;
            } else {
                // 編集で月が変わった場合に対応
                const editedLog = logs[logs.length - 1];
                const editedMonth = editedLog?.date?.slice(0, 7);
                if (editedMonth && editedMonth !== currentSelected) {
                    selectedMonthByProject[project.id] = editedMonth;
                }
            }
        } else if (triggerType === "deleteLog") {
            if (!groupedByMonth[currentSelected]) {
                selectedMonthByProject[project.id] = latestMonth;
            }
        }
        const selectedMonth = selectedMonthByProject[project.id] ?? latestMonth;
        const logsInMonth = groupedByMonth[selectedMonth] ?? [];
        const isExpanded = expandedMonthLogs[project.id]?.[selectedMonth] ?? false;
        const visibleLogs = isExpanded ? logsInMonth : logsInMonth.slice(0, 3);

        const monthWrapper = document.createElement("div");
        monthWrapper.innerHTML = `
        <div class="flex justify-start items-center">
                <select onchange="changeSelectedMonth('${project.id}', this.value)" class="text-sm border rounded px-2 py-1">
                ${monthKeys.map(m => {
                    const count = groupedByMonth[m].length;
                    const hours = groupedByMonth[m].reduce((sum, l) => sum + l.hours, 0);
                    return `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${m}月（${count}件 / ${hours.toFixed(2)}H）</option>`;
                }).join('')}
            </select>
        </div>
        <div class="mt-2 space-y-2">
            ${visibleLogs.map(log => {
                const globalIndex = logs.findIndex(l =>
                    l.project === log.project &&
                    l.date === log.date &&
                    l.hours === log.hours &&
                    l.memo === log.memo
                );
                return `
                <div class="log-row flex justify-between items-center bg-white border p-2 rounded">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="log-${globalIndex}" name="logSelect" onclick="selectLog(${globalIndex})" />
                        <p class="text-sm font-medium">
                            ${log.date} - ${log.hours}H
                            <span class="text-gray-500">${log.memo ? ` - ${log.memo}` : ''}</span>
                        </p>
                    </div>
                </div>
                `;
            }).join('')}
            ${logsInMonth.length > 3 ? `
            <button onclick="toggleExpandMonth('${project.id}', '${selectedMonth}')" class="text-xs text-blue-500 underline">
                ${isExpanded ? '閉じる' : 'さらに表示'}
            </button>
            ` : ''}
        </div>
        `;
        detailDiv.appendChild(monthWrapper);
        wrapper.appendChild(detailDiv);
        projectLogsDiv.appendChild(wrapper);
    });
}


// ===================================
// --- Timer -------------------------
// ===================================

// タイマー切替
function toggleTimer(projectId) {
    const now = new Date();

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

// 記録表示切替
function toggleDetail(projectId) {
    const wasOpen = openedProjects[projectId];
    openedProjects[projectId] = !wasOpen;

    if (!openedProjects[projectId]) {
        delete expandedMonthLogs[projectId];
        delete selectedMonthByProject[projectId];
    }
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
        renderLogs("stopTimer");
        return alert("1分未満の記録は無視されます。");
    }

    // 既存ログに同じ日＆プロジェクト＆メモ("Auto Timer")があるか探す
    const hours = +(diffMinutes / 60).toFixed(2);
    const today = getTodayDate();
    const existing = logs.find(l => l.project === projectId && l.date === today && l.memo === "Auto Timer");
    if (existing) {
        // 合算して小数第2位まで
        existing.hours = +(existing.hours + hours).toFixed(2);
    } else {
        logs.push({ project: projectId, date: today, hours, memo: "Auto Timer" });
    }
    saveLogs("stopTimer");
    delete activeTimers[projectId];
    updateFooter();
}


// ===================================
// --- Calender ----------------------
// ===================================

// カレンダーモーダル表示
function openCalendarModal() {
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth() + 1;
    document.getElementById("calendarModal").classList.remove("hidden");
    renderCalendarGrid();
}

// カレンダーモーダルを閉じる
function closeCalendarModal() {
    document.getElementById("calendarModal").classList.add("hidden");
}

// 表示月の変更
function changeCalendarMonth(offset) {
    calendarMonth += offset;
    if (calendarMonth < 1) {
        calendarMonth = 12;
        calendarYear--;
    } else if (calendarMonth > 12) {
        calendarMonth = 1;
        calendarYear++;
    }
    renderCalendarGrid();
}

// カレンダーを描画
function renderCalendarGrid() {
    const grid = document.getElementById("calendarGrid");
    const wrapper = document.getElementById("calendarGridWrapper");
    const title = document.getElementById("calendarTitle");
    grid.innerHTML = "";
    title.textContent = `${calendarYear}年${calendarMonth}月`;

    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    const prevMonthDays = new Date(calendarYear, calendarMonth - 1, 0).getDate();

    const logsByDate = {};
    logs.forEach(log => {
        if (!logsByDate[log.date]) logsByDate[log.date] = [];
        logsByDate[log.date].push(log);
    });

    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    weekdays.forEach(day => {
        const header = document.createElement("div");
        header.className = "font-bold text-center";
        header.textContent = day;
        grid.appendChild(header);
    });

    for (let i = 0; i < 42; i++) {
        const cell = document.createElement("div");
        cell.className = "border p-2 relative h-[80px]";

        let dateStr = "";
        let dayNum = 0;
        let isCurrentMonth = false;

        if (i < firstDay) {
            // 前月
            dayNum = prevMonthDays - firstDay + i + 1;
            const prevMonth = calendarMonth - 1 || 12;
            const prevYear = calendarMonth === 1 ? calendarYear - 1 : calendarYear;
            dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            cell.classList.add("opacity-50", "text-gray-400");
        } else if (i < firstDay + daysInMonth) {
            // 今月
            dayNum = i - firstDay + 1;
            dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            isCurrentMonth = true;
        } else {
            // 次月
            dayNum = i - (firstDay + daysInMonth) + 1;
            const nextMonth = calendarMonth + 1 > 12 ? 1 : calendarMonth + 1;
            const nextYear = calendarMonth === 12 ? calendarYear + 1 : calendarYear;
            dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            cell.classList.add("opacity-50", "text-gray-400");
        }

        const logsForDay = logsByDate[dateStr] || [];
        const totalHours = logsForDay.reduce((sum, log) => sum + log.hours, 0);
        const detailText = logsForDay.map(log => `<strong>${log.project}</strong>：${log.hours}H - ${log.memo}`).join("<br>");

        // 曜日判定（0=日曜, 6=土曜）
        const weekday = new Date(dateStr).getDay();
        let bgColor = "bg-white";
        let textColor = "text-gray-800";
        let hoverColor = "hover:bg-gray-100";

        // 土日の色
        if (weekday === 0) {
            bgColor = "bg-red-100";
            textColor = "text-red-600";
        } else if (weekday === 6) {
            bgColor = "bg-blue-100";
            textColor = "text-blue-600";
        }

        cell.className += ` ${bgColor} ${textColor} ${hoverColor}`;
        cell.innerHTML = `<strong>${dayNum}</strong><br>${totalHours ? totalHours.toFixed(2) + "H" : ""}`;
        // ツールチップ
        if (detailText && isCurrentMonth) {
            cell.addEventListener("mouseenter", () => {
                const tooltip = document.createElement("div");
                tooltip.className = "fixed z-50 bg-white border text-xs p-2 shadow whitespace-nowrap max-w-[300px]";
                tooltip.innerHTML = detailText;
                document.body.appendChild(tooltip);

                const rect = cell.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                const padding = 8;
                const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                let top = rect.top;
                let left = rect.right + padding;

                // 右端に近い場合は左に表示（スクロールバー幅を考慮）
                if (left + tooltipRect.width > window.innerWidth - scrollbarWidth) {
                    left = rect.left - tooltipRect.width - padding;
                }
                // 下端に近い場合は上に表示
                if (top + tooltipRect.height > window.innerHeight) {
                    top = window.innerHeight - tooltipRect.height - padding;
                }
                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
                cell._tooltip = tooltip;
            });
            cell.addEventListener("mouseleave", () => {
                if (cell._tooltip) {
                    cell._tooltip.remove();
                    cell._tooltip = null;
                }
            });
        }
        grid.appendChild(cell);
    }
    // 高さは6週分固定
    const gridHeight = 40 + 6 * 80;
    wrapper.style.height = `${gridHeight}px`;
}


// ===================================
// --- Footer ------------------------
// ===================================

// 本日の合計作業時間を取得
function getTodayTotalHours() {
    const today = getTodayDate();
    return logs.filter(l => l.date === today).reduce((sum, l) => sum + l.hours, 0);
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

// 作業詳細ツールチップ
function showTooltip(forceFixed = false) {
    removeTooltip();
    const today = getTodayDate();
    const logsForToday = logs.filter(log => log.date === today);
    if (logsForToday.length === 0) return;

    const tooltip = document.createElement("div");
    tooltip.classList.add("tooltip-fixed");
    tooltip.className = `fixed z-50 bg-slate-100 border border-slate-400 text-base text-gray-800 p-3 rounded-md max-w-[70vw] space-y-1 shadow-2xl`;
    // 作業記録一覧
    logsForToday.forEach(log => {
        const div = document.createElement("div");
        div.className = "whitespace-nowrap overflow-hidden text-ellipsis";
        div.innerHTML = `<strong>${log.project}</strong>：${log.hours}H - ${log.memo || ''}`;
        tooltip.appendChild(div);
    });
    // ✖ボタン（固定モードのみ）
    if (forceFixed) {
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = `<i class="ri-close-large-line"></i>`;
        closeBtn.className = `
            absolute -top-3 -right-3 bg-white border border-gray-300 rounded-full w-6 h-6 flex items-center justify-center
            text-gray-500 hover:text-gray-800 shadow-md
        `;
        closeBtn.onclick = removeTooltip;
        tooltip.appendChild(closeBtn);
    }
    document.body.appendChild(tooltip);

    const rect = footerToday.getBoundingClientRect();
    const padding = 25;

    requestAnimationFrame(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        let top = rect.top - tooltipRect.height - padding;
        let left = rect.left;

        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - padding;
        }
        if (top < 0) {
            top = rect.bottom + padding;
        }
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;

        if (forceFixed) {
            tooltip.classList.add("border-4", "border-indigo-700");
            isTooltipFixed = true;
        }
        footerToday._tooltip = tooltip;
    });
}

// ツールチップを削除
function removeTooltip() {
    if (footerToday._tooltip) {
        footerToday._tooltip.remove();
        footerToday._tooltip = null;
    }
    isTooltipFixed = false;
}

// ツールチップを更新
function refreshTooltip() {
    if (!isTooltipFixed) return;
    removeTooltip();
    showTooltip(true);
}
