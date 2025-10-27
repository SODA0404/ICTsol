// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 定数 ---
    const API_KEY = '$2a$10$.Xv9dQJFAEDIV5pO50uXfeAWRhkkHcN94Rwc.0fBMgkNy8iauclHu'; // ご自身のキーに書き換えてください
    const BIN_ID = '68e353e1d0ea881f4096e4f5'; // ご自身のIDに書き換えてください
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
    const CLIENT_ID = '163499005911-6v32s29gtk4t4oegd4077q4k5u0aa4ps.apps.googleusercontent.com'; // ご自身のクライアントIDに
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

    // --- 要素取得 ---
    const views = document.querySelectorAll('.view');
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
        googleSync: document.getElementById('google-sync-btn'),
        themeToggle: document.getElementById('theme-toggle-checkbox')
    };
    const scheduleElements = {
        list: document.getElementById('schedule-list'),
        currentUserSpan: document.getElementById('current-user'),
        calendarView: document.getElementById('calendar-view'),
        calendarTitle: document.getElementById('calendar-title')
    };

    // --- 状態管理 ---
    let currentUser = null;
    let currentView = 'week';
    let currentDate = new Date();
    let tokenClient, gapiInited = false, gisInited = false, accessToken = null;

    // ===== ▼▼▼ 勉強記録機能 ▼▼▼ =====
    const addStudyLogBtn = document.getElementById('add-study-log-btn');
    const studyChoiceModal = document.getElementById('study-choice-modal');
    const timerLogModal = document.getElementById('timer-log-modal');
    const manualLogModal = document.getElementById('manual-log-modal');
    const showTimerBtn = document.getElementById('show-timer-btn');
    const showManualBtn = document.getElementById('show-manual-btn');
    const closeButtons = document.querySelectorAll('.modal-overlay .close-btn');
    const timerDisplay = document.getElementById('timer-display');
    const timerToggleBtn = document.getElementById('timer-toggle-btn');
    const timerSubject = document.getElementById('timer-subject');
    const timerContent = document.getElementById('timer-content');
    const manualLogForm = document.getElementById('manual-log-form');

    addStudyLogBtn.addEventListener('click', () => studyChoiceModal.classList.remove('hidden'));
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            studyChoiceModal.classList.add('hidden');
            timerLogModal.classList.add('hidden');
            manualLogModal.classList.add('hidden');
        });
    });
    showTimerBtn.addEventListener('click', () => { studyChoiceModal.classList.add('hidden'); timerLogModal.classList.remove('hidden'); });
    showManualBtn.addEventListener('click', () => { studyChoiceModal.classList.add('hidden'); manualLogModal.classList.remove('hidden'); });

    let timerInterval = null;
    let startTime = 0;

    timerToggleBtn.addEventListener('click', () => {
        if (timerToggleBtn.textContent === 'スタート') {
            if (!timerSubject.value || !timerContent.value) return alert('科目と勉強内容を先に入力してください。');
            startTime = new Date();
            timerInterval = setInterval(updateTimer, 1000);
            timerToggleBtn.textContent = 'ストップ';
            timerToggleBtn.classList.add('is-timing');
            timerSubject.disabled = true;
            timerContent.disabled = true;
        } else {
            clearInterval(timerInterval);
            const endTime = new Date();
            addScheduleToCalendar(`【${timerSubject.value}】${timerContent.value}`, startTime, endTime);
            timerToggleBtn.textContent = 'スタート';
            timerToggleBtn.classList.remove('is-timing');
            timerDisplay.textContent = '00:00:00';
            timerSubject.disabled = false;
            timerContent.disabled = false;
            timerSubject.value = '';
            timerContent.value = '';
            timerLogModal.classList.add('hidden');
        }
    });

    function updateTimer() {
        const now = new Date();
        const elapsedTime = Math.floor((now - startTime) / 1000);
        const hours = String(Math.floor(elapsedTime / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((elapsedTime % 3600) / 60)).padStart(2, '0');
        const seconds = String(elapsedTime % 60).padStart(2, '0');
        timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }

    manualLogForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = document.getElementById('manual-subject').value;
        const content = document.getElementById('manual-content').value;
        const date = document.getElementById('manual-date').value;
        const startTimeStr = document.getElementById('manual-start-time').value;
        const duration = parseInt(document.getElementById('manual-duration').value);
        const startDateTime = new Date(`${date}T${startTimeStr}`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
        addScheduleToCalendar(`【${subject}】${content}`, startDateTime, endDateTime);
        manualLogForm.reset();
        manualLogModal.classList.add('hidden');
    });

    // 共通カレンダー登録関数 (startTime/endTime を使うよう修正)
    async function addScheduleToCalendar(title, start, end) {
        const formatTime = (date) => date.toTimeString().split(' ')[0].substring(0, 5);
        const newSchedule = {
            date: start.toISOString().split('T')[0],
            startTime: formatTime(start),
            endTime: formatTime(end),
            text: title
        };
        const usersData = await getUsersData();
        if (!usersData[currentUser]) usersData[currentUser] = { password: '', schedules: [] };
        usersData[currentUser].schedules.push(newSchedule);
        await saveUsersData(usersData);
        await updateView();
        alert('勉強記録をカレンダーに登録しました！');
    }
    // ===== ▲▲▲ 勉強記録機能ここまで ▲▲▲ =====


    // --- 画面遷移ロジック ---
    const showScreen = (screenIdToShow) => {
        views.forEach(view => {
            view.classList.toggle('hidden', view.id !== screenIdToShow);
        });
    };

    // --- Google API 関連 ---
    window.gapiLoaded = function() {
        gapi.load('client', async () => { 
            await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] }); 
            gapiInited = true; 
        }); 
    }
    window.gisLoaded = function() {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID, scope: SCOPES,
            callback: (resp) => {
                if (resp.error) { console.error(resp); return alert('Googleログインに失敗しました'); }
                accessToken = resp.access_token;
                alert('Googleログイン成功！「同期」ボタンを再度押して同期を実行してください。');
            },
        });
        gisInited = true;
    }
    
    // Google同期関数を startTime/endTime を使うよう修正
    async function syncSchedulesToGoogle() {
        if (!currentUser) return alert('まずアプリにログインしてください');
        if (!accessToken) {
            if (gisInited) tokenClient.requestAccessToken({ prompt: 'consent' });
            return;
        }

        alert('Googleカレンダーとの同期を開始します...');
        const usersData = await getUsersData();
        const schedules = usersData[currentUser]?.schedules || [];
        const promises = schedules.map(s => {
            const startDate = new Date(`${s.date}T${s.startTime || s.time}`); // 古いデータ(s.time)にも対応
            let endDate;
            
            if (s.endTime) {
                endDate = new Date(`${s.date}T${s.endTime}`); // 新しいデータ
            } else {
                endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 古いデータは1時間と仮定
            }

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

            const event = {
                summary: s.text,
                start: { dateTime: startDate.toISOString(), timeZone: 'Asia/Tokyo' },
                end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Tokyo' },
            };
            return gapi.client.calendar.events.insert({ calendarId: 'primary', resource: event }).catch(err => console.error('追加失敗:', err));
        });
        await Promise.all(promises);
        alert('Googleカレンダーへの同期が完了しました！');
    }

    // --- データ保存・読み込み ---
    async function getUsersData() {
        try {
            const res = await fetch(`${JSONBIN_URL}/latest`, { headers: { 'X-Master-Key': API_KEY } });
            if (res.status === 404) return {};
            if (!res.ok) throw new Error('データ読み込み失敗');
            const data = await res.json();
            return (typeof data.record === 'object' && data.record !== null) ? data.record : {};
        } catch (error) { console.error(error); alert(error.message); return {}; }
    }
    async function saveUsersData(data) {
        try {
            const res = await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('データ保存失敗');
        } catch (error) { console.error(error); alert(error.message); }
    }

    // --- ビュー更新・描画 ---
    async function updateView() {
        if (!currentUser) return;
        const usersData = await getUsersData();
        const schedules = usersData[currentUser]?.schedules || [];
        
        ['dayView', 'weekView', 'monthView'].forEach(v => buttons[v]?.classList.remove('active'));
        buttons[`${currentView}View`]?.classList.add('active');

        if (currentView === 'day') renderDayView(schedules);
        else if (currentView === 'week') renderWeekView(schedules);
        else renderMonthView(schedules);
        
        renderScheduleList(schedules);
    }

    // 描画関数を startTime/time の両対応に修正
    function renderDayView(schedules) {
        scheduleElements.calendarTitle.textContent = formatDate(currentDate, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        scheduleElements.calendarView.innerHTML = '';
        scheduleElements.calendarView.className = 'day-view';
        const dayElem = createDayElement(currentDate);
        schedules
            .filter(s => s.date === currentDate.toISOString().split('T')[0])
            .sort((a,b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
            .forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
        scheduleElements.calendarView.appendChild(dayElem.element);
    }
    function renderWeekView(schedules) {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        scheduleElements.calendarTitle.textContent = `${formatDate(start, {month:'long', day:'numeric'})} - ${formatDate(end, {month:'long', day:'numeric'})}`;
        scheduleElements.calendarView.innerHTML = '';
        scheduleElements.calendarView.className = 'week-view';
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const dayElem = createDayElement(day);
            schedules
                .filter(s => s.date === day.toISOString().split('T')[0])
                .sort((a,b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
                .forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
            scheduleElements.calendarView.appendChild(dayElem.element);
        }
    }
    function renderMonthView(schedules) {
        scheduleElements.calendarTitle.textContent = formatDate(currentDate, { year: 'numeric', month: 'long' });
        scheduleElements.calendarView.innerHTML = '';
        scheduleElements.calendarView.className = 'month-view';
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startDay = new Date(firstDay);
        startDay.setDate(startDay.getDate() - (startDay.getDay() === 0 ? 6 : startDay.getDay() - 1));
        for (let i = 0; i < 42; i++) {
            const day = new Date(startDay);
            day.setDate(startDay.getDate() + i);
            const dayElem = createDayElement(day);
            if (day.getMonth() !== currentDate.getMonth()) dayElem.element.classList.add('other-month');
            schedules
                .filter(s => s.date === day.toISOString().split('T')[0])
                .sort((a,b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
                .forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
            scheduleElements.calendarView.appendChild(dayElem.element);
        }
    }

    // ★★★★★ 過去の予定をリストから削除するロジックを修正 ★★★★★
    function renderScheduleList(schedules) {
        scheduleElements.list.innerHTML = '';
        const now = new Date();

        const futureSchedules = schedules.filter(s => {
            let scheduleEndTime;
            if (s.endTime) {
                // Case 1: 新しいデータ (endTime がある)
                scheduleEndTime = new Date(`${s.date}T${s.endTime}`);
            } else if (s.time) {
                // Case 2: 古いデータ (time しかない) -> 1時間と仮定
                scheduleEndTime = new Date(`${s.date}T${s.time}`);
                scheduleEndTime.setHours(scheduleEndTime.getHours() + 1);
            } else {
                return false; // 無効なデータ
            }
            return scheduleEndTime > now; // 終了時刻が未来のものだけ
        });

        // フィルタリングされた予定をソートして表示
        futureSchedules
            .sort((a, b) => {
                const startTimeA = a.startTime || a.time;
                const startTimeB = b.startTime || b.time;
                return new Date(`${a.date}T${startTimeA}`) - new Date(`${b.date}T${startTimeB}`);
            })
            .forEach(s => {
                const li = document.createElement('li');
                const startTime = s.startTime || s.time;
                const endTime = s.endTime || '( 1h )'; // 終了時刻がなければ(1h)と表示

                li.innerHTML = `
                    <span class="schedule-item-content">
                        <strong>${s.date} (${formatDate(new Date(s.date), {weekday:'short'})})</strong>
                        <span>${startTime} - ${endTime}</span>
                        ${s.text}
                    </span>
                    <button class="delete-btn" title="削除"><i class="fas fa-trash-alt"></i></button>`;
                
                // 削除機能のために、存在するデータをすべてdatasetに格納
                li.dataset.date = s.date;
                li.dataset.text = s.text;
                if(s.startTime) li.dataset.startTime = s.startTime;
                if(s.endTime) li.dataset.endTime = s.endTime;
                if(s.time) li.dataset.time = s.time; // 古いデータ用

                scheduleElements.list.appendChild(li);
            });
    }

    // DOM要素作成ヘルパー (修正)
    function createDayElement(date) {
        const element = document.createElement('div');
        element.className = 'calendar-day';
        if (date.toDateString() === new Date().toDateString()) element.classList.add('today');
        const headerStyle = currentView === 'month' ? 'style="text-align: left; padding: 5px; border-bottom: none;"' : '';
        const dayNumber = (currentView === 'month' && date.getDate() === 1) ? `${date.getMonth()+1}/${date.getDate()}` : date.getDate();
        element.innerHTML = `<div class="calendar-day-header" ${headerStyle}>${dayNumber}</div><div class="calendar-day-body"></div>`;
        return { element, body: element.querySelector('.calendar-day-body') };
    }
    function createScheduleItem(schedule) {
        const item = document.createElement('div');
        item.className = 'calendar-schedule-item';
        const startTime = schedule.startTime || schedule.time;
        item.textContent = `${startTime} ${schedule.text}`;
        return item;
    }
    const formatDate = (date, options) => new Intl.DateTimeFormat('ja-JP', options).format(date);

    // --- イベントリスナー ---
    function setupEventListeners() {
        buttons.showLogin.addEventListener('click', () => showScreen('login-container'));
        buttons.showRegister.addEventListener('click', () => showScreen('register-container'));
        buttons.back.forEach(btn => btn.addEventListener('click', () => showScreen('welcome-container')));

        forms.register.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.elements[0].value.trim();
            const password = e.target.elements[1].value.trim();
            if (!username || !password) return alert('全て入力してください。');
            const usersData = await getUsersData();
            if (usersData[username]) return alert('そのユーザー名は既に使用されています。');
            usersData[username] = { password, schedules: [] };
            await saveUsersData(usersData);
            await loginUser(username, password);
        });
        forms.login.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.elements[0].value.trim();
            const password = e.target.elements[1].value.trim();
            const usersData = await getUsersData();
            if (usersData[username]?.password === password) await loginUser(username, password);
            else alert('ユーザー名またはパスワードが間違っています。');
        });
        buttons.logout.addEventListener('click', () => { 
            currentUser = null; 
            accessToken = null;
            sessionStorage.removeItem('user'); 
            showScreen('welcome-container'); 
        });

        // ★★★ 予定追加フォームのロジックを修正 ★★★
        forms.schedule.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('schedule-date').value;
            const startTime = document.getElementById('schedule-start-time').value;
            const endTime = document.getElementById('schedule-end-time').value;
            const text = document.getElementById('schedule-text').value.trim();

            if(!date || !startTime || !endTime || !text) return alert('全て入力してください。');
            if (endTime <= startTime) return alert('終了時刻は開始時刻より後に設定してください。');
            
            const usersData = await getUsersData();
            if (!usersData[currentUser]) usersData[currentUser] = { password: JSON.parse(sessionStorage.getItem('user'))?.password, schedules: [] };
            
            usersData[currentUser].schedules.push({ date, startTime, endTime, text }); 
            
            await saveUsersData(usersData);
            e.target.reset();
            await updateView();
        });

        // ★★★ 削除ロジックを両方のデータ形式に対応 ★★★
        scheduleElements.list.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                const li = deleteButton.parentElement;
                const { date, text, startTime, endTime, time } = li.dataset; // 両方の可能性を取得

                const usersData = await getUsersData();
                const schedules = usersData[currentUser]?.schedules || [];
                
                let index = -1;
                if (startTime && endTime) {
                    // Case 1: 新しいデータ (startTime, endTime がある)
                    index = schedules.findIndex(s => 
                        s.date === date && 
                        s.startTime === startTime && 
                        s.endTime === endTime && 
                        s.text === text
                    );
                } else if (time) {
                    // Case 2: 古いデータ (time しかない)
                    index = schedules.findIndex(s => 
                        s.date === date && 
                        s.time === time && 
                        s.text === text &&
                        !s.startTime // startTime がないことを確認
                    );
                }

                if (index > -1) { 
                    schedules.splice(index, 1); 
                    await saveUsersData(usersData); 
                    await updateView(); 
                } else {
                    console.error("削除対象のデータが見つかりません:", li.dataset);
                }
            }
        });

        // ナビゲーション
        buttons.today.addEventListener('click', () => { currentDate = new Date(); updateView(); });
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
        
        // Google 同期ボタン
        buttons.googleSync.addEventListener('click', () => { 
            syncSchedulesToGoogle();
        });

        // --- テーマ切り替え ---
        buttons.themeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    async function loginUser(username, password) {
        currentUser = username;
        sessionStorage.setItem('user', JSON.stringify({ username, password }));
        scheduleElements.currentUserSpan.textContent = currentUser;
        forms.register.reset();
        forms.login.reset();
        currentDate = new Date();
        currentView = 'week';
        await updateView();
        showScreen('schedule-container');
    }

    // --- 初期化 ---
    async function initializeApp() {
        setupEventListeners();
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            buttons.themeToggle.checked = true;
        }
        const savedUser = JSON.parse(sessionStorage.getItem('user'));
        if (savedUser) {
            await loginUser(savedUser.username, savedUser.password);
        } else {
            showScreen('welcome-container');
        }
        // defer実行のため、グローバル関数を呼び出す
        if (typeof gapiLoaded === 'function') gapiLoaded();
        if (typeof gisLoaded === 'function') gisLoaded();
    }

    initializeApp();
});