const now = new Date();
const openedProjects = {};
const expandedMonthLogs = {};
const selectedMonthByProject = {};
const sortableInGroups = {};
const sortableHeaderDrops = {};
const modalTitle = document.getElementById("modalTitle");
const inputDate = document.getElementById("workDate");
const inputHours = document.getElementById("workHours");
const inputMemo = document.getElementById("workMemo");
const footerToday = document.getElementById("footerToday");
const projectLogsDiv = document.getElementById("projectLogs");
const settings = JSON.parse(localStorage.getItem("project_settings") || "[]");
const storedGroups = JSON.parse(localStorage.getItem("project_groups") || "null");
const __blockSelectHandler = (e) => { e.preventDefault(); };

let nextMemoSource = "manual";
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
let sortableGroups = null;
let sortableCatchAll = null;
let sortableUngrouped = null;
let __dragPointer = { x: 0, y: 0 };
let __dragMoveHandler = null;
let __dragTouchHandler = null;
let __prevOnSelectStart = null;
let projectGroups = storedGroups ?? {
    order: [],
    items: {},
    meta: {},
    ungroupedOrder: []
};


// ===================================
// --- Window ------------------------
// ===================================

// 初期化（load時）
window.addEventListener("load", () => {
    normalizeProjectGroups();
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

    removeTooltip(false);
});

// ツールチップ固定切替
footerToday.addEventListener("click", () => {
    if (!isTooltipFixed) {
        showTooltip(true);
    } else {
        removeTooltip(true);
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
    bindWorkMemoInputWatcher();
    nextMemoSource = "manual";
    modal.classList.remove("hidden");
}

// モーダル関数(閉じる)
function closeModal() {
    modal.classList.add("hidden");
    editIndex = null;
    activeProject = null;
}

// 入力候補を取得：手入力のみを5件
function updateWorkMemoSuggestions() {
    const datalist = document.getElementById("workMemoSuggestions");
    if (!datalist) return;

    datalist.innerHTML = "";
    const seen = new Set();
    const recent = [];

    // 最新順でユニークな作業内容を抽出(Auto Timerと作業コード由来を除外)
    [...logs].reverse().forEach(log => {
        const memo = log.memo;
        const source = log.memoSource || "manual";
        if (!memo) return;
        if (memo === "Auto Timer") return;
        if (source === "code") return;
        if (!seen.has(memo)) {
            seen.add(memo);
            recent.push(memo);
        }
    });
    recent.slice(0, 5).forEach(memo => {
        const option = document.createElement("option");
        option.value = memo;
        datalist.appendChild(option);
    });
}

// 作業コード選択モーダル
(function seedMemoCodePresetsIfEmpty() {
    const KEY = "work_memo_presets";
    const current = localStorage.getItem(KEY);

    try {
        const arr = current ? JSON.parse(current) : null;
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && 'code' in arr[0] && 'name' in arr[0]) {
            return;
        }
        if (Array.isArray(arr) && typeof arr[0] === 'string') {
            const migrated = arr.map(s => {
                const m = s.match(/^(\d+)\s+(.+)$/);
                return m ? { code: m[1], name: m[2] } : { code: null, name: s };
            });
            localStorage.setItem(KEY, JSON.stringify(migrated));
            return;
        }
    } catch {}

    const PRESETS = [
        { code: "5301", name: "設計前段取り" },
        { code: "5302", name: "組立図(進度100％)" },
        { code: "5303", name: "部品図(進度100％)" },
        { code: "5304", name: "回路・電仕様・管理" },
        { code: "5305", name: "ﾄﾗｲ・確認" },
        { code: "5306", name: "外注管理" },
        { code: "5307", name: "運搬･W/C移動" },
        { code: "5308", name: "出荷準備" },
        { code: "5309", name: "設備DR" },
        { code: "5310", name: "モデル(進度25％)" },
        { code: "5311", name: "モデル(進度50％)" },
        { code: "5312", name: "モデル(進度75％)" },
        { code: "5313", name: "モデル(進度100％)" },
        { code: "5314", name: "部品図(進度20％)" },
        { code: "5315", name: "部品図(進度40％)" },
        { code: "5316", name: "部品図(進度60％)" },
        { code: "5317", name: "部品図(進度80％)" },
        { code: "5318", name: "図面修正(自工程）" },
        { code: "5319", name: "図面修正(構想不備)" },
        { code: "5320", name: "図面修正(図面ミス)" },
        { code: "5321", name: "図面修正(手配ミス)" },
        { code: "5322", name: "図面修正(仕様不備)" },
        { code: "5323", name: "出図" },
        { code: "5401", name: "設計検討" },
        { code: "5402", name: "電気設計" },
        { code: "5403", name: "管理" },
        { code: "5404", name: "電気施工" },
        { code: "5405", name: "ﾄﾗｲ･調整" },
        { code: "5406", name: "外注管理" },
        { code: "5407", name: "運搬･W/C移動" },
        { code: "5408", name: "出荷準備" },
        { code: "5409", name: "設備DR" },
        { code: "5411", name: "設計前の検討" },
        { code: "5412", name: "ハード図作成作業" },
        { code: "5413", name: "管理表作成" },
        { code: "5414", name: "ソフト作成作業" },
        { code: "5415", name: "取説作成" },
        { code: "5416", name: "部品整理" },
        { code: "5417", name: "BOX加工・配線" },
        { code: "5418", name: "電気施工100％" },
        { code: "5419", name: "I/Oチェック" },
        { code: "5420", name: "手動回路の確認作業" },
        { code: "5421", name: "自動運転の確認" },
        { code: "5422", name: "計測･ﾃﾞｰﾀ取り･まとめ" },
        { code: "5423", name: "機器調整" },
        { code: "5424", name: "設備ﾁｪｯｸｼｰﾄ記入" },
        { code: "5425", name: "客先での現地工事" },
        { code: "5426", name: "図面、取説" },
        { code: "5427", name: "設備の移動時間" },
        { code: "5428", name: "外注手配管理" },
        { code: "5429", name: "現地トライ修正作業" },
        { code: "5431", name: "ハード図 1～50％" },
        { code: "5432", name: "ソフト 1～20％" },
        { code: "5433", name: "ソフト 20～40％" },
        { code: "5434", name: "ソフト 40～60％" },
        { code: "5435", name: "ソフト 60～80％" },
        { code: "5436", name: "手動運転 1～50％" },
        { code: "5437", name: "自動運転 1～20％" },
        { code: "5438", name: "自動運転 20～40％" },
        { code: "5439", name: "自動運転 40～60％" },
        { code: "5440", name: "自動運転 60～80％" },
        { code: "5441", name: "RA:電気部品準備・調査" },
        { code: "5442", name: "追加手配・施工" },
        { code: "5443", name: "ﾊｰﾄﾞ図ﾐｽ修正" },
        { code: "5444", name: "RA:配線ミス" },
        { code: "5445", name: "ソフト修正作業" },
        { code: "5446", name: "客先要望対応：設計・検討" },
        { code: "5447", name: "客先要望対応：変更・調整" },
        { code: "5448", name: "設計不具合：設計・検討" },
        { code: "5449", name: "設計不具合：変更・調整" },
        { code: "5451", name: "電気施工20％" },
        { code: "5452", name: "電気施工40％" },
        { code: "5453", name: "電気施工60％" },
        { code: "5454", name: "電気施工80％" },
        { code: "5456", name: "調整確認20％" },
        { code: "5457", name: "調整確認40％" },
        { code: "5458", name: "調整確認60％" },
        { code: "5459", name: "調整確認80％" },
        { code: "5460", name: "調整確認100％" },
        { code: "5461", name: "制御盤_ハーネス加工" },
        { code: "5462", name: "制御盤_配線前工程" },
        { code: "5463", name: "制御盤_部品取付作業" },
        { code: "5464", name: "制御盤_配線作業" },
        { code: "5465", name: "制御盤_確認作業" },
        { code: "5481", name: "部品整理" },
        { code: "5482", name: "制御BOX" },
        { code: "5483", name: "スイッチユニット" },
        { code: "5484", name: "可動部ハーネス" },
        { code: "5485", name: "オプションBOX" },
        { code: "5486", name: "その他ハーネス加工" },
        { code: "5487", name: "その他前工程組立作業" },
        { code: "5488", name: "メイン工程組立作業" },
        { code: "5489", name: "PCセットアップ" },
        { code: "5490", name: "検査、トライ" },
        { code: "5491", name: "出荷準備" },
        { code: "5492", name: "手直し" }
    ];

    localStorage.setItem(KEY, JSON.stringify(PRESETS));
    console.log("work_memo_presets seeded (5301–5492).");
})();

// 取得関数
function getMemoPresets() {
    const KEY = "work_memo_presets";
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];

        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];

        return arr.map(item => {
            if (typeof item === "string") {
                const m = item.match(/^(\d+)\s+(.+)$/);
                return m ? { code: m[1], name: m[2] } : { code: null, name: item };
            }
            if (item && typeof item === "object") {
                return { code: item.code ?? null, name: item.name ?? "" };
            }
            return { code: null, name: "" };
        });
    } catch {
        return [];
    }
}

// 最近使用したコード
const RECENT_MEMO_KEY = "work_memo_recent_codes";
function getRecentMemoCodeList() {
    try {
        const raw = localStorage.getItem(RECENT_MEMO_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}

function pushRecentMemoCode(code) {
    if (!code) return;

    const list = getRecentMemoCodeList();
    const next = [code, ...list.filter(x => x !== code)].slice(0, 30);
    localStorage.setItem(RECENT_MEMO_KEY, JSON.stringify(next));
}

// モーダル開閉
function openMemoCodePicker() {
    const modal  = document.getElementById('memoCodePickerModal');
    const search = document.getElementById('memoCodeSearch');
    const list   = document.getElementById('memoCodeList');
    if (!modal || !search || !list) return;

    search.value = '';
    renderMemoCodePickerList('');
    modal.classList.remove('hidden');
    setTimeout(() => search.focus(), 0);
}

function closeMemoCodePicker() {
    const modal  = document.getElementById('memoCodePickerModal');
    const search = document.getElementById('memoCodeSearch');
    const list   = document.getElementById('memoCodeList');
    if (!modal) return;

    modal.classList.add('hidden');
    if (search) search.value = '';
    if (list)   list.innerHTML = '';
}

// リスト描画／行生成／選択
function renderMemoCodePickerList(keyword) {
    const container = document.getElementById('memoCodeList');
    if (!container) return;

    container.innerHTML = "";
    const normalize = s => (s || "").replace(/\u3000/g, " ").toLowerCase();
    const kw = normalize(keyword);
    const presets = getMemoPresets();
    const byCode = new Map(presets.filter(p => p.code).map(p => [p.code, p]));
    const filterFn = (p) => {
        const codeHit = (p.code || "").toLowerCase().includes(kw);
        const nameHit = (p.name || "").toLowerCase().includes(kw);
        return kw ? (codeHit || nameHit) : true;
    };

    const recentCodes = getRecentMemoCodeList().filter(c => byCode.has(c));
    const recentItems = recentCodes.map(c => byCode.get(c)).filter(filterFn);
    const restItems = presets.filter(p => !recentCodes.includes(p.code)).filter(filterFn);
    const makeSection = (title, items) => {
        const sec = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'text-xs font-bold text-gray-500 flex items-center gap-2';
        header.innerHTML = `<i class="ri-bookmark-2-line"></i> ${title}`;
        sec.appendChild(header);

        const list = document.createElement('div');
        list.className = 'mt-2 space-y-2';
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-gray-400 text-xs';
            empty.textContent = '該当なし';
            list.appendChild(empty);
        } else {
            items.forEach(p => list.appendChild(buildMemoCodeItem(p)));
        }
        sec.appendChild(list);
        container.appendChild(sec);
    };
    if (recentItems.length > 0) makeSection('最近使ったコード', recentItems);
    makeSection('すべて', restItems);
}


function buildMemoCodeItem(preset) {
    const { code, name } = preset;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `w-full text-left border rounded-md px-3 py-2 bg-white hover:bg-slate-50 flex items-center justify-between gap-3`;
    btn.innerHTML = `
    <div class="min-w-0">
        <div class="font-bold text-gray-800 truncate">
            ${code ? code : ''}${code && name ? ' ' : ''}${name || ''}
        </div>
    </div>
    `;
    btn.addEventListener('click', () => chooseMemoCode(preset));
    return btn;
}

function chooseMemoCode(preset) {
    const input = document.getElementById('workMemo');
    if (!input) return;

    const code = preset.code || '';
    const name = preset.name || '';
    const value = code ? `${code}${name ? ' ' : ''}${name}` : name;
    input.value = value;
    // 次回保存時の入力元は「作業コード」
    nextMemoSource = "code";

    if (code) pushRecentMemoCode(code);
    closeMemoCodePicker();
    input.focus();
}


// 初期バインド
(function setupMemoCodePicker(){
    const btn = document.getElementById('memoCodePickerBtn');
    const modal = document.getElementById('memoCodePickerModal');
    const closeBtn = document.getElementById('memoCodePickerClose');
    const search = document.getElementById('memoCodeSearch');

    if (!btn || !modal || !closeBtn || !search) return;

    btn.addEventListener('click', openMemoCodePicker);
    closeBtn.addEventListener('click', closeMemoCodePicker);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeMemoCodePicker(); });
    window.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('hidden') && e.key === 'Escape') closeMemoCodePicker();
    });
    search.addEventListener('input', () => renderMemoCodePickerList(search.value.trim()));
    search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const first = modal.querySelector('#memoCodeList button');
            if (first) first.click();
        }
    });
})();

function bindWorkMemoInputWatcher() {
    const input = document.getElementById("workMemo");
    if (!input) return;
    if (input.__presetBound) return;
    input.__presetBound = true;
    input.addEventListener("input", () => {
        // ユーザーがタイプしたら入力元は「手入力」に戻す
        nextMemoSource = "manual";
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

    const newEntry = { project: activeProject, date, hours, memo, memoSource: nextMemoSource || "manual" };
    if (editIndex !== null) {
 // 編集時：元データの memoSource を尊重したければ下記に置換
const prev = logs[editIndex] || {};
const source = (prev.memo === memo && prev.memoSource) ? prev.memoSource : (nextMemoSource || "manual");
logs[editIndex] = { ...newEntry, memoSource: source };
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
    bindWorkMemoInputWatcher();
    nextMemoSource = "manual";

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
    const row = checkbox?.closest(".log-row");

    if (selectedLogIndex === index) {
        selectedLogIndex = null;
    } else {
        if (checkbox) checkbox.checked = true;
        selectedLogIndex = index;
        row?.classList.add('bg-blue-100');
    }
    updateButtons("btnEdit", "btnDelete", selectedLogIndex !== null);
    syncSelectionToTooltip();
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
        setupSortables();
    } else {
        btn.classList.remove("bg-sky-500", "hover:bg-sky-600", "ring-2", "ring-offset-1", "ring-sky-400", "shadow-inner");
        btn.classList.add("bg-slate-500", "hover:bg-slate-600", "text-white");
        icon.className = "ri-list-settings-line";
        teardownSortables();
        renderLogs();
    }
    setFolderUiEnabled(sortMode);
}


function teardownSortables() {
    if (sortableGroups) {
        sortableGroups.destroy(); sortableGroups = null;
    }
    if (sortableUngrouped) {
        sortableUngrouped.destroy(); sortableUngrouped = null;
    }
    Object.values(sortableInGroups).forEach(inst => inst?.destroy());
    for (const k in sortableInGroups) delete sortableInGroups[k];

    Object.values(sortableHeaderDrops).forEach(inst => inst?.destroy());
    for (const k in sortableHeaderDrops) delete sortableHeaderDrops[k];

    if (sortableCatchAll) {
        sortableCatchAll.destroy(); sortableCatchAll = null;
    }
}

// フォルダーへ移動時、一番上に追加
function moveProjectToFolderTop(projectId, gid) {
    projectGroups.order.forEach(g => {
        projectGroups.items[g] = (projectGroups.items[g] ?? []).filter(id => id !== projectId);
    });
    projectGroups.ungroupedOrder = projectGroups.ungroupedOrder.filter(id => id !== projectId);

    if (gid) {
        projectGroups.items[gid] = [
            projectId,
            ...(projectGroups.items[gid] ?? [])
        ];
    } else {
        projectGroups.ungroupedOrder.push(projectId);
    }
    saveProjectGroups();
}


function normalizeProjectGroups() {
    const allIds = settings.map(s => s.id);
    const grouped = new Set(Object.values(projectGroups.items).flat());
    const missing = allIds.filter(id => !grouped.has(id) && !projectGroups.ungroupedOrder.includes(id));

    if (missing.length > 0) {
        projectGroups.ungroupedOrder.push(...missing);
        saveProjectGroups();
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


function saveProjectGroups() {
    localStorage.setItem("project_groups", JSON.stringify(projectGroups));
}

function setFolderUiEnabled(enabled) {
    const btn = document.getElementById("addFolderBtn");
    if (btn) btn.disabled = !enabled;
}

function getUngroupedProjectIds() {
    return projectGroups.ungroupedOrder;
}

// フォルダーの追加
function promptCreateFolder() {
    const title = prompt("フォルダー名を入力してください");
    if (!title) return;

    const id = `grp_${Date.now()}`;
    projectGroups.order.push(id);
    projectGroups.items[id] = [];
    projectGroups.meta[id] = { title, open: false };
    saveProjectGroups();
    renderLogs();
}


// フォルダー名の編集
function renameFolder(id) {
    const current = projectGroups.meta[id]?.title ?? "";
    const title = prompt("フォルダー名を編集", current);
    if (title == null) return;

    projectGroups.meta[id].title = title || current;
    saveProjectGroups();
    renderLogs();
}

// フォルダーの削除
function removeFolder(id) {
    if (!confirm("フォルダーを削除しますか？（中身は未所属に戻ります）")) return;

    // フォルダー内のアイテム（順序保持）
    const items = (projectGroups.items[id] ?? []).slice();
    projectGroups.order = projectGroups.order.filter(g => g !== id);
    delete projectGroups.items[id];
    delete projectGroups.meta[id];

    // 未所属末尾に追加
    const prev = projectGroups.ungroupedOrder ?? [];
    const set = new Set(prev.concat(items));
    projectGroups.ungroupedOrder = Array.from(set);
    saveProjectGroups();
    renderLogs();
}


// フォルダーの開閉
function toggleFolderOpen(id) {
    const m = projectGroups.meta[id];
    if (!m) return;

    m.open = !m.open;
    saveProjectGroups();
    renderLogs();
}


// DnDユーティリティ
function lockDragSize(el) {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    el.style.width = rect.width + 'px';
    el.style.height = rect.height + 'px';
}

function unlockDragSize(el) {
    if (!el) return;

    el.style.width = '';
    el.style.height = '';
}


// 選択抑止
function addNoSelect() {
    document.documentElement.classList.add('no-select');
    __prevOnSelectStart = document.onselectstart;
    document.onselectstart = () => false;
    document.addEventListener('selectstart', __blockSelectHandler, true);
    document.addEventListener('dragstart',   __blockSelectHandler, true);
    document.documentElement.style.userSelect      = 'none';
    document.documentElement.style.webkitUserSelect= 'none';
    document.body.style.userSelect                 = 'none';
    document.body.style.webkitUserSelect           = 'none';
    // 既に付いてしまったハイライト削除
    try {
        const sel = window.getSelection?.();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
        if (document.selection && document.selection.empty) document.selection.empty();
    } catch (_) {}
}

function removeNoSelect() {
    document.documentElement.classList.remove('no-select');
    document.onselectstart = __prevOnSelectStart || null;
    document.removeEventListener('selectstart', __blockSelectHandler, true);
    document.removeEventListener('dragstart',   __blockSelectHandler, true);
    document.documentElement.style.userSelect       = '';
    document.documentElement.style.webkitUserSelect = '';
    document.body.style.userSelect                  = '';
    document.body.style.webkitUserSelect            = '';
    // 選択状態をクリア
    try {
        const sel = window.getSelection?.();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
        if (document.selection && document.selection.empty) document.selection.empty();
    } catch (_) {}
}


function startPointerTrack() {
    stopPointerTrack();
    __dragMoveHandler = (e) => {
        __dragPointer.x = e.clientX;
        __dragPointer.y = e.clientY;
    };
    __dragTouchHandler = (e) => {
        const t = e.touches?.[0] || e.changedTouches?.[0];
        if (!t) return;

        __dragPointer.x = t.clientX;
        __dragPointer.y = t.clientY;
    };
    document.addEventListener('mousemove', __dragMoveHandler, { passive: true });
    document.addEventListener('touchmove', __dragTouchHandler, { passive: true });
}

function stopPointerTrack() {
    if (__dragMoveHandler) document.removeEventListener('mousemove', __dragMoveHandler);
    if (__dragTouchHandler) document.removeEventListener('touchmove', __dragTouchHandler);
    __dragMoveHandler = null;
    __dragTouchHandler = null;
}

function getContainerGid(el) {
    if (!el) return null;
    if (el.id === 'ungroupedList') return null;

    const m = el.id?.match(/^groupList_(.+)$/);
    return m ? m[1] : null;
}


// ドロップ座標をイベントから取得
function getDropPoint(evt) {
    const oe = evt?.originalEvent;
    if (oe) {
        if (oe.touches && oe.touches[0]) return { x: oe.touches[0].clientX,     y: oe.touches[0].clientY };
        if (oe.changedTouches && oe.changedTouches[0]) return { x: oe.changedTouches[0].clientX, y: oe.changedTouches[0].clientY };
        if (typeof oe.clientX === 'number' && typeof oe.clientY === 'number') return { x: oe.clientX, y: oe.clientY };
    }
    return { x: __dragPointer.x, y: __dragPointer.y };
}

// 点が矩形内にあるか
function pointInRect(x, y, rect, margin = 0) {
    return (
        x >= rect.left  - margin &&
        x <= rect.right + margin &&
        y >= rect.top   - margin &&
        y <= rect.bottom+ margin
    );
}

// ドロップ地点の判定
function getDropHit(evt) {
    const { x, y } = getDropPoint(evt);
    const els = document.elementsFromPoint(x, y) || [];
    let listEl = null;

    const skip = (el) =>
        el.classList?.contains('sortable-ghost')   ||
        el.classList?.contains('sortable-chosen')  ||
        el.classList?.contains('sortable-drag')    ||
        el.classList?.contains('sortable-fallback')||
        el.classList?.contains('dragging-el')      ||
        el.classList?.contains('drag-ghost');

    for (const el of els) {
        if (skip(el)) continue;

        // フォルダーのヘッダー命中を最優先
        const header = el.closest?.('.group-header');
        if (header) {
            const wrap = header.closest?.('[data-group-id]');
            const gid = wrap?.dataset?.groupId || null;
            if (gid) return { headerGid: gid, listEl: null };
        }
        const list = el.closest?.('#ungroupedList, [id^="groupList_"]');
        if (list && !listEl) listEl = list;
    }
    return { headerGid: null, listEl };
}


// DnDセットアップ
function setupSortables() {
    if (!sortMode) {
        teardownSortables();
        return;
    }

    const sameListOnly = (el) => ({name: el.id || 'projects', pull: true, put: (to, from) => to.el === from.el});
    const onStartCommon = (evt) => { addNoSelect(); lockDragSize(evt.item); startPointerTrack(); };
    const onEndCommon   = (evt) => { unlockDragSize(evt.item); removeNoSelect(); stopPointerTrack(); };

    // フォルダー自体の並び替え
    const groupsContainer = document.getElementById("groupsContainer");
    if (groupsContainer) {
        if (sortableGroups) sortableGroups.destroy();
        sortableGroups = new Sortable(groupsContainer, {
            animation: 150,
            handle: ".group-header",
            forceFallback: true,
            fallbackOnBody: true,
            onStart: onStartCommon,
            onEnd: (evt) => {
                onEndCommon(evt);
                const newOrder = Array.from(groupsContainer.querySelectorAll("[data-group-id]")).map(el => el.dataset.groupId);
                projectGroups.order = newOrder;
                saveProjectGroups();
            }
        });
    }
    // 未所属（同一内のみ）
    const ungroupedList = document.getElementById("ungroupedList");
    if (ungroupedList) {
        if (sortableUngrouped) sortableUngrouped.destroy();
        sortableUngrouped = new Sortable(ungroupedList, {
            group: sameListOnly(ungroupedList),
            animation: 150,
            draggable: ".project-card",
            forceFallback: true,
            fallbackOnBody: true,
            onStart: onStartCommon,
            onEnd: (evt) => {
                const pid = evt.item?.dataset?.projectId;
                const originGid = getContainerGid(evt.from);
                const { headerGid, listEl } = getDropHit(evt);
                onEndCommon(evt);
                if (!pid) return;

                // ヘッダー命中 → 指定フォルダーの先頭へ
                if (headerGid && headerGid !== originGid) {
                    try { evt.item?.remove(); } catch (_) {}
                    moveProjectToFolderTop(pid, headerGid);
                    updateFolderCounts();
                    renderLogs();
                    return;
                }
                // 同一未所属内の並び替え
                if (listEl === evt.from || evt.from === evt.to) {
                    applyDomOrderToUngrouped();
                    updateFolderCounts();
                    return;
                }
            }
        });
    }
    // 各フォルダー（開：同一内のみ／閉：中身なし）
    projectGroups.order.forEach(gid => {
        const list = document.getElementById(`groupList_${gid}`);
        if (!list) return;

        if (sortableInGroups[gid]) { sortableInGroups[gid].destroy(); delete sortableInGroups[gid]; }
        sortableInGroups[gid] = new Sortable(list, {
            group: sameListOnly(list),
            animation: 150,
            draggable: ".project-card",
            forceFallback: true,
            fallbackOnBody: true,
            onStart: onStartCommon,
            onEnd: (evt) => {
                const pid = evt.item?.dataset?.projectId;
                const originGid = getContainerGid(evt.from);
                const { headerGid, listEl } = getDropHit(evt);
                const { x, y } = getDropPoint(evt);
                onEndCommon(evt);
                if (!pid) return;

                // ヘッダー命中 → 別フォルダーの先頭へ
                if (headerGid && headerGid !== originGid) {
                    try { evt.item?.remove(); } catch (_) {}
                    moveProjectToFolderTop(pid, headerGid);
                    updateFolderCounts();
                    renderLogs();
                    return;
                }
                //「元リストの矩形の外」かつ「ヘッダー/どのリスト上でもない」→ 未所属へ
                const fromRect = evt.from?.getBoundingClientRect?.();
                const outsideFrom = fromRect ? !pointInRect(x, y, fromRect, 0) : false;
                if (outsideFrom && !listEl && !headerGid) {
                    moveProjectToFolderTop(pid, null);
                    updateFolderCounts();
                    renderLogs();
                    return;
                }
                // 同一フォルダー内の並び替え
                if (listEl === evt.from || evt.from === evt.to) {
                    applyDomOrderToGroups();
                    updateFolderCounts();
                    return;
                }
                // どの条件にも該当しなければ未所属へ
                moveProjectToFolderTop(pid, null);
                updateFolderCounts();
                renderLogs();
            }
        });
    });
}



function applyDomOrderToGroups() {
    projectGroups.order.forEach(gid => {
        const list = document.getElementById(`groupList_${gid}`);
        if (!list) return;

        const ids = Array.from(list.querySelectorAll(".project-card")).map(el => el.dataset.projectId);
        projectGroups.items[gid] = ids;
    });
    saveProjectGroups();
}

function applyDomOrderToUngrouped() {
    const list = document.getElementById("ungroupedList");
    if (!list) return;

    projectGroups.ungroupedOrder = Array.from(list.querySelectorAll(".project-card")).map(el => el.dataset.projectId);
    saveProjectGroups();
}


function updateFolderCounts() {
    // フォルダーの件数を即時反映
    projectGroups.order.forEach(gid => {
        const wrap = document.querySelector(`[data-group-id="${gid}"]`);
        if (!wrap) return;

        const countSpan = wrap.querySelector('.group-count');
        if (!countSpan) return;

        const count = (projectGroups.items[gid] ?? []).length;
        countSpan.textContent = `(${count})`;
    });
    // 未所属の件数を即時反映
    const ungroupedCountEl = document.getElementById('ungroupedTitleCount');
    if (ungroupedCountEl) {
        const count = getUngroupedProjectIds().length;
        ungroupedCountEl.textContent = `(${count})`;
    }
}


function buildProjectCard(project, triggerType = "manual") {
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
    wrapper.dataset.projectId = project.id;
    wrapper.className = "bg-white px-4 py-3 rounded-md shadow log-wrapper project-card";
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
            ${project.id}
            <span class='text-sm text-gray-500 ml-2'>
                ${project.name ?? ''}
            </span>
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
    return wrapper;
}


// 全体ラッパー描画
function renderLogs(triggerType = "manual", options = {}) {
    const { preserveSelection = false } = options;
    projectLogsDiv.innerHTML = "";
    if (!preserveSelection) {
        clearSelection();
    } else {
        updateButtons("btnEdit", "btnDelete", selectedLogIndex !== null);
    }

    // 未所属を常に表示
    const ungroupedIds = getUngroupedProjectIds();
    const ungroupedWrap = document.createElement("div");
    ungroupedWrap.className = "space-y-3 mb-4";

    const title = document.createElement("div");
    title.className = "text-sm text-gray-500 flex items-center gap-2";
    title.innerHTML = `<i class="ri-stack-line"></i> 未所属 <span id="ungroupedTitleCount" class="text-xs text-gray-400"></span>`;
    ungroupedWrap.appendChild(title);

    const list = document.createElement("div");
    list.id = "ungroupedList";
    const isEmpty = ungroupedIds.length === 0;
    list.className = `space-y-3 ${isEmpty ? '' : ''}`;

    if (!isEmpty) {
        ungroupedIds.map(id => settings.find(s => s.id === id)).filter(Boolean).forEach(pj => list.appendChild(buildProjectCard(pj, triggerType)));
    }
    ungroupedWrap.appendChild(list);
    projectLogsDiv.appendChild(ungroupedWrap);

    // フォルダー群
    const groupsContainer = document.createElement("div");
    groupsContainer.id = "groupsContainer";
    groupsContainer.className = "space-y-3";

    projectGroups.order.forEach(gid => {
        const meta = projectGroups.meta[gid] ?? { title: "Folder", open: false };
        const items = projectGroups.items[gid] ?? [];

        const gWrap = document.createElement("div");
        gWrap.dataset.groupId = gid;
        gWrap.className = "bg-white rounded-md shadow border";

        // ヘッダー（左一帯クリックで開閉 / 右は編集・削除）
        const header = document.createElement("div");
        header.className = "group-header flex items-center justify-between px-3 py-2 border-b bg-slate-50";
        header.innerHTML = `
        <div class="group-title flex items-center gap-2 select-none rounded cursor-pointer hover:bg-slate-100 px-1 py-0.5" role="button" tabindex="0" aria-expanded="${meta.open}">
            <span class="caret text-blue-600 text-xs">
                ${meta.open ? '▼' : '▶'}
            </span>
            <span class="font-bold text-gray-700">
                ${meta.title}
            </span>
            <span class="group-count text-xs text-gray-500">
                (${items.length})
            </span>
        </div>
        <div class="group-actions flex items-center gap-3">
            <button class="text-xm text-gray-600 hover:text-gray-900" onclick="renameFolder('${gid}')" title="Rename">
                <i class="ri-edit-2-line"></i>
            </button>
            <button class="text-xm text-red-600 hover:text-red-800" onclick="removeFolder('${gid}')" title="Delete folder">
                <i class="ri-delete-bin-6-line"></i>
            </button>
        </div>
        `;
        gWrap.appendChild(header);

        // クリック/キーで開閉（右側は除外）
        const titleHit = header.querySelector('.group-title');
        titleHit?.addEventListener('click', (e) => {
            if (e.target && e.target.closest && e.target.closest('.group-actions')) return;
            toggleFolderOpen(gid);
        });
        titleHit?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFolderOpen(gid);
            }
        });
        if (meta.open) {
            const list = document.createElement("div");
            list.id = `groupList_${gid}`;
            list.className = "px-3 py-2 space-y-3";

            if (items.length === 0) {
                const empty = document.createElement("div");
                empty.className = "border border-dashed rounded-md py-3 px-4 text-center bg-slate-50";
                empty.innerHTML = `
                <div class="flex flex-col items-center justify-center gap-1 text-gray-400">
                    <i class="ri-folder-open-line text-2xl"></i>
                    <div class="text-sm">
                        フォルダー内に何もありません
                    </div>
                </div>
                `;
                list.appendChild(empty);
            } else {
                items.map(id => settings.find(s => s.id === id)).filter(Boolean).forEach(pj => list.appendChild(buildProjectCard(pj, triggerType)));
            }
            gWrap.appendChild(list);
        }
        groupsContainer.appendChild(gWrap);
    });
    projectLogsDiv.appendChild(groupsContainer);
    if (triggerType === "submitLog" || triggerType === "stopTimer" || triggerType === "deleteLog") {
        refreshTooltip();
    }
    setupSortables();
    updateFolderCounts();
    syncSelectionToList();
    syncSelectionToTooltip();
}


// ===================================
// --- Global Add --------------------
// ===================================

// ヘッダーボタンのセットアップ
(function setupGlobalAdd() {
    const btn = document.getElementById('globalAddBtn');
    const modal = document.getElementById('projectPickerModal');
    const closeBtn = document.getElementById('projectPickerClose');
    const searchInput = document.getElementById('projectPickerSearch');
    const listWrap = document.getElementById('projectPickerList');

    if (!btn || !modal || !closeBtn || !searchInput || !listWrap) return;

    btn.addEventListener('click', () => {
        if (typeof removeTooltip === 'function') removeTooltip(true);
        if (typeof clearSelection === 'function') clearSelection();

        searchInput.value = '';
        renderProjectPickerList(listWrap, '');
        modal.classList.remove('hidden');
        setTimeout(() => searchInput.focus(), 0);
    });

    function closePicker() { modal.classList.add('hidden'); }
    closeBtn.addEventListener('click', closePicker);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePicker();
    });
    window.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('hidden') && e.key === 'Escape') closePicker();
    });

    // 検索（逐次フィルタ）
    searchInput.addEventListener('input', () => {
        renderProjectPickerList(listWrap, searchInput.value.trim());
    });
})();

// リスト描画（未所属 → フォルダー順）
function renderProjectPickerList(container, keyword) {
    container.innerHTML = '';
    const kw = (keyword || '').toLowerCase();
    const makeSection = (title, ids) => {
        const sec = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'text-xs font-bold text-gray-500 flex items-center gap-2';
        header.innerHTML = `<i class="ri-folder-2-line"></i> ${title}`;
        sec.appendChild(header);

        const list = document.createElement('div');
        list.className = 'mt-2 grid gap-2 sm:grid-cols-2';

        const items = ids.map(id => settings.find(s => s.id === id)).filter(Boolean).filter(p => {
            if (!kw) return true;
            const idHit = (p.id || '').toLowerCase().includes(kw);
            const nameHit = (p.name || '').toLowerCase().includes(kw);
            return idHit || nameHit;
        });

        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-gray-400 text-xs';
            empty.textContent = '該当なし';
            list.appendChild(empty);
        } else {
            items.forEach(p => list.appendChild(buildProjectPickerItem(p)));
        }
        sec.appendChild(list);
        container.appendChild(sec);
    };
    // 未所属
    const ungroupedIds = getUngroupedProjectIds?.() || [];
    makeSection('未所属', ungroupedIds);
    // 各フォルダー（定義順）
    (projectGroups.order || []).forEach(gid => {
        const title = projectGroups.meta?.[gid]?.title || 'Folder';
        const ids = projectGroups.items?.[gid] || [];
        makeSection(title, ids);
    });
}

// リストの行（クリックで openModal(projectId) → 本登録モーダルへ）
function buildProjectPickerItem(project) {
    const div = document.createElement('button');
    div.type = 'button';
    div.className = `text-left w-full border rounded-md px-3 py-2 bg-white hover:bg-slate-50 flex items-center gap-3`;
    div.innerHTML = `
        <div class="min-w-0">
        <div class="font-bold text-gray-800 truncate">${project.id}</div>
        <div class="text-xs text-gray-500 truncate">${project.name || ''}</div>
        </div>
    `;
    div.addEventListener('click', () => {
        if (typeof removeTooltip === 'function') removeTooltip(true);
        if (typeof clearSelection === 'function') clearSelection();
        // モーダルを閉じてから既存の登録モーダルへ
        document.getElementById('projectPickerModal')?.classList.add('hidden');
        openModal(project.id);
    });
    return div;
}


// ===================================
// --- Timer -------------------------
// ===================================

// タイマー切替
function toggleTimer(projectId) {
    const now = new Date();

    // 他で計測中なら停止して切り替え
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
        return alert("１分未満の計測は作業記録として登録できません。");
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
                tooltip.className = "fixed z-[70] bg-white border text-xs p-2 shadow whitespace-nowrap max-w-[300px]";
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


// リスト側UI（checkboxと行ハイライト）へ選択を反映
function syncSelectionToList() {
    document.querySelectorAll('input[name="logSelect"]').forEach(el => { el.checked = false; });
    document.querySelectorAll('.log-row').forEach(row => row.classList.remove('bg-blue-100'));

    if (selectedLogIndex === null) return;

    // 表示されている明細内に該当チェックボックスがあれば同期
    const cb = document.getElementById(`log-${selectedLogIndex}`);
    if (cb) {
        cb.checked = true;
        cb.closest('.log-row')?.classList.add('bg-blue-100');
    }
}

// ツールチップ側UI（行ハイライト）へ選択を反映
function syncSelectionToTooltip() {
    const rows = document.querySelectorAll('.tt-log-row');
    rows.forEach(r => r.classList.remove('selected', 'bg-blue-100'));

    if (selectedLogIndex === null) return;

    const target = Array.from(rows).find(r => Number(r.dataset.index) === selectedLogIndex);
    if (target) target.classList.add('selected', 'bg-blue-100');
}


// 選択状態をクリア
function clearSelection() {
    selectedLogIndex = null;
    updateButtons("btnEdit", "btnDelete", false);
    document.querySelectorAll('.tt-log-row.selected').forEach(el => el.classList.remove('selected', 'bg-blue-100'));
    document.querySelectorAll('input[name="logSelect"]').forEach(el => { el.checked = false; });
    document.querySelectorAll('.log-row').forEach(row => row.classList.remove('bg-blue-100'));
}

// ツールチップ行の選択トグル
function selectLogFromTooltip(index, rowEl) {
    if (selectedLogIndex === index) {
        clearSelection();
        return;
    }

    document.querySelectorAll('.tt-log-row.selected').forEach(el => el.classList.remove('selected', 'bg-blue-100'));
    selectedLogIndex = index;
    if (rowEl) rowEl.classList.add('selected', 'bg-blue-100');
    updateButtons("btnEdit", "btnDelete", true);
    syncSelectionToList();
}


// 今日の作業ツールチップ
function showTooltip(forceFixed = false) {
    removeTooltip(/* shouldClearSelection */ false);
    const today = getTodayDate();
    const logsForTodayWithIndex = logs.map((log, idx) => ({ ...log, __idx: idx })).filter(l => l.date === today);

    if (logsForTodayWithIndex.length === 0) return;

    const tooltip = document.createElement("div");
    tooltip.classList.add("tooltip-fixed");
    tooltip.className = `fixed z-50 bg-slate-100 border border-slate-400 text-base text-gray-800 p-3 rounded-md max-w-[70vw] space-y-2 shadow-2xl`;
    // ヘッダー
    const header = document.createElement('div');
    header.className = "text-sm font-bold text-gray-700";
    header.textContent = `今日の作業 (${today})`;
    tooltip.appendChild(header);
    // リスト
    const list = document.createElement('div');
    list.className = "space-y-1";
    logsForTodayWithIndex.forEach(item => {
        const row = document.createElement('div');
        row.className = `tt-log-row whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-between gap-3 px-2 py-1 rounded cursor-pointer hover:bg-blue-50`;
        row.dataset.index = String(item.__idx);

        const content = document.createElement('div');
        content.className = "min-w-0";
        content.innerHTML = `<strong class="text-gray-900">${item.project}</strong>
                            ：${(+item.hours).toFixed(2)}H
                            <span class="text-gray-600">${item.memo ? ' - ' + item.memo : ''}</span>`;
        row.addEventListener('click', () => selectLogFromTooltip(item.__idx, row));
        row.appendChild(content);
        list.appendChild(row);
    });
    tooltip.appendChild(list);
    // ✖ボタン（固定モードのみ）
    if (forceFixed) {
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = `<i class="ri-close-large-line"></i>`;
        closeBtn.className = `absolute -top-5 -right-3 bg-white border border-gray-300 rounded-full w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 shadow-md`;
        closeBtn.onclick = () => removeTooltip(true);
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
        syncSelectionToTooltip();
    });
}

// ツールチップを削除
function removeTooltip(shouldClearSelection = false) {
    if (footerToday._tooltip) {
        footerToday._tooltip.remove();
        footerToday._tooltip = null;
    }
    isTooltipFixed = false;

    if (shouldClearSelection) {
        clearSelection();
    }
}

// ツールチップを更新
function refreshTooltip() {
    if (!isTooltipFixed) return;

    removeTooltip();
    showTooltip(true);
}
