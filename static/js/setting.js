const modal = document.getElementById("modal");
const inputId = document.getElementById("projectId");
const inputName = document.getElementById("projectName");
const inputEstimate = document.getElementById("estimate");
const inputDue = document.getElementById("dueDate");
const list = document.getElementById("projectList");

let settings = JSON.parse(localStorage.getItem("project_settings") || "[]");
let editIndex = null;
let selectedProjectId = null;


// モーダル関数(開く)
function openModal() {
    modal.classList.remove("hidden");
    inputId.value = "";
    inputName.value = "";
    inputEstimate.value = "";
    inputDue.value = "";
    editIndex = null;
}


// モーダル関数(閉じる)
function closeModal() {
    modal.classList.add("hidden");
}


// 保存関数
function saveSettings() {
    localStorage.setItem("project_settings", JSON.stringify(settings));
    renderList();
    closeModal();
}


// 登録関数
function addProject() {
    const id = inputId.value.trim();
    const name = inputName.value.trim();
    const estimate = inputEstimate.value ? Number(inputEstimate.value) : null;
    const due = inputDue.value || null;
    if (!id) return alert("必須項目を入力してください。");

    const newItem = { id, name, estimate, due };
    if (editIndex !== null) {
        settings[editIndex] = newItem;
    } else {
        // 新規追加時、同じIDがあるか確認
        const existingIndex = settings.findIndex(p => p.id === id);
        if (existingIndex !== -1) {
            const confirmed = confirm(`${id} は既に登録されています。上書きしますか？`);
            if (!confirmed) return;
            settings[existingIndex] = newItem;
        } else {
            settings.push(newItem);
        }
    }
    saveSettings();
}


// 編集関数
function editProject(id) {
    const idx = settings.findIndex(p => p.id === id);
    if (idx === -1) return;
    const p = settings[idx];
    inputId.value = p.id;
    inputName.value = p.name ?? "";
    inputEstimate.value = p.estimate ?? "";
    inputDue.value = p.due ?? "";
    editIndex = idx;
    modal.classList.remove("hidden");
}

function editSelected() {
    if (!selectedProjectId) return;
    editProject(selectedProjectId);
}


// 削除関数
function deleteProject(id) {
    if (!confirm(`${id} を削除しますか？`)) return;
    settings = settings.filter(p => p.id !== id);
    saveSettings();
}

function deleteSelected() {
    if (!selectedProjectId) return;
    deleteProject(selectedProjectId);
}


// 表示関数
function renderList() {
    list.innerHTML = "";
    selectedProjectId = null;
    updateActionButtons();

    settings.forEach(p => {
        const div = document.createElement("div");
        div.className = "project-item bg-white shadow p-4 pt-2 pb-2 flex justify-between items-center rounded-xl";

        div.innerHTML = `
        <div class="flex items-center gap-3">
            <input type="checkbox" id="select-${p.id}" name="projectSelect" onclick="selectProject('${p.id}')">
            <div>
                <p class="font-bold text-gray-800 text-lg">
                    ${p.id}
                    <span class='text-sm text-gray-500 ml-2'>${p.name ?? ''}</span>
                </p>
                <div class="flex justify-between items-center mt-1">
                    <div class="flex gap-2 items-center text-sm text-gray-600">
                        <div class="flex items-center gap-2 min-w-[170px]">
                            <span class="text-xs text-white px-2 py-0.5 rounded ${p.estimate ? 'bg-green-500' : 'bg-gray-500'}">
                                工数
                            </span>
                            <span>Estimate：${p.estimate ?? " ー "}H</span>
                        </div>
                        <div class="flex items-center gap-2 min-w-[170px]">
                            <span class="text-xs text-white px-2 py-0.5 rounded ${p.due ? 'bg-green-500' : 'bg-gray-500'}">
                                納期
                            </span>
                            <span>Due：${p.due ?? " ー "}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        list.appendChild(div);
    });
}


// 選択関数
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
    updateActionButtons();
}


// 選択・ボタンの状態更新関数
function updateActionButtons() {
    const editBtn = document.getElementById("btnEdit");
    const deleteBtn = document.getElementById("btnDelete");
    const hasSelection = selectedProjectId !== null;
    editBtn.disabled = !hasSelection;
    deleteBtn.disabled = !hasSelection;
}


// エクスポート関数
function exportData() {
    const data = {
        project_settings: settings,
        project_logs: JSON.parse(localStorage.getItem("project_logs") || "[]")
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


// インポート関数
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // バックアップ形式チェック
            if (!data.project_settings) {
                alert("不正なバックアップファイルです。");
                return;
            }
            // 上書き確認
            if (localStorage.getItem("project_settings") && !confirm("既存の設定を上書きします。続行しますか？")) {
                return;
            }
            // 設定の復元
            localStorage.setItem("project_settings", JSON.stringify(data.project_settings));
            // ログがある場合は復元
            if (data.project_logs) {
                localStorage.setItem("project_logs", JSON.stringify(data.project_logs));
            }
            alert("復元が完了しました！");
            location.reload();
        } catch (err) {
            alert("ファイルの読み込みに失敗しました。");
        }
    };
    reader.readAsText(file, "utf-8");
}


// エクスポート＆アプリ初期化関数
function resetAppData() {
    if (!confirm("データをエクスポートしてからアプリを初期化します。続行しますか？")) return;

    // エクスポート
    const data = {
        project_settings: JSON.parse(localStorage.getItem("project_settings") || "[]"),
        project_logs: JSON.parse(localStorage.getItem("project_logs") || "[]")
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // このアプリのデータだけ削除
    localStorage.removeItem("project_settings");
    localStorage.removeItem("project_logs");
    // このアプリのキャッシュだけ削除
    caches.keys().then(keys => {
        const scopePrefix = `${location.origin}/WorkTimeTracker`;
        keys.filter(key => key.startsWith(scopePrefix))
            .forEach(key => caches.delete(key));
    });
    alert("データをエクスポートしてアプリを初期化しました。");
    location.reload();
}


renderList();