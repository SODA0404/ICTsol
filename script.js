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

    // ===== ▼▼▼ 勉強記録機能 (SM-2アルゴリズム対応) ▼▼▼ =====
    
    // --- 勉強モーダルの要素取得 ---
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

    // --- (新設) 復習フィードバックモーダルの要素取得 ---
    const reviewFeedbackModal = document.getElementById('review-feedback-modal');
    const reviewItemText = document.getElementById('review-item-text');
    const reviewItemIdHidden = document.getElementById('review-item-id-hidden');
    const feedbackButtons = document.querySelectorAll('.feedback-btn');

    // --- 勉強モーダルの表示ロジック ---
    addStudyLogBtn.addEventListener('click', () => studyChoiceModal.classList.remove('hidden'));
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').classList.add('hidden');
        });
    });
    
    showTimerBtn.addEventListener('click', () => { studyChoiceModal.classList.add('hidden'); timerLogModal.classList.remove('hidden'); });
    showManualBtn.addEventListener('click', () => { studyChoiceModal.classList.add('hidden'); manualLogModal.classList.remove('hidden'); });

    // --- タイマー機能 ---
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

            // ★ 変更: 期限を取得
            const deadline = document.getElementById('timer-deadline').value || null;

            addNewStudyItem(
                `【${timerSubject.value}】${timerContent.value}`, 
                startTime, 
                endTime,
                deadline // ★ 追加: 期限を渡す
            );
            
            timerToggleBtn.textContent = 'スタート';
            timerToggleBtn.classList.remove('is-timing');
            timerDisplay.textContent = '00:00:00';
            timerSubject.disabled = false;
            timerContent.disabled = false;
            timerSubject.value = '';
            timerContent.value = '';
            document.getElementById('timer-deadline').value = ''; // ★ 追加: 期限もリセット
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

    // --- 手動入力機能 ---
    manualLogForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = document.getElementById('manual-subject').value;
        const content = document.getElementById('manual-content').value;
        const date = document.getElementById('manual-date').value;
        const startTimeStr = document.getElementById('manual-start-time').value;
        const duration = parseInt(document.getElementById('manual-duration').value);
        
        // ★ 変更: 期限を取得
        const deadline = document.getElementById('manual-deadline').value || null;
        
        const startDateTime = new Date(`${date}T${startTimeStr}`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
        
        addNewStudyItem(
            `【${subject}】${content}`, 
            startDateTime, 
            endDateTime,
            deadline // ★ 追加: 期限を渡す
        );
        
        manualLogForm.reset();
        manualLogModal.classList.add('hidden');
    });


    // ===== ★★★ SM-2 アルゴリズムのコアロジック ★★★ =====

    const formatTime = (date) => date.toTimeString().split(' ')[0].substring(0, 5);
    const formatDate = (date) => date.toISOString().split('T')[0];
    const today = () => new Date(new Date().setHours(0, 0, 0, 0)); // 今日の0時0分

    /**
     * (変更) 新しい勉強項目をDBとカレンダーに追加する
     * @param {string} title - 勉強内容
     * @param {Date} start - 開始日時
     * @param {Date} end - 終了日時
     * @param {string | null} deadline - (★追加) 期限日 (YYYY-MM-DD)
     */
    async function addNewStudyItem(title, start, end, deadline = null) {
        // ★ 1. データを取得
        const usersData = await getUsersData();
        if (!usersData[currentUser]) usersData[currentUser] = { password: '', schedules: [], reviewItems: [] };
        if (!usersData[currentUser].reviewItems) usersData[currentUser].reviewItems = [];

        // ★ 変更: タイトルに期限を追加
        const itemTitle = deadline ? `${title} [期限: ${deadline}]` : title;

        // 2. 勉強した「元ネタ」を reviewItems リストに保存 (ローカル)
        const reviewItem = {
            id: `${Date.now()}-${title}`, // 固有ID
            text: itemTitle, // ★ 変更
            originalStartTime: formatTime(start), 
            originalEndTime: formatTime(end),
            deadline: deadline, // ★ 追加: 期限データを保持
            reviewCount: 0,
            easeFactor: 2.5,
            interval: 0,
            nextReviewDate: formatDate(start) 
        };
        usersData[currentUser].reviewItems.push(reviewItem);

        // 3. 「勉強した」という事実をカレンダーに登録 (ローカル)
        const originalSchedule = {
            date: formatDate(start),
            startTime: formatTime(start),
            endTime: formatTime(end),
            text: itemTitle, // ★ 変更
            isReview: false,
            reviewItemId: null 
        };
        usersData[currentUser].schedules.push(originalSchedule);
        
        // 4. ★★★ 変更点 ★★★
        // 取得した usersData を processReview に渡す
        await processReview(usersData, reviewItem.id, 4, true); // `isInitialLearning = true`

        alert('勉強記録を登録しました。翌日に1回目の復習がセットされます。');
    }

    /**
     * (新設) 復習のフィードバックを処理し、次の復習予定を計算する
     * @param {object} usersData - ★★★ (変更点) usersData オブジェクト
     * @param {string} reviewItemId - 処理対象の reviewItem の ID
     * @param {number} quality - ユーザーのフィードバック (5, 4, 3, 2)
     * @param {boolean} isInitialLearning - 新規登録時(true)か、カレンダーからの実行(false)か
     */
    async function processReview(usersData, reviewItemId, quality, isInitialLearning = false) {
        // ★★★ 変更点 ★★★
        // const usersData = await getUsersData(); // ← 削除 (引数で受け取る)
        
        const schedules = usersData[currentUser].schedules;
        const reviewItems = usersData[currentUser].reviewItems;

        // 1. マスターリストから復習アイテムを見つける
        const itemIndex = reviewItems.findIndex(item => item.id === reviewItemId);
        if (itemIndex === -1) {
            // (isInitialLearning が true の場合、このエラーは発生しなくなったはず)
            console.error('該当の復習アイテムが見つかりません:', reviewItemId);
            return;
        }
        const item = reviewItems[itemIndex];

        // 2. (カレンダーからの実行の場合) 完了した予定をカレンダーから削除
        if (!isInitialLearning) {
            const completedScheduleIndex = schedules.findIndex(s => s.reviewItemId === reviewItemId);
            if (completedScheduleIndex > -1) {
                schedules.splice(completedScheduleIndex, 1);
            }
        }

        // --- SM-2 アルゴリズムの核 ---

        // 3. フィードバックに基づいてデータを更新
        if (quality < 3) {
            item.reviewCount = 0; 
            item.interval = 1;      
            item.easeFactor = Math.max(1.3, item.easeFactor - 0.2); 
        } else {
            item.reviewCount += 1;
            
            const q = quality;
            const newEF = item.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
            item.easeFactor = Math.max(1.3, newEF); 

            if (item.reviewCount === 1) {
                item.interval = 1;
            } else if (item.reviewCount === 2) {
                item.interval = 6;
            } else {
                item.interval = Math.round(item.interval * item.easeFactor);
            }
        }

        // 4. 習得済み (reviewCount >= 5) かチェック
        if (item.reviewCount >= 5) {
            reviewItems.splice(itemIndex, 1);
            if (!isInitialLearning) {
                alert(`「${item.text}」は習得済みとなりました！お疲れ様でした。`);
            }
        } else {
            // 5. 習得済みでない場合、次の復習日を計算してカレンダーに登録
            
            // 5a. SM-2による標準の次の復習日を計算
            const standardNextDate = today(); // 今日の0時
            standardNextDate.setDate(standardNextDate.getDate() + item.interval);
            
            let finalNextDate = standardNextDate; // 最終的な復習日

            // 5b. (★新ロジック) 期限（Deadline）が設定されているかチェック
            if (item.deadline) {
                const deadlineDate = new Date(`${item.deadline}T00:00:00`); // 期限日の0時
                const todayDate = today();

                // 5c. 期限が有効か (今日以降か)
                if (deadlineDate >= todayDate) {
                    
                    // 5d. SM-2の結果が期限を超えるか？
                    if (standardNextDate > deadlineDate) {
                        
                        // --- 圧縮ロジック発動 ---
                        
                        // 習得までに必要な残りの復習回数を計算 (例: 5回完了)
                        // (現在 reviewCount がインクリメントされた後なので、(5 - item.reviewCount) で正しい)
                        const remainingReviewsNeeded = Math.max(1, 5 - item.reviewCount); // 最低1回
                        
                        // 期限までの残り日数を計算 (明日は1、今日は0)
                        const daysUntilDeadline = Math.max(0, Math.floor((deadlineDate - todayDate) / (1000 * 60 * 60 * 24)));

                        let compressedInterval;

                        if (daysUntilDeadline === 0) {
                            // 期限が今日 (だが、今日はもう復習した)
                            // → 最短の「明日」に設定
                            compressedInterval = 1;
                        } else if (daysUntilDeadline < remainingReviewsNeeded) {
                            // 残り日数 < 残り回数 (例: 2日で3回)
                            // → 毎日やるしかない (間隔 = 1日)
                            compressedInterval = 1;
                        } else {
                            // 残り日数 >= 残り回数 (例: 10日で3回)
                            // 均等割り (例: 10 / 3 = 3.33 -> 3日ごと)
                            compressedInterval = Math.floor(daysUntilDeadline / remainingReviewsNeeded);
                        }
                        
                        // 間隔は最低でも1日 (今日復習したため)
                        const finalInterval = Math.max(1, compressedInterval);
                        
                        finalNextDate = today();
                        finalNextDate.setDate(finalNextDate.getDate() + finalInterval);

                        // 最終チェック: 圧縮した結果が期限を超えていないか？ (通常超えないはずだが念のため)
                        if (finalNextDate > deadlineDate) {
                            finalNextDate = deadlineDate;
                        }
                    }
                }
            }
            
            // 5e. 最終決定した日付でカレンダーに登録
            item.nextReviewDate = formatDate(finalNextDate);

            const reviewSchedule = {
                date: item.nextReviewDate,
                startTime: item.originalStartTime, 
                endTime: item.originalEndTime,
                // item.text は既に [期限: ...] を含んでいる
                text: `(復習${item.reviewCount}回目) ${item.text}`,
                isReview: true,
                reviewItemId: item.id 
            };
            
            schedules.push(reviewSchedule);
        }
        
        // --- SM-2 ここまで ---

        // 6. ★★★ 変更点 ★★★
        // 処理の最後に必ずデータを保存し、ビューを更新する
        await saveUsersData(usersData);
        await updateView();

        if (reviewFeedbackModal) {
            reviewFeedbackModal.classList.add('hidden');
        }
    }

    /**
     * (新設) 通常の予定（復習ではない）をカレンダーに追加する
     */
    async function addSimpleSchedule(date, startTime, endTime, text) {
        const usersData = await getUsersData();
        if (!usersData[currentUser]) usersData[currentUser] = { password: JSON.parse(sessionStorage.getItem('user'))?.password, schedules: [], reviewItems: [] };
        
        usersData[currentUser].schedules.push({ 
            date, 
            startTime, 
            endTime, 
            text, 
            isReview: false,
            reviewItemId: null 
        }); 
        
        await saveUsersData(usersData);
        await updateView();
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
                endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1時間と仮定
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

    // ★★★ 描画ロジックを修正 (復習アイテムのクリック対応) ★★★
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
            } else {
                return false;
            }
            // 終了時刻が過去でも、今日の日付のものは表示する (復習し忘れ対応)
            const scheduleDate = new Date(s.date);
            if (scheduleDate.toDateString() === today().toDateString()) {
                return true;
            }
            return scheduleEndTime > now;
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

                if (s.isReview) {
                    li.classList.add('review-item');
                    li.dataset.reviewItemId = s.reviewItemId; 
                    li.title = "クリックして復習を評価";
                }

                li.innerHTML = `
                    <span class="schedule-item-content">
                        <strong>${s.date} (${new Intl.DateTimeFormat('ja-JP', {weekday:'short'}).format(new Date(s.date))})</strong>
                        <span>${startTime} - ${endTime}</span>
                        ${s.text}
                    </span>
                    <button class="delete-btn" title="削除"><i class="fas fa-trash-alt"></i></button>`;
                
                li.dataset.date = s.date;
                li.dataset.text = s.text;
                if(s.startTime) li.dataset.startTime = s.startTime;
                if(s.endTime) li.dataset.endTime = s.endTime;
                if(s.time) li.dataset.time = s.time;
                if(s.isReview) li.dataset.isReview = s.isReview;

                scheduleElements.list.appendChild(li);
            });
    }

    // DOM要素作成ヘルパー
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
        if (schedule.isReview) {
            item.classList.add('review-item');
            item.dataset.reviewItemId = schedule.reviewItemId;
            item.title = "クリックして復習を評価";
        }
        const startTime = schedule.startTime || schedule.time;
        item.textContent = `${startTime} ${schedule.text}`;
        return item;
    }

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
            
            usersData[username] = { password, schedules: [], reviewItems: [] }; 
            
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

        // ★★★ 通常の予定追加フォーム (ロジック分離) ★★★
        forms.schedule.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('schedule-date').value;
            const startTime = document.getElementById('schedule-start-time').value;
            const endTime = document.getElementById('schedule-end-time').value;
            const text = document.getElementById('schedule-text').value.trim();

            if(!date || !startTime || !endTime || !text) return alert('全て入力してください。');
            if (endTime <= startTime) return alert('終了時刻は開始時刻より後に設定してください。');
            
            await addSimpleSchedule(date, startTime, endTime, text);
            
            e.target.reset();
        });

        // ★★★ 削除ロジック (★ 修正) ★★★
        scheduleElements.list.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                e.stopPropagation(); 
                const li = deleteButton.parentElement;
                await deleteScheduleItem(li.dataset);
                return; 
            }

            const reviewItemElement = e.target.closest('li[data-review-item-id]');
            if (reviewItemElement) {
                const reviewItemId = reviewItemElement.dataset.reviewItemId;
                await openReviewModal(reviewItemId);
            }
        });
        
        // ★★★ (新設) カレンダー内の復習アイテムクリック ★★★
        scheduleElements.calendarView.addEventListener('click', async (e) => {
             const reviewItemElement = e.target.closest('.calendar-schedule-item[data-review-item-id]');
             if (reviewItemElement) {
                const reviewItemId = reviewItemElement.dataset.reviewItemId;
                await openReviewModal(reviewItemId);
             }
        });

        // ★★★ (新設) 復習フィードバックモーダルのボタン処理 ★★★
        if (feedbackButtons) {
            feedbackButtons.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const quality = parseInt(btn.dataset.quality);
                    const reviewItemId = reviewItemIdHidden.value;
                    if (reviewItemId && quality) {
                        reviewFeedbackModal.classList.add('hidden');
                        
                        // ★★★ 変更点 ★★★
                        // データを「先に」取得して、引数として渡す
                        const usersData = await getUsersData();
                        await processReview(usersData, reviewItemId, quality);
                    }
                });
            });
        } else {
            console.error("復習モーダルのボタンが見つかりません。HTMLが正しく読み込まれていません。");
        }


        // ナビゲーション (変更なし)
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
        
        // Google 同期ボタン (変更なし)
        buttons.googleSync.addEventListener('click', () => { 
            syncSchedulesToGoogle();
        });

        // --- テーマ切り替え (変更なし) ---
        buttons.themeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    /**
     * (新設) 削除ロジックの本体
     * @param {DOMStringMap} dataset - 削除対象li要素のdataset
     */
    async function deleteScheduleItem(dataset) {
        const { date, text, startTime, endTime, time, isReview } = dataset;
        const usersData = await getUsersData();
        const schedules = usersData[currentUser]?.schedules || [];
        
        const isReviewBool = (isReview === "true"); 
        let index = -1;

        if (startTime && endTime) {
            // Case 1: 新しいデータ (startTime, endTime がある)
            index = schedules.findIndex(s => 
                s.date === date && 
                s.startTime === startTime && 
                s.endTime === endTime && 
                s.text === text &&
                (s.isReview || false) === isReviewBool
            );
        } else if (time) {
            // Case 2: 古いデータ (time しかない)
            index = schedules.findIndex(s => 
                s.date === date && 
                s.time === time && 
                s.text === text &&
                !s.startTime &&
                (s.isReview || false) === isReviewBool
            );
        }

        if (index > -1) {
            // ★ もし復習予定を削除した場合、マスターリストからも削除する
            if (isReviewBool && schedules[index].reviewItemId) {
                const reviewItemId = schedules[index].reviewItemId;
                const reviewItems = usersData[currentUser].reviewItems || [];
                const reviewItemIndex = reviewItems.findIndex(item => item.id === reviewItemId);
                if (reviewItemIndex > -1) {
                    reviewItems.splice(reviewItemIndex, 1);
                    alert('復習予定をカレンダーから削除し、復習マスターリストからも削除しました。');
                }
            }
            
            schedules.splice(index, 1); 
            await saveUsersData(usersData); 
            await updateView(); 
        } else {
            console.error("削除対象のデータが見つかりません:", dataset);
        }
    }


    /**
     * (新設) 復習モーダルを開く
     * @param {string} reviewItemId 
     */
    async function openReviewModal(reviewItemId) {
        // (HTMLに要素が直接あるので、いつでも参照可能)
        const usersData = await getUsersData();
        const reviewItem = usersData[currentUser]?.reviewItems.find(item => item.id === reviewItemId);
        
        if (!reviewItem) {
            alert('エラー: 該当の復習項目が見つかりませんでした。削除されたか、データが破損しています。');
            await updateView(); // 画面を再同期
            return;
        }

        reviewItemText.textContent = reviewItem.text;
        reviewItemIdHidden.value = reviewItem.id;
        reviewFeedbackModal.classList.remove('hidden');
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
            // セッションログイン時にパスワードを（簡易的に）検証
            const usersData = await getUsersData();
            if (usersData[savedUser.username]?.password === savedUser.password) {
                await loginUser(savedUser.username, savedUser.password);
            } else {
                sessionStorage.removeItem('user');
                showScreen('welcome-container');
            }
        } else {
            showScreen('welcome-container');
        }
        // defer実行のため、グローバル関数を呼び出す
        if (typeof gapiLoaded === 'function') gapiLoaded();
        if (typeof gisLoaded === 'function') gisLoaded();
    }

    // ★ 5. DOMContentLoaded の最後で初期化を実行
    initializeApp();
});