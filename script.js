document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = '$2a$10$.Xv9dQJFAEDIV5pO50uXfeAWRhkkHcN94Rwc.0fBMgkNy8iauclHu'; // 自分のAPIキー
    const BIN_ID = '68e353e1d0ea881f4096e4f5'; // 自分のBin ID
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/68e353e1d0ea881f4096e4f5`;

    // --- 要素取得 ---
    const containers = {
        welcome: document.getElementById('welcome-container'),
        register: document.getElementById('register-container'),
        login: document.getElementById('login-container'),
        schedule: document.getElementById('schedule-container')
    };
    const forms = {
        register: document.getElementById('register-form'),
        login: document.getElementById('login-form'),
        schedule: document.getElementById('schedule-form')
    };
    const buttons = {
        showLogin: document.getElementById('show-login-btn'),
        showRegister: document.getElementById('show-register-btn'),
        back: document.querySelectorAll('.back-btn'),
        logout: document.getElementById('logout-btn'),
        prev: document.getElementById('prev-btn'),
        today: document.getElementById('today-btn'),
        next: document.getElementById('next-btn'),
        dayView: document.getElementById('day-view-btn'),
        weekView: document.getElementById('week-view-btn'),
        monthView: document.getElementById('month-view-btn'),
        googleSync: document.getElementById('google-sync-btn')
    };
    const scheduleElements = {
        list: document.getElementById('schedule-list'),
        currentUserSpan: document.getElementById('current-user'),
        calendarView: document.getElementById('calendar-view'),
        calendarTitle: document.getElementById('calendar-title')
    };

    // --- アプリケーションの状態管理 ---
    let currentUser = null;
    let currentView = 'week';
    let currentDate = new Date();

    // --- Google Calendar 同期用 ---
    const CLIENT_ID = '163499005911-6v32s29gtk4t4oegd4077q4k5u0aa4ps.apps.googleusercontent.com';
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

    let tokenClient;
    let gapiInited = false;
    let gisInited = false;
    let accessToken = null;

    function gapiLoaded() {
        gapi.load('client', async () => {
            await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
            gapiInited = true;
            console.log('GAPIクライアント初期化完了');
        });
    }

    function gisLoaded() {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (resp) => {
                if (resp.error) {
                    console.error(resp);
                    alert('Googleログインに失敗しました');
                    return;
                }
                accessToken = resp.access_token;
                console.log('ログイン成功:', accessToken);
                alert('Googleログイン成功！これで同期できます。');
                syncSchedulesToGoogle();
            },
        });
        gisInited = true;
    }

function syncSchedulesToGoogle() {
    if (!currentUser) return alert('まずログインしてください');
    if (!accessToken) return alert('Googleログインしてください');

    const usersData = JSON.parse(localStorage.getItem('scheduleAppUsers') || '{}');
    const schedules = usersData[currentUser]?.schedules || [];

    schedules.forEach(async (s) => {
        const startDate = new Date(`${s.date}T${s.time}`);
        if (isNaN(startDate)) {
            console.error('日付解析エラー:', s);
            return;
        }
        const endDate = new Date(startDate.getTime() + 60*60*1000); // 1時間予定
        const event = {
            summary: s.text,
            start: { dateTime: startDate.toISOString(), timeZone: 'Asia/Tokyo' },
            end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Tokyo' },
        };
        try {
            const response = await gapi.client.calendar.events.insert({ calendarId: 'primary', resource: event });
            console.log('Googleカレンダーに追加:', response);
        } catch (err) {
            console.error('追加失敗:', err);
        }
    });
    alert('全ての予定をGoogleカレンダーに同期しました！');
}

    // --- ユーティリティ ---
    const showScreen = (screen) => Object.values(containers).forEach(c => c.classList.toggle('hidden', c !== screen));
    const formatDate = (date, options) => new Intl.DateTimeFormat('ja-JP', options).format(date);
    
    // --- データ保存・読み込み (JSONBin.io) ---
    async function getUsersData() {
        try {
            const response = await fetch(`${JSONBIN_URL}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            if (response.status === 404) {
                return {}; // Binが空か存在しない場合は空のオブジェクトを返す
            }
            if (!response.ok) throw new Error('データの読み込みに失敗しました。');
            const data = await response.json();
            // Binが空の場合、recordが{}ではなく空文字列""になることがあるため、その対策
            return (typeof data.record === 'object' && data.record !== null) ? data.record : {};
        } catch (error) {
            console.error(error);
            alert(error.message);
            return {};
        }
    }

    async function saveUsersData(data) {
        try {
            const response = await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('データの保存に失敗しました。');
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    // --- 主要なビュー更新関数 ---
    async function updateView() {
        if (!currentUser) return;
        const usersData = await getUsersData();
        const schedules = usersData[currentUser]?.schedules || [];
        
        // アクティブなビューボタン更新
        buttons.dayView.classList.remove('active');
        buttons.weekView.classList.remove('active');
        buttons.monthView.classList.remove('active');
        buttons[`${currentView}View`].classList.add('active');

        if (currentView === 'day') renderDayView(schedules);
        else if (currentView === 'week') renderWeekView(schedules);
        else if (currentView === 'month') renderMonthView(schedules);

        renderScheduleList(schedules);
    }

    // --- 各ビュー描画 ---
    function renderDayView(schedules) {
        scheduleElements.calendarTitle.textContent = formatDate(currentDate, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        scheduleElements.calendarView.innerHTML = '';
        scheduleElements.calendarView.className = 'day-view';
        const dayElement = createDayElement(currentDate);
        const daySchedules = schedules.filter(s => s.date === currentDate.toISOString().split('T')[0])
                                      .sort((a,b) => a.time.localeCompare(b.time));

        daySchedules.forEach(s => dayElement.body.appendChild(createScheduleItem(s)));
        scheduleElements.calendarView.appendChild(dayElement.element);
    }

    function renderWeekView(schedules) {
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = startOfWeek.getDay();
        const mondayOffset = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
        startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        scheduleElements.calendarTitle.textContent = `${formatDate(startOfWeek, {month:'long', day:'numeric'})} - ${formatDate(endOfWeek, {month:'long', day:'numeric'})}`;
        scheduleElements.calendarView.innerHTML = '';
        scheduleElements.calendarView.className = 'week-view';
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const dayElement = createDayElement(day);
            const daySchedules = schedules.filter(s => s.date === day.toISOString().split('T')[0])
                                          .sort((a,b) => a.time.localeCompare(b.time));
            daySchedules.forEach(s => dayElement.body.appendChild(createScheduleItem(s)));
            scheduleElements.calendarView.appendChild(dayElement.element);
        }
    }

    function renderMonthView(schedules) {
        scheduleElements.calendarTitle.textContent = formatDate(currentDate, { year: 'numeric', month: 'long' });
        scheduleElements.calendarView.innerHTML = '';
        scheduleElements.calendarView.className = 'month-view';
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const dayOfWeek = firstDayOfMonth.getDay();
        const mondayOffset = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(firstDayOfMonth.getDate() - mondayOffset);
        for (let i = 0; i < 42; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            const dayElement = createDayElement(day);

            if (day.getMonth() !== currentDate.getMonth()) dayElement.element.classList.add('other-month');

            const daySchedules = schedules.filter(s => s.date === day.toISOString().split('T')[0])
                                          .sort((a,b) => a.time.localeCompare(b.time));
            daySchedules.forEach(s => dayElement.body.appendChild(createScheduleItem(s)));
            scheduleElements.calendarView.appendChild(dayElement.element);
        }
    }

    function renderScheduleList(schedules) {
        scheduleElements.list.innerHTML = '';
        schedules.sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
                 .forEach(s => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="schedule-item-content">
                    <strong>${s.date} (${new Intl.DateTimeFormat('ja-JP', {weekday:'short'}).format(new Date(s.date))})</strong> ${s.time} - ${s.text}
                </span>
                <button class="delete-btn">削除</button>`;
            scheduleElements.list.appendChild(li);
        });
    }

    // --- DOM要素作成ヘルパー ---
    function createDayElement(date) {
        const element = document.createElement('div');
        element.classList.add('calendar-day');
        if (date.toDateString() === new Date().toDateString()) element.classList.add('today');

        const header = document.createElement('div');
        header.classList.add('calendar-day-header');
        header.textContent = formatDate(date, currentView === 'month' ? {day:'numeric'} : {month:'numeric', day:'numeric', weekday:'short'});

        const body = document.createElement('div');
        body.classList.add('calendar-day-body');

        element.append(header, body);
        return { element, body };
    }

    function createScheduleItem(schedule) {
        const item = document.createElement('div');
        item.classList.add('calendar-schedule-item');
        item.textContent = `${schedule.time} ${schedule.text}`;
        return item;
    }

    // --- イベントリスナー設定 ---
    function setupEventListeners() {
        buttons.showLogin.addEventListener('click', () => showScreen(containers.login));
        buttons.showRegister.addEventListener('click', () => showScreen(containers.register));
        buttons.back.forEach(btn => btn.addEventListener('click', () => showScreen(containers.welcome)));

        forms.register.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = forms.register.querySelector('input[type="text"]').value.trim();
            const password = forms.register.querySelector('input[type="password"]').value.trim();
            if (!username || !password) return alert('全て入力してください。');
            const usersData = await getUsersData();
            if (usersData[username]) return alert('そのユーザー名は既に使用されています。');
            usersData[username] = { password, schedules: [] };
            await saveUsersData(usersData);
            await loginUser(username);
        });

        forms.login.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = forms.login.querySelector('input[type="text"]').value.trim();
            const password = forms.login.querySelector('input[type="password"]').value.trim();
            const usersData = await getUsersData();
            if (usersData[username]?.password === password) {
                await loginUser(username);
            } else {
                alert('ユーザー名またはパスワードが間違っています。');
            }
        });

        buttons.logout.addEventListener('click', () => {
            currentUser = null;
            showScreen(containers.welcome);
        });

forms.schedule.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = forms.schedule.querySelector('input[type="date"]').value;
    const time = forms.schedule.querySelector('input[type="time"]').value;
    const text = forms.schedule.querySelector('input[type="text"]').value.trim();
    if(!date || !time || !text) return alert('全て入力してください。');

    const usersData = await getUsersData();
    if (!usersData[currentUser]) {
        usersData[currentUser] = { password: '', schedules: [] };
    }
    usersData[currentUser].schedules.push({ date, time, text });

    await saveUsersData(usersData);
    localStorage.setItem('scheduleAppUsers', JSON.stringify(usersData));

    forms.schedule.reset();
    await updateView();
});

scheduleElements.list.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const content = e.target.previousElementSibling.textContent;
        const match = content.match(/(\d{4}-\d{2}-\d{2}).*?(\d{2}:\d{2})\s-\s(.+)/);
        if (match) {
            const [_, date, time, text] = match.map(item => item.trim());
            const usersData = await getUsersData(); 
            const schedules = usersData[currentUser].schedules;
            const index = schedules.findIndex(s => s.date === date && s.time === time && s.text === text);
            if (index > -1) {
                schedules.splice(index, 1);
                await saveUsersData(usersData);
                await updateView();
            }
        }
    }
});


        buttons.today.addEventListener('click', () => {
            currentDate = new Date();
            updateView();
        });
        buttons.prev.addEventListener('click', () => {
            if (currentView === 'day') currentDate.setDate(currentDate.getDate() - 1);
            if (currentView === 'week') currentDate.setDate(currentDate.getDate() - 7);
            if (currentView === 'month') currentDate.setMonth(currentDate.getMonth() - 1);
            updateView();
        });
        buttons.next.addEventListener('click', () => {
            if (currentView === 'day') currentDate.setDate(currentDate.getDate() + 1);
            if (currentView === 'week') currentDate.setDate(currentDate.getDate() + 7);
            if (currentView === 'month') currentDate.setMonth(currentDate.getMonth() + 1);
            updateView();
        });
        buttons.dayView.addEventListener('click', () => { currentView = 'day'; updateView(); });
        buttons.weekView.addEventListener('click', () => { currentView = 'week'; updateView(); });
        buttons.monthView.addEventListener('click', () => { currentView = 'month'; updateView(); });

        // Google Calendar 同期ボタン
        buttons.googleSync.addEventListener('click', () => {
            if (!gisInited) return alert('GISが初期化されていません。少々お待ちください');
            tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    }

    async function loginUser(username) {
        currentUser = username;
        scheduleElements.currentUserSpan.textContent = currentUser;
        forms.register.reset();
        forms.login.reset();
        currentDate = new Date();
        currentView = 'week';
        await updateView();
        showScreen(containers.schedule);
    }

    // --- 初期化 ---
    setupEventListeners();
    showScreen(containers.welcome);
    gapiLoaded();
    gisLoaded();
});

// ############# 勉強内容登録用のボタン ###############
// 1. 必要なHTML要素を取得する
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modal = document.getElementById('modal');
const studyForm = document.getElementById('studyForm');

// 2. 「勉強内容の追加」ボタンが押されたときの処理
openModalBtn.addEventListener('click', () => {
    modal.classList.remove('hidden'); // hiddenクラスを削除して表示
});

// 3. 閉じるボタンが押されたときの処理
closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden'); // hiddenクラスを追加して非表示
});

// 4. 背景がクリックされた時も閉じるようにする
modal.addEventListener('click', (event) => {
    // クリックされたのが背景（modal-overlay）自身なら閉じる
    if (event.target === modal) {
         modal.classList.add('hidden');
    }
});

// 5. フォームの「登録」ボタンが押されたときの処理
studyForm.addEventListener('submit', (event) => {
    // フォームのデフォルトの送信動作をキャンセル（ページがリロードされなくなる）
    event.preventDefault(); 
    
    // 入力フォームの要素を取得
    const contentInput = document.getElementById('studyContent');
    const subjectInput = document.getElementById('subject');
    const timeInput = document.getElementById('studyTime');
    
    // ★入力された値を変数として保存する
    const studyData = {
        content: contentInput.value,
        subject: subjectInput.value,
        time: parseInt(timeInput.value, 10) // 文字列を数値に変換
    };
    
    // 保存されたデータを確認（ブラウザの開発者ツールでコンソールを開いてください）
    console.log('登録されたデータ:', studyData);
    alert(`「${studyData.subject}」を${studyData.time}分間、記録しました！`);
    
    // フォームの中身をリセット
    studyForm.reset();
    
    // ポップアップを閉じる
    modal.classList.add('hidden');
});
// ###############################################