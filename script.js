document.addEventListener('DOMContentLoaded', () => {
    // --- 定数 ---
    const API_KEY = '$2a$10$.Xv9dQJFAEDIV5pO50uXfeAWRhkkHcN94Rwc.0fBMgkNy8iauclHu';
    const BIN_ID = '68e353e1d0ea881f4096e4f5';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
    const CLIENT_ID = '163499005911-6v32s29gtk4t4oegd4077q4k5u0aa4ps.apps.googleusercontent.com';
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

    // --- 要素取得 ---
    const views = document.querySelectorAll('.view');
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

    // --- 画面遷移ロジック ---
    const showScreen = (screenIdToShow) => {
        views.forEach(view => {
            view.classList.toggle('hidden', view.id !== screenIdToShow);
        });
    };

    // --- Google API 関連 ---
    function gapiLoaded() { gapi.load('client', async () => { await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] }); gapiInited = true; }); }
    function gisLoaded() {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID, scope: SCOPES,
            callback: (resp) => {
                if (resp.error) { console.error(resp); return alert('Googleログインに失敗しました'); }
                accessToken = resp.access_token;
                alert('Googleログイン成功！同期します。');
                syncSchedulesToGoogle();
            },
        });
        gisInited = true;
    }
    async function syncSchedulesToGoogle() {
        if (!currentUser || !accessToken) return alert('ログインとGoogle認証が必要です');
        const usersData = await getUsersData();
        const schedules = usersData[currentUser]?.schedules || [];
        const promises = schedules.map(s => {
            const startDate = new Date(`${s.date}T${s.time}`);
            if (isNaN(startDate)) return;
            const event = {
                summary: s.text,
                start: { dateTime: startDate.toISOString(), timeZone: 'Asia/Tokyo' },
                end: { dateTime: new Date(startDate.getTime() + 3600000).toISOString(), timeZone: 'Asia/Tokyo' },
            };
            return gapi.client.calendar.events.insert({ calendarId: 'primary', resource: event });
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
    function renderDayView(schedules) {
        scheduleElements.calendarTitle.textContent = formatDate(currentDate, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        scheduleElements.calendarView.innerHTML = '';
        scheduleElements.calendarView.className = 'day-view';
        const dayElem = createDayElement(currentDate);
        schedules.filter(s => s.date === currentDate.toISOString().split('T')[0]).sort((a,b) => a.time.localeCompare(b.time)).forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
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
            schedules.filter(s => s.date === day.toISOString().split('T')[0]).sort((a,b) => a.time.localeCompare(b.time)).forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
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
            schedules.filter(s => s.date === day.toISOString().split('T')[0]).sort((a,b) => a.time.localeCompare(b.time)).forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
            scheduleElements.calendarView.appendChild(dayElem.element);
        }
    }
    function renderScheduleList(schedules) {
        scheduleElements.list.innerHTML = '';
        schedules.sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
                 .forEach(s => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="schedule-item-content"><strong>${s.date} (${formatDate(new Date(s.date), {weekday:'short'})})</strong> ${s.time} - ${s.text}</span><button class="delete-btn" title="削除"><i class="fas fa-trash-alt"></i></button>`;
            li.dataset.date = s.date; li.dataset.time = s.time; li.dataset.text = s.text;
            scheduleElements.list.appendChild(li);
        });
    }
    function createDayElement(date) {
        const element = document.createElement('div');
        element.className = 'calendar-day';
        if (date.toDateString() === new Date().toDateString()) element.classList.add('today');
        element.innerHTML = `<div class="calendar-day-header">${formatDate(date, {day:'numeric'})}</div><div class="calendar-day-body"></div>`;
        return { element, body: element.querySelector('.calendar-day-body') };
    }
    function createScheduleItem(schedule) {
        const item = document.createElement('div');
        item.className = 'calendar-schedule-item';
        item.textContent = `${schedule.time} ${schedule.text}`;
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
            const username = forms.register.elements[0].value.trim();
            const password = forms.register.elements[1].value.trim();
            if (!username || !password) return alert('全て入力してください。');
            const usersData = await getUsersData();
            if (usersData[username]) return alert('そのユーザー名は既に使用されています。');
            usersData[username] = { password, schedules: [] };
            await saveUsersData(usersData);
            await loginUser(username, password);
        });
        forms.login.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = forms.login.elements[0].value.trim();
            const password = forms.login.elements[1].value.trim();
            const usersData = await getUsersData();
            if (usersData[username]?.password === password) await loginUser(username, password);
            else alert('ユーザー名またはパスワードが間違っています。');
        });
        buttons.logout.addEventListener('click', () => { currentUser = null; sessionStorage.removeItem('user'); showScreen('welcome-container'); });
        forms.schedule.addEventListener('submit', async (e) => {
            e.preventDefault();
            const [date, time, text] = [e.target.elements[0].value, e.target.elements[1].value, e.target.elements[2].value.trim()];
            if(!date || !time || !text) return alert('全て入力してください。');
            const usersData = await getUsersData();
            if (!usersData[currentUser]) usersData[currentUser] = { password: JSON.parse(sessionStorage.getItem('user'))?.password, schedules: [] };
            usersData[currentUser].schedules.push({ date, time, text });
            await saveUsersData(usersData);
            e.target.reset();
            await updateView();
        });
        scheduleElements.list.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                const li = deleteButton.parentElement;
                const { date, time, text } = li.dataset;
                const usersData = await getUsersData();
                const schedules = usersData[currentUser]?.schedules || [];
                const index = schedules.findIndex(s => s.date === date && s.time === time && s.text === text);
                if (index > -1) { schedules.splice(index, 1); await saveUsersData(usersData); await updateView(); }
            }
        });

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
        buttons.googleSync.addEventListener('click', () => { if (gisInited) tokenClient.requestAccessToken({ prompt: 'consent' }); });

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
        if (typeof gapi !== 'undefined' && gapi.load) gapiLoaded();
        if (typeof google !== 'undefined' && google.accounts) gisLoaded();
    }

    initializeApp();
});