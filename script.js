// --- JavaScript（機能） ---

// HTMLの要素をあらかじめ取得しておく
const form = document.getElementById('schedule-form');
const dateInput = document.getElementById('schedule-date');
const timeInput = document.getElementById('schedule-time');
const textInput = document.getElementById('schedule-text');
const scheduleList = document.getElementById('schedule-list');

// フォームが送信されたときの処理
form.addEventListener('submit', function(event) {
    // 既定の送信動作（ページのリロード）をキャンセル
    event.preventDefault(); 

    // 入力された値を取得
    const date = dateInput.value;
    const time = timeInput.value;
    const text = textInput.value;

    // いずれかの入力が空なら処理を中断
    if (!date || !time || !text) {
        alert('すべて入力してください。');
        return;
    }

    // 新しい予定をリストに追加する関数を呼び出す
    addSchedule(date, time, text);

    // フォームをリセット（入力欄を空にする）
    form.reset();
});

// 予定をリストに追加する関数
function addSchedule(date, time, text) {
    // 新しいli要素（リストの1行）を作成
    const listItem = document.createElement('li');

    // li要素の中身のHTMLを作成
    listItem.innerHTML = `
        <span class="schedule-item-content">
            <strong>${date}</strong> ${time} - ${text}
        </span>
        <button class="delete-btn">削除</button>
    `;

    // 作成したli要素をulリストに追加
    scheduleList.appendChild(listItem);
}

// 予定リスト全体でクリックイベントを監視（イベント移譲）
scheduleList.addEventListener('click', function(event) {
    // クリックされたのが「削除」ボタンの場合のみ処理を実行
    if (event.target.classList.contains('delete-btn')) {
        // クリックされたボタンの親要素であるliをリストから削除
        const listItem = event.target.parentElement;
        scheduleList.removeChild(listItem);
    }
});