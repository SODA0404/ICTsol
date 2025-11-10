// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 定数 (変更なし) ---
    const API_KEY = '$2a$10$.Xv9dQJFAEDIV5pO50uXfeAWRhkkHcN94Rwc.0fBMgkNy8iauclHu';
    const BIN_ID = '68e353e1d0ea881f4096e4f5';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
    const CLIENT_ID = '163499005911-6v32s29gtk4t4oegd4077q4k5u0aa4ps.apps.googleusercontent.com';
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

    // --- 要素取得 (ほぼ変更なし) ---
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
        schedule: document.getElementById('schedule-form'),
        changePassword: document.getElementById('change-password-form') 
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
        confirmDelete: document.getElementById('confirm-delete-btn')
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

    // --- 状態管理 (変更なし) ---
    let currentUser = null;
    let currentView = 'week';
    let currentDate = new Date();
    let tokenClient, gapiInited = false, gisInited = false, accessToken = null;
    let holidays = new Set();

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

    // モーダル表示ロジック (変更なし)
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

    // タイマー機能 (変更なし)
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
            addScheduleToCalendar(`【${timerSubject.value}】${timerContent.value}`, startTime, endTime); // 共通関数を呼ぶ
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
        const deadline = deadlineStr ? new Date(`${deadlineStr}T23:59:59`) : null; // 期限日の終わり

        // --- 入力チェック ---
        if (isNaN(initialStart.getTime()) || isNaN(initialEnd.getTime())) {
            return alert('日付または時刻の形式が正しくありません。');
        }
        if (initialEnd <= initialStart) {
            return alert('終了時間は開始時間よりも後に設定してください。');
        }

        const durationMs = initialEnd.getTime() - initialStart.getTime();

        // --- データ処理開始 ---
        const usersData = await getUsersData();

        // 1. 初回の勉強を登録
        addScheduleToData(usersData, `【${subject}】${content} (初回)`, initialStart, initialEnd);

        const proposalIntervals = [1, 3, 7, 30]; // 1日後, 3日後, 1週間後, 1ヶ月後
        const scheduledDates = [];
        const formatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };

        // 2. 復習予定を生成
        for (const day of proposalIntervals) {
            // 初回と同じ開始時間で復習日を計算
            const preferredStart = new Date(initialStart.getTime());
            preferredStart.setDate(preferredStart.getDate() + day);

            // 期限チェック (復習開始希望時刻が期限を過ぎていたらスキップ)
            if (deadline && preferredStart > deadline) {
                continue;
            }

            // ★ 空き時間スロットを検索 (現在の全スケジュールリストを渡す)
            const foundSlotStart = findFreeSlot(preferredStart, durationMs, usersData[currentUser].schedules);

            if (foundSlotStart) {
                const foundSlotEnd = new Date(foundSlotStart.getTime() + durationMs);
                const title = `【${subject}】${content} (復習 ${day}日目)`;

                // データをメモリ上（usersData）に追加
                addScheduleToData(usersData, title, foundSlotStart, foundSlotEnd);

                // 通知用の日付をフォーマット
                scheduledDates.push(foundSlotStart.toLocaleString('ja-JP', formatOptions));
            } else {
                console.warn(`復習 ${day}日目 (${preferredStart.toLocaleDateString()}) は空き時間が見つかりませんでした。`);
            }
        }

        // 3. 全ての変更をDBに保存し、ビューを更新
        await saveUsersData(usersData);
        await updateView();

        // 4. ユーザーに通知
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

    // 共通カレンダー登録関数 (タイマー用)
    async function addScheduleToCalendar(title, start, end) {
        const usersData = await getUsersData();
        addScheduleToData(usersData, title, start, end); // メモリに追加
        await saveUsersData(usersData); // 保存
        await updateView(); // 更新
        alert('勉強記録をカレンダーに登録しました！');
    }

    // メモリ上のデータに追加するヘルパー関数 (復習セット/タイマー/サイドバー共通)
    function addScheduleToData(usersData, title, start, end) {
        if (!usersData[currentUser]) {
            const password = JSON.parse(sessionStorage.getItem('user'))?.password || '';
            usersData[currentUser] = { password: password, schedules: [] };
        }
        const formatTime = (date) => date.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
        const newSchedule = {
            date: start.toISOString().split('T')[0], // YYYY-MM-DD
            startTime: formatTime(start),
            endTime: formatTime(end),
            text: title
        };
        usersData[currentUser].schedules.push(newSchedule);
    }

    // 空きスロット検索ヘルパー関数 (復習セット用)
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
                    proposalStart = new Date(existingEnd.getTime() + 1000); // 1秒ずらす
                    proposalEnd = new Date(proposalStart.getTime() + durationMs);

                    if (proposalStart.toISOString().split('T')[0] !== targetDateStr) {
                        return null; // 日付が変わったらNG
                    }
                    break;
                }
            }
        }
        return (attempts >= 100) ? null : proposalStart;
    }
    // ===== ▲▲▲ 勉強記録機能ここまで ▲▲▲ =====


    // --- 画面遷移ロジック (変更なし) ---
    const showScreen = (screenIdToShow) => {
        views.forEach(view => {
            view.classList.toggle('hidden', view.id !== screenIdToShow);
        });
    };

    // --- Google API 関連 ---
    // (グローバル関数を定義)
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
                endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1h
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

    // --- データ保存・読み込み (変更なし) ---
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

    // --- ビュー更新・描画 (変更なし) ---
    async function updateView() {
        if (!currentUser) return;
        const usersData = await getUsersData();
        const schedules = usersData[currentUser]?.schedules || [];

        ['dayView', 'weekView', 'monthView'].forEach(v => buttons[v]?.classList.remove('active'));
        buttons[`${currentView}View`]?.classList.add('active');

        if (currentView === 'day') {
            buttons.today.textContent = '今日';
        } else if (currentView === 'week') {
            buttons.today.textContent = '今週';
        } else {
            buttons.today.textContent = '今月';
        }

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
        schedules
            .filter(s => s.date === currentDate.toISOString().split('T')[0])
            .sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
            .forEach(s => dayElem.body.appendChild(createScheduleItem(s)));
        scheduleElements.calendarView.appendChild(dayElem.element);
    }
    function renderWeekView(schedules) {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - start.getDay()); // ★ 日曜始まりに変更
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        scheduleElements.calendarTitle.textContent = `${formatDate(start, { month: 'long', day: 'numeric' })} - ${formatDate(end, { month: 'long', day: 'numeric' })}`;
        
        scheduleElements.calendarView.className = 'week-view'; // クラス名は先に設定

        // ★ 修正: 曜日のヘッダー行を生成
        let headerHtml = '<div class="calendar-week-header">';
        let tempDay = new Date(start);
        for (let i = 0; i < 7; i++) {
            const dayClass = getDayClassName(tempDay);
            headerHtml += `<div class="calendar-week-day ${dayClass}">${formatDate(tempDay, { weekday: 'short' })}</div>`;
            tempDay.setDate(tempDay.getDate() + 1);
        }
        headerHtml += '</div>';

        // ★ 修正: 日付グリッドを生成
        let gridHtml = '<div class="calendar-grid">'; // 日付用のグリッドコンテナ
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const dayElem = createDayElement(day); // createDayElement は日付のみを返すよう後で修正

            // スケジュールを構築
            const body = document.createElement('div');
            schedules
                .filter(s => s.date === day.toISOString().split('T')[0])
                .sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
                .forEach(s => body.appendChild(createScheduleItem(s)));
            
            dayElem.element.querySelector('.calendar-day-body').innerHTML = body.innerHTML;
            gridHtml += dayElem.element.outerHTML;
        }
        gridHtml += '</div>';

        scheduleElements.calendarView.innerHTML = headerHtml + gridHtml;
    }
    function renderMonthView(schedules) {
        scheduleElements.calendarTitle.textContent = formatDate(currentDate, { year: 'numeric', month: 'long' });
        
        scheduleElements.calendarView.className = 'month-view'; // クラス名は先に設定

        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startDay = new Date(firstDay);
        startDay.setDate(startDay.getDate() - startDay.getDay()); // ★ 日曜始まりに変更

        // ★ 修正: 曜日のヘッダー行を生成
        let headerHtml = '<div class="calendar-week-header">';
        let tempDay = new Date(startDay);
        for (let i = 0; i < 7; i++) {
            const dayClass = getDayClassName(tempDay);
            headerHtml += `<div class="calendar-week-day ${dayClass}">${formatDate(tempDay, { weekday: 'short' })}</div>`;
            tempDay.setDate(tempDay.getDate() + 1);
        }
        headerHtml += '</div>';

        // ★ 修正: 日付グリッドを生成
        let gridHtml = '<div class="calendar-grid">'; // 日付用のグリッドコンテナ
        for (let i = 0; i < 42; i++) {
            const day = new Date(startDay);
            day.setDate(startDay.getDate() + i);
            const dayElem = createDayElement(day); // createDayElement は日付のみを返すよう後で修正

            if (day.getMonth() !== currentDate.getMonth()) dayElem.element.classList.add('other-month');

            // スケジュールを構築
            const body = document.createElement('div');
            schedules
                .filter(s => s.date === day.toISOString().split('T')[0])
                .sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
                .forEach(s => body.appendChild(createScheduleItem(s)));
            
            dayElem.element.querySelector('.calendar-day-body').innerHTML = body.innerHTML;
            gridHtml += dayElem.element.outerHTML;
        }
        gridHtml += '</div>';

        scheduleElements.calendarView.innerHTML = headerHtml + gridHtml;
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
            } else if (s.startTime) { // startTimeのみでendTimeがない場合 (タイマーなどで発生しうる)
                scheduleEndTime = new Date(`${s.date}T${s.startTime}`);
                scheduleEndTime.setHours(scheduleEndTime.getHours() + 1);
            } else {
                return false;
            }
            return scheduleEndTime > now; // 終了時刻が未来のものだけ
        });

        futureSchedules
            .sort((a, b) => {
                const startTimeA = a.startTime || a.time;
                const startTimeB = b.startTime || b.time;
                return new Date(`${a.date}T${startTimeA}`) - new Date(`${b.date}T${startTimeB}`);
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

                scheduleElements.list.appendChild(li);
            });
    }

    const getDayClassName = (day) => {
        const dateStr = day.toISOString().split('T')[0];
        const dayIndex = day.getDay();
        if (holidays.has(dateStr) || dayIndex === 0) return 'sunday'; // 日曜・祝日
        if (dayIndex === 6) return 'saturday'; // 土曜
        return '';
    };

    // 祝日読み込み関数
    async function loadHolidays() {
        try {
            // 内閣府の祝日CSVデータ(Shift_JIS)を利用
            const response = await fetch('https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const sjisText = await response.arrayBuffer();
            // Shift_JISからUTF-8にデコード
            const decoder = new TextDecoder('shift_jis');
            const csvText = decoder.decode(sjisText);
            
            const lines = csvText.split('\n');
            const holidaySet = new Set();
            // 1行目(ヘッダー)をスキップ
            for (let i = 1; i < lines.length; i++) {
                const columns = lines[i].split(',');
                if (columns[0]) {
                    // YYYY/M/D を YYYY-MM-DD 形式に正規化
                    const parts = columns[0].split('/');
                    if (parts.length === 3) {
                        const dateStr = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
                        holidaySet.add(dateStr);
                    }
                }
            }
            holidays = holidaySet;
            console.log('日本の祝日を読み込みました。', holidays.size, '件');
        } catch (error) {
            console.error('祝日の読み込みに失敗しました:', error);
            // 失敗しても動作を続行
        }
    }

    function createDayElement(date) {
        const element = document.createElement('div');
        element.className = 'calendar-day';
        if (date.toDateString() === new Date().toDateString()) element.classList.add('today');

        // ★ 修正: 曜日クラスは日付の「数字」に適用
        const dayClass = getDayClassName(date);
        
        let headerStyle = '';
        let dayNumber;

        if (currentView === 'month') {
            headerStyle = 'style="text-align: left; padding: 5px; border-bottom: none;"';
            dayNumber = (date.getDate() === 1 && !element.classList.contains('other-month')) 
                              ? `${date.getMonth() + 1}/${date.getDate()}` 
                              : date.getDate();
        } else { // week or day
            dayNumber = date.getDate();
        }
        
        // ★ 修正: headerに曜日は含めず、日付の数字(span)に色クラスを適用
        element.innerHTML = `<div class="calendar-day-header" ${headerStyle}>
                                <span class="${dayClass}">${dayNumber}</span>
                             </div>
                             <div class="calendar-day-body"></div>`;
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

        // サイドバー予定追加フォーム
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

            await addScheduleToCalendar(text, start, end); // 共通関数を使用
            e.target.reset();
        });

        // 削除ロジック
        scheduleElements.list.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                const li = deleteButton.parentElement;
                const { date, text, startTime, endTime, time } = li.dataset;

                const usersData = await getUsersData();
                const schedules = usersData[currentUser]?.schedules || [];

                let index = -1;
                if (startTime && endTime) {
                    // 新しいデータ
                    index = schedules.findIndex(s =>
                        s.date === date &&
                        s.startTime === startTime &&
                        s.endTime === endTime &&
                        s.text === text
                    );
                } else if (time) {
                    // 古いデータ
                    index = schedules.findIndex(s =>
                        s.date === date &&
                        s.time === time &&
                        s.text === text &&
                        !s.startTime
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
            // アイコン自体とメニュー内部のクリックは無視
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
        
        // 全モーダルの閉じるボタンリスナーを共通化
        modalCloseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // すべてのモーダルを閉じる
                studyChoiceModal.classList.add('hidden');
                timerLogModal.classList.add('hidden');
                manualLogModal.classList.add('hidden');
                changePasswordModal.classList.add('hidden');
                deleteAccountModal.classList.add('hidden');
                // パスワード変更フォームもリセット
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

            // JSONBinのパスワードとsessionStorageのパスワードの両方をチェック
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

    // --- ★★★ 初期化処理 (Google APIロード安定化) ★★★ ---
    async function initializeApp() {
        // 先にリスナーを登録 (重要)
        setupEventListeners();

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            buttons.themeToggle.checked = true;
        }
        
        // ★ 修正: 祝日を読み込む
        await loadHolidays();

        const savedUser = JSON.parse(sessionStorage.getItem('user'));
        if (savedUser) {
            await loginUser(savedUser.username, savedUser.password);
        } else {
            showScreen('welcome-container');
        }

        // Google APIのロードを待機
        await checkGoogleApiLoad();
    }

    // ★★★ 新規追加: Google APIロード待機関数 ★★★
    async function checkGoogleApiLoad() {
        let gapiReady = false;
        let gisReady = false;
        let attempts = 0;

        while (attempts < 50) { // 最大5秒待つ (100ms * 50)
            // gapi.load が存在するか、google.accounts が存在するかで判断
            gapiReady = (typeof gapi !== 'undefined' && gapi.load);
            gisReady = (typeof google !== 'undefined' && google.accounts);

            if (gapiReady && gisReady) {
                // グローバルに定義された関数を実行
                if (typeof window.gapiLoaded === 'function') window.gapiLoaded();
                if (typeof window.gisLoaded === 'function') window.gisLoaded();
                console.log("Google API loaded.");
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        console.warn('Google APIのロードに時間がかかっています。');
        // タイムアウトしても、ロード済みのものだけ実行してみる
        if (gapiReady && typeof window.gapiLoaded === 'function') window.gapiLoaded();
        if (gisReady && typeof window.gisLoaded === 'function') window.gisLoaded();
    }

    initializeApp();
});