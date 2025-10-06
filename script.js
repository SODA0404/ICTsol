// --- JavaScript（機能） ---

// --- ▼▼▼ 追加した処理 ▼▼▼ ---

// HTMLの要素をあらかじめ取得しておく（登録画面関連）
const registerContainer = document.getElementById('register-container');
const scheduleContainer = document.getElementById('schedule-container');
const registerForm = document.getElementById('register-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// 登録フォームが送信されたときの処理
registerForm.addEventListener('submit', function(event) {
    // 既定の送信動作（ページのリロード）をキャンセル
    event.preventDefault();

    // 入力された値を取得（前後の空白は削除）
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // いずれかの入力が空なら処理を中断
    if (!username || !password) {
        alert('ユーザー名とパスワードの両方を入力してください。');
        return;
    }

    // 登録画面を非表示にし、スケジュール画面を表示する
    registerContainer.classList.add('hidden');
    scheduleContainer.classList.remove('hidden');
});

// --- ▲▲▲ 追加した処理 ▲▲▲ ---


// --- ▼▼▼ 以下は既存のスケジュール機能のコード ▼▼▼ ---

// 曜日の配列をあらかじめ定義しておく
const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

// HTMLの要素をあらかじめ取得しておく（スケジュール関連）
const form = document.getElementById('schedule-form');
const dateInput = document.getElementById('schedule-date');
const timeInput = document.getElementById('schedule-time');
const textInput = document.getElementById('schedule-text');
const scheduleList = document.getElementById('schedule-list');

// スケジュール追加フォームが送信されたときの処理
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
    // --- 曜日を取得する処理を追加 ---
    const dateObj = new Date(date + 'T00:00'); // タイムゾーン問題を避けるため'T00:00'を付ける
    const dayIndex = dateObj.getDay(); // 曜日を数値で取得 (0=日, 1=月...)
    const dayOfWeek = daysOfWeek[dayIndex]; // 配列から曜日の文字を取得
    // --------------------------------

    // 新しいli要素（リストの1行）を作成
    const listItem = document.createElement('li');

    // li要素の中身のHTMLを作成（曜日を表示に含める）
    listItem.innerHTML = `
        <span class="schedule-item-content">
            <strong>${date} (${dayOfWeek})</strong> ${time} - ${text}
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