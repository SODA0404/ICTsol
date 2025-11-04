// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 定数 ---
    const API_KEY = '$2a$10$.Xv9dQJFAEDIV5pO50uXfeAWRhkkHcN94Rwc.0fBMgkNy8iauclHu';
    const BIN_ID = '68e353e1d0ea881f4096e4f5';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
    const CLIENT_ID = '163499005911-6v32s29gtk4t4oegd4077q4k5u0aa4ps.apps.googleusercontent.com';
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

    // --- 要素取得 (全機能統合) ---
    const views = document.querySelectorAll('.view');
    // (ダークモードトグル位置変更用)
    const globalThemeToggle = document.getElementById('global-theme-toggle');
    const headerRight = document.querySelector('.header-right');
    const logoutButton = document.getElementById('logout-btn');
    const bodyElement = document.body;

    const containers = {
        welcome: document.getElementById('welcome-container'),
        register: document.getElementById('register-container'),
        login: document.getElementById('login-container'),
        schedule: document.getElementById('schedule-container')
    };
    const forms = {
        register: document.getElementById('register-form'),
        login: document.getElementById('login-form'),
        schedule: document.getElementById('schedule-form'),
        changePassword: document.getElementById('change-password-form'),
        // (編集モーダル用)
        eventDetail: document.getElementById('event-detail-form')
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
        themeToggle: document.getElementById('theme-toggle-checkbox'),
        accountIcon: document.getElementById('account-icon'),
        showChangePassword: document.getElementById('show-change-password-btn'),
        showDeleteAccount: document.getElementById('show-delete-account-btn'),
        confirmDelete: document.getElementById('confirm-delete-btn'),
        // (編集モーダル用)
        eventDetailDelete: document.getElementById('event-detail-delete-btn')
    };
    const scheduleElements = {
        list: document.getElementById('schedule-list'),
        currentUserSpan: document.getElementById('current-user'),
        calendarView: document.getElementById('calendar-view'),
        calendarTitle: document.getElementById('calendar-title')
    };

    const accountMenu = document.getElementById('account-menu');
    const changePasswordModal = document.getElementById('change-password-modal');
    const deleteAccountModal = document.getElementById('delete-account-modal');
    const modalCloseButtons = document.querySelectorAll('.modal-overlay .close-btn'); // 全モーダルの閉じるボタンを共通化
    // (編集モーダル用)
    const eventDetailModal = document.getElementById('event-detail-modal');


    // --- 状態管理 ---
    let currentUser = null;
    let currentView = 'week';
    let currentDate = new Date();
    let tokenClient, gapiInited = false, gisInited = false, accessToken = null;

    // ===== ▼▼▼ 勉強記録機能 (復習セット機能) ▼▼▼ =====
    const addStudyLogBtn = document.getElementById('add-study-log-btn');
    const studyChoiceModal = document.getElementById('study-choice-modal');
    const timerLogModal = document.getElementById('timer-log-modal');
    const manualLogModal = document.getElementById('manual-log-modal');
    const showTimerBtn = document.getElementById('show-timer-btn');
    const showManualBtn = document.getElementById('show-manual-btn');
    const timerDisplay = document.getElementById('timer-display');
    const timerToggleBtn = document.getElementById('timer-toggle-btn');
    const timerSubject = document.getElementById('timer-subject');
    const timerContent = document.getElementById('timer-content');
    const manualLogForm = document.getElementById('manual-log-form');

    addStudyLogBtn.addEventListener('click', () => studyChoiceModal.classList.remove('hidden'));
    showTimerBtn.addEventListener('click', () => { studyChoiceModal.classList.add('hidden'); timerLogModal.classList.remove('hidden'); });
    showManualBtn.addEventListener('click', () => { studyChoiceModal.classList.add('hidden'); manualLogModal.classList.remove('hidden'); });

    // タイマー機能
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
            addScheduleToCalendar(`【${timerSubject.value}】${timerContent.value}`, startTime, endTime, true); 
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

    // ★★★★★ 手動入力（復習セット）機能 ★★★★★
    manualLogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subject = document.getElementById('manual-subject').value;
        const content = document.getElementById('manual-content').value;
        const date = document.getElementById('manual-date').value;
        const startTimeStr = document.getElementById('manual-start-time').value;
        const endTimeStr = document.getElementById('manual-end-time').value; 
        const deadlineStr = document.getElementById('manual-deadline').value; 

        const initialStart = new Date(`${date}T${startTimeStr}`);
        const initialEnd = new Date(`${date}T${endTimeStr}`); 
        const deadline = deadlineStr ? new Date(`${deadlineStr}T23:59:59`) : null; 

        if (isNaN(initialStart.getTime()) || isNaN(initialEnd.getTime())) {
            return alert('日付または時刻の形式が正しくありません。');
        }
        if (initialEnd <= initialStart) {
            return alert('終了時間は開始時間よりも後に設定してください。');
        }

        const durationMs = initialEnd.getTime() - initialStart.getTime();
        const studySetId = `set_${Date.now()}`;
        const usersData = await getUsersData();

        // 1. 初回の勉強を登録
        addScheduleToData(usersData, `【${subject}】${content} (初回)`, initialStart, initialEnd, studySetId, true);

        const proposalIntervals = [1, 3, 7, 30]; 
        const scheduledDates = [];
        const formatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };

        // 2. 復習予定を生成
        for (const day of proposalIntervals) {
            const preferredStart = new Date(initialStart.getTime());
            preferredStart.setDate(preferredStart.getDate() + day);

            if (deadline && preferredStart > deadline) {
                continue;
            }
            
            const schedules = usersData[currentUser]?.schedules || [];
            const foundSlotStart = findFreeSlot(preferredStart, durationMs, schedules);

            if (foundSlotStart) {
                const foundSlotEnd = new Date(foundSlotStart.getTime() + durationMs);
                const title = `【${subject}】${content} (復習 ${day}日目)`;

                addScheduleToData(usersData, title, foundSlotStart, foundSlotEnd, studySetId, false);
                scheduledDates.push(foundSlotStart.toLocaleString('ja-JP', formatOptions));
            } else {
                console.warn(`復習 ${day}日目 (${preferredStart.toLocaleDateString()}) は空き時間が見つかりませんでした。`);
            }
        }

        await saveUsersData(usersData);
        await updateView();

        let alertMessage = "初回の勉強を登録しました。\n";
        if (scheduledDates.length > 0) {
            alertMessage += `以下の日時に復習予定をセットしました:\n${scheduledDates.join('\n')}`;
        } else {
            alertMessage += "（セット可能な復習予定はありませんでした）";
        }
        alert(alertMessage);

        manualLogForm.reset();
        manualLogModal.classList.add('hidden');
    });

    async function addScheduleToCalendar(title, start, end, showAlert = false) {
        const usersData = await getUsersData();
        addScheduleToData(usersData, title, start, end, null, false); 
        await saveUsersData(usersData); 
        await updateView(); 
        if (showAlert) {
            alert('予定をカレンダーに登録しました！');
        }
    }

    function addScheduleToData(usersData, title, start, end, studySetId = null, isInitial = false) {
        if (!usersData[currentUser]) {
            const password = JSON.parse(sessionStorage.getItem('user'))?.password || '';
            usersData[currentUser] = { password: password, schedules: [] };
        }
        const formatTime = (date) => date.toTimeString().split(' ')[0].substring(0, 5);
        const newSchedule = {
            date: start.toISOString().split('T')[0],
            startTime: formatTime(start),
            endTime: formatTime(end),
            text: title,
            studySetId: studySetId, 
            isInitial: isInitial    
        };
        usersData[currentUser].schedules.push(newSchedule);
    }

    function findFreeSlot(preferredStart, durationMs, existingSchedules) {
        let proposalStart = new Date(preferredStart.getTime());
        let proposalEnd = new Date(proposalStart.getTime() + durationMs);
        const targetDateStr = proposalStart.toISOString().split('T')[0];
        let conflictFound = true;
        let attempts = 0;
        while (conflictFound && attempts < 100) {
            conflictFound = false;
            attempts++;
            for (const event of existingSchedules) {
                if (event.date !== targetDateStr) continue;
                const eventStartStr = event.startTime || event.time;
                if (!eventStartStr) continue;
                const existingStart = new Date(`${event.date}T${eventStartStr}`);
                let existingEnd;
                if (event.endTime) {
                    existingEnd = new Date(`${event.date}T${event.endTime}`);
                } else {
                    existingEnd = new Date(existingStart.getTime() + 60 * 60 * 1000); // 1h
                }
                if (isNaN(existingStart.getTime()) || isNaN(existingEnd.getTime())) continue;
                const isOverlapping = (proposalStart < existingEnd) && (proposalEnd > existingStart);
                if (isOverlapping) {
                    conflictFound = true;
                    proposalStart = new Date(existingEnd.getTime() + 1000); 
                    proposalEnd = new Date(proposalStart.getTime() + durationMs);
                    if (proposalStart.toISOString().split('T')[0] !== targetDateStr) {
                        return null; 
                    }
                    break;
                }
            }
        }
        return (attempts >= 100) ? null : proposalStart;
    }
    // ===== ▲▲▲ 勉強記録機能ここまで ▲▲▲ =====


    // --- 画面遷移ロジック (ダークモードトグル位置変更) ---
    const showScreen = (screenIdToShow) => {
        views.forEach(view => {
            view.classList.toggle('hidden', view.id !== screenIdToShow);
        });

        if (screenIdToShow === 'schedule-container') {
            if (globalThemeToggle && headerRight && logoutButton) {
                headerRight.insertBefore(globalThemeToggle, logoutButton); 
                globalThemeToggle.style.position = 'relative';
                globalThemeToggle.style.top = 'auto';
                globalThemeToggle.style.right = 'auto';
                globalThemeToggle.style.zIndex = 'auto';
                globalThemeToggle.style.backgroundColor = 'transparent';
                globalThemeToggle.style.boxShadow = 'none';
            }
        } else {
            if (globalThemeToggle && bodyElement) {
                bodyElement.appendChild(globalThemeToggle); 
                globalThemeToggle.style.position = 'fixed';
                globalThemeToggle.style.top = '20px';
                globalThemeToggle.style.right = '20px';
                globalThemeToggle.style.zIndex = '1000';
                globalThemeToggle.style.backgroundColor = 'var(--surface-color)';
                globalThemeToggle.style.boxShadow = 'var(--shadow)';
            }
        }
    };

    // --- Google API 関連 ---
    window.gapiLoaded = function () {
        gapi.load('client', async () => {
            await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
            gapiInited = true;
        });
    }
    window.gisLoaded = function () {
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
            const startDate = new Date(`${s.date}T${s.startTime || s.time}`);
            let endDate;
            if (s.endTime) {
                endDate = new Date(`${s.date}T${s.endTime}`);
            } else {
                endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
            }
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
            const event = {
                summary: s.text,
                start: { dateTime: startDate.toISOString(), timeZone: 'Asia/Tokyo' },
                end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Tokyo' },
            };
            return gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            }).then(
                (response) => console.log('追加成功:', response),
                (error) => console.error('追加失敗:', error)
            );
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

    // --- ビュー更新・描画 (タイムスロット対応) ---
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
        drawTimeSlots(dayElem.body); 
        schedules
            .filter(s => s.date === currentDate.toISOString().split('T')[0])
            .sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
            .forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
        scheduleElements.calendarView.appendChild(dayElem.element);
    }

    function renderWeekView(schedules) {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        scheduleElements.calendarTitle.textContent = `${formatDate(start, { month: 'long', day: 'numeric' })} - ${formatDate(end, { month: 'long', day: 'numeric' })}`;
        scheduleElements.calendarView.innerHTML = '';
        scheduleElements.calendarView.className = 'week-view';
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const dayElem = createDayElement(day);
            schedules
                .filter(s => s.date === day.toISOString().split('T')[0])
                .sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
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
                .sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
                .forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
            scheduleElements.calendarView.appendChild(dayElem.element);
        }
    }

    function renderScheduleList(schedules) {
        scheduleElements.list.innerHTML = '';
        const now = new Date();
        const futureSchedules = schedules.filter(s => {
            let scheduleEndTime;
            if (s.endTime) {
                scheduleEndTime = new Date(`${s.date}T${s.endTime}`);
            } else if (s.time) {
                scheduleEndTime = new Date(`${s.date}T${s.time}`);
                scheduleEndTime.setHours(scheduleEndTime.getHours() + 1);
            } else if (s.startTime) { 
                scheduleEndTime = new Date(`${s.date}T${s.startTime}`);
                scheduleEndTime.setHours(scheduleEndTime.getHours() + 1);
            } else {
                return false;
            }
            if (isNaN(scheduleEndTime.getTime())) return false;
            return scheduleEndTime > now; 
        });
        futureSchedules
            .sort((a, b) => {
                const startTimeA = a.startTime || a.time;
                const startTimeB = b.startTime || b.time;
                const dateA = new Date(`${a.date}T${startTimeA}`);
                const dateB = new Date(`${b.date}T${startTimeB}`);
                if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
                return dateA - dateB;
            })
            .forEach(s => {
                const li = document.createElement('li');
                const startTime = s.startTime || s.time;
                const endTime = s.endTime || '( 1h )';
                li.innerHTML = `
                    <span class="schedule-item-content">
                        <strong>${s.date} (${formatDate(new Date(s.date), { weekday: 'short' })})</strong>
                        <span>${startTime} - ${endTime}</span>
                        ${s.text}
                    </span>
                    <button class="delete-btn" title="削除"><i class="fas fa-trash-alt"></i></button>`;
                li.dataset.date = s.date;
                li.dataset.text = s.text;
                if (s.startTime) li.dataset.startTime = s.startTime;
                if (s.endTime) li.dataset.endTime = s.endTime;
                if (s.time) li.dataset.time = s.time;
                if (s.studySetId) li.dataset.studySetId = s.studySetId;
                if (s.isInitial) li.dataset.isInitial = s.isInitial;
                scheduleElements.list.appendChild(li);
            });
    }

    function createDayElement(date) {
        const element = document.createElement('div');
        element.className = 'calendar-day';
        if (date.toDateString() === new Date().toDateString()) element.classList.add('today');
        const headerStyle = currentView === 'month' ? 'style="text-align: left; padding: 5px; border-bottom: none;"' : '';
        const dayNumber = (currentView === 'month' && date.getDate() === 1) ? `${date.getMonth() + 1}/${date.getDate()}` : date.getDate();
        element.innerHTML = `<div class="calendar-day-header" ${headerStyle}>${dayNumber}</div><div class="calendar-day-body"></div>`;
        return { element, body: element.querySelector('.calendar-day-body') };
    }

    function drawTimeSlots(container) {
        if (currentView === 'month' || currentView === 'week') return; 
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 24; i++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            const label = document.createElement('span');
            label.className = 'time-slot-label';
            label.textContent = `${i}:00`;
            slot.appendChild(label);
            fragment.appendChild(slot);
        }
        container.appendChild(fragment);
    }

    function createScheduleItem(schedule) {
        const item = document.createElement('div');
        item.className = 'calendar-schedule-item'; 
        const startTimeStr = schedule.startTime || schedule.time;
        
        if (currentView === 'day') {
            const pxPerHour = 60; 
            let startMinutes = 0;
            let endMinutes = 0;
            if (schedule.startTime) { 
                const [startHour, startMin] = schedule.startTime.split(':').map(Number);
                startMinutes = startHour * 60 + startMin;
                if (schedule.endTime) {
                    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
                    endMinutes = endHour * 60 + endMin;
                } else {
                    endMinutes = startMinutes + 60; 
                }
            } else if (schedule.time) { 
                const [startHour, startMin] = schedule.time.split(':').map(Number);
                startMinutes = startHour * 60 + startMin;
                endMinutes = startMinutes + 60; 
            }
            const durationMinutes = Math.max(15, endMinutes - startMinutes); 
            const top = (startMinutes / 60) * pxPerHour;
            let height = (durationMinutes / 60) * pxPerHour;
            height = Math.max(15, height - 2); 
            item.style.top = `${top}px`;
            item.style.height = `${height}px`;
            if (durationMinutes >= 30) {
                 item.innerHTML = `<strong>${startTimeStr}</strong> ${schedule.text}`;
            } else {
                 item.textContent = `${startTimeStr} ${schedule.text}`;
            }
        } else {
            item.textContent = `${startTimeStr} ${schedule.text}`;
        }

        item.dataset.date = schedule.date;
        item.dataset.text = schedule.text;
        item.dataset.startTime = schedule.startTime || '';
        item.dataset.endTime = schedule.endTime || '';
        item.dataset.time = schedule.time || '';
        item.dataset.studySetId = schedule.studySetId || '';
        item.dataset.isInitial = schedule.isInitial || '';
        return item;
    }

    const formatDate = (date, options) => new Intl.DateTimeFormat('ja-JP', options).format(date);

    // --- イベントリスナー (全機能統合) ---
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
            accountMenu.classList.add('hidden');
        });

        forms.schedule.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('schedule-date').value;
            const startTimeStr = document.getElementById('schedule-start-time').value;
            const endTimeStr = document.getElementById('schedule-end-time').value;
            const text = document.getElementById('schedule-text').value.trim();
            if (!date || !startTimeStr || !endTimeStr || !text) return alert('全て入力してください。');
            if (endTimeStr <= startTimeStr) return alert('終了時刻は開始時刻より後に設定してください。');
            const start = new Date(`${date}T${startTimeStr}`);
            const end = new Date(`${date}T${endTimeStr}`);
            await addScheduleToCalendar(text, start, end, false); 
            alert('予定を追加しました。'); 
            e.target.reset();
        });

        scheduleElements.list.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                const li = deleteButton.parentElement;
                const deleted = await deleteScheduleItem(li.dataset);
                if (deleted) alert('予定を削除しました。');
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

        buttons.googleSync.addEventListener('click', () => {
            syncSchedulesToGoogle();
        });

        buttons.themeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        buttons.accountIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            accountMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!accountMenu.classList.contains('hidden') && !accountMenu.contains(e.target) && !buttons.accountIcon.contains(e.target) ) {
                accountMenu.classList.add('hidden');
            }
        });
        buttons.showChangePassword.addEventListener('click', () => {
            changePasswordModal.classList.remove('hidden');
            accountMenu.classList.add('hidden');
        });
        buttons.showDeleteAccount.addEventListener('click', () => {
            deleteAccountModal.classList.remove('hidden');
            accountMenu.classList.add('hidden');
        });
        
        modalCloseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                studyChoiceModal.classList.add('hidden');
                timerLogModal.classList.add('hidden');
                manualLogModal.classList.add('hidden');
                changePasswordModal.classList.add('hidden');
                deleteAccountModal.classList.add('hidden');
                eventDetailModal.classList.add('hidden'); 
                forms.changePassword.reset();
            });
        });

        forms.changePassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPassword = document.getElementById('old-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            if (newPassword !== confirmPassword) return alert('新しいパスワードが一致しません。');
            if (!newPassword || newPassword.length < 4) return alert('新しいパスワードは4文字以上にしてください。');
            const usersData = await getUsersData();
            const storedUserData = JSON.parse(sessionStorage.getItem('user'));
            if (!storedUserData || usersData[currentUser]?.password !== oldPassword || storedUserData.password !== oldPassword) {
                 return alert('現在のパスワードが間違っています。');
            }
            usersData[currentUser].password = newPassword;
            await saveUsersData(usersData);
            storedUserData.password = newPassword;
            sessionStorage.setItem('user', JSON.stringify(storedUserData));
            alert('パスワードを変更しました。');
            forms.changePassword.reset();
            changePasswordModal.classList.add('hidden');
        });
        buttons.confirmDelete.addEventListener('click', async () => {
            const usersData = await getUsersData();
            if (usersData[currentUser]) {
                delete usersData[currentUser];
                await saveUsersData(usersData);
                currentUser = null;
                accessToken = null;
                sessionStorage.removeItem('user');
                alert('アカウントを削除しました。');
                deleteAccountModal.classList.add('hidden');
                accountMenu.classList.add('hidden');
                showScreen('welcome-container');
            } else {
                alert('エラーが発生しました。再度お試しください。');
                deleteAccountModal.classList.add('hidden');
            }
        });

        scheduleElements.calendarView.addEventListener('click', (e) => {
            const item = e.target.closest('.calendar-schedule-item');
            if (!item) return;
            const { date, text, startTime, endTime, time, studySetId, isInitial } = item.dataset;
            forms.eventDetail.elements['event-detail-text'].value = text;
            forms.eventDetail.elements['event-detail-date'].value = date;
            if (startTime) {
                forms.eventDetail.elements['event-detail-start-time'].value = startTime;
                forms.eventDetail.elements['event-detail-end-time'].value = endTime;
            } else if (time) {
                forms.eventDetail.elements['event-detail-start-time'].value = time;
                const start = new Date(`${date}T${time}`);
                if (!isNaN(start.getTime())) {
                    start.setHours(start.getHours() + 1);
                    forms.eventDetail.elements['event-detail-end-time'].value = start.toTimeString().split(' ')[0].substring(0, 5);
                } else {
                     forms.eventDetail.elements['event-detail-end-time'].value = '';
                }
            }
            forms.eventDetail.dataset.originalDate = date;
            forms.eventDetail.dataset.originalText = text;
            forms.eventDetail.dataset.originalStartTime = startTime || '';
            forms.eventDetail.dataset.originalEndTime = endTime || '';
            forms.eventDetail.dataset.originalTime = time || '';
            forms.eventDetail.dataset.originalStudySetId = studySetId || '';
            forms.eventDetail.dataset.originalIsInitial = isInitial || '';
            eventDetailModal.classList.remove('hidden');
        });

        // ▼▼▼ 修正 ▼▼▼ (復習セット一括更新ロジック)
        forms.eventDetail.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newText = forms.eventDetail.elements['event-detail-text'].value;
            const newDate = forms.eventDetail.elements['event-detail-date'].value;
            const newStartTime = forms.eventDetail.elements['event-detail-start-time'].value;
            const newEndTime = forms.eventDetail.elements['event-detail-end-time'].value;
            if (newEndTime <= newStartTime) return alert('終了時刻は開始時刻より後に設定してください。');

            const original = forms.eventDetail.dataset;
            const usersData = await getUsersData();
            const schedules = usersData[currentUser]?.schedules || [];

            const index = schedules.findIndex(s => 
                s.date === original.originalDate &&
                s.text === original.originalText &&
                (s.startTime || '') === original.originalStartTime &&
                (s.endTime || '') === original.originalEndTime &&
                (s.time || '') === original.originalTime &&
                (s.studySetId || '') === (original.originalStudySetId || '') &&
                (s.isInitial ? String(s.isInitial) : '') === (original.originalIsInitial || '')
            );

            if (index > -1) {
                // 1. まず、クリックされた「初回」の予定を更新
                schedules[index] = {
                    date: newDate,
                    startTime: newStartTime,
                    endTime: newEndTime,
                    text: newText, 
                    studySetId: schedules[index].studySetId, 
                    isInitial: schedules[index].isInitial
                };

                // 2. もしこれが復習セットの初回なら、他の復習予定のテキストも更新
                const studySetId = original.originalStudySetId;
                // (isInitialはdataset経由で文字列 'true' になるため、'true'で比較)
                const isInitial = original.originalIsInitial === 'true';

                if (studySetId && isInitial) {
                    // (初回) サフィックスを除去したテキストを準備
                    const baseTextOriginal = original.originalText.replace(/\s*\(初回\)$/, '').trim();
                    const baseTextNew = newText.replace(/\s*\(初回\)$/, '').trim();
                    
                    if (baseTextOriginal !== baseTextNew) {
                         // schedules全体をループして、関連する復習予定を更新
                        schedules.forEach(s => {
                            if (s.studySetId === studySetId && !s.isInitial) {
                                // 古いベーステキストを新しいベーステキストに置換
                                // (例: "【数学】微分 (復習 1日目)" -> "【数学】積分 (復習 1日目)")
                                s.text = s.text.replace(baseTextOriginal, baseTextNew);
                            }
                        });
                    }
                }
                // ▲▲▲ 修正 ▲▲▲

                await saveUsersData(usersData);
                await updateView();
                eventDetailModal.classList.add('hidden');
                alert('予定を更新しました。');
            } else {
                console.error("更新対象が見つかりません:", original);
                alert('更新対象の予定が見つかりませんでした。');
            }
        });
        // ▲▲▲ 修正 ▲▲▲

        buttons.eventDetailDelete.addEventListener('click', async () => {
            if (!confirm('本当にこの予定を削除しますか？')) return;
            const originalData = forms.eventDetail.dataset;
            
            const deleted = await deleteScheduleItem({
                date: originalData.originalDate,
                text: originalData.originalText,
                startTime: originalData.originalStartTime,
                endTime: originalData.originalEndTime,
                time: originalData.originalTime,
                studySetId: originalData.originalStudySetId,
                isInitial: originalData.originalIsInitial
            });

            if (deleted) {
                eventDetailModal.classList.add('hidden');
                alert('予定を削除しました。');
            } else {
                if (!originalData.originalStudySetId) {
                     alert('削除対象の予定が見つかりませんでした。');
                }
            }
        });
    }

    // (復習セット一括削除ロジック)
    async function deleteScheduleItem(itemData) {
        const { date, text, startTime, endTime, time, studySetId, isInitial } = itemData;
        const usersData = await getUsersData();
        let schedules = usersData[currentUser]?.schedules || [];
        let deleted = false;

        // 1. 復習セットの「初回」が削除された場合のロジック
        if (studySetId && isInitial === 'true') {
            if (confirm('これは復習セットの初回予定です。関連するすべての復習予定も削除しますか？')) {
                const originalLength = schedules.length;
                usersData[currentUser].schedules = schedules.filter(s => s.studySetId !== studySetId);
                deleted = usersData[currentUser].schedules.length < originalLength;
            } else {
                return false; 
            }
        } 
        // 2. 復習セットの「復習」予定、または単発の予定が削除された場合
        else {
            let index = -1;
            if (startTime || endTime) { 
                index = schedules.findIndex(s => 
                    s.date === date && s.text === text &&
                    (s.startTime || '') === (startTime || '') &&
                    (s.endTime || '') === (endTime || '') &&
                    (s.studySetId || '') === (studySetId || '')
                );
            } else if (time) { 
                index = schedules.findIndex(s => 
                    s.date === date && s.text === text && 
                    s.time === time && !s.startTime &&
                    (s.studySetId || '') === (studySetId || '')
                );
            }
            if (index > -1) {
                schedules.splice(index, 1);
                deleted = true;
            }
        }
        // 3. 変更を保存して更新
        if (deleted) {
            await saveUsersData(usersData);
            await updateView();
            return true;
        } else {
            if (studySetId && isInitial === 'true') {
                 // ユーザーがキャンセル
            } else {
                console.error("削除対象のデータが見つかりません:", itemData);
            }
            return false;
        }
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
        await checkGoogleApiLoad();
    }

    async function checkGoogleApiLoad() {
        let gapiReady = false;
        let gisReady = false;
        let attempts = 0;
        while (attempts < 50) { 
            gapiReady = (typeof gapi !== 'undefined' && gapi.load);
            gisReady = (typeof google !== 'undefined' && google.accounts);
            if (gapiReady && gisReady) {
                if (typeof window.gapiLoaded === 'function') window.gapiLoaded();
                if (typeof window.gisLoaded === 'function') window.gisLoaded();
                console.log("Google API loaded.");
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        console.warn('Google APIのロードに時間がかかっています。');
        if (gapiReady && typeof window.gapiLoaded === 'function') window.gapiLoaded();
        if (gisReady && typeof window.gisLoaded === 'function') window.gisLoaded();
    }

    initializeApp();
});