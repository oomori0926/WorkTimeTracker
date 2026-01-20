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
