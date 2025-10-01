const modal = document.getElementById("modal");
const scrollBtn = document.getElementById("scrollTopBtn");


// ===================================
// --- Window ------------------------
// ===================================

// スクロールボタン
window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
        scrollBtn.classList.remove("opacity-0", "pointer-events-none");
        scrollBtn.classList.add("opacity-100");
    } else {
        scrollBtn.classList.add("opacity-0", "pointer-events-none");
        scrollBtn.classList.remove("opacity-100");
    }
});

scrollBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});


// ===================================
// --- Function ----------------------
// ===================================

// 編集・削除ボタンの状態更新
function updateButtons(editBtnId, deleteBtnId, hasSelection) {
    const editBtn = document.getElementById(editBtnId);
    const deleteBtn = document.getElementById(deleteBtnId);
    if (editBtn) editBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
}
