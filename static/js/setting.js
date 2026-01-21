const inputId = document.getElementById("projectId");
const inputName = document.getElementById("projectName");
const inputEstimate = document.getElementById("estimate");
const inputDue = document.getElementById("dueDate");
const projectListDiv = document.getElementById("projectList");

let selectedProjectId = null;
let settings = JSON.parse(localStorage.getItem("project_settings") || "[]");


// ===================================
// --- Window ------------------------
// ===================================

// 初期化（load時）
window.addEventListener("load", () => {
    renderList();
    showStorageUsage();
});


// ===================================
// --- Modal -------------------------
// ===================================

// モーダル関数(開く)
function openModal() {
    modal.classList.remove("hidden");
    inputId.value = "";
    inputName.value = "";
    inputEstimate.value = "";
    inputDue.value = "";
}

// モーダル関数(閉じる)
function closeModal() {
    modal.classList.add("hidden");
}

// 作業コード選択モーダル
const ADD_PROJ_CODE_PRESETS = [
    { code: "7301", name: "庶務･出図･コピー" },
    { code: "7302", name: "点検･清掃･安全" },
    { code: "7303", name: "朝礼・ミーティング" },
    { code: "7304", name: "改善･教育･訓練" },
    { code: "7305", name: "会社行事" },
    { code: "7306", name: "間接応援" },
    { code: "7307", name: "機械修理" },
    { code: "7308", name: "組合活動" },
    { code: "7309", name: "雑務" },
    { code: "7314", name: "委託業務" },
    { code: "7318", name: "見積業務" },
    { code: "7319", name: "販売業務" },
    { code: "7320", name: "生産管理" },
    { code: "7321", name: "生産周旋" },
    { code: "7322", name: "工事管理" },
    { code: "7323", name: "客先立会・打合せ" },
    { code: "7324", name: "改善" },
    { code: "7330", name: "金型見積り" },
    { code: "7331", name: "お客様部品見積り" },
    { code: "7332", name: "工事登録(営業購買)" },
    { code: "7333", name: "納品処理(営業購買)" },
    { code: "7334", name: "発送・出荷手配(営業)" },
    { code: "7335", name: "社内進捗管理(営業)" },
    { code: "7336", name: "顧客進捗管理(営業)" },
    { code: "7337", name: "営業管理(営業)" },
    { code: "7338", name: "営業活動(営業)" },
    { code: "7350", name: "解析･ﾓﾃﾞﾙ作成" },
    { code: "7351", name: "ブランク展開（見積用）" },
    { code: "7352", name: "成形モデル作成（見積用）" },
    { code: "7353", name: "成形性解析（見積用）" },
    { code: "7354", name: "S/B解析（見積用）" },
    { code: "7355", name: "解析結果報告書作成（見積用）" },
    { code: "7356", name: "部内大型投資（設備導入等）" },
    { code: "7357", name: "部内業務改善（生産性改善等）" },
    { code: "7358", name: "特命事項（トップから依頼された業務）" },
    { code: "7401", name: "プレス量産" },
    { code: "7510", name: "MC打合せ1" },
    { code: "7511", name: "MC打合せ2" },
    { code: "7512", name: "MC打合せ3" },
    { code: "7513", name: "精密打合せ1" },
    { code: "7514", name: "精密打合せ2" },
    { code: "7515", name: "精密打合せ3" },
    { code: "7516", name: "汎用機打合せ1" },
    { code: "7517", name: "汎用機打合せ2" },
    { code: "7518", name: "汎用機打合せ3" },
    { code: "7519", name: "日報・対策書入力" },
    { code: "7520", name: "出退勤管理" },
    { code: "7521", name: "人時間作業日報処理" },
    { code: "7522", name: "機械時間日報処理" },
    { code: "7523", name: "移動表の完了処理" },
    { code: "7524", name: "工程設定" },
    { code: "7525", name: "移動表の作成" },
    { code: "7526", name: "在庫管理" },
    { code: "7527", name: "表面処理品の処理" },
    { code: "7528", name: "熱処理品の処理" },
    { code: "7529", name: "イソナイト品の処理" },
    { code: "7530", name: "原材料品の処理" },
    { code: "7531", name: "材料搬入" },
    { code: "7532", name: "保守" },
    { code: "7533", name: "清掃" },
    { code: "7540", name: "業務管理" },
    { code: "7541", name: "計測機管理" },
    { code: "7542", name: "品質不良対応" },
    { code: "7543", name: "サンプル品調査" },
    { code: "7777", name: "部品完成処理" },
    { code: "8888", name: "工事完了処理" }
];

// 開く/閉じる
function openProjCodePicker() {
    const modal  = document.getElementById('projCodePickerModal');
    const search = document.getElementById('projCodeSearch');
    const list   = document.getElementById('projCodeList');
    if (!modal || !search || !list) return;

    search.value = '';
    renderProjCodeList('');
    modal.classList.remove('hidden');
    setTimeout(() => search.focus(), 0);
}

function closeProjCodePicker() {
    const modal  = document.getElementById('projCodePickerModal');
    const search = document.getElementById('projCodeSearch');
    const list   = document.getElementById('projCodeList');
    if (!modal) return;

    modal.classList.add('hidden');
    if (search) search.value = '';
    if (list)   list.innerHTML = '';
}

// リスト描画
function renderProjCodeList(keyword) {
    const container = document.getElementById('projCodeList');
    if (!container) return;

    container.innerHTML = "";
    const normalize = s => (s || "").replace(/\u3000/g, " ").toLowerCase();
    const kw = normalize(keyword);
    const items = ADD_PROJ_CODE_PRESETS.filter(p => {
        if (!kw) return true;
        return (p.code || "").toLowerCase().includes(kw) || (p.name || "").toLowerCase().includes(kw);
    });

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'text-gray-400 text-xs';
        empty.textContent = '該当なし';
        container.appendChild(empty);
        return;
    }
    items.forEach(p => container.appendChild(buildProjCodeItem(p)));
}

function buildProjCodeItem(preset) {
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
    btn.addEventListener('click', () => chooseProjCode(preset));
    return btn;
}

// 選択 → 入力へ反映して閉じる
function chooseProjCode(preset) {
    const idInput = document.getElementById('projectId');
    const nameInput = document.getElementById('projectName');
    if (!idInput || !nameInput) return;

    idInput.value = preset.code || '';
    nameInput.value = preset.name || '';
    closeProjCodePicker();
    // 次操作をしやすいよう ID → Name の順にフォーカス遷移
    if (idInput.value) {
        nameInput.focus();
    } else {
        idInput.focus();
    }
}

// 初期バインド
(function setupProjCodePicker(){
    const btn = document.getElementById('projCodePickerBtn');
    const modal = document.getElementById('projCodePickerModal');
    const closeBtn = document.getElementById('projCodePickerClose');
    const search = document.getElementById('projCodeSearch');

    if (!btn || !modal || !closeBtn || !search) return;

    btn.addEventListener('click', openProjCodePicker);
    closeBtn.addEventListener('click', closeProjCodePicker);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProjCodePicker(); });
    window.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('hidden') && e.key === 'Escape') closeProjCodePicker();
    });
    search.addEventListener('input', () => renderProjCodeList(search.value.trim()));
    search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const first = modal.querySelector('#projCodeList button');
            if (first) first.click();
        }
    });
})();


// ===================================
// --- Main --------------------------
// ===================================

// 保存
function saveSettings() {
    localStorage.setItem("project_settings", JSON.stringify(settings));
    closeModal();
    renderList();
    showStorageUsage();
}

// 登録
function submitProject() {
    const id = inputId.value.trim();
    const name = inputName.value.trim();
    const estimate = inputEstimate.value ? Number(inputEstimate.value) : null;
    const due = inputDue.value || null;
    if (!id) {
        return alert("必須項目を入力してください。");
    }

    // 編集時にIDが変更されたら旧データ削除
    if (selectedProjectId && selectedProjectId !== id) {
        settings = settings.filter(p => p.id !== selectedProjectId);
    }
    if (settings.some(p => p.id === id)) {
        if (!confirm(`${id} は既に存在します。上書きしてもよろしいですか？`)) {
            return;
        }
        settings = settings.filter(p => p.id !== id);
    }
    settings.push({ id, name, estimate, due });
    saveSettings();
}

// 編集
function editProject(id) {
    const p = settings.find(p => p.id === id);
    if (!p) return;

    inputId.value = p.id;
    inputName.value = p.name;
    inputEstimate.value = p.estimate;
    inputDue.value = p.due;
    selectedProjectId = p.id;
    modal.classList.remove("hidden");
}

function editSelected() {
    if (!selectedProjectId) return;

    editProject(selectedProjectId);
}


// 削除
function deleteProject(id) {
    if (!confirm(`${id} を削除しますか？`)) return;

    settings = settings.filter(p => p.id !== id);
    saveSettings();
}

function deleteSelected() {
    if (!selectedProjectId) return;

    deleteProject(selectedProjectId);
}

// 選択
function selectProject(id) {
    document.querySelectorAll('input[name="projectSelect"]').forEach(cb => {
        cb.checked = false;
        cb.closest(".project-item")?.classList.remove("bg-blue-100");
    });

    const checkbox = document.getElementById(`select-${id}`);
    const wrapper = checkbox.closest(".project-item");

    if (selectedProjectId === id) {
        selectedProjectId = null;
    } else {
        checkbox.checked = true;
        selectedProjectId = id;
        wrapper?.classList.add("bg-blue-100");
    }
    updateButtons("btnEdit", "btnDelete", selectedProjectId !== null);
}

// 表示
function renderList() {
    projectListDiv.innerHTML = "";
    selectedProjectId = null;
    updateButtons("btnEdit", "btnDelete", selectedProjectId !== null);

    settings.forEach(p => {
        const div = document.createElement("div");
        div.className = "project-item bg-white shadow px-4 py-2 flex justify-between items-center rounded-md";

        div.innerHTML = `
        <div class="flex items-center gap-3">
            <input type="checkbox" id="select-${p.id}" name="projectSelect" onclick="selectProject('${p.id}')">
            <div>
                <p class="font-bold text-gray-800 text-lg">
                    ${p.id}
                    <span class='text-sm text-gray-500 ml-2'>
                        ${p.name ?? ''}
                    </span>
                </p>
                <div class="flex justify-between items-center mt-1">
                    <div class="flex gap-2 items-center text-sm text-gray-600">
                        <div class="flex items-center gap-2 min-w-[170px]">
                            <span class="text-xs text-white px-2 py-0.5 rounded ${p.estimate ? 'bg-green-500' : 'bg-gray-500'}">
                                工数
                            </span>
                            ${p.estimate != null ? `<span class="text-gray-600">Estimate：${p.estimate}H</span>` : " ー "}
                        </div>
                        <div class="flex items-center gap-2 min-w-[170px]">
                            <span class="text-xs text-white px-2 py-0.5 rounded ${p.due ? 'bg-green-500' : 'bg-gray-500'}">
                                納期
                            </span>
                            <span>
                                ${p.due ?? " ー "}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        projectListDiv.appendChild(div);
    });
}


// ===================================
// --- Footer ------------------------
// ===================================

// エクスポート
function exportData() {
    const data = {
        project_settings: settings,
        project_logs: JSON.parse(localStorage.getItem("project_logs") || "[]"),
        project_groups: JSON.parse(localStorage.getItem("project_groups") || "null")
    };
    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// インポート
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.project_settings) {
                alert("不正なバックアップファイルです。");
                return;
            }
            if (localStorage.getItem("project_settings") && !confirm("既存の設定を上書きします。続行しますか？")) {
                return;
            }
            // 設定の復元
            localStorage.setItem("project_settings", JSON.stringify(data.project_settings));
            // ログがある場合は復元
            if (data.project_logs) {
                localStorage.setItem("project_logs", JSON.stringify(data.project_logs));
            } else {
                localStorage.removeItem("project_logs");
            }
            // フォルダー構成（グループ）がある場合は復元
            if (data.project_groups) {
                localStorage.setItem("project_groups", JSON.stringify(data.project_groups));
            } else {
                localStorage.removeItem("project_groups");
            }
            alert("復元が完了しました！");
            location.reload();
        } catch (err) {
            console.error(err);
            alert("ファイルの読み込みに失敗しました。");
        }
    };
    reader.readAsText(file, "utf-8");
}

// エクスポート＆アプリ初期化
function resetAppData() {
    if (!confirm("データをエクスポートしてからアプリを初期化します。続行しますか？")) return;

    const data = {
        project_settings: JSON.parse(localStorage.getItem("project_settings") || "[]"),
        project_logs: JSON.parse(localStorage.getItem("project_logs") || "[]"),
        project_groups: JSON.parse(localStorage.getItem("project_groups") || "null")
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    localStorage.removeItem("project_settings");
    localStorage.removeItem("project_logs");
    localStorage.removeItem("project_groups");
    caches.keys().then(keys => {
        const scopePrefix = `${location.origin}/WorkTimeTracker`;
        keys.filter(key => key.startsWith(scopePrefix)).forEach(key => caches.delete(key));
    });
    alert("データをエクスポートしてアプリを初期化しました。");
    location.reload();
}

// ローカルストレージの使用容量を取得
function getLocalStorageUsage() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        total += key.length + value.length;
        }
    }
    // バイト → KB に変換（1文字 ≒ 1バイト）
    return (total / 1024).toFixed(2);
}

// ローカルストレージの使用容量を表示
function showStorageUsage() {
    const bar = document.getElementById("storageBar");
    const text = document.getElementById("storageText");
    if (!bar || !text) return;

    const usageKB = parseFloat(getLocalStorageUsage());
    const usageMB = (usageKB / 1024).toFixed(2);
    const percent = ((usageMB / 5.0) * 100).toFixed(1);

    // 色変更
    if (percent >= 90) {
        bar.className = "bg-red-500 h-2.5 rounded-full";
    } else if (percent >= 70) {
        bar.className = "bg-yellow-500 h-2.5 rounded-full";
    } else {
        bar.className = "bg-green-500 h-2.5 rounded-full";
    }

    bar.style.width = `${Math.min(percent, 100)}%`;
    text.textContent = `${usageMB} MB / 5.0 MB（ ${percent}% ）使用中`;
}
