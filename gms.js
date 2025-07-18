// ==================== 常量配置区域 ====================
const CONFIG = {
    // 时间相关常量
    TIME: {
        WARNING_DAYS: 10,           // 任务警告天数
        RECENT_DAYS: 7,             // 近期任务天数
        ACTIVE_TASK_THRESHOLD: 3,   // 活跃任务阈值
        BACKUP_CLEANUP_COUNT: 10    // 保留备份数量
    },
    
    // DOM选择器常量
    SELECTORS: {
        SETTINGS_MODAL: '#settingsModal',
        MODAL_OVERLAY: '#modalOverlay',
        CONFIRM_SETTINGS_BTN: '#confirmSettingsBtn',
        MONTH_PANEL: '#monthPanel',
        TASKPICKER_PANEL: '#taskpickerPanel',
        DAY_PANEL: '#dayPanel',
        PROJECT_LIST_CONTAINER: '#projectListContainer'
    },
    
    // 存储键名常量
    STORAGE_KEYS: {
        PROJECTS: 'projects',
        TAG_LIBRARY: 'tagLibrary',
        CALENDAR_SETTINGS: 'calendarSettings',
        SHOW_TIME: 'showTime',
        SHOW_COUNT: 'showCount',
        TASK_FONT_SIZE: 'taskFontSize',
        NAV_MENU_ACTIVE_INDEX: 'navMenuActiveIndex',
        BACKUP_CONFIG: 'backupConfig'
    },
    
    // 样式类名常量
    CSS_CLASSES: {
        HIDDEN: 'hidden',
        ACTIVE: 'active',
        PICKER_MODE: 'picker-mode',
        GREEN_PREVIEW_BOX: 'green-preview-box',
        PROJECT_CARD_COMPACT: 'project-card-compact'
    }
};

// 默认备份配置
const DEFAULT_BACKUP_CONFIG = {
    enabled: true,
    interval: 5, // 分钟
    delay: 2, // 秒
    mode: 'download', // 'download' 或 'silent'
    notification: true,
    consoleLog: true
};

// ==================== 主要功能代码 ====================

document.getElementById('confirmSettingsBtn').addEventListener('click', function() {
    const modal = document.getElementById('settingsModal');
    const overlay = document.getElementById('modalOverlay');
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    // 刷新当前视图
    const today = new Date();
    renderMonthView(today);
    
});

        // 从localStorage获取项目数据
        function getProjects() {
            try {
                const projectsJson = localStorage.getItem(CONFIG.STORAGE_KEYS.PROJECTS) || '[]';
                const projects = JSON.parse(projectsJson);
                
                // 确保返回的是数组
                if (!Array.isArray(projects)) {
                    console.error('getProjects: 存储的数据不是数组格式', projects);
                    return [];
                }
                
                // 验证和修复项目数据结构
                const validatedProjects = projects.map(project => {
                    if (!project || typeof project !== 'object') {
                        console.warn('发现无效的项目数据，已跳过:', project);
                        return null;
                    }
                    
                    // 确保基本属性存在
                    const validatedProject = {
                        id: project.id || Date.now(),
                        name: project.name || '未命名项目',
                        category: project.category || '未分类',
                        subtasks: [],
                        ...project
                    };
                    
                    // 验证子任务数组
                    if (project.subtasks && Array.isArray(project.subtasks)) {
                        validatedProject.subtasks = project.subtasks.filter(subtask => {
                            if (!subtask || typeof subtask !== 'object') {
                                console.warn('发现无效的子任务数据，已跳过:', subtask);
                                return false;
                            }
                            
                            // 确保子任务基本属性存在
                            if (!subtask.name || typeof subtask.name !== 'string') {
                                console.warn('子任务缺少有效名称，已跳过:', subtask);
                                return false;
                            }
                            
                            return true;
                        });
                    }
                    
                    return validatedProject;
                }).filter(project => project !== null);
                
                return validatedProjects;
            } catch (error) {
                console.error('getProjects: 解析项目数据失败', error);
                return [];
            }
        }

        // 自动备份相关变量
        let backupTimer = null;
        let lastBackupTime = 0;
        
        // 获取备份配置
        function getBackupConfig() {
            try {
                const savedConfig = localStorage.getItem(CONFIG.STORAGE_KEYS.BACKUP_CONFIG);
                if (savedConfig) {
                    const config = JSON.parse(savedConfig);
                    return { ...DEFAULT_BACKUP_CONFIG, ...config };
                }
            } catch (error) {
                console.error('读取备份配置失败:', error);
            }
            return DEFAULT_BACKUP_CONFIG;
        }
        
        // 保存备份配置
        function saveBackupConfig(config) {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEYS.BACKUP_CONFIG, JSON.stringify(config));
            } catch (error) {
                console.error('保存备份配置失败:', error);
            }
        }

        // 收集备份数据
        function collectBackupData() {
            try {
                // 安全地解析各项数据
                let projects = [];
                try {
                    projects = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PROJECTS) || '[]');
                    if (!Array.isArray(projects)) projects = [];
                } catch (e) {
                    console.error('解析项目数据失败:', e);
                    projects = [];
                }
                
                let tagLibrary = [];
                try {
                    tagLibrary = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TAG_LIBRARY) || '[]');
                    if (!Array.isArray(tagLibrary)) tagLibrary = [];
                } catch (e) {
                    console.error('解析标签库数据失败:', e);
                    tagLibrary = [];
                }
                
                let calendarSettings = {};
                try {
                    calendarSettings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CALENDAR_SETTINGS) || '{}');
                    if (typeof calendarSettings !== 'object' || calendarSettings === null) calendarSettings = {};
                } catch (e) {
                    console.error('解析日历设置数据失败:', e);
                    calendarSettings = {};
                }
                
                return {
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    data: {
                        projects,
                        tagLibrary,
                        calendarSettings,
                        showTime: localStorage.getItem(CONFIG.STORAGE_KEYS.SHOW_TIME),
                        showCount: localStorage.getItem(CONFIG.STORAGE_KEYS.SHOW_COUNT),
                        taskFontSize: localStorage.getItem(CONFIG.STORAGE_KEYS.TASK_FONT_SIZE),
                        navMenuActiveIndex: localStorage.getItem(CONFIG.STORAGE_KEYS.NAV_MENU_ACTIVE_INDEX)
                    }
                };
            } catch (error) {
                console.error('收集备份数据失败:', error);
                return null;
            }
        }

        // 自动备份文件
        function autoBackup() {
            try {
                const config = getBackupConfig();
                const backupData = collectBackupData();
                if (!backupData) {
                    if (config.consoleLog) {
                        console.warn('备份数据为空，跳过备份');
                    }
                    return;
                }

                const blob = new Blob([JSON.stringify(backupData, null, 2)], {
                    type: 'application/json'
                });
                
                // 生成文件名：学习计划备份_YYYY-MM-DD_HH-MM-SS.json
                const now = new Date();
                const date = now.toISOString().slice(0, 10);
                const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');
                const fileName = `学习计划备份_${date}_${time}.json`;
                
                if (config.mode === 'download') {
                    // 自动下载模式
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    
                    // 触发下载
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    if (config.consoleLog) {
                        console.log(`✅ 自动备份完成: ${fileName}`);
                    }
                    
                    if (config.notification) {
                        showBackupStatus('✅ 备份完成');
                    }
                } else {
                    // 静默模式 - 保存到浏览器存储
                    const backupKey = `backup_${Date.now()}`;
                    try {
                        localStorage.setItem(backupKey, JSON.stringify(backupData));
                        
                        // 清理旧的静默备份（保留最近10个）
                        cleanupSilentBackups();
                        
                        if (config.consoleLog) {
                            console.log(`✅ 静默备份完成: ${backupKey}`);
                        }
                        
                        if (config.notification) {
                            showBackupStatus('✅ 静默备份完成');
                        }
                    } catch (error) {
                        console.error('静默备份失败:', error);
                        if (config.notification) {
                            showBackupStatus('❌ 静默备份失败');
                        }
                    }
                }
                
                // 更新最后备份时间
                lastBackupTime = Date.now();
                
            } catch (error) {
                const config = getBackupConfig();
                console.error('自动备份失败:', error);
                if (config.notification) {
                    showBackupStatus('❌ 备份失败');
                }
            }
        }
        
        // 清理旧的静默备份
        function cleanupSilentBackups() {
            try {
                const backupKeys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('backup_')) {
                        backupKeys.push(key);
                    }
                }
                
                // 按时间戳排序，保留最近指定数量的备份
                backupKeys.sort().reverse();
                if (backupKeys.length > CONFIG.TIME.BACKUP_CLEANUP_COUNT) {
                    backupKeys.slice(CONFIG.TIME.BACKUP_CLEANUP_COUNT).forEach(key => {
                        localStorage.removeItem(key);
                    });
                }
            } catch (error) {
                console.error('清理静默备份失败:', error);
            }
        }
        
        // 手动下载备份（总是下载模式）
        function manualDownloadBackup() {
            try {
                const backupData = collectBackupData();
                if (!backupData) {
                    console.warn('备份数据为空，跳过备份');
                    return;
                }

                const blob = new Blob([JSON.stringify(backupData, null, 2)], {
                    type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // 生成文件名：学习计划备份_YYYY-MM-DD_HH-MM-SS.json
                const now = new Date();
                const date = now.toISOString().slice(0, 10);
                const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');
                const fileName = `学习计划备份_${date}_${time}.json`;
                
                a.download = fileName;
                
                // 触发下载
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log(`✅ 手动备份完成: ${fileName}`);
                showBackupStatus('✅ 手动备份完成');
                
            } catch (error) {
                console.error('手动备份失败:', error);
                showBackupStatus('❌ 手动备份失败');
            }
        }
        
        // 初始化自动备份设置界面
        function initAutoBackupSettings() {
            const config = getBackupConfig();
            
            // 设置开关状态
            const autoBackupEnabled = document.getElementById('autoBackupEnabled');
            const autoBackupToggle = document.getElementById('autoBackupToggle');
            const autoBackupSlider = document.getElementById('autoBackupSlider');
            
            if (autoBackupEnabled) {
                autoBackupEnabled.checked = config.enabled;
                updateToggleStyle(autoBackupToggle, autoBackupSlider, config.enabled);
                
                autoBackupEnabled.addEventListener('change', function() {
                    const enabled = this.checked;
                    updateToggleStyle(autoBackupToggle, autoBackupSlider, enabled);
                    
                    // 保存配置
                    const newConfig = { ...config, enabled };
                    saveBackupConfig(newConfig);
                    
                    // 更新状态显示
                    updateBackupSettingsStatus();
                });
            }
            
            // 设置备份间隔
            const backupIntervalSelect = document.getElementById('backupIntervalSelect');
            if (backupIntervalSelect) {
                backupIntervalSelect.value = config.interval;
                backupIntervalSelect.addEventListener('change', function() {
                    const newConfig = { ...config, interval: parseInt(this.value) };
                    saveBackupConfig(newConfig);
                    updateBackupSettingsStatus();
                });
            }
            
            // 设置延迟时间
            const backupDelaySelect = document.getElementById('backupDelaySelect');
            if (backupDelaySelect) {
                backupDelaySelect.value = config.delay;
                backupDelaySelect.addEventListener('change', function() {
                    const newConfig = { ...config, delay: parseInt(this.value) };
                    saveBackupConfig(newConfig);
                    updateBackupSettingsStatus();
                });
            }
            
            // 设置备份模式
            const backupModeDownload = document.getElementById('backupModeDownload');
            const backupModeSilent = document.getElementById('backupModeSilent');
            
            if (backupModeDownload && backupModeSilent) {
                if (config.mode === 'download') {
                    backupModeDownload.checked = true;
                } else {
                    backupModeSilent.checked = true;
                }
                
                backupModeDownload.addEventListener('change', function() {
                    if (this.checked) {
                        const newConfig = { ...config, mode: 'download' };
                        saveBackupConfig(newConfig);
                        updateBackupSettingsStatus();
                    }
                });
                
                backupModeSilent.addEventListener('change', function() {
                    if (this.checked) {
                        const newConfig = { ...config, mode: 'silent' };
                        saveBackupConfig(newConfig);
                        updateBackupSettingsStatus();
                    }
                });
            }
            
            // 设置通知选项
            const backupNotificationEnabled = document.getElementById('backupNotificationEnabled');
            if (backupNotificationEnabled) {
                backupNotificationEnabled.checked = config.notification;
                backupNotificationEnabled.addEventListener('change', function() {
                    const newConfig = { ...config, notification: this.checked };
                    saveBackupConfig(newConfig);
                });
            }
            
            const backupConsoleLogEnabled = document.getElementById('backupConsoleLogEnabled');
            if (backupConsoleLogEnabled) {
                backupConsoleLogEnabled.checked = config.consoleLog;
                backupConsoleLogEnabled.addEventListener('change', function() {
                    const newConfig = { ...config, consoleLog: this.checked };
                    saveBackupConfig(newConfig);
                });
            }
            
            // 更新状态显示
            updateBackupSettingsStatus();
        }
        
        // 更新开关样式
        function updateToggleStyle(toggle, slider, enabled) {
            if (enabled) {
                toggle.style.backgroundColor = '#4CAF50';
                slider.style.transform = 'translateX(26px)';
            } else {
                toggle.style.backgroundColor = '#ccc';
                slider.style.transform = 'translateX(0)';
            }
        }
        
        // 更新备份设置状态显示
        function updateBackupSettingsStatus() {
            const config = getBackupConfig();
            
            const statusAutoBackup = document.getElementById('statusAutoBackup');
            const statusInterval = document.getElementById('statusInterval');
            const statusMode = document.getElementById('statusMode');
            const statusLastBackup = document.getElementById('statusLastBackup');
            
            if (statusAutoBackup) {
                statusAutoBackup.textContent = config.enabled ? '已启用' : '已禁用';
                statusAutoBackup.style.color = config.enabled ? '#4CAF50' : '#ff4444';
            }
            
            if (statusInterval) {
                statusInterval.textContent = `${config.interval}分钟`;
            }
            
            if (statusMode) {
                statusMode.textContent = config.mode === 'download' ? '自动下载' : '静默保存';
            }
            
            if (statusLastBackup) {
                if (lastBackupTime > 0) {
                    const lastBackupDate = new Date(lastBackupTime);
                    statusLastBackup.textContent = lastBackupDate.toLocaleString();
                } else {
                    statusLastBackup.textContent = '未备份';
                }
            }
        }
        
        // 计算localStorage使用量
        function calculateStorageUsage() {
            try {
                let totalSize = 0;
                const storageDetails = [];
                const maxStorage = 5 * 1024 * 1024; // 5MB in bytes
                
                // 遍历所有localStorage键值对
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                        const value = localStorage.getItem(key);
                        const size = (key.length + value.length) * 2; // UTF-16编码，每个字符2字节
                        totalSize += size;
                        
                        // 收集存储详情
                        storageDetails.push({
                            key: key,
                            size: size,
                            valueLength: value.length
                        });
                    }
                }
                
                return {
                    used: totalSize,
                    max: maxStorage,
                    percentage: (totalSize / maxStorage) * 100,
                    details: storageDetails.sort((a, b) => b.size - a.size) // 按大小排序
                };
            } catch (error) {
                console.error('计算存储使用量失败:', error);
                return {
                    used: 0,
                    max: 5 * 1024 * 1024,
                    percentage: 0,
                    details: []
                };
            }
        }
        
        // 格式化存储大小
        function formatStorageSize(bytes) {
            if (bytes === 0) return '0 B';
            
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // 更新存储使用量显示
        function updateStorageUsageDisplay() {
            const usage = calculateStorageUsage();
            
            // 更新进度条
            const usageBar = document.getElementById('storageUsageBar');
            const usageText = document.getElementById('storageUsageText');
            const usedStorage = document.getElementById('usedStorage');
            const availableStorage = document.getElementById('availableStorage');
            const storageDetails = document.getElementById('storageDetails');
            
            if (usageBar) {
                usageBar.style.width = Math.min(usage.percentage, 100) + '%';
                
                // 根据使用量改变颜色
                if (usage.percentage > 80) {
                    usageBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6b6b)';
                } else if (usage.percentage > 60) {
                    usageBar.style.background = 'linear-gradient(90deg, #ffa726, #ffcc02)';
                } else {
                    usageBar.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
                }
            }
            
            if (usageText) {
                usageText.textContent = `${formatStorageSize(usage.used)} / ${formatStorageSize(usage.max)}`;
            }
            
            if (usedStorage) {
                usedStorage.textContent = formatStorageSize(usage.used);
            }
            
            if (availableStorage) {
                const available = usage.max - usage.used;
                availableStorage.textContent = formatStorageSize(available);
            }
            
            if (storageDetails) {
                let detailsHtml = '';
                usage.details.forEach((item, index) => {
                    if (index < 8) { // 只显示前8个最大的项目
                        detailsHtml += `${item.key}: ${formatStorageSize(item.size)} (${item.valueLength} chars)<br>`;
                    }
                });
                
                if (usage.details.length > 8) {
                    detailsHtml += `... 还有 ${usage.details.length - 8} 个项目`;
                }
                
                storageDetails.innerHTML = detailsHtml || '暂无数据';
            }
        }

        // 显示备份状态
        function showBackupStatus(message) {
            // 移除已存在的状态提示
            const existingStatus = document.querySelector('.backup-status');
            if (existingStatus) {
                existingStatus.remove();
            }
            
            const status = document.createElement('div');
            status.className = 'backup-status';
            status.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                transition: opacity 0.3s ease;
            `;
            status.textContent = message;
            
            document.body.appendChild(status);
            
            // 3秒后自动消失
            setTimeout(() => {
                if (status.parentNode) {
                    status.style.opacity = '0';
                    setTimeout(() => {
                        if (status.parentNode) {
                            status.remove();
                        }
                    }, 300);
                }
            }, 3000);
        }

        // 触发自动备份（带防抖和频率控制）
        function triggerAutoBackup() {
            const config = getBackupConfig();
            
            // 检查是否启用自动备份
            if (!config.enabled) {
                return;
            }
            
            const now = Date.now();
            const minInterval = config.interval * 60 * 1000; // 转换为毫秒
            
            // 检查是否超过最小备份间隔
            if ((now - lastBackupTime) < minInterval) {
                if (config.consoleLog) {
                    console.log(`备份间隔太短，跳过本次备份（间隔${config.interval}分钟）`);
                }
                return;
            }
            
            // 清除之前的定时器
            clearTimeout(backupTimer);
            
            // 设置延迟，避免频繁备份
            const delay = config.delay * 1000; // 转换为毫秒
            backupTimer = setTimeout(() => {
                autoBackup();
            }, delay);
        }

        // 保存项目数据
        function saveProjects(projects) {
            // 添加安全检查，防止保存undefined或null
            if (!projects || !Array.isArray(projects)) {
                console.error('saveProjects: 无效的projects参数', projects);
                return;
            }
            localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
            
            // 触发自动备份
            triggerAutoBackup();
            
            // 更新存储使用量显示
            updateStorageUsageDisplay();
            
            // 更新统计卡片
            updateStatsCards();
        }

        // 格式化日期为YYYY-MM-DD
        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // 获取当天日期
        function getToday() {
            return new Date();
        }

        // 当前查看日期
        currentViewDate = getToday();

        // 格式化时长（分钟转小时分钟）
        function formatDuration(minutes) {
            if (!minutes || minutes <= 0) return '0m';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours > 0 ? hours + 'h' : ''}${mins}m`;
        }

        // 格式化当前日期为年月日格式
        function formatCurrentDate() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // 格式化当前时间为时分格式
        function formatCurrentTime() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        // 初始化设置数据存储结构
        function initSettingsData() {
            const existingData = localStorage.getItem(CONFIG.STORAGE_KEYS.CALENDAR_SETTINGS);
            let needsUpdate = false;
            let settingsData;
            
                // 默认法定节假日 (MM-DD格式)
                const defaultHolidays = [
                    { date: '01-01', name: '元旦' },
                    { date: '02-10', name: '春节' },
                    { date: '02-11', name: '春节' },
                    { date: '02-12', name: '春节' },
                    { date: '04-04', name: '清明节' },
                    { date: '05-01', name: '劳动节' },
                    { date: '06-10', name: '端午节' },
                    { date: '09-15', name: '中秋节' },
                    { date: '10-01', name: '国庆节' },
                    { date: '10-02', name: '国庆节' },
                    { date: '10-03', name: '国庆节' }
                ];
            
            if (!existingData) {
                // 如果没有数据，创建默认数据
                settingsData = {
                    holidays: defaultHolidays,
                    temporaryPlans: []
                };
                needsUpdate = true;
            } else {
                // 如果有数据，检查数据结构
                try {
                    settingsData = JSON.parse(existingData);
                    
                    // 确保数据结构正确
                    if (!settingsData.holidays) {
                        settingsData.holidays = [];
                    }
                    if (!settingsData.temporaryPlans) {
                        settingsData.temporaryPlans = [];
                    }
                    
                    // 如果节假日列表为空，添加默认节假日
                    if (settingsData.holidays.length === 0) {
                        settingsData.holidays = defaultHolidays;
                        needsUpdate = true;
                    }
                } catch (e) {
                    console.error('解析设置数据失败，使用默认数据:', e);
                    settingsData = {
                        holidays: defaultHolidays,
                        temporaryPlans: []
                    };
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.CALENDAR_SETTINGS, JSON.stringify(settingsData));
            }
        }

        // 获取设置数据
        function getSettingsData() {
            try {
                const data = localStorage.getItem(CONFIG.STORAGE_KEYS.CALENDAR_SETTINGS);
                if (!data) {
                    return { holidays: [], temporaryPlans: [] };
                }
                
                const parsedData = JSON.parse(data);
                
                // 验证数据结构
                if (!parsedData || typeof parsedData !== 'object') {
                    console.error('设置数据不是有效对象，使用默认值');
                    return { holidays: [], temporaryPlans: [] };
                }
                
                // 确保必要属性存在且为数组
                const validatedData = {
                    holidays: Array.isArray(parsedData.holidays) ? parsedData.holidays : [],
                    temporaryPlans: Array.isArray(parsedData.temporaryPlans) ? parsedData.temporaryPlans : []
                };
                
                // 验证节假日数据格式
                validatedData.holidays = validatedData.holidays.filter(holiday => {
                    if (!holiday || typeof holiday !== 'object') {
                        console.warn('发现无效的节假日数据，已跳过:', holiday);
                        return false;
                    }
                    if (!holiday.date || !holiday.name || typeof holiday.date !== 'string' || typeof holiday.name !== 'string') {
                        console.warn('节假日数据缺少必要字段，已跳过:', holiday);
                        return false;
                    }
                    return true;
                });
                
                // 验证临时计划数据格式
                validatedData.temporaryPlans = validatedData.temporaryPlans.filter(plan => {
                    if (!plan || typeof plan !== 'object') {
                        console.warn('发现无效的临时计划数据，已跳过:', plan);
                        return false;
                    }
                    if (!plan.name || !plan.date || typeof plan.name !== 'string' || typeof plan.date !== 'string') {
                        console.warn('临时计划数据缺少必要字段，已跳过:', plan);
                        return false;
                    }
                    return true;
                });
                
                return validatedData;
            } catch (e) {
                console.error('Failed to parse settings data:', e);
                // 数据解析失败时返回默认值
                return { holidays: [], temporaryPlans: [] };
            }
        }

        // 保存设置数据
        function saveSettingsData(data) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.CALENDAR_SETTINGS, JSON.stringify(data));
            // 触发自动备份
            triggerAutoBackup();
            // 更新存储使用量显示
            updateStorageUsageDisplay();
        }



        // 渲染节假日列表
        function renderHolidaysList() {
            const holidaysList = document.getElementById('holidaysList');
            if (!holidaysList) {
                return;
            }
            
            const { holidays } = getSettingsData();
            
            holidaysList.innerHTML = '';

            if (!holidays || holidays.length === 0) {
                // 重置容器样式为默认
                holidaysList.style.display = 'block';
                holidaysList.style.flexDirection = 'column';
                holidaysList.style.flexWrap = 'nowrap';
                holidaysList.style.gap = '0';
                
                const emptyMessage = document.createElement('div');
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.color = '#666';
                emptyMessage.style.fontSize = '14px';
                emptyMessage.style.padding = '20px';
                emptyMessage.textContent = '暂无节假日设置';
                holidaysList.appendChild(emptyMessage);
                return;
            }
            
            // 设置容器样式为flex布局
            holidaysList.style.gap = '10px';
            holidaysList.style.display = 'flex';
            holidaysList.style.flexDirection = 'row';
            holidaysList.style.flexWrap = 'wrap';

            holidays.forEach((holiday, index) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.padding = '10px';
                item.style.border = '1px solid #ff4444';
                item.style.borderRadius = '8px';
                item.style.marginBottom = '10px';
                item.style.position = 'relative';
                item.style.fontSize = '13px';
                item.innerHTML = `
                    <span>${holiday.date} - ${holiday.name}</span>
                    <button class="delete-holiday" data-index="${index}" style="background: none; color: #000000; border: none; padding: 0; cursor: pointer; position: absolute; top: 1px; right: 2px;"><strong>X</strong></button>
                `;
                holidaysList.appendChild(item);
            });

            // 添加删除事件监听
            document.querySelectorAll('.delete-holiday').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const data = getSettingsData();
                    data.holidays.splice(index, 1);
                    saveSettingsData(data);
                    renderHolidaysList();
                });
            });
        }

        // 渲染临时计划列表
        function renderTemporaryPlans() {
            const plansList = document.getElementById('plansList');
            const { temporaryPlans } = getSettingsData();
            plansList.innerHTML = '';

            temporaryPlans.forEach((plan, index) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.padding = '10px';
                item.style.border = '1px solid #eee';
                item.style.borderRadius = '4px';
                item.style.marginBottom = '10px';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>${plan.name}</strong>
                        <div>
                            <button class="edit-plan" data-index="${index}" style="background: #4a89dc; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; margin-right: 5px;">编辑</button>
                            <button class="delete-plan" data-index="${index}" style="background: #ff4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">删除</button>
                        </div>
                    </div>
                    <div style="margin-top: 5px; font-size: 14px;">
                        <div>日期: ${plan.date}</div>
                        <div>时间: ${plan.startTime} - ${plan.endTime}</div>
                        <div>状态: ${plan.status || '未完成'}</div>
                    </div>
                `;
                plansList.appendChild(item);
            });

            // 添加编辑和删除事件监听
            document.querySelectorAll('.edit-plan').forEach(btn => {
                btn.addEventListener('click', function() {
                    // 编辑功能实现
                    const index = parseInt(this.getAttribute('data-index'));
                    const data = getSettingsData();
                    const plan = data.temporaryPlans[index];
                    
                    document.getElementById('planName').value = plan.name;
                    document.getElementById('planDate').value = plan.date;
                    document.getElementById('planStartTime').value = plan.startTime;
                    document.getElementById('planEndTime').value = plan.endTime;
                    
                    // 切换到编辑模式
                    const addBtn = document.getElementById('addPlanBtn');
                    addBtn.textContent = '更新计划';
                    addBtn.setAttribute('data-edit-index', index);
                });
            });

            document.querySelectorAll('.delete-plan').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const data = getSettingsData();
                    data.temporaryPlans.splice(index, 1);
                    saveSettingsData(data);
                    renderTemporaryPlans();
                });
            });
        }

        // 初始化设置弹窗
        function initSettingsModal() {
            // 初始化数据
            initSettingsData();
            
            // 获取元素
            const modal = document.getElementById('settingsModal');
            const overlay = document.getElementById('modalOverlay');
            const settingsBtn = document.getElementById('settingsBtn');
            const closeBtn = document.getElementById('closeSettingsBtn');
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');
            const addHolidayBtn = document.getElementById('addHolidayBtn');
            const refreshHolidaysBtn = document.getElementById('refreshHolidaysBtn');
            const addPlanBtn = document.getElementById('addPlanBtn');

            // 检查必要元素是否存在
            if (!modal || !overlay) {
                return;
            }
            if (!settingsBtn) {
                // 延迟重试，因为settingsBtn可能动态创建
                setTimeout(() => {
                    const retrySettingsBtn = document.getElementById('settingsBtn');
                    if (retrySettingsBtn) {
                        bindSettingsButtonEvent(retrySettingsBtn, modal, overlay);
                    }
                }, 1000);
            } else {
                bindSettingsButtonEvent(settingsBtn, modal, overlay);
            }

            // 绑定设置按钮事件的函数
            function bindSettingsButtonEvent(btn, modal, overlay) {
                btn.addEventListener('click', function() {
                    // 每次打开设置弹窗时都重新初始化数据
                    initSettingsData();
                    
                modal.style.display = 'block';
                overlay.style.display = 'block';
                    
                                // 延迟渲染，确保弹窗已经显示
            setTimeout(() => {
                console.log('开始渲染节假日列表...');
                // 强制重新初始化数据
                initSettingsData();
                renderHolidaysList();
                renderTemporaryPlans();
                // 初始化自动备份设置
                initAutoBackupSettings();
            }, 100);
            });
            }



            // 关闭弹窗
            function closeModal() {
                if (modal) modal.style.display = 'none';
                if (overlay) overlay.style.display = 'none';
                // 重置添加计划按钮
                addPlanBtn.textContent = '添加计划';
                addPlanBtn.removeAttribute('data-edit-index');
                document.getElementById('planName').value = '';
                document.getElementById('planDate').value = '';
                document.getElementById('planStartTime').value = '';
                document.getElementById('planEndTime').value = '';
            }

            closeBtn.addEventListener('click', closeModal);
            overlay.addEventListener('click', closeModal);

            // 标签页切换
            tabBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const tab = this.getAttribute('data-tab');
                    
                    // 更新按钮样式
                    tabBtns.forEach(b => {
                        b.classList.remove('active');
                        b.style.color = '#666';
                    });
                    this.classList.add('active');
                    this.style.color = '#50b767';
                    
                    // 显示对应内容
                    tabContents.forEach(content => {
                        content.style.display = 'none';
                    });
                    document.getElementById(`${tab}Content`).style.display = 'block';
                });
            });

            // 添加节假日
            addHolidayBtn.addEventListener('click', function() {
                const dateInput = document.getElementById('holidayDate');
                const nameInput = document.getElementById('holidayName');
                const date = dateInput.value.trim();
                const name = nameInput.value.trim();

                if (date && name && /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(date)) {
                    const data = getSettingsData();
                    data.holidays.push({ date, name });
                    saveSettingsData(data);
                    renderHolidaysList();
                    dateInput.value = '';
                    nameInput.value = '';
                } else {
                    alert('请输入有效的日期(MM-DD)和节假日名称');
                }
            });

            // 刷新节假日列表
            if (refreshHolidaysBtn) {
                refreshHolidaysBtn.addEventListener('click', function() {
                    initSettingsData();
                    renderHolidaysList();
                });
            }



            // 添加或更新临时计划
            addPlanBtn.addEventListener('click', function() {
                const nameInput = document.getElementById('planName');
                const dateInput = document.getElementById('planDate');
                const startTimeInput = document.getElementById('planStartTime');
                const endTimeInput = document.getElementById('planEndTime');
                
                const name = nameInput.value.trim();
                const date = dateInput.value;
                const startTime = startTimeInput.value;
                const endTime = endTimeInput.value;
                
                if (name && date && startTime && endTime) {
                    const data = getSettingsData();
                    const editIndex = this.getAttribute('data-edit-index');
                    
                    if (editIndex !== null) {
                        // 更新现有计划
                        data.temporaryPlans[editIndex] = {
                            ...data.temporaryPlans[editIndex],
                            name, date, startTime, endTime
                        };
                        this.removeAttribute('data-edit-index');
                        this.textContent = '添加计划';
                    } else {
                        // 添加新计划
                        data.temporaryPlans.push({
                            name, date, startTime, endTime, status: '未完成'
                        });
                    }
                    
                    saveSettingsData(data);
                    renderTemporaryPlans();
                    
                    // 清空表单
                    nameInput.value = '';
                    dateInput.value = '';
                    startTimeInput.value = '';
                    endTimeInput.value = '';
                } else {
                    alert('请填写所有计划字段');
                }
            });
        }

        // 任务完成确认弹窗
        function openCompleteTaskModal(taskItem) {
            // 移除已存在的模态框防止事件重复绑定
            const existingModal = document.getElementById('completeTaskModal');
            if (existingModal) {
                existingModal.remove();
            }

            // 创建新的模态框元素
            const modal = document.createElement('div');
            modal.id = 'completeTaskModal';
            modal.className = 'task-modal';
            modal.innerHTML = `
                <div class="modal-content">
                                <div class="modal-header">
                <h3 id="modalTitle"></h3>
                <div class="project-progress-container">
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="projectProgressBar">
                            <div class="progress-fill" id="projectProgressFill"></div>
                        </div>
                    </div>
                    <div class="progress-text" id="projectProgressText"></div>
                </div>
                <span class="close-btn">&times;</span>
            </div>
                    <div class="modal-tabs">
                        <div class="tab-buttons">
                            <button class="tab-btn active" data-tab="complete">完成任务确认</button>
                            <button class="tab-btn" data-tab="edit">修改子任务</button>
                            <button class="tab-btn" data-tab="subtasks">项目子任务列表</button>
                        </div>
                        <div class="tab-content">
                            <!-- 完成任务确认标签页 -->
                            <div class="tab-pane active" id="complete-tab">
                                <!-- 操作选择按钮区域 -->
                                <div id="action-buttons-area" class="action-buttons-container">
                                    <div class="action-buttons">
                                        <button id="modifyTaskBtn" class="action-btn">修改任务</button>
                                        <button id="markCompleteBtn" class="action-btn">标记完成</button>
                                        <button id="cancelPlanBtn" class="action-btn">取消计划</button>
                                    </div>
                                    <p class="action-warning">⚠️ 请选择上面按钮点击后确认！</p>
                                </div>
                                
                                <!-- 原始完成任务确认内容（默认隐藏） -->
                                <div id="original-complete-content" class="original-complete-content" style="display: none;">
                                    <p><strong>任务标题：</strong><span id="modalStartTimeDisplay"></span>：<span id="modalTaskTitle"></span></p>
                                    
                                    <div class="time-input-group">
                                        <div class="input-row">
                                            <span for="modalCompleteTime">完成日期：</span>
                                            <input type="date" id="modalCompleteTime">
                                            <span for="modalTaskDuration">任务用时：</span>
                                            <input type="number" id="modalTaskDuration" min="1" value="30" style="width: 80px;">
                                            <span>分钟</span>
                                        </div>
                                        <div class="input-row">
                                            <span for="modalStartTime">开始时间：</span>
                                            <input type="time" id="modalStartTime" step="60">
                                        
                                            <span for="modalEndTime">完成时间：</span>
                                            <input type="time" id="modalEndTime" step="60">
                                        </div>
                                    </div>
                                    <p style="color: red;"><strong>⚠️ 确认本条任务已完成后，无法修改任务状态和时间！</strong></p>
                                    <div class="modal-footer">
                                        <button id="modalCancelBtn" class="btn cancel">取消</button>
                                        <button id="modalConfirmBtn" class="btn confirm">确认</button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 修改子任务标签页 -->
                            <div class="tab-pane" id="edit-tab">
                                <div class="form-group">
                                
                                    <span for="editTaskName">任务名称:</span>
                                    <input type="text" id="editTaskName" class="form-control">
                                </div>
                                <div class="form-group">
                                    
                                    <div class="status-radios">
                                        <span class="radio-label">
                                            <input type="radio" name="status" value="0"> <span>计划中</span>
                                        </span>
                                        <span class="radio-label">
                                            <input type="radio" name="status" value="1"> <span>已完成</span>
                                        </span>
                                        <span class="radio-label">
                                            <input type="radio" name="status" value="-1"> <span>不计划</span>
                                        </span>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editCompleteTime">完成日期：</label>
                                        <input type="date" id="editCompleteTime" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="editConsumingTime">用时(分钟)：</label>
                                        <input type="number" id="editConsumingTime" class="form-control" min="1">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editStartTime">开始时间：</label>
                                        <input type="time" id="editStartTime" step="60" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="editEndTime">结束时间：</label>
                                        <input type="time" id="editEndTime" step="60" class="form-control">
                                    </div>
                                </div>
                                <p style="color: red; font-size: 13px; margin-bottom: 5px; font-weight: bold;">**下方预览当天任务时间安排，点击可选择开始时间**</p>
                                <div class="time-slot-container">
                                                            <div class="time-slot-scroll">
                                        <div class="time-slot-bar" id="timeSlotBar"></div>
                                        <div class="time-markers"></div>
                                        <div class="time-ruler"></div>
                                    </div>
                                                        </div>
                                <div class="modal-footer">
                                    <button id="editCancelBtn" class="btn cancel">取消</button>
                                    <button id="editSaveBtn" class="btn confirm">保存修改</button>
                                </div>
                            </div>
                            
                            <!-- 项目子任务列表标签页 -->
                            <div class="tab-pane" id="subtasks-tab">
                                <h4>所属项目所有子任务</h4>
                                <div id="subtasksList" class="subtasks-list"></div>
                                <div class="modal-footer">
                                    <button id="subtasksCloseBtn" class="btn cancel">关闭</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .task-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; }
                .modal-content { background-color: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 600px; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; border-bottom: 1px solid #eee; padding-bottom: 1px; }
                .close-btn { cursor: pointer; font-size: 24px; }
                .modal-body { margin-bottom: 20px; }
                .time-input-group { 
                    margin-top: 15px; 
                    display: flex; 
                    flex-direction: column; 
                    gap: 10px; 
                }
                .input-row { 
                    display: flex; 
                    align-items: center; 
                    gap: 10px; 
                    flex-wrap: nowrap; 
                }
                .time-input-group span { 
                    white-space: nowrap; 
                    margin-right: 5px; 
                }
                #modalStartTime, #modalCompleteTime, #modalEndTime { 
                    padding: 8px; 
                    width: 120px; 
                    flex-shrink: 0; 
                }
                .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
                .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
                .confirm { background-color: #4CAF50; color: white; }
                .cancel { background-color: #f44336; color: white; }
                
                /* 标签页样式 */
                .modal-tabs { margin-top: 15px; }
                .tab-buttons { display: flex; border-bottom: 1px solid #ccc; margin-bottom: 15px; }
                .tab-btn { padding: 8px 16px; background: none; border: none; cursor: pointer; border-bottom: 3px solid transparent; }
                .tab-btn.active { border-bottom-color: #4CAF50; color: #4CAF50; font-weight: bold; }
                .tab-content { min-height: 200px; }
                .tab-pane { display: none; }
                .tab-pane.active { display: block; }
                
                /* 表单样式 */
                .form-group { margin-bottom: 15px; }
                .form-control { width: 100%; padding: 8px; box-sizing: border-box; margin-top: 5px; }
                .form-row { display: flex; gap: 15px; margin-bottom: 15px; }
                .form-row .form-group { flex: 1; margin-bottom: 0; }
                label { display: block; }
                
                /* 状态单选按钮样式 */
                .status-radios { display: flex; gap: 10px; margin-top: 8px; }
                .radio-label { display: flex; align-items: center; padding: 6px 12px; border-radius: 4px; cursor: pointer; background-color: #ccc; color: white; position: relative; }
                .radio-label input { 
                    position: absolute; 
                    opacity: 0; 
                    pointer-events: none; 
                    width: 0; 
                    height: 0; 
                    margin: 0; 
                }
                .radio-label:has(input:checked) { background-color: #4CAF50; }
                
                /* 子任务列表样式 */
                .subtasks-list { max-height: 300px; overflow-y: auto; margin-top: 10px; border:1px solid #ccc; padding:10px; }
                .subtask-item { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: auto; height: auto; padding: 10px; border: 1px solid #ccc; border-radius: 5px; background-color: #fff; margin: 5px; position: relative; cursor: pointer; }
.subtask-item:hover { background-color: #f0fff4; box-shadow: 0 0 2px rgba(0, 0, 0, 0.3); }
.task-name { font-size: 14px; font-weight: normal; margin:2px 5px; text-align: center; }
.subtask-item.status-planned-border { border-color: #ff9800; } /* 计划中-橙色边框 */
.subtask-item.status-completed-border { border-color: #28a745; } /* 已完成-绿色边框 */
.task-check-icon { position: absolute; bottom: -5px; right: -1px; width: 20px; height: 25px; }
.task-plan-icon { position: absolute; bottom: -4px; right: 1px; width: 16px; height: 25px; }
.task-date { position: absolute; top: 1px; left: 3px; font-size: 11px; color: #666; font-weight: bold; }
.subtask-item.status-unplanned-border { border-color: #eee; } /* 未计划-灰色边框 */
            
            /* 时间条样式 */
            .time-slot-container { margin: 20px 0; position: relative; overflow-x: auto; width: 100%; }

            .time-slot-scroll { margin: 0 30px; overflow: hidden; position: relative; width: 900px; }
            /* 鼠标悬浮时间指示器 */
            .time-indicator { position: absolute; width: 2px; height: 100%; background-color: #ff9800; pointer-events: none; display: none; z-index: 10; }
            /* 时间注释层 */
            .time-tooltip { position: fixed; background-color: white; border: 2px solid #ff9800; border-radius: 8px; padding: 3px 8px; font-size: 12px; pointer-events: none; display: none; z-index: 1000; white-space: nowrap; }
            .time-ruler-marker.quarter-hour { height: 5px; background-color: #999; top: -5px; }
            .time-slot-bar { height: 50px; background: #f0f0f0; border-radius: 5px; position: relative; width: 900px; }
            .time-slot { position: absolute; height: 100%; background: #a7d937db; border-radius: 0px;color: white; font-size: 12px; padding: 2px 5px; box-sizing: border-box; }
            .time-slot.empty { background: #e0e0e0; }
            .time-markers { display: none; justify-content: space-between; padding: 0 5px; font-size: 8px; color: #666; margin-top: 5px; width: 900px; position: relative; box-sizing: border-box; }
            .time-ruler { height: 25px; width: 900px; position: relative; margin-top: 5px; margin-bottom: 20px; border-top: 1px solid #ccc; }
.time-ruler-marker { position: absolute; width: 1px; }
.time-ruler-marker.full-hour { height: 15px; background-color: #333; top: 0; }
.time-ruler-marker.half-hour { height: 10px; background-color:orange; top: -10px; }
.time-ruler-label { position: absolute; transform: translateX(-50%); font-size: 12px; }
            .time-ruler-label.full-hour { bottom: 0; color: #333; }
.time-ruler-label.half-hour { top: 0; color: #666; }

                /* 操作按钮样式 */
.action-buttons-container { text-align: center; padding: 20px; }
.action-buttons { display: flex; gap: 15px; justify-content: center; margin-bottom: 15px; }
.action-btn { 
    padding: 12px 24px; 
    background-color: #6c757d; 
    color: white; 
    border: none; 
    border-radius: 6px; 
    cursor: pointer; 
    font-size: 16px; 
    transition: background-color 0.3s ease; 
}
.action-btn:hover { background-color: #5a6268; }
.action-warning { 
    color: #dc3545; 
    font-weight: bold; 
    margin: 0; 
    font-size: 14px; 
}

/* 项目进度条样式 */
.project-progress-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    margin-left: 20px;
}

.progress-bar-container {
    width: 200px;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
}

.progress-bar {
    width: 100%;
    height: 100%;
    position: relative;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #45a049);
    border-radius: 4px;
    transition: width 0.3s ease;
    position: relative;
}

.progress-text {
    font-size: 12px;
    color: #666;
    font-weight: bold;
    text-align: center;
    white-space: nowrap;
}

/* 响应式调整 */
@media (max-width: 768px) {
    .project-progress-container {
        margin-left: 10px;
    }
    .progress-bar-container {
        width: 120px;
        height: 6px;
    }
    .progress-text {
        font-size: 10px;
    }
}
            `;
            document.head.appendChild(style);

            // 关闭按钮事件
            modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
            // 取消按钮事件（在原始完成任务确认内容中）
            modal.querySelector('#modalCancelBtn').addEventListener('click', () => {
                // 隐藏原始完成任务确认内容，显示按钮区域
                modal.querySelector('#original-complete-content').style.display = 'none';
                modal.querySelector('#action-buttons-area').style.display = 'block';
            });
            // 点击外部关闭
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

            // 填充任务信息
            modal.querySelector('#modalTitle').textContent = taskItem.projectName;
            modal.querySelector('#modalTaskTitle').textContent = taskItem.subtask.name;
            modal.querySelector('#modalStartTimeDisplay').textContent = taskItem.subtask.startTime || '未设置';
            modal.querySelector('#modalStartTime').value = taskItem.subtask.startTime || formatCurrentTime();
            modal.querySelector('#modalCompleteTime').value = formatCurrentDate();
            modal.querySelector('#modalEndTime').value = formatCurrentTime();
            modal.querySelector('#modalTaskDuration').value = taskItem.subtask.consumingTime || 30;
            
            // 计算并显示项目进度
            const allProjects = getProjects();
            const currentProject = allProjects.find(p => p.name === taskItem.projectName);
            if (currentProject && currentProject.subtasks) {
                const totalTasks = currentProject.subtasks.length;
                const completedTasks = currentProject.subtasks.filter(s => s.status === 1).length;
                const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                
                // 更新进度条
                const progressFill = modal.querySelector('#projectProgressFill');
                const progressText = modal.querySelector('#projectProgressText');
                
                if (progressFill) {
                    progressFill.style.width = progressPercentage + '%';
                }
                
                if (progressText) {
                    progressText.textContent = `项目进度 ${progressPercentage}% - 已完成 (${completedTasks}) - 总任务 (${totalTasks})`;
                }
            }

            // 填充编辑表单
            modal.querySelector('#editTaskName').value = taskItem.subtask.name || '';
            // 设置状态单选按钮
            const status = taskItem.subtask.status !== undefined ? taskItem.subtask.status : 0;
            const statusRadio = modal.querySelector(`input[name="status"][value="${status}"]`);
            if (statusRadio) {
                statusRadio.checked = true;
            } else {
                // 默认选中计划中
                modal.querySelector('input[name="status"][value="0"]').checked = true;
            }
            modal.querySelector('#editCompleteTime').value = taskItem.subtask.completeTime ? formatDate(new Date(taskItem.subtask.completeTime)) : formatCurrentDate();

            // 添加radio-label点击事件处理
            const radioLabels = modal.querySelectorAll('.radio-label');
            radioLabels.forEach(label => {
                label.addEventListener('click', () => {
                    const radio = label.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.checked = true;
                    }
                });
            });

            // 生成时间条
            function renderTimeSlotBar(completeTime) {
                const timeSlotBar = modal.querySelector('#timeSlotBar');
                const timeMarkers = modal.querySelector('.time-markers');
                if (!timeSlotBar || !timeMarkers) return;

                timeSlotBar.innerHTML = '';
                timeMarkers.innerHTML = '';

                // 获取当天日期
                const date = completeTime ? new Date(completeTime) : new Date();
                const year = date.getFullYear();
                const month = date.getMonth();
                const day = date.getDate();
                const targetDate = formatDate(date);

                // 查询当天的所有任务
                const projects = getProjects();
                const tasks = [];
                projects.forEach(project => {
                    project.subtasks.forEach(subtask => {
                        if (subtask.completeTime && formatDate(new Date(subtask.completeTime)) === targetDate) {
                            tasks.push(subtask);
                        }
                    });
                });

                // 生成时间块（每10分钟一个单位）
                const totalUnits = 18 * 6; // 18小时 × 6个10分钟单位
                const unitWidth = 900 / totalUnits; // 每个10分钟单位的宽度

                for (let unit = 0; unit < totalUnits; unit++) { // 显示6:00-24:00，每10分钟一个单位
                    // 创建时间色块
                    const slot = document.createElement('div');
                    slot.className = 'time-slot empty';
                    slot.style.left = `${unit * unitWidth}px`; // 从6:00开始计算位置
                    slot.style.width = `${unitWidth}px`;
                    slot.dataset.unit = unit;

                    // 计算当前单位对应的小时和分钟
                    const totalMinutes = unit * 10;
                    const hour = 6 + Math.floor(totalMinutes / 60);
                    const minute = totalMinutes % 60;

                    // 检查该10分钟单位是否有任务
                    const task = tasks.find(task => {
                        if (!task.startTime) return false;
                        const [sHours, sMins] = task.startTime.split(':').map(Number);
                        const startTime = new Date(year, month, day, sHours, sMins);
                        let endTime;

                        if (task.endTime) {
                            const [eHours, eMins] = task.endTime.split(':').map(Number);
                            endTime = new Date(year, month, day, eHours, eMins);
                        } else if (task.consumingTime) {
                            endTime = new Date(startTime);
                            endTime.setMinutes(startTime.getMinutes() + parseInt(task.consumingTime));
                        } else {
                            endTime = new Date(startTime);
                            endTime.setHours(startTime.getHours() + 1);
                        }

                        const slotStart = new Date(year, month, day, hour, minute);
                        const slotEnd = new Date(year, month, day, hour, minute + 10);
                        return startTime < slotEnd && endTime > slotStart;
                    });

                    if (task) {
                        slot.classList.remove('empty');
                        slot.textContent = task.category || '';
                    }
                    timeSlotBar.appendChild(slot);
                }

                // 添加时间指示器和提示框
                const timeIndicator = document.createElement('div');
                timeIndicator.className = 'time-indicator';
                timeSlotBar.appendChild(timeIndicator);

                // 移除已存在的时间注释层
                const existingTooltip = document.querySelector('.time-tooltip');
                if (existingTooltip) existingTooltip.remove();
                const timeTooltip = document.createElement('div');
                timeTooltip.className = 'time-tooltip';
                document.body.appendChild(timeTooltip);

                // 添加鼠标移动事件以显示时间指示器
                timeSlotBar.addEventListener('mousemove', (e) => {
                    const rect = timeSlotBar.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    
                    // 计算当前时间（10分钟为单位）
                    const totalUnits = 18 * 6; // 18小时 × 6个10分钟单位
                    const unitWidth = 900 / totalUnits; // 每个10分钟单位的宽度
                    const unit = Math.floor(x / unitWidth);
                    const totalMinutes = unit * 10;
                    const hour = 6 + Math.floor(totalMinutes / 60);
                    const minute = totalMinutes % 60;
                    const roundedMinute = minute;
                    
                    // 更新指示器位置
                    timeIndicator.style.left = `${x}px`;
                    timeIndicator.style.display = 'block';
                    
                    // 更新提示框位置和内容
                    timeTooltip.textContent = `${hour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`;
                    timeTooltip.style.left = `${e.clientX + 10}px`;
                    timeTooltip.style.top = `${e.clientY - 30}px`;
                    timeTooltip.style.display = 'block';
                });

                // 鼠标离开时隐藏指示器
                timeSlotBar.addEventListener('mouseleave', () => {
                    timeIndicator.style.display = 'none';
                    timeTooltip.style.display = 'none';
                });

                // 设置初始滚动位置到6:00
                modal.querySelector('.time-slot-scroll').scrollLeft = 0; // 起始位置无需滚动

                // 生成时间刻度尺（6:00-24:00，每10分钟一个刻度）
                const timeRuler = modal.querySelector('.time-ruler');
                timeRuler.innerHTML = '';
                for (let i = 0; i < totalUnits; i++) { // 每个10分钟一个刻度
                    const minute = i * 10;
                    const hour = 6 + Math.floor(minute / 60);
                    const minuteInHour = minute % 60;
                    const isFullHour = minuteInHour === 0;
                    const isHalfHour = minuteInHour === 30;
                    const position = i * unitWidth;

                    // 创建刻度线
                    const marker = document.createElement('div');
                    if (isFullHour) {
                        marker.className = 'time-ruler-marker full-hour';
                    } else if (isHalfHour) {
                        marker.className = 'time-ruler-marker half-hour';
                    } else {
                        marker.className = 'time-ruler-marker quarter-hour';
                    }
                    marker.style.left = `${position}px`;
                    timeRuler.appendChild(marker);

                    // 创建时间标签
                    if (isFullHour) {
                        const label = document.createElement('div');
                        label.className = 'time-ruler-label full-hour';
                        label.style.left = `${position}px`;
                        label.textContent = `${hour}:00`;
                        timeRuler.appendChild(label);
                    } else if (isHalfHour) {
                        const label = document.createElement('div');
                        label.className = 'time-ruler-label half-hour';
                        label.style.left = `${position}px`;
                        label.textContent = `${hour}:30`;
                        timeRuler.appendChild(label);
                    }
                }
            }

                // 添加时间色块点击事件
                timeSlotBar.addEventListener('click', (e) => {
                    if (e.target.classList.contains('time-slot')) {
                        const unit = parseInt(e.target.dataset.unit);
                        const totalMinutes = unit * 10;
                        const hour = 6 + Math.floor(totalMinutes / 60);
                        const minute = totalMinutes % 60;
                        modal.querySelector('#editStartTime').value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    }
                });

            // 初始化时间条
            renderTimeSlotBar(taskItem.subtask.completeTime);
            modal.querySelector('#editStartTime').value = taskItem.subtask.startTime || '';
            modal.querySelector('#editEndTime').value = taskItem.subtask.endTime || '';
            modal.querySelector('#editConsumingTime').value = taskItem.subtask.consumingTime || 30;

            // 加载项目子任务列表
            const projects = getProjects();
            const project = projects.find(p => p.name === taskItem.projectName);
            const subtasksList = modal.querySelector('#subtasksList');

            // 计算任务统计数据
            const completedTasks = project ? project.subtasks.filter(s => s.status === 1).length : 0;
            const uncompletedTasks = project ? project.subtasks.length - completedTasks : 0;
            const totalTasks = project ? project.subtasks.length : 0;

            // 更新标题
            const subtaskTitle = modal.querySelector('#subtasks-tab h4');
            if (subtaskTitle) {
                subtaskTitle.textContent = `全部子任务 (已完成: ${completedTasks}, 未完成: ${uncompletedTasks}, 总任务: ${totalTasks})`;
            }

            if (project && project.subtasks.length > 0) {
                // 清空容器
                subtasksList.innerHTML = '';
                
                project.subtasks.forEach((subtask, index) => {
                    const subtaskItem = document.createElement('div');
                    subtaskItem.className = `subtask-item status-${subtask.status === 0 ? 'planned' : subtask.status === 1 ? 'completed' : 'unplanned'}-border`;
                    subtaskItem.setAttribute('data-subtask-index', index);
                    
                    // 添加日期元素（如果需要）
                    if ((subtask.status === 0 || subtask.status === 1) && subtask.completeTime) {
                        const dateSpan = document.createElement('span');
                        dateSpan.className = 'task-date';
                        dateSpan.textContent = formatDate(new Date(subtask.completeTime)).split('-').slice(1).join('-');
                        subtaskItem.appendChild(dateSpan);
                    }
                    
                    // 添加任务名称元素
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'task-name';
                    nameSpan.textContent = subtask.name; // 使用 textContent 而不是 innerHTML
                    subtaskItem.appendChild(nameSpan);
                    
                    // 添加状态图标
                    if (subtask.status === 1) {
                        const checkIcon = document.createElement('div');
                        checkIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="task-check-icon" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg>';
                        subtaskItem.appendChild(checkIcon);
                    } else if (subtask.status === 0) {
                        const planIcon = document.createElement('div');
                        planIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="task-plan-icon" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /><path d="M9 12h6" /><path d="M9 16h6" /></svg>';
                        subtaskItem.appendChild(planIcon);
                    }
                    
                    subtasksList.appendChild(subtaskItem);
                });
            } else {
                subtasksList.innerHTML = '<div class="empty-task">该项目暂无子任务</div>';
            }

            // 添加子任务点击事件
            subtasksList.addEventListener('click', function(e) {
                const subtaskItem = e.target.closest('.subtask-item');
                if (!subtaskItem) return;
                
                const index = parseInt(subtaskItem.dataset.subtaskIndex);
                const subtask = project.subtasks[index];
                
                // 获取当前名称和日期
                const currentName = subtask.name;
                let currentDate = '';
                if (subtask.completeTime) {
                    const date = new Date(subtask.completeTime);
                    currentDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                }
                
                // 弹窗输入新名称
                const newName = prompt('修改子任务名称:', currentName);
                if (newName === null || newName.trim() === '') {
                    alert('名称不能为空');
                    return;
                }
                
                // 弹窗输入新日期
                const newDate = prompt('修改任务日期 (YYYY-MM-DD):', currentDate);
                if (newDate === null) return;
                
                // 验证日期格式
                if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                    alert('日期格式不正确，请使用YYYY-MM-DD');
                    return;
                }
                
                // 更新子任务数据
                subtask.name = newName;
                subtask.completeTime = newDate;
                
                // 保存项目数据
                saveProjects(projects);
                
                // 更新DOM显示
                subtaskItem.querySelector('.task-name').textContent = newName;
                const dateElement = subtaskItem.querySelector('.task-date');
                if (dateElement) {
                    dateElement.textContent = newDate.split('-').slice(1).join('-');
                } else if (subtask.status === 0 || subtask.status === 1) {
                    // 如果之前没有日期元素但状态需要显示日期，则添加
                    const newDateElement = document.createElement('span');
                    newDateElement.className = 'task-date';
                    newDateElement.textContent = newDate.split('-').slice(1).join('-');
                    subtaskItem.insertBefore(newDateElement, subtaskItem.firstChild);
                }
                
                alert('子任务已更新');
            });

            // 标签页切换功能
            const tabButtons = modal.querySelectorAll('.tab-btn');
            const tabPanes = modal.querySelectorAll('.tab-pane');
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // 移除所有激活状态
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabPanes.forEach(pane => pane.classList.remove('active'));
                    
                    // 设置当前激活状态
                    button.classList.add('active');
                    const tabId = button.getAttribute('data-tab');
                    modal.querySelector(`#${tabId}-tab`).classList.add('active');
                });
            });

            // 编辑保存按钮事件
            modal.querySelector('#editSaveBtn').addEventListener('click', function() {
                try {
                    const taskName = modal.querySelector('#editTaskName').value;
                    const status = parseInt(modal.querySelector('input[name="status"]:checked').value);
                    const completeTime = modal.querySelector('#editCompleteTime').value;
                    const startTime = modal.querySelector('#editStartTime').value;
                    const endTime = modal.querySelector('#editEndTime').value;
                    const consumingTime = parseInt(modal.querySelector('#editConsumingTime').value);

                    if (!taskName || !completeTime || isNaN(consumingTime) || consumingTime <= 0) {
                        alert('请填写必要的任务信息');
                        return;
                    }

                    // 更新任务数据
                    const projects = getProjects();
                    if (!projects || !Array.isArray(projects)) {
                        throw new Error('项目数据无效');
                    }
                    
                    const projectIndex = projects.findIndex(p => p && p.name === taskItem.projectName);
                    if (projectIndex === -1) throw new Error('未找到项目');

                    const project = projects[projectIndex];
                    if (!project || !project.subtasks || !Array.isArray(project.subtasks)) {
                        throw new Error('项目子任务数据无效');
                    }

                    // 使用多个条件来唯一确定子任务：名称、完成日期、开始时间
                    const subtaskIndex = project.subtasks.findIndex(s => 
                        s && 
                        s.name === taskItem.subtask.name &&
                        s.completeTime === taskItem.subtask.completeTime &&
                        s.startTime === taskItem.subtask.startTime
                    );
                    
                    // 如果没找到，尝试只用名称和完成日期
                    let finalSubtaskIndex = subtaskIndex;
                    if (finalSubtaskIndex === -1) {
                        finalSubtaskIndex = project.subtasks.findIndex(s => 
                            s && 
                            s.name === taskItem.subtask.name &&
                            s.completeTime === taskItem.subtask.completeTime
                        );
                    }
                    
                    // 如果还是没找到，使用原来的逻辑（只按名称）
                    if (finalSubtaskIndex === -1) {
                        finalSubtaskIndex = project.subtasks.findIndex(s => s && s.name === taskItem.subtask.name);
                    }
                    
                    if (finalSubtaskIndex === -1) throw new Error('未找到子任务');

                    // 更新子任务字段
                    projects[projectIndex].subtasks[finalSubtaskIndex].name = taskName;
                    projects[projectIndex].subtasks[finalSubtaskIndex].status = status;
                    projects[projectIndex].subtasks[finalSubtaskIndex].completeTime = completeTime;
                    projects[projectIndex].subtasks[finalSubtaskIndex].startTime = startTime;
                    projects[projectIndex].subtasks[finalSubtaskIndex].endTime = endTime;
                    projects[projectIndex].subtasks[finalSubtaskIndex].consumingTime = consumingTime;

                    saveProjects(projects);
                    
                    // 获取当前选中的日期
                    const currentSelectedDate = getCurrentSelectedDate();
                    
                    // 关闭模态框
                    modal.remove();

                    // 延迟重新渲染视图，确保DOM更新完成
                    setTimeout(() => {
                        try {
                            // 重新渲染月视图
                            renderMonthView(new Date());
                            
                            // 重新渲染日视图，保持当前选中的日期
                            const dayPanel = document.getElementById('dayPanel');
                            if (dayPanel) {
                                renderDayView(currentSelectedDate, dayPanel);
                            }
                            
                            // 重新选中当前日期单元格
                            const dateStr = formatDate(currentSelectedDate);
                            const targetCell = document.querySelector(`.calendar-cell[data-date="${dateStr}"]`);
                            if (targetCell) {
                                // 移除所有选中状态
                                document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
                                // 添加选中状态
                                targetCell.classList.add('selected');
                            }
                        } catch (renderError) {
                            console.error('重新渲染视图时发生错误:', renderError);
                        }
                    }, 100);
                } catch (error) {
                    console.error('修改任务时发生错误:', error);
                    alert('修改失败: ' + error.message);
                }
            });

            // 编辑取消按钮事件
            modal.querySelector('#editCancelBtn').addEventListener('click', () => modal.remove());

            // 子任务列表关闭按钮事件
            modal.querySelector('#subtasksCloseBtn').addEventListener('click', () => modal.remove());

            // 确认按钮事件
            const confirmBtn = modal.querySelector('#modalConfirmBtn');
            confirmBtn.addEventListener('click', function() {
                console.log('确认按钮被点击');
                try {
                    const endTime = modal.querySelector('#modalEndTime').value;
                    const completeTime = modal.querySelector('#modalCompleteTime').value;
                    const taskDuration = modal.querySelector('#modalTaskDuration').value;
                    if (!endTime || !completeTime || !taskDuration) {
                        alert('请选择完成日期、时间和任务用时');
                        return;
                    }

                    // 更新任务状态
                    const projects = getProjects();
                    console.log('获取项目列表:', projects);
                    if (!projects || !Array.isArray(projects)) {
                        console.error('项目数据无效');
                        alert('更新失败: 项目数据无效');
                        return;
                    }
                    
                    const projectIndex = projects.findIndex(p => p && p.name === taskItem.projectName);
                    console.log('项目索引:', projectIndex, '项目名称:', taskItem.projectName);
                    if (projectIndex === -1) {
                        console.error('未找到项目:', taskItem.projectName);
                        alert('更新失败: 未找到项目');
                        return;
                    }

                    const project = projects[projectIndex];
                    if (!project || !project.subtasks || !Array.isArray(project.subtasks)) {
                        console.error('项目子任务数据无效');
                        alert('更新失败: 项目子任务数据无效');
                        return;
                    }

                    // 使用多个条件来唯一确定子任务：名称、完成日期、开始时间
                    const subtaskIndex = project.subtasks.findIndex(s => 
                        s && 
                        s.name === taskItem.subtask.name &&
                        s.completeTime === taskItem.subtask.completeTime &&
                        s.startTime === taskItem.subtask.startTime
                    );
                    
                    // 如果没找到，尝试只用名称和完成日期
                    let finalSubtaskIndex = subtaskIndex;
                    if (finalSubtaskIndex === -1) {
                        finalSubtaskIndex = project.subtasks.findIndex(s => 
                            s && 
                            s.name === taskItem.subtask.name &&
                            s.completeTime === taskItem.subtask.completeTime
                        );
                    }
                    
                    // 如果还是没找到，使用原来的逻辑（只按名称）
                    if (finalSubtaskIndex === -1) {
                        finalSubtaskIndex = project.subtasks.findIndex(s => s && s.name === taskItem.subtask.name);
                    }
                    
                    console.log('子任务索引:', finalSubtaskIndex, '子任务名称:', taskItem.subtask.name);
                    if (finalSubtaskIndex === -1) {
                        console.error('未找到子任务:', taskItem.subtask.name);
                        alert('更新失败: 未找到子任务');
                        return;
                    }

                    // 更新任务状态和结束时间
                    projects[projectIndex].subtasks[finalSubtaskIndex].status = 1;
                    projects[projectIndex].subtasks[finalSubtaskIndex].endTime = endTime;
                    projects[projectIndex].subtasks[finalSubtaskIndex].completeTime = completeTime;
                    projects[projectIndex].subtasks[finalSubtaskIndex].consumingTime = parseInt(taskDuration);
                    console.log('更新后的子任务数据:', projects[projectIndex].subtasks[finalSubtaskIndex]);

                    saveProjects(projects);
                    console.log('项目数据已保存');

                    // 获取当前选中的日期
                    const currentSelectedDate = getCurrentSelectedDate();

                    // 关闭并移除模态框
                    modal.remove();
                    console.log('模态框已移除');

                    // 重新渲染视图
                    console.log('开始重新渲染视图');
                    setTimeout(() => {
                        try {
                            // 重新渲染月视图
                            renderMonthView(new Date());
                            
                            // 重新渲染日视图，保持当前选中的日期
                            const dayPanel = document.getElementById('dayPanel');
                            if (dayPanel) {
                                renderDayView(currentSelectedDate, dayPanel);
                            }
                            
                            // 重新选中当前日期单元格
                            const dateStr = formatDate(currentSelectedDate);
                            const targetCell = document.querySelector(`.calendar-cell[data-date="${dateStr}"]`);
                            if (targetCell) {
                                // 移除所有选中状态
                                document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
                                // 添加选中状态
                                targetCell.classList.add('selected');
                            }
                            console.log('视图渲染完成');
                        } catch (renderError) {
                            console.error('重新渲染视图时发生错误:', renderError);
                        }
                    }, 100);
                } catch (error) {
                    console.error('确认任务时发生错误:', error);
                    alert('处理请求时出错: ' + error.message + '\n请查看控制台获取详细信息');
                }
            });

            // 新增操作按钮事件处理
            // 修改任务按钮事件
            modal.querySelector('#modifyTaskBtn').addEventListener('click', function() {
                // 切换到修改子任务标签页
                const tabButtons = modal.querySelectorAll('.tab-btn');
                const tabPanes = modal.querySelectorAll('.tab-pane');
                
                // 移除所有激活状态
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // 激活修改子任务标签页
                const editTabBtn = modal.querySelector('.tab-btn[data-tab="edit"]');
                const editTabPane = modal.querySelector('#edit-tab');
                editTabBtn.classList.add('active');
                editTabPane.classList.add('active');
            });

            // 标记完成按钮事件
            modal.querySelector('#markCompleteBtn').addEventListener('click', function() {
                // 隐藏按钮区域，显示原始完成任务确认内容
                modal.querySelector('#action-buttons-area').style.display = 'none';
                modal.querySelector('#original-complete-content').style.display = 'block';
                
                // 设置任务用时为原始的consumingTime值
                const taskDurationInput = modal.querySelector('#modalTaskDuration');
                if (taskDurationInput) {
                    taskDurationInput.value = taskItem.subtask.consumingTime || 30;
                }
            });

            // 取消计划按钮事件
            modal.querySelector('#cancelPlanBtn').addEventListener('click', function() {
                if (confirm(`确定要取消任务"${taskItem.subtask.name}"的计划吗？`)) {
                    try {
                        // 更新任务状态为取消计划
                        const projects = getProjects();
                        if (!projects || !Array.isArray(projects)) {
                            throw new Error('项目数据无效');
                        }
                        
                        const projectIndex = projects.findIndex(p => p && p.name === taskItem.projectName);
                        if (projectIndex === -1) throw new Error('未找到项目');

                        const project = projects[projectIndex];
                        if (!project || !project.subtasks || !Array.isArray(project.subtasks)) {
                            throw new Error('项目子任务数据无效');
                        }

                        // 使用多个条件来唯一确定子任务
                        const subtaskIndex = project.subtasks.findIndex(s => 
                            s && 
                            s.name === taskItem.subtask.name &&
                            s.completeTime === taskItem.subtask.completeTime &&
                            s.startTime === taskItem.subtask.startTime
                        );
                        
                        // 如果没找到，尝试只用名称和完成日期
                        let finalSubtaskIndex = subtaskIndex;
                        if (finalSubtaskIndex === -1) {
                            finalSubtaskIndex = project.subtasks.findIndex(s => 
                                s && 
                                s.name === taskItem.subtask.name &&
                                s.completeTime === taskItem.subtask.completeTime
                            );
                        }
                        
                        // 如果还是没找到，使用原来的逻辑（只按名称）
                        if (finalSubtaskIndex === -1) {
                            finalSubtaskIndex = project.subtasks.findIndex(s => s && s.name === taskItem.subtask.name);
                        }
                        
                        if (finalSubtaskIndex === -1) throw new Error('未找到子任务');

                        // 只更新status字段为-1
                        projects[projectIndex].subtasks[finalSubtaskIndex].status = -1;
                        saveProjects(projects);
                        
                        // 获取当前选中的日期
                        const currentSelectedDate = getCurrentSelectedDate();
                        
                        // 关闭模态框
                        modal.remove();
                        
                        // 重新渲染视图
                        setTimeout(() => {
                            try {
                                // 重新渲染月视图
                                renderMonthView(new Date());
                                
                                // 重新渲染日视图，保持当前选中的日期
                                const dayPanel = document.getElementById('dayPanel');
                                if (dayPanel) {
                                    renderDayView(currentSelectedDate, dayPanel);
                                }
                                
                                // 重新选中当前日期单元格
                                const dateStr = formatDate(currentSelectedDate);
                                const targetCell = document.querySelector(`.calendar-cell[data-date="${dateStr}"]`);
                                if (targetCell) {
                                    // 移除所有选中状态
                                    document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
                                    // 添加选中状态
                                    targetCell.classList.add('selected');
                                }
                                
                                // 移除成功提示，用户已经通过confirm确认了操作
                            } catch (renderError) {
                                console.error('重新渲染视图时发生错误:', renderError);
                            }
                        }, 100);
                    } catch (error) {
                        console.error('取消计划时发生错误:', error);
                        alert('取消失败: ' + error.message);
                    }
                }
            });

            // 显示模态框
            modal.style.display = 'flex';
        }

        // 格式化时间显示（提取时分）
        function formatTimeStr(timeStr) {
            if (!timeStr) return '';
            const parts = timeStr.split('T');
            return parts.length > 1 ? parts[1].slice(0, 5) : '';
        }

        // 获取当前选中的日期
        function getCurrentSelectedDate() {
            const selectedCell = document.querySelector('.calendar-cell.selected');
            if (selectedCell && selectedCell.dataset.date) {
                return new Date(selectedCell.dataset.date);
            }
            // 如果没有选中的日期，返回今天
            return new Date();
        }

        // 应用保存的字体大小到任务元素
        function applySavedFontSize(container = document) {
            try {
                const savedSize = localStorage.getItem(CONFIG.STORAGE_KEYS.TASK_FONT_SIZE);
                if (savedSize) {
                    const taskElements = container.querySelectorAll('.day-task, .task-info');
                    taskElements.forEach(task => {
                        task.style.fontSize = savedSize;
                    });
                }
            } catch (e) {
                console.warn('无法应用保存的字体大小设置:', e);
            }
        }

        // 临时计划操作弹窗
        function openTemporaryPlanModal(plan, planIndex, date) {
            // 移除已存在的模态框防止事件重复绑定
            const existingModal = document.getElementById('temporaryPlanModal');
            if (existingModal) {
                existingModal.remove();
            }

            // 创建模态框
            const modal = document.createElement('div');
            modal.id = 'temporaryPlanModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            modal.innerHTML = `
                <div style="
                    background-color: white;
                    padding: 25px;
                    border-radius: 12px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    width: 400px;
                    max-width: 90vw;
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 10px;
                    ">
                        <h3 style="margin: 0; color: #2196f3;">临时计划操作</h3>
                        <button id="closeTemporaryPlanModal" style="
                            background: transparent;
                            border: none;
                            font-size: 20px;
                            cursor: pointer;
                            color: #666;
                        ">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #333;">计划信息</h4>
                        <div style="
                            background-color: #f8f9fa;
                            padding: 15px;
                            border-radius: 8px;
                            border-left: 4px solid #2196f3;
                        ">
                            <div style="margin-bottom: 8px;"><strong>名称：</strong>${plan.name}</div>
                            <div style="margin-bottom: 8px;"><strong>日期：</strong>${plan.date}</div>
                            <div style="margin-bottom: 8px;"><strong>时间：</strong>${plan.startTime} - ${plan.endTime}</div>
                            <div><strong>状态：</strong>${plan.status === 'completed' ? '✅ 已完成' : '⏳ 进行中'}</div>
                        </div>
                    </div>
                    
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        margin-bottom: 20px;
                    ">
                        <button id="completePlanBtn" style="
                            padding: 12px;
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: bold;
                        ">✅ 已完成</button>
                        <button id="delayPlanBtn" style="
                            padding: 12px;
                            background-color: #FF9800;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: bold;
                        ">⏰ 延期</button>
                        <button id="editPlanBtn" style="
                            padding: 12px;
                            background-color: #2196F3;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: bold;
                        ">✏️ 修改</button>
                        <button id="deletePlanBtn" style="
                            padding: 12px;
                            background-color: #f44336;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: bold;
                        ">🗑️ 删除</button>
                    </div>
                    
                    <div style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        padding-top: 15px;
                        border-top: 1px solid #eee;
                    ">
                        <button id="cancelTemporaryPlanBtn" style="
                            padding: 8px 16px;
                            background-color: #f0f0f0;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            cursor: pointer;
                        ">取消</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 绑定事件
            const closeBtn = modal.querySelector('#closeTemporaryPlanModal');
            const cancelBtn = modal.querySelector('#cancelTemporaryPlanBtn');
            const completeBtn = modal.querySelector('#completePlanBtn');
            const delayBtn = modal.querySelector('#delayPlanBtn');
            const editBtn = modal.querySelector('#editPlanBtn');
            const deleteBtn = modal.querySelector('#deletePlanBtn');

            // 关闭弹窗
            const closeModal = () => modal.remove();
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            // 已完成按钮
            completeBtn.addEventListener('click', () => {
                const settingsData = getSettingsData();
                settingsData.temporaryPlans[planIndex].status = 'completed';
                saveSettingsData(settingsData);
                closeModal();
                
                // 重新渲染当前视图
                const currentSelectedDate = getCurrentSelectedDate();
                const dayPanel = document.getElementById('dayPanel');
                if (dayPanel) {
                    renderDayView(currentSelectedDate, dayPanel);
                }
            });

            // 延期按钮
            delayBtn.addEventListener('click', () => {
                closeModal();
                openDelayPlanModal(plan, planIndex);
            });

            // 修改按钮
            editBtn.addEventListener('click', () => {
                closeModal();
                openEditPlanModal(plan, planIndex);
            });

            // 删除按钮
            deleteBtn.addEventListener('click', () => {
                if (confirm('确定要删除这个临时计划吗？')) {
                    const settingsData = getSettingsData();
                    settingsData.temporaryPlans.splice(planIndex, 1);
                    saveSettingsData(settingsData);
                    closeModal();
                    
                    // 重新渲染当前视图
                    const currentSelectedDate = getCurrentSelectedDate();
                    const dayPanel = document.getElementById('dayPanel');
                    if (dayPanel) {
                        renderDayView(currentSelectedDate, dayPanel);
                    }
                }
            });
        }

        // 延期计划弹窗
        function openDelayPlanModal(plan, planIndex) {
            const modal = document.createElement('div');
            modal.id = 'delayPlanModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            modal.innerHTML = `
                <div style="
                    background-color: white;
                    padding: 25px;
                    border-radius: 12px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    width: 400px;
                    max-width: 90vw;
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 10px;
                    ">
                        <h3 style="margin: 0; color: #FF9800;">延期计划</h3>
                        <button id="closeDelayModal" style="
                            background: transparent;
                            border: none;
                            font-size: 20px;
                            cursor: pointer;
                            color: #666;
                        ">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">延期日期：</label>
                        <input type="date" id="delayDate" value="${plan.date}" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            margin-bottom: 15px;
                        ">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">开始时间：</label>
                        <input type="time" id="delayStartTime" value="${plan.startTime}" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                        ">
                    </div>
                    
                    <div style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        padding-top: 15px;
                        border-top: 1px solid #eee;
                    ">
                        <button id="cancelDelayBtn" style="
                            padding: 8px 16px;
                            background-color: #f0f0f0;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            cursor: pointer;
                        ">取消</button>
                        <button id="confirmDelayBtn" style="
                            padding: 8px 16px;
                            background-color: #FF9800;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">确认延期</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 绑定事件
            const closeBtn = modal.querySelector('#closeDelayModal');
            const cancelBtn = modal.querySelector('#cancelDelayBtn');
            const confirmBtn = modal.querySelector('#confirmDelayBtn');

            const closeModal = () => modal.remove();
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            confirmBtn.addEventListener('click', () => {
                const newDate = modal.querySelector('#delayDate').value;
                const newStartTime = modal.querySelector('#delayStartTime').value;
                
                if (!newDate || !newStartTime) {
                    alert('请填写完整的延期信息');
                    return;
                }

                const settingsData = getSettingsData();
                settingsData.temporaryPlans[planIndex].date = newDate;
                settingsData.temporaryPlans[planIndex].startTime = newStartTime;
                saveSettingsData(settingsData);
                closeModal();
                
                // 重新渲染当前视图
                const currentSelectedDate = getCurrentSelectedDate();
                const dayPanel = document.getElementById('dayPanel');
                if (dayPanel) {
                    renderDayView(currentSelectedDate, dayPanel);
                }
            });
        }

        // 修改计划弹窗
        function openEditPlanModal(plan, planIndex) {
            const modal = document.createElement('div');
            modal.id = 'editPlanModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            modal.innerHTML = `
                <div style="
                    background-color: white;
                    padding: 25px;
                    border-radius: 12px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    width: 400px;
                    max-width: 90vw;
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 10px;
                    ">
                        <h3 style="margin: 0; color: #2196F3;">修改计划</h3>
                        <button id="closeEditModal" style="
                            background: transparent;
                            border: none;
                            font-size: 20px;
                            cursor: pointer;
                            color: #666;
                        ">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">计划名称：</label>
                        <input type="text" id="editPlanName" value="${plan.name}" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            margin-bottom: 15px;
                        ">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">计划日期：</label>
                        <input type="date" id="editPlanDate" value="${plan.date}" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            margin-bottom: 15px;
                        ">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">开始时间：</label>
                        <input type="time" id="editPlanStartTime" value="${plan.startTime}" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            margin-bottom: 15px;
                        ">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">结束时间：</label>
                        <input type="time" id="editPlanEndTime" value="${plan.endTime}" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                        ">
                    </div>
                    
                    <div style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        padding-top: 15px;
                        border-top: 1px solid #eee;
                    ">
                        <button id="cancelEditBtn" style="
                            padding: 8px 16px;
                            background-color: #f0f0f0;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            cursor: pointer;
                        ">取消</button>
                        <button id="confirmEditBtn" style="
                            padding: 8px 16px;
                            background-color: #2196F3;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">确认修改</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 绑定事件
            const closeBtn = modal.querySelector('#closeEditModal');
            const cancelBtn = modal.querySelector('#cancelEditBtn');
            const confirmBtn = modal.querySelector('#confirmEditBtn');

            const closeModal = () => modal.remove();
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            confirmBtn.addEventListener('click', () => {
                const newName = modal.querySelector('#editPlanName').value.trim();
                const newDate = modal.querySelector('#editPlanDate').value;
                const newStartTime = modal.querySelector('#editPlanStartTime').value;
                const newEndTime = modal.querySelector('#editPlanEndTime').value;
                
                if (!newName || !newDate || !newStartTime || !newEndTime) {
                    alert('请填写完整的计划信息');
                    return;
                }

                const settingsData = getSettingsData();
                settingsData.temporaryPlans[planIndex].name = newName;
                settingsData.temporaryPlans[planIndex].date = newDate;
                settingsData.temporaryPlans[planIndex].startTime = newStartTime;
                settingsData.temporaryPlans[planIndex].endTime = newEndTime;
                saveSettingsData(settingsData);
                closeModal();
                
                // 重新渲染当前视图
                const currentSelectedDate = getCurrentSelectedDate();
                const dayPanel = document.getElementById('dayPanel');
                if (dayPanel) {
                    renderDayView(currentSelectedDate, dayPanel);
                }
            });
        }

        // 日模式渲染
        function renderDayView(date, container = document.getElementById('dayView')) {
            const today = formatDate(date);
            const projects = getProjects();
            // const dayView = document.getElementById('dayView');
            
            // 检查container是否存在
            if (!container) {
                console.error('renderDayView: container is null or undefined');
                return;
            }
            
            // 检查是否是dayPanel（月视图中的日面板）
            const isDayPanel = container.id === 'dayPanel';
            
            if (isDayPanel) {
                // 如果是dayPanel，只显示标题和内容，不显示按钮
                const dateObj = new Date(today);
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                
                // 保留预览区域，只更新主要内容
                const existingPreview = container.querySelector('#tempPreviewSection');
                const previewHTML = existingPreview ? existingPreview.outerHTML : '';
                
                container.innerHTML = `
                    <h2 style="margin: 0; margin-bottom: 15px;"> ${month}-${day} 任务</h2>
                    <div id="day-content"></div>
                    <div class="add-task-icon" id="addTaskIcon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 24 24" fill="#50b767" class="icon icon-tabler icons-tabler-filled icon-tabler-square-rounded-plus">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M12 2l.324 .001l.318 .004l.616 .017l.299 .013l.579 .034l.553 .046c4.785 .464 6.732 2.411 7.196 7.196l.046 .553l.034 .579c.005 .098 .01 .198 .013 .299l.017 .616l.005 .642l-.005 .642l-.017 .616l-.013 .299l-.034 .579l-.046 .553c-.464 4.785 -2.411 6.732 -7.196 7.196l-.553 .046l-.579 .034c-.098 .005 -.198 .01 -.299 .013l-.616 .017l-.642 .005l-.642 -.005l-.616 -.017l-.299 -.013l-.579 -.034l-.553 -.046c-4.785 -.464 -6.732 -2.411 -7.196 -7.196l-.046 -.553l-.034 -.579a28.058 28.058 0 0 1 -.013 -.299l-.017 -.616c-.003 -.21 -.005 -.424 -.005 -.642l.001 -.324l.004 -.318l.017 -.616l.013 -.299l.034 -.579l.046 -.553c.464 -4.785 2.411 -6.732 7.196 -7.196l.553 -.046l.579 -.034c.098 -.005 .198 -.01 .299 -.013l.616 -.017c.21 -.003 .424 -.005 .642 -.005zm0 6a1 1 0 0 0 -1 1v2h-2l-.117 .007a1 1 0 0 0 .117 1.993h2v2l.007 .117a1 1 0 0 0 1.993 -.117v-2h2l.117 -.007a1 1 0 0 0 -.117 -1.993h-2v-2l-.007 -.117a1 1 0 0 0 -.993 -.883z" fill="#50b767" stroke-width="0" />
                        </svg>
                        <div class="text-button">添加计划</div>
                    </div>
                    ${previewHTML}
                `;
            } else {
                // 如果是dayView（独立的日视图），显示完整的标题和按钮
                container.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                      <h2 style="margin: 0;"> ${today} 任务</h2>
                      <div class="button-container" style="position: static; display: flex; gap: 10px;">
                        <div class="nav-buttons">
                            <button class="nav-btn" id="prevBtn"> ◀︎ </button>
                            <button class="nav-btn" id="todayBtn">今天</button>
                            <button class="nav-btn" id="nextBtn"> ▶︎ </button><button class="nav-btn" id="settingsBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 22 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-settings settings-icon">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
                                    <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                                </svg>
                            </button>
                        </div>
                      </div>
                    </div>
                    <div id="day-content"></div>
                `;
            }
            
            const dayContent = container.querySelector('#day-content');

            const pendingTasks = [];
            const completedTasks = [];
            const toCompleteTasks = [];

            projects.forEach(project => {
                if (!project || !project.subtasks || !Array.isArray(project.subtasks)) {
                    return; // 跳过无效的项目数据
                }
                project.subtasks.forEach(subtask => {
                    if (subtask && subtask.completeTime && subtask.status !== undefined) {
                        const taskInfo = {
                            projectName: project.name,
                            subtask: subtask
                        };
                        const taskCompleteDate = new Date(subtask.completeTime);
                        const todayDate = new Date(today);
                        todayDate.setHours(0, 0, 0, 0);
                        
                        if (subtask.status === 0) {
                            if (taskCompleteDate < todayDate) {
                                toCompleteTasks.push(taskInfo);
                            } else if (formatDate(taskCompleteDate) === today) {
                                pendingTasks.push(taskInfo);
                            }
                        } else if (subtask.status === 1 && formatDate(taskCompleteDate) === today) {
                            completedTasks.push(taskInfo);
                        }
                    }
                });
            });

            // 按startTime从早到晚排序
            const parseTime = timeStr => {
                if (!timeStr) return Infinity;
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };
            pendingTasks.sort((a, b) => parseTime(a.subtask.startTime) - parseTime(b.subtask.startTime));
            // 按completeTime由远到近排序待补做任务
            toCompleteTasks.sort((a, b) => new Date(a.subtask.completeTime) - new Date(b.subtask.completeTime));
            completedTasks.sort((a, b) => new Date(a.subtask.completeTime) - new Date(b.subtask.completeTime));
            // 按completeTime由远到近排序待补做任务
            toCompleteTasks.sort((a, b) => new Date(a.subtask.completeTime) - new Date(b.subtask.completeTime));

            const pendingContainer = document.createElement('div');
            pendingContainer.innerHTML = `<h3>⏰ 计划中 (${pendingTasks.length})</h3>`;
            pendingTasks.forEach(item => {
                const taskEl = document.createElement('div');
                taskEl.className = 'day-task pending';
                // 创建任务信息容器
                const taskInfo = document.createElement('div');
                taskInfo.className = 'task-info';
                
                const taskTime = document.createElement('div');
                taskTime.className = 'task-time';
                taskTime.textContent = item.subtask.startTime ? item.subtask.startTime + ' -' : '';
                
                const taskContent = document.createElement('div');
                taskContent.className = 'task-content';
                taskContent.textContent = item.projectName + ': ';
                
                const subtaskSpan = document.createElement('span');
                subtaskSpan.style.cssText = 'color:#ff0000; background-color: rgba(255, 0, 0, 0.1);';
                subtaskSpan.textContent = '(' + item.subtask.name + ')';
                taskContent.appendChild(subtaskSpan);
                
                taskInfo.appendChild(taskTime);
                taskInfo.appendChild(taskContent);
                
                const taskMeta = document.createElement('div');
                taskMeta.className = 'task-meta';
                taskMeta.textContent = item.subtask.consumingTime + '分钟';
                
                taskEl.appendChild(taskInfo);
                taskEl.appendChild(taskMeta);
                // 添加点击事件以打开完成确认弹窗
                taskEl.addEventListener('click', () => openCompleteTaskModal(item));
                pendingContainer.appendChild(taskEl);
            });

            if (pendingTasks.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'empty-task';
                emptyEl.textContent = '暂无计划中任务';
                emptyEl.style.textAlign = 'center';
                emptyEl.style.padding = '10px';
                emptyEl.style.color = '#999';
                pendingContainer.appendChild(emptyEl);
            }

            const completedContainer = document.createElement('div');
            completedContainer.innerHTML = `<h3>✔️已完成 (${completedTasks.length})</h3>`;
            completedTasks.forEach(item => {
                const taskEl = document.createElement('div');
                taskEl.className = 'day-task completed';
                taskEl.title = '右键可让任务回退计划中'; // 添加鼠标悬停提示
                // 创建任务信息容器
                const taskInfo = document.createElement('div');
                taskInfo.className = 'task-info';
                
                const taskTime = document.createElement('div');
                taskTime.className = 'task-time';
                taskTime.textContent = '✔️';
                
                const taskContent = document.createElement('div');
                taskContent.className = 'task-content';
                taskContent.textContent = item.projectName + ': ';
                
                const subtaskSpan = document.createElement('span');
                subtaskSpan.textContent = '(' + item.subtask.name + ')';
                taskContent.appendChild(subtaskSpan);
                
                taskInfo.appendChild(taskTime);
                taskInfo.appendChild(taskContent);
                
                const taskMeta = document.createElement('div');
                taskMeta.className = 'task-meta';
                taskMeta.textContent = item.subtask.consumingTime + '分钟';
                
                taskEl.appendChild(taskInfo);
                taskEl.appendChild(taskMeta);
                
                // 为已完成任务添加右键点击事件
                taskEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault(); // 阻止默认右键菜单
                    showCompletedTaskContextMenu(e, item);
                });
                
                completedContainer.appendChild(taskEl);
            });

            if (completedTasks.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'empty-task';
                emptyEl.textContent = '暂无已完成任务';
                emptyEl.style.textAlign = 'center';
                emptyEl.style.padding = '20px';
                emptyEl.style.color = '#999';
                completedContainer.appendChild(emptyEl);
            }

            // 仅在今天日期显示待补做任务
            dayContent.appendChild(pendingContainer);
            dayContent.appendChild(completedContainer);
            
            // 绑定按钮事件（只在非dayPanel的情况下）
            if (!isDayPanel) {
                bindButtonEvents();
            }
            
            // 为dayPanel中的添加任务图标绑定事件
            if (isDayPanel) {
                const addTaskIcon = container.querySelector('#addTaskIcon');
                if (addTaskIcon) {
                    addTaskIcon.addEventListener('click', () => {
                        toggleTaskPicker();
                    });
                }
            }
            
            // 添加临时计划显示
            const settingsData = getSettingsData();
            const temporaryPlans = settingsData.temporaryPlans || [];
            const todayPlans = temporaryPlans.filter(plan => plan.date === today);
            
            if (todayPlans.length > 0) {
                const planContainer = document.createElement('div');
                planContainer.innerHTML = `<h3>📌 临时计划 (${todayPlans.length})</h3>`;
                
                todayPlans.forEach((plan, index) => {
                    const planEl = document.createElement('div');
                    planEl.className = 'day-task';
                    planEl.style.borderLeft = '4px solid #2196f3';
                    planEl.style.cursor = 'pointer';
                    // 创建任务信息容器
                    const taskInfo = document.createElement('div');
                    taskInfo.className = 'task-info';
                    
                    const taskTime = document.createElement('div');
                    taskTime.className = 'task-time';
                    taskTime.textContent = plan.startTime + ' - ' + plan.endTime + ' -';
                    
                    const taskContent = document.createElement('div');
                    taskContent.className = 'task-content';
                    taskContent.textContent = plan.name;
                    
                    taskInfo.appendChild(taskTime);
                    taskInfo.appendChild(taskContent);
                    
                    const taskMeta = document.createElement('div');
                    taskMeta.className = 'task-meta';
                    taskMeta.textContent = plan.status === 'completed' ? '✅ 已完成' : '⏳ 进行中';
                    
                    planEl.appendChild(taskInfo);
                    planEl.appendChild(taskMeta);
                    // 添加点击事件，需要找到在原始数组中的索引
                    const originalIndex = temporaryPlans.findIndex(p => 
                        p.name === plan.name && 
                        p.date === plan.date && 
                        p.startTime === plan.startTime && 
                        p.endTime === plan.endTime
                    );
                    planEl.addEventListener('click', () => openTemporaryPlanModal(plan, originalIndex, today));
                    planContainer.appendChild(planEl);
                });
                
                dayContent.appendChild(planContainer);
            }
            
            if (today === formatDate(getToday())) {
                // 渲染待补做任务
                const toCompleteContainer = document.createElement('div');
            toCompleteContainer.className = 'task-group toComplete';
            toCompleteContainer.innerHTML = `<h3>📋待补做 (${toCompleteTasks.length})</h3>`;
            
            toCompleteTasks.forEach(item => {
                const taskEl = document.createElement('div');
                taskEl.className = 'day-task to-complete';
                // 创建任务信息容器
                const taskInfo = document.createElement('div');
                taskInfo.className = 'task-info';
                
                const taskTime = document.createElement('div');
                taskTime.className = 'task-time';
                taskTime.textContent = item.subtask.completeTime + ' -';
                
                const taskContent = document.createElement('div');
                taskContent.className = 'task-content';
                taskContent.textContent = item.projectName + ': ';
                
                const subtaskSpan = document.createElement('span');
                subtaskSpan.style.cssText = 'color:#ff9800; background-color: rgba(255, 152, 0, 0.1);';
                subtaskSpan.textContent = '(' + item.subtask.name + ')';
                taskContent.appendChild(subtaskSpan);
                
                taskInfo.appendChild(taskTime);
                taskInfo.appendChild(taskContent);
                
                const taskMeta = document.createElement('div');
                taskMeta.className = 'task-meta';
                taskMeta.textContent = item.subtask.consumingTime + '分钟';
                
                taskEl.appendChild(taskInfo);
                taskEl.appendChild(taskMeta);
                taskEl.addEventListener('click', () => openCompleteTaskModal(item));
                toCompleteContainer.appendChild(taskEl);
            });
            
            if (toCompleteTasks.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'empty-task';
                emptyEl.textContent = '暂无待补做任务';
                emptyEl.style.textAlign = 'center';
                emptyEl.style.padding = '10px';
                emptyEl.style.color = '#999';
                toCompleteContainer.appendChild(emptyEl);
            }
            
                dayContent.appendChild(toCompleteContainer);
            }
            
            // 应用保存的字体大小到新创建的任务元素
            applySavedFontSize(container);
        }

        // 为已完成任务显示右键菜单
        function showCompletedTaskContextMenu(e, taskItem) {
            // 移除已存在的右键菜单
            const existingMenu = document.querySelector('.completed-task-context-menu');
            if (existingMenu) existingMenu.remove();
            
            // 创建右键菜单
            const contextMenu = document.createElement('div');
            contextMenu.className = 'completed-task-context-menu';
            
            // 计算菜单位置，使用clientX/clientY确保定位准确
            let menuX = e.clientX + 10;
            let menuY = e.clientY;
            
            // 确保菜单不会超出视口边界
            const menuWidth = 120;
            const menuHeight = 50;
            
            if (menuX + menuWidth > window.innerWidth) {
                menuX = e.clientX - menuWidth - 10;
            }
            if (menuY + menuHeight > window.innerHeight) {
                menuY = e.clientY - menuHeight;
            }
            
            contextMenu.style.cssText = `
                position: fixed;
                left: ${menuX}px;
                top: ${menuY}px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 6px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 10000;
                font-size: 14px;
                min-width: 120px;
                padding: 5px 0;
            `;
            
            // 创建菜单项
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 8px 15px;
                cursor: pointer;
                font-size: 14px;
                color: #007bff;
                transition: background-color 0.2s;
            `;
            menuItem.textContent = '回到计划中';
            
            // 添加鼠标悬停效果
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f0f0f0';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            // 添加点击事件
            menuItem.addEventListener('click', () => {
                markTaskAsPlanned(taskItem);
                contextMenu.remove();
            });
            
            contextMenu.appendChild(menuItem);
            document.body.appendChild(contextMenu);
            
            // 点击其他地方关闭菜单
            const closeMenu = (event) => {
                if (!contextMenu.contains(event.target)) {
                    contextMenu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            // 延迟添加事件监听器，避免立即触发
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 100);
        }

        // 将已完成任务标记为计划中
        function markTaskAsPlanned(taskItem) {
            if (confirm(`确定要将任务"${taskItem.subtask.name}"重新标记为计划中吗？`)) {
                // 更新localStorage中的项目数据
                const projects = getProjects();
                const project = projects.find(p => p.name === taskItem.projectName);
                if (project && project.subtasks) {
                    const subtaskIndex = project.subtasks.findIndex(s => 
                        s.uniqueId === taskItem.subtask.uniqueId ||
                        (s.name === taskItem.subtask.name && s.completeTime === taskItem.subtask.completeTime)
                    );
                    if (subtaskIndex !== -1) {
                        // 只更新status字段，不改变其他字段
                        project.subtasks[subtaskIndex].status = 0;
                        saveProjects(projects);
                        
                        // 重新渲染当前视图
                        const currentSelectedDate = getCurrentSelectedDate();
                        renderMonthView(new Date());
                        
                        // 如果有日面板，也重新渲染日面板
                        const dayPanel = document.getElementById('dayPanel');
                        if (dayPanel) {
                            renderDayView(currentSelectedDate, dayPanel);
                        }
                        
                        // alert('任务已重新标记为计划中！');
                    }
                }
            }
        }

        // 渲染单日任务卡片
        function renderDailyTasks(date) {
            const today = formatDate(date);
            const projects = getProjects();
            const dayContainer = document.createElement('div');
            dayContainer.className = 'daily-view';

            // 日期标题
            const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const dayName = weekDays[date.getDay()];
            const month = date.getMonth() + 1;
            const day = date.getDate();
            dayContainer.innerHTML = `<h3>${dayName} ${month}月${day}日</h3>`;

            // 筛选任务
            const pendingTasks = [];
            const completedTasks = [];
            const toCompleteTasks = [];
            projects.forEach(project => {
                if (!project || !project.subtasks || !Array.isArray(project.subtasks)) {
                    return; // 跳过无效的项目数据
                }
                project.subtasks.forEach(subtask => {
                    if (subtask && subtask.completeTime && subtask.status !== undefined) {
                        const taskCompleteDate = new Date(subtask.completeTime);
                        const todayDate = new Date(today);
                        todayDate.setHours(0, 0, 0, 0);
                        
                        if (subtask.status === 0) {
                            if (taskCompleteDate < todayDate) {
                                toCompleteTasks.push({ projectName: project.name, subtask });
                            } else if (formatDate(taskCompleteDate) === today) {
                                pendingTasks.push({ projectName: project.name, subtask });
                            }
                        } else if (subtask.status === 1 && formatDate(taskCompleteDate) === today) {
                            completedTasks.push({ projectName: project.name, subtask });
                        }
                    }
                });
            });

            // 排序任务
            // 按startTime排序pending任务
            const parseTime = timeStr => {
                if (!timeStr) return Infinity;
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };
            pendingTasks.sort((a, b) => parseTime(a.subtask.startTime) - parseTime(b.subtask.startTime));

            // 渲染计划中任务
            const pendingContainer = document.createElement('div');
            pendingContainer.innerHTML = `<h4>计划中 (${pendingTasks.length})</h4>`;
            pendingTasks.forEach(item => {
                const taskEl = document.createElement('div');
                taskEl.className = 'day-task pending';
                taskEl.innerHTML = `
                    <div class="task-info">
                        <div class="task-time">${item.subtask.startTime ? item.subtask.startTime + ' -' : ''}</div>
                        <div class="task-content">${item.projectName}: <span>(${item.subtask.name})</span></div>
                    </div>
                    <div class="task-meta">${item.subtask.consumingTime}分钟</div>
                `;
                // 添加点击事件以打开完成确认弹窗
                taskEl.addEventListener('click', () => openCompleteTaskModal(item));
                pendingContainer.appendChild(taskEl);
            });
            // 渲染待补做任务
            const toCompleteContainer = document.createElement('div');
            toCompleteContainer.className = 'task-group toComplete';
            toCompleteContainer.innerHTML = `<h4>待补做 (${toCompleteTasks.length})</h4>`;
            
            toCompleteTasks.forEach(item => {
                const taskEl = document.createElement('div');
                taskEl.className = 'day-task to-complete';
                taskEl.innerHTML = `
                    <div class="task-info">
                        <div class="task-time">${item.subtask.completeTime} -</div>
                        <div class="task-content">${item.projectName}: <span style="color:#ff9800; background-color: rgba(255, 152, 0, 0.1);">(${item.subtask.name})</span></div>
                    </div>
                    <div class="task-meta">${item.subtask.consumingTime}分钟</div>
                `;
                taskEl.addEventListener('click', () => openCompleteTaskModal(item));
                toCompleteContainer.appendChild(taskEl);
            });
            
            if (toCompleteTasks.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'empty-task';
                emptyEl.textContent = '暂无待补做任务';
                emptyEl.style.textAlign = 'center';
                emptyEl.style.padding = '10px';
                emptyEl.style.color = '#999';
                toCompleteContainer.appendChild(emptyEl);
            }
            
                dayContainer.appendChild(pendingContainer);

            // 渲染已完成任务
            const completedContainer = document.createElement('div');
            completedContainer.innerHTML = `<h4>已完成 (${completedTasks.length})</h4>`;
            completedTasks.forEach(item => {
                const taskEl = document.createElement('div');
                taskEl.className = 'day-task completed';
                taskEl.title = '右键可让任务回退计划中'; // 添加鼠标悬停提示
                taskEl.innerHTML = `
                    <div class="task-info">
                        <div class="task-time"></div>
                        <div class="task-content">${item.projectName}: <span>(${item.subtask.name})</span></div>
                    </div>
                    <div class="task-meta">${item.subtask.consumingTime}分钟</div>
                `;
                
                // 为已完成任务添加右键点击事件
                taskEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault(); // 阻止默认右键菜单
                    showCompletedTaskContextMenu(e, item);
                });
                
                completedContainer.appendChild(taskEl);
            });
            dayContainer.appendChild(completedContainer);
            dayContainer.appendChild(toCompleteContainer);

            // 应用保存的字体大小到新创建的任务元素
            applySavedFontSize(dayContainer);

            return dayContainer;
        }


// 添加年月选择器弹窗
function toggleYearMonthPicker(currentYear, currentMonth) {
    console.log('toggleYearMonthPicker called with:', currentYear, currentMonth);
    // 切换箭头图标
    const h2Element = event.currentTarget;
    const chevronIcons = h2Element.querySelectorAll('.chevron-icon');
    chevronIcons.forEach(icon => {
        const isDown = icon.classList.contains('icon-tabler-chevron-down');
        icon.style.opacity = isDown ? '0' : '1';
    });
    let picker = document.getElementById('yearMonthPicker');
    if (picker) {
    // 切换箭头回向下
    const chevronIcons = document.querySelectorAll('.chevron-icon');
    chevronIcons.forEach(icon => {
        const isDown = icon.classList.contains('icon-tabler-chevron-down');
        icon.style.opacity = isDown ? '1' : '0';
    });
    picker.style.maxHeight = '0';
    picker.style.opacity = '0';
    picker.addEventListener('transitionend', function handler() {
        picker.remove();
        picker.removeEventListener('transitionend', handler);
    });
    return;
}

    picker = document.createElement('div');
    picker.id = 'yearMonthPicker';
    picker.style.cssText = 'position: absolute; top: 100%; left: 0; width: 350px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 9999; padding: 10px; transition: max-height 0.3s ease, opacity 0.5s ease; max-height: 0; opacity: 0; overflow: hidden;';

    // 年份标题
    const yearHeader = document.createElement('div');
    yearHeader.style.cssText = 'text-align: center; padding: 5px 0; font-size: 18px; font-weight: bold; cursor: pointer; margin-bottom: 10px;';
    yearHeader.textContent = currentYear;
    yearHeader.onclick = () => toggleYearSelection(picker, currentYear);
    picker.appendChild(yearHeader);

    // 月份网格
    const monthsGrid = document.createElement('div');
    monthsGrid.id = 'monthsGrid';
    monthsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;';

    for (let i = 0; i < 12; i++) {
        const monthBtn = document.createElement('div');
        monthBtn.style.cssText = 'text-align: center; padding: 10px; border-radius: 5px; cursor: pointer; ' + (i === currentMonth ? 'background: #4CAF50; color: white;' : 'background: #f5f5f5;');
        monthBtn.textContent = `${i+1}月`;
        monthBtn.onclick = () => {
            currentViewDate = new Date(currentYear, i, 1);
            renderMonthView(currentViewDate);
            picker.remove();
        };
        monthsGrid.appendChild(monthBtn);
    }
    picker.appendChild(monthsGrid);

    // 年份选择网格（默认隐藏）
    const yearsGrid = document.createElement('div');
    yearsGrid.id = 'yearsGrid';
    yearsGrid.style.cssText = 'display: none; grid-template-columns: repeat(3, 1fr); gap: 10px;';
    picker.appendChild(yearsGrid);

    // 将弹窗添加到月面板
    const headerContainer = document.getElementById('monthPanel').querySelector('div[style*="position: relative;"]');
    console.log('headerContainer found:', !!headerContainer);
    if (headerContainer) {
        headerContainer.appendChild(picker);
    setTimeout(() => {
        picker.style.maxHeight = '500px';
        picker.style.opacity = '1';
    }, 10);
    } else {
        console.error('headerContainer not found');
    }
}

function toggleYearSelection(picker, currentYear) {
    const monthsGrid = picker.querySelector('#monthsGrid');
    const yearsGrid = picker.querySelector('#yearsGrid');
    const yearHeader = picker.querySelector('div:first-child');

    if (monthsGrid.style.display !== 'none') {
        // 切换到年份选择
        monthsGrid.style.display = 'none';
        yearsGrid.style.display = 'grid';
        yearHeader.textContent = '选择年份';

        // 生成年份按钮（当前年份前后5年）
        yearsGrid.innerHTML = '';
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            const yearBtn = document.createElement('div');
            yearBtn.style.cssText = 'text-align: center; padding: 10px; border-radius: 5px; cursor: pointer; ' + (i === currentYear ? 'background: #4CAF50; color: white;' : 'background: #f5f5f5;');
            yearBtn.textContent = i;
            yearBtn.onclick = () => {
                // 更新年份并切换回月份选择
                yearHeader.textContent = i;
                monthsGrid.style.display = 'grid';
                yearsGrid.style.display = 'none';
                // 更新月份按钮的选中状态
                const monthBtns = monthsGrid.querySelectorAll('div');
                monthBtns.forEach((btn, index) => {
                    btn.style.background = index === currentViewDate.getMonth() ? '#4CAF50' : '#f5f5f5';
                    btn.style.color = index === currentViewDate.getMonth() ? 'white' : 'inherit';
                });
                // 更新当前年份
                currentYear = i;
            };
            yearsGrid.appendChild(yearBtn);
        }
    } else {
        // 切换回月份选择
        monthsGrid.style.display = 'grid';
        yearsGrid.style.display = 'none';
        yearHeader.textContent = currentYear;
    }
}



        // 月模式渲染
        function renderMonthView(date) {
            const today = new Date(date);
            const year = today.getFullYear();
            const month = today.getMonth();
            const monthView = document.getElementById('monthView');
            const monthPanel = document.getElementById('monthPanel');
            
            // 检查monthPanel是否存在
            if (!monthPanel) {
                console.error('renderMonthView: monthPanel is null or undefined');
                return;
            }
    monthPanel.innerHTML = `
              <div style="position: relative;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                  <h2 onclick="toggleYearMonthPicker(${year}, ${month})" style="cursor: pointer; display: inline-flex; align-items: center; gap: 8px; user-select: none; width: fit-content; margin: 0;">${year}年${month+1}月<div style="position: relative; width: 24px; height: 24px; pointer-events: none;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down chevron-icon" style="transition: opacity 0.3s ease; position: absolute;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" /></svg><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-up chevron-icon" style="transition: opacity 0.3s ease; opacity: 0; position: absolute;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 15l6 -6l6 6" /></svg></div></h2>
                  <div class="button-container" style="position: static; display: flex; gap: 10px;">
                    <div class="nav-buttons">
                        <button class="nav-btn" id="prevBtn"> ◀︎ </button>
                        <button class="nav-btn" id="todayBtn">今天</button>
                        <button class="nav-btn" id="nextBtn"> ▶︎ </button><button class="nav-btn" id="settingsBtn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-settings settings-icon">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
                                <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                            </svg>
                        </button>
                    </div>
                  </div>
                </div>
                <div class="toggle-controls" style="position: absolute; top: 10px; right: 10px; display: flex; gap: 15px;">
                    <style>
                      .toggle-controls .toggle-item input { background: #ccc; } .toggle-controls .toggle-item input:checked {
                        background: #4CAF50 !important;
                      }
                      #showTime::before, #showCount::before {
                        content: '';
                        position: absolute;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        top: 2px;
                        left: 2px;
                        background: white;
                        transition: .3s;
                      }
                      #showTime:checked::before, #showCount:checked::before {
                        left: 22px;
                      }
                    </style>
                  <div class="toggle-item" style="display: flex; align-items: center; gap: 5px;">
                      <label for="showTime" style="color: #000; font-size: 14px;">任务用时</label>
                      <input type="checkbox" id="showTime" checked style="position: relative; width: 40px; height: 20px; appearance: none; border-radius: 10px; outline: none; transition: .3s;">
                    </div>
                  <div class="toggle-item" style="display: flex; align-items: center; gap: 5px;">
                      <label for="showCount" style="color: #000; font-size: 14px;">任务数量</label>
                      <input type="checkbox" id="showCount" checked style="position: relative; width: 40px; height: 20px; appearance: none; border-radius: 10px; outline: none; transition: .3s;">
                    </div>
                </div>
              </div>
            `;

            const monthGrid = document.createElement('div');
            monthGrid.className = 'month-grid';
            const days = ['一', '二', '三', '四', '五', '六', '日'];

            // 添加星期标题
            days.forEach(day => {
                const header = document.createElement('div');
                header.className = 'weekday-header';
                header.textContent = `星期${day}`;
                monthGrid.appendChild(header);
            });

            // 从localStorage加载滑块状态
            const loadToggleStates = () => {
                // 任务用时状态
                const savedShowTime = localStorage.getItem(CONFIG.STORAGE_KEYS.SHOW_TIME);
                let showTimeChecked = true;
                if (savedShowTime !== null) {
                    try {
                        showTimeChecked = JSON.parse(savedShowTime);
                    } catch (error) {
                        console.error('解析显示时间设置失败:', error);
                        showTimeChecked = true;
                    }
                }
                const showTimeToggle = document.getElementById('showTime');
                if (showTimeToggle) {
                    showTimeToggle.checked = showTimeChecked;
                    document.querySelectorAll('.time-display').forEach(el => {
                        el.style.display = showTimeChecked ? 'flex' : 'none';
                    });
                }

                // 任务数量状态
                const savedShowCount = localStorage.getItem(CONFIG.STORAGE_KEYS.SHOW_COUNT);
                let showCountChecked = true;
                if (savedShowCount !== null) {
                    try {
                        showCountChecked = JSON.parse(savedShowCount);
                    } catch (error) {
                        console.error('解析显示数量设置失败:', error);
                        showCountChecked = true;
                    }
                }
                const showCountToggle = document.getElementById('showCount');
                if (showCountToggle) {
                    showCountToggle.checked = showCountChecked;
                    document.querySelectorAll('.count-display').forEach(el => {
                        el.style.display = showCountChecked ? 'flex' : 'none';
                    });
                }
            };

            // 获取月第一天和最后一天
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const firstDayOfWeek = firstDay.getDay() || 7; // 周一为1，周日为7

            // 添加上月占位
            for (let i = 1; i < firstDayOfWeek; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'calendar-cell empty';
                monthGrid.appendChild(emptyCell);
            }

            // 添加当月日期
            for (let day = 1; day <= lastDay.getDate(); day++) {
                const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            cell.addEventListener('click', () => {
                const isSelected = cell.classList.contains('selected');
                // 移除所有选中状态
                document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
                
                if (isSelected) {
            // 如果已选中，则清空dayPanel并显示提示信息
            document.getElementById('dayPanel').innerHTML = '<div class="empty-message">请选择日期查看任务！👉</div>';
            
            // 取消选中时清除URL日期参数
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('date')) {
                urlParams.delete('date');
                const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                window.history.replaceState({}, document.title, newUrl);
            }
        } else {
            // 如果未选中，则添加选中状态并渲染dayView
            cell.classList.add('selected');
            const selectedDate = new Date(year, month, day, 12, 0, 0);
            const dayPanel = document.getElementById('dayPanel');
            renderDayView(selectedDate, dayPanel);
            
            // 处理URL日期参数
            const urlParams = new URLSearchParams(window.location.search);
            const urlDate = urlParams.get('date');
            const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
            
            if (urlDate && urlDate !== selectedDateStr) {
                urlParams.delete('date');
                const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                window.history.replaceState({}, document.title, newUrl);
            }
        }
            });

        // 所有单元格创建完成后添加日历网格到面板
        monthPanel.appendChild(monthGrid);
        
        // 绑定按钮事件
        bindButtonEvents();
        
        // 使用requestAnimationFrame确保DOM更新完成后再加载状态
        requestAnimationFrame(loadToggleStates);

// 点击页面其他地方关闭年月选择器
document.addEventListener('click', function(e) {
    const picker = document.getElementById('yearMonthPicker');
    const header = document.querySelector('#monthPanel h2');
    if (picker && !picker.contains(e.target) && e.target !== header) {
        picker.remove();
    }
});

            
            
            // 使用requestAnimationFrame确保DOM更新完成后再加载状态
            requestAnimationFrame(loadToggleStates);


                // 使用本地日期进行比较，避免时区转换错误
const cellDate = new Date(year, month, day);
// 获取当前日期的MM-DD格式
const monthStr = String(cellDate.getMonth() + 1).padStart(2, '0');
const dayStr = String(cellDate.getDate()).padStart(2, '0');
const mmdd = `${monthStr}-${dayStr}`;
// 查找节假日
const settingsData = getSettingsData();
const holiday = settingsData.holidays.find(h => h.date === mmdd);
// 使用UTC日期方法生成日期字符串，与taskDateStr保持一致
const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
                // 高亮今天日期
                const today = getToday();
                if (cellDate.getDate() === today.getDate() && 
                    cellDate.getMonth() === today.getMonth() && 
                    cellDate.getFullYear() === today.getFullYear()) {
                    cell.classList.add('today');
                }
                // 使用UTC日期生成dateStr，避免时区差异


                // 创建日期单元格内容
                const cellHeader = document.createElement('div');
                cellHeader.className = 'cell-header';
                cellHeader.textContent = day;
                
                // 添加节假日信息
                if (holiday) {
                    const holidayContainer = document.createElement('div');
                    holidayContainer.className = 'holiday-container';
                    
                    const holidayText = document.createElement('div');
                    holidayText.className = 'holiday-text';
                    holidayText.textContent = holiday.name;
                    
                    holidayContainer.appendChild(holidayText);
                    cellHeader.appendChild(holidayContainer);
                }
                
                cell.appendChild(cellHeader);
                cell.dataset.date = dateStr;

                // 收集当天的任务类别和状态
                const tasks = [];
                  const seenTasks = new Set();
                const projects = getProjects();
                projects.forEach(project => {
                    if (!project || !project.subtasks || !Array.isArray(project.subtasks)) {
                        return; // 跳过无效的项目数据
                    }
                    project.subtasks.forEach(subtask => {
                        if (!subtask) return; // 跳过无效的子任务
                        // 显式按本地日期解析，忽略时间部分和时区影响
// 使用本地日期方法生成比较字符串，避免时区差异
// 解析completeTime并忽略时间部分
const taskDate = new Date(subtask.completeTime);
taskDate.setHours(0, 0, 0, 0);
// 使用UTC日期方法避免时区差异
const taskDateStr = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
// 仅统计子任务名称不为空的任务
// 验证日期有效性并添加状态过滤
// 使用名称+时间组合去重
// 使用名称+日期+状态组合生成更唯一的taskKey
const taskKey = `${subtask.name.trim()}-${taskDateStr}-${subtask.status}`;
if (!seenTasks.has(taskKey) && taskDateStr === dateStr && subtask.name && subtask.name.trim() !== '' && (subtask.status === 0 || subtask.status === 1) && !isNaN(taskDate.getTime())) {
    seenTasks.add(taskKey);
                            tasks.push({
                category: project.category || '未分类',
                status: subtask.status,
                startTime: subtask.startTime,
                // 包含所有可能的时间属性
                consumingTime: subtask.consumingTime,
                ConsumingTime: subtask.ConsumingTime,
                editConsumingTime: subtask.editConsumingTime,
                consuming_time: subtask.consuming_time,
                learningTime: subtask.learningTime,
                time: subtask.time,
                duration: subtask.duration,
                minutes: subtask.minutes
            });
                        }
                    });
                });

                // 显示任务数量和进度
                const pendingTasks = tasks.filter(task => task.status === 0);
                const completedTasks = tasks.filter(task => task.status === 1);
                const totalCount = tasks.length;
                const completedCount = completedTasks.length;
                
                if (totalCount > 0) {
                    // 计算总耗时（分钟）
                    const totalMinutes = tasks.reduce((sum, task) => {
                        // 修复：检查更多可能的属性名变体
                        // 优先使用标准属性名，减少变体检查避免混淆
                        // 同时检查创建和编辑任务时可能使用的属性名
                        // 同时检查属性名的大小写变体
                        // 重新添加对历史属性名的支持
                        // 添加对历史属性名的全面支持以兼容旧数据
                        const timeValue = task.consumingTime !== undefined ? task.consumingTime : 
                                          (task.ConsumingTime !== undefined ? task.ConsumingTime : 
                                          (task.editConsumingTime !== undefined ? task.editConsumingTime : 
                                          (task.consuming_time !== undefined ? task.consuming_time : 
                                          (task.learningTime !== undefined ? task.learningTime : 
                                          (task.time !== undefined ? task.time : 
                                          (task.duration !== undefined ? task.duration : 
                                          (task.minutes !== undefined ? task.minutes : 0)))))));
                        
                        // 改进数值提取：确保是有效的整数
                        let time = 0;
                        if (typeof timeValue === 'number') {
                            time = Math.floor(timeValue);
                        } else if (typeof timeValue === 'string') {
                            const numericMatch = timeValue.match(/^\d+$/);
                            time = numericMatch ? parseInt(numericMatch[0]) : 0;
                        }
                        
                        // 添加额外验证确保不为空值且在合理范围内
                        const validTime = !isNaN(time) && time >= 0 && time <= 1440 ? time : 0; // 最大24小时
                        return sum + validTime;
                    }, 0);
                    
                    // 转换为小时分钟格式
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    let timeText = '';
                    if (hours > 0) {
                        timeText += `${hours}时`;
                    }
                    if (minutes > 0 || hours === 0) {
                        timeText += `${minutes}分`;
                    }
                    // 修复：处理0分钟的情况
                    if (timeText === '') timeText = '0分钟';
                    
                    // 总耗时显示，应用新样式
                    const timeEl = document.createElement('div');
                    timeEl.classList.add('time-display');
                    timeEl.textContent = timeText;
                    timeEl.style.fontSize = '12px';
                    timeEl.style.color = 'rgb(51, 51, 51)';
                    timeEl.style.display = 'flex';
                    timeEl.style.justifyContent = 'flex-start';
                    timeEl.style.alignItems = 'flex-start';
                    timeEl.style.alignContent = 'flex-start';
                   // timeEl.style.height = '100%';
                    cell.appendChild(timeEl);
                    
                    // 进度显示在右下角
                    const progressEl = document.createElement('div');
                    progressEl.classList.add('count-display');
                    progressEl.style.position = 'absolute';
                    progressEl.style.bottom = '3px';
                    progressEl.style.right = '5px';
                    progressEl.style.minWidth = '35px';
                    progressEl.style.height = '14px';
                    progressEl.style.borderRadius = '4px';
                    progressEl.style.backgroundColor = '#eee';
                    progressEl.style.fontSize = '11px';
                    progressEl.style.display = 'flex';
                    progressEl.style.alignItems = 'center';
                    progressEl.style.justifyContent = 'center';
                    
                    // 检查任务完成状态和日期
                    const today = getToday();
                    const cellDate = new Date(year, month, day);
                    const isPastDate = cellDate < today;
                    const isToday = cellDate.toDateString() === today.toDateString();
                    const isAllCompleted = completedCount === totalCount && totalCount > 0;
                    const isIncomplete = completedCount < totalCount && totalCount > 0;
                    
                    if (isAllCompleted) {
                        // 全部完成时显示绿色√图标和总任务数
                        progressEl.innerHTML = `<span style="font-weight: bold;">${totalCount}</span>`;
                        progressEl.style.backgroundColor = '#e8f5e8';
                        
                        // 创建绿色√图标并添加到容器外面左边
                        const greenCheck = document.createElement('div');
                        greenCheck.className = 'green-check-outside';
                        greenCheck.style.position = 'absolute';
                        greenCheck.style.left = '-8px';
                        greenCheck.style.top = '50%';
                        greenCheck.style.transform = 'translateY(-50%)';
                        greenCheck.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>`;
                        
                        progressEl.appendChild(greenCheck);
                    } else if (isIncomplete && isPastDate && !isToday) {
                        // 未完成且日期已过时（但不是今天）显示红色圆点脉冲和红色已完成数
                        progressEl.innerHTML = `<span style="color: #ff4444;">${completedCount}</span> / <span style="font-weight: bold;"> ${totalCount}</span>`;
                        
                        // 创建红色圆点并添加到容器外面左边
                        const redDot = document.createElement('div');
                        redDot.className = 'red-dot-outside';
                        redDot.style.position = 'absolute';
                        redDot.style.left = '-8px';
                        redDot.style.top = '50%';
                        redDot.style.transform = 'translateY(-50%)';
                        redDot.style.width = '6px';
                        redDot.style.height = '6px';
                        redDot.style.backgroundColor = '#ff0000';
                        redDot.style.borderRadius = '50%';
                        redDot.style.animation = 'pulseRipple 1.5s infinite';
                        
                        progressEl.appendChild(redDot);
                    } else {
                        // 其他情况正常显示，总任务数加粗
                        progressEl.innerHTML = `${completedCount} / <span style="font-weight: bold;"> ${totalCount}</span>`;
                    }
                    
                    // 检查是否有临时计划
                    const settingsData = getSettingsData();
                    const hasTemporaryPlan = settingsData.temporaryPlans.some(plan => plan.date === dateStr);
                    if (hasTemporaryPlan) {
                        const dotEl = document.createElement('span');
                        dotEl.style.width = '8px';
                        dotEl.style.height = '8px';
                        dotEl.style.backgroundColor = 'red';
                        dotEl.style.borderRadius = '50%';
                        dotEl.style.display = 'inline-block';
                        dotEl.style.marginLeft = '5px';
                        dotEl.style.position = 'absolute';
                        dotEl.style.left = '0px'; // 呼吸灯调整位置
                        dotEl.style.bottom = '4px'; // 呼吸灯调整位置
                        dotEl.style.animation = 'breathe 2s infinite ease-in-out';
                        dotEl.style.verticalAlign = 'middle';
                        cell.appendChild(dotEl);
                    }
                    
                    cell.appendChild(progressEl);
                }
                
                // 设置单元格为相对定位，使内部绝对定位元素生效
                cell.style.position = 'relative';
                monthGrid.appendChild(cell);
            }

            monthPanel.appendChild(monthGrid);

            // 添加滑块事件监听器控制显示隐藏
            document.getElementById('showTime').addEventListener('change', function(e) {
    const isChecked = e.target.checked;
    localStorage.setItem('showTime', JSON.stringify(isChecked));
    // 触发自动备份
    triggerAutoBackup();
    // 更新存储使用量显示
    updateStorageUsageDisplay();
    
                const display = e.target.checked ? 'flex' : 'none';
                document.querySelectorAll('.time-display').forEach(el => el.style.display = display);
            });
            
            document.getElementById('showCount').addEventListener('change', function(e) {
    const isChecked = e.target.checked;
    localStorage.setItem('showCount', JSON.stringify(isChecked));
    // 触发自动备份
    triggerAutoBackup();
    // 更新存储使用量显示
    updateStorageUsageDisplay();
    
                const display = e.target.checked ? 'flex' : 'none';
                document.querySelectorAll('.count-display').forEach(el => el.style.display = display);
            });

    // 初始化左侧日面板
    const dayPanel = document.getElementById('dayPanel');
    renderDayView(today, dayPanel);

            // 移除任务标签相关样式和事件
        }




        // 导航功能
        function navigate(direction) {
            const newDate = new Date(currentViewDate);
            newDate.setMonth(newDate.getMonth() + direction);
            currentViewDate = newDate;
            renderMonthView(currentViewDate);
        }

        // 绑定按钮事件
        function bindButtonEvents() {
            // 绑定导航按钮事件
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const todayBtn = document.getElementById('todayBtn');
            const settingsBtn = document.getElementById('settingsBtn');
            
            if (prevBtn) {
                prevBtn.removeEventListener('click', prevBtn._navigateHandler);
                prevBtn._navigateHandler = () => navigate(-1);
                prevBtn.addEventListener('click', prevBtn._navigateHandler);
            }
            if (nextBtn) {
                nextBtn.removeEventListener('click', nextBtn._navigateHandler);
                nextBtn._navigateHandler = () => navigate(1);
                nextBtn.addEventListener('click', nextBtn._navigateHandler);
            }
            if (todayBtn) {
                todayBtn.removeEventListener('click', todayBtn._todayHandler);
                todayBtn._todayHandler = () => {
                    window.currentViewDate = getToday();
                    renderMonthView(currentViewDate);
                };
                todayBtn.addEventListener('click', todayBtn._todayHandler);
            }
            if (settingsBtn) {
                settingsBtn.removeEventListener('click', settingsBtn._settingsHandler);
                settingsBtn._settingsHandler = () => {
                    // 每次打开设置弹窗时都重新初始化数据
                    initSettingsData();
                    
                    const modal = document.getElementById('settingsModal');
                    const overlay = document.getElementById('modalOverlay');
                    
                    if (modal && overlay) {
                        modal.style.display = 'block';
                        overlay.style.display = 'block';
                        
                        // 延迟渲染，确保弹窗已经显示
                        setTimeout(() => {
                            // 强制重新初始化数据
                            initSettingsData();
                            renderHolidaysList();
                            renderTemporaryPlans();
                            // 初始化自动备份设置
                            initAutoBackupSettings();
                        }, 100);
                    } else {
                        console.error('设置弹窗或遮罩层元素未找到');
                    }
                };
                settingsBtn.addEventListener('click', settingsBtn._settingsHandler);
            }
        }

        // 初始化
        document.addEventListener('DOMContentLoaded', () => {
            // 初始化导航菜单功能
            initNavigationMenu();
            
            // 解析URL参数中的日期
            const urlParams = new URLSearchParams(window.location.search);
            const targetDate = urlParams.get('date');
                            if (targetDate) {
                    const parsedDate = new Date(targetDate);
                    if (!isNaN(parsedDate.getTime())) { // 验证日期有效性
                        currentViewDate = parsedDate;
                        renderMonthView(currentViewDate); // 渲染月视图并指定日期
                    // 自动选中URL参数中的日期
                    setTimeout(() => {
                        const targetDateStr = formatDate(parsedDate);
                        const targetCell = document.querySelector(`.calendar-cell[data-date="${targetDateStr}"]`);
                        if (targetCell) {
                            targetCell.click();
                        }
                    }, 0);
                    } else {
                        // 日期无效，显示默认月视图
                        renderMonthView(currentViewDate);
                    }
                } else {
                // 默认显示月视图
                renderMonthView(currentViewDate);
            }
        // 初始化设置弹窗
        initSettingsModal();
        });

        // 导航菜单功能
        function initNavigationMenu() {
            const menuItems = document.querySelectorAll('.nav-menu-item');
            const slider = document.querySelector('.nav-slider');
            const panels = document.querySelectorAll('.content-panel');
            let activeIndex = 0;
            // 读取本地存储
            const savedIndex = localStorage.getItem(CONFIG.STORAGE_KEYS.NAV_MENU_ACTIVE_INDEX);
            if (savedIndex !== null && !isNaN(savedIndex) && menuItems[savedIndex]) {
                activeIndex = parseInt(savedIndex);
            }
            // 激活初始菜单
            menuItems.forEach((item, idx) => {
                item.classList.toggle('active', idx === activeIndex);
                panels[idx] && panels[idx].classList.toggle('active', idx === activeIndex);
            });
            moveSlider(activeIndex);
            
            // 如果初始激活的是项目管理页面，初始化项目管理面板
            if (menuItems[activeIndex] && menuItems[activeIndex].getAttribute('data-tab') === 'project') {
                initProjectPanel();
            }
            // 菜单点击事件
            menuItems.forEach((item, index) => {
                item.addEventListener('click', () => {
                    // 移除所有活动状态
                    menuItems.forEach(i => i.classList.remove('active'));
                    panels.forEach(p => p.classList.remove('active'));
                    // 添加当前活动状态
                    item.classList.add('active');
                    if (panels[index]) panels[index].classList.add('active');
                    // 移动滑块
                    moveSlider(index);
                    // 存储当前索引
                    localStorage.setItem(CONFIG.STORAGE_KEYS.NAV_MENU_ACTIVE_INDEX, index);
                    // 触发自动备份
                    triggerAutoBackup();
                    // 更新存储使用量显示
                    updateStorageUsageDisplay();
                    
                    // 如果切换到项目管理页面，重新初始化项目管理面板
                    if (item.getAttribute('data-tab') === 'project') {
                        initProjectPanel();
                    }
                    
                    // 如果切换到首页，更新统计卡片
                    if (item.getAttribute('data-tab') === 'home') {
                        updateStatsCards();
                    }
                });
            });
            // 窗口变化时滑块自适应
            window.addEventListener('resize', () => {
                const idx = [...menuItems].findIndex(i => i.classList.contains('active'));
                moveSlider(idx);
            });
            function moveSlider(index) {
                const item = menuItems[index];
                if (!item) return;
                const menuRect = item.parentElement.getBoundingClientRect();
                const itemRect = item.getBoundingClientRect();
                const left = item.offsetLeft;
                const width = Math.max(0, item.offsetWidth - 100);
                slider.style.width = width + 'px';
                slider.style.transform = `translateX(${left + 50}px)`;
            }
        }

        // 添加计划弹窗相关变量
        let currentPlannedTasks = [];
        let currentSelectedProject = null;
        let currentSelectedSubtask = null;

        

        // 初始化添加计划弹窗
        function initAddPlanModal() {
            const projects = getProjects();
            
            // 渲染类别标签
            renderAddPlanCategoryTags(projects);
            
            // 渲染项目列表
            renderProjectList(projects);
            
            // 绑定事件
            bindAddPlanEvents();
            
            // 显示项目列表，隐藏子任务列表
            document.getElementById('projectListHeader').style.display = 'flex';
            document.getElementById('subtaskListHeader').style.display = 'none';
            document.getElementById('projectListContent').style.display = 'grid';
            document.getElementById('subtaskListContent').style.display = 'none';
            
            // 初始化变量
            currentPlannedTasks = [];
            currentSelectedProject = null;
        }

        // 渲染类别标签（用于添加计划弹窗）
        function renderAddPlanCategoryTags(projects) {
            const categoryTags = document.getElementById('categoryTags');
            const categories = [...new Set(projects.map(p => p.category).filter(c => c))];
            
            categoryTags.innerHTML = '<div class="category-tag active" data-category="all">全部</div>';
            
            categories.forEach(category => {
                const tag = document.createElement('div');
                tag.className = 'category-tag';
                tag.textContent = category;
                tag.setAttribute('data-category', category);
                categoryTags.appendChild(tag);
            });
            
            // 添加"10天以上没做的项目"标签
            const warningTag = document.createElement('div');
            warningTag.className = 'category-tag warning-tag';
            warningTag.textContent = '10天以上没做的项目';
            warningTag.setAttribute('data-category', 'warning');
            categoryTags.appendChild(warningTag);
        }

        // 渲染项目列表
        function renderProjectList(projects, filterCategory = 'all', searchTerm = '') {
            const projectListContent = document.getElementById('projectListContent');
            
            let filteredProjects = projects;
            
            // 按类别筛选
            if (filterCategory !== 'all' && filterCategory !== 'warning') {
                filteredProjects = filteredProjects.filter(p => p.category === filterCategory);
            }
            
            // 筛选10天以上没做的项目
            if (filterCategory === 'warning') {
                filteredProjects = filteredProjects.filter(project => {
                    const subtasks = project.subtasks || [];
                    const completedTasks = subtasks.filter(s => s.status === 1).length;
                    const totalTasks = subtasks.length;
                    
                    // 只筛选有部分完成但未全部完成的项目
                    if (completedTasks > 0 && completedTasks < totalTasks) {
                        const completedSubtasks = subtasks.filter(s => s.status === 1);
                        const latestCompleted = completedSubtasks.sort((a, b) => 
                            new Date(b.completeTime) - new Date(a.completeTime)
                        )[0];
                        
                        if (latestCompleted && latestCompleted.completeTime) {
                            const daysDiff = Math.floor((new Date() - new Date(latestCompleted.completeTime)) / (1000 * 60 * 60 * 24));
                            return daysDiff > 10;
                        }
                    }
                    return false;
                });
            }
            
            // 按搜索词筛选
            if (searchTerm) {
                filteredProjects = filteredProjects.filter(p => 
                    p.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            
            projectListContent.innerHTML = '';
            
            filteredProjects.forEach((project, index) => {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card';
                
                // 计算任务完成情况
                const subtasks = project.subtasks || [];
                const totalTasks = subtasks.length;
                const completedTasks = subtasks.filter(s => s.status === 1).length;
                const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                
                // 检查是否需要显示警告图标
                let warningIcon = '';
                if (completedTasks > 0 && completedTasks < totalTasks) {
                    const completedSubtasks = subtasks.filter(s => s.status === 1);
                    const latestCompleted = completedSubtasks.sort((a, b) => 
                        new Date(b.completeTime) - new Date(a.completeTime)
                    )[0];
                    
                    if (latestCompleted && latestCompleted.completeTime) {
                        const daysDiff = Math.floor((new Date() - new Date(latestCompleted.completeTime)) / (1000 * 60 * 60 * 24));
                        if (daysDiff > 10) {
                            warningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-alert-circle" style="margin-left: 8px;">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
                                <path d="M12 8v4" />
                                <path d="M12 16h.01" />
                            </svg>`;
                        }
                    }
                }
                
                // 检查是否全部完成
                const checkIcon = completedTasks === totalTasks && totalTasks > 0 ? 
                    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#50b767" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-square-rounded-check" style="margin-left: 8px;">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M9 12l2 2l4 -4" />
                        <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9z" />
                    </svg>` : '';
                
                // 创建项目卡片内容
                const cardContainer = document.createElement('div');
                cardContainer.style.cssText = 'display: flex; align-items: flex-start; justify-content: space-between;';
                
                // 左侧内容
                const leftContent = document.createElement('div');
                leftContent.style.cssText = 'display: flex; align-items: center; gap: 8px;';
                
                // 添加完成图标
                if (checkIcon) {
                    const checkIconDiv = document.createElement('div');
                    checkIconDiv.innerHTML = checkIcon;
                    leftContent.appendChild(checkIconDiv);
                }
                
                // 添加序号
                const indexSpan = document.createElement('span');
                indexSpan.style.cssText = `
                    color: #666; 
                    font-size: 14px; 
                    font-weight: normal; 
                    margin-right: 4px;
                    opacity: 0.8;
                    font-family: 'Courier New', monospace;
                `;
                indexSpan.textContent = `${index + 1}.`;
                leftContent.appendChild(indexSpan);
                
                // 添加项目名称
                const projectNameDiv = document.createElement('div');
                projectNameDiv.style.fontWeight = 'bold';
                projectNameDiv.textContent = project.name;
                leftContent.appendChild(projectNameDiv);
                
                // 右侧内容
                const rightContent = document.createElement('div');
                rightContent.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; gap: 4px;';
                
                // 进度条容器
                const progressContainer = document.createElement('div');
                progressContainer.style.cssText = 'width: 150px; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;';
                
                // 进度条
                const progressBar = document.createElement('div');
                progressBar.style.cssText = `width: ${completionRate}%; height: 100%; background: #50b767; transition: width 0.3s ease;`;
                progressContainer.appendChild(progressBar);
                rightContent.appendChild(progressContainer);
                
                // 任务统计
                const statsDiv = document.createElement('div');
                statsDiv.style.cssText = 'font-size: 12px; color: #ff8c00; white-space: nowrap; display: flex; align-items: center; gap: 4px;';
                statsDiv.textContent = `已完成任务数 ${completedTasks}/${totalTasks} - ${completionRate.toFixed(0)}%`;
                
                // 添加警告图标
                if (warningIcon) {
                    const warningIconDiv = document.createElement('div');
                    warningIconDiv.innerHTML = warningIcon;
                    statsDiv.appendChild(warningIconDiv);
                }
                
                rightContent.appendChild(statsDiv);
                
                // 组装卡片
                cardContainer.appendChild(leftContent);
                cardContainer.appendChild(rightContent);
                projectCard.appendChild(cardContainer);
                
                projectCard.addEventListener('click', (e) => {
                    // 如果点击的是操作按钮，不执行选择逻辑
                    if (e.target.classList.contains('project-action-btn')) {
                        return;
                    }
                    // 移除所有项目的选中状态
                    document.querySelectorAll('.project-panel-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    // 为当前点击的项目添加选中状态
                    projectCard.classList.add('selected');
                    // 调用选择项目函数
                    selectProject(project);
                });
                
                // 为操作按钮添加事件监听器
                const actionBtns = projectCard.querySelectorAll('.project-action-btn');
                actionBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation(); // 阻止事件冒泡
                        const action = btn.dataset.action;
                        if (action === 'edit') {
                            openProjectEditModal(project);
                        } else if (action === 'details') {
                            openProjectDetailsModal(project);
                        }
                    });
                });
                
                // 如果是当前选中的项目，添加选中样式
                if (currentSelectedProject && currentSelectedProject.name === project.name) {
                    projectCard.classList.add('selected');
                }
                
                projectListContent.appendChild(projectCard);
            });
            
            // 添加"到底啦！"提示（仅在有项目时显示）
            if (filteredProjects.length > 0) {
                const endTip = document.createElement('div');
                endTip.className = 'list-end-tip';
                endTip.style.cssText = `
                    text-align: center;
                    padding: 20px 10px;
                    color: #999;
                    font-size: 13px;
                    font-style: italic;
                    opacity: 0.6;
                    margin-top: 10px;
                    border-top: 1px dashed #e0e0e0;
                    background: linear-gradient(135deg, rgba(248,249,250,0.8) 0%, rgba(240,242,245,0.6) 100%);
                    border-radius: 6px;
                `;
                endTip.innerHTML = `
                    <span style="display: inline-block; margin-right: 6px;">🎯</span>
                    到底啦！共 ${filteredProjects.length} 个项目
                `;
                projectListContent.appendChild(endTip);
            }
            
            // 更新项目清单标题中的数量
            updateProjectListTitle(filteredProjects.length);
        }

        // 选择项目
        function selectProject(project) {
            currentSelectedProject = project;
            
            // 切换标题显示
            document.getElementById('projectListHeader').style.display = 'none';
            document.getElementById('subtaskListHeader').style.display = 'flex';
            document.getElementById('subtaskProjectName').textContent = `${project.name} - 子任务`;
            
            // 获取容器元素
            const projectListContent = document.getElementById('projectListContent');
            const subtaskListContent = document.getElementById('subtaskListContent');
            
            // 设置初始状态
            subtaskListContent.style.display = 'flex';
            subtaskListContent.style.transform = 'translateX(100%)';
            subtaskListContent.style.transition = 'transform 0.3s ease-out';
            
            // 开始动画
            setTimeout(() => {
                // 项目列表向左滑出
                projectListContent.style.transform = 'translateX(-100%)';
                projectListContent.style.transition = 'transform 0.3s ease-out';
                
                // 子任务列表从右侧滑入
                subtaskListContent.style.transform = 'translateX(0)';
                
                // 动画完成后清理
                setTimeout(() => {
                    projectListContent.style.display = 'none';
                    projectListContent.style.transform = '';
                    projectListContent.style.transition = '';
                    subtaskListContent.style.transform = '';
                    subtaskListContent.style.transition = '';
                }, 300);
            }, 50);
            
            // 渲染子任务列表
            renderSubtaskList(project);
        }

        // 渲染子任务列表
        function renderSubtaskList(project) {
            const subtaskListContent = document.getElementById('subtaskListContent');
            
            // 清空容器
            subtaskListContent.innerHTML = '';
            
            // 创建子任务容器
            const subtaskCardsContainer = document.createElement('div');
            subtaskCardsContainer.id = 'subtaskCardsContainer';
            subtaskCardsContainer.style.cssText = 'flex: 1; width: 100%; display: flex; flex-wrap: wrap; gap: 5px; overflow-y: auto; align-content: flex-start;';
            subtaskCardsContainer.className = 'subtask-cards-container';
            
            subtaskListContent.appendChild(subtaskCardsContainer);
            
            // 绑定返回按钮事件
            document.getElementById('backToProjects').addEventListener('click', backToProjects);
            
            // 渲染子任务卡片
            if (project.subtasks && project.subtasks.length > 0) {
                project.subtasks.forEach((subtask, index) => {
                    // 确保每个子任务都有唯一标识符
                    if (!subtask.uniqueId) {
                        subtask.uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                    
                    const subtaskCard = document.createElement('div');
                    let cardClass = 'subtask-card';
                    
                    // 检查任务是否在当前日期的计划中
                    const isInCurrentDatePlan = checkTaskInCurrentDatePlan(subtask);
                    if (isInCurrentDatePlan) {
                        cardClass += ' in-plan';
                    }

                    if (subtask.status === 1) {
                        cardClass += ' completed';
                    }
                    
                                subtaskCard.className = cardClass;
            subtaskCard.style.cursor = 'pointer'; // 所有任务都可以右键操作，设为pointer
            subtaskCard.setAttribute('data-subtask-id', subtask.uniqueId);
            subtaskCard.setAttribute('data-subtask-index', index); // 添加索引属性以支持拖拽
            subtaskCard.setAttribute('data-subtask-unique-id', subtask.uniqueId); // 确保使用uniqueId作为唯一标识符
            subtaskCard.style.position = 'relative'; // 为选中状态的对勾图标定位
                    
                    // 为所有子任务添加右键提示
                    if (subtask.status === 1) {
                        subtaskCard.title = '已完成任务，右键点击可进行管理操作';
                    } else {
                        subtaskCard.title = '可拖拽到右侧计划区域，右键点击进行管理操作';
                    }
                    
                    // 检查是否需要显示完成日期
                    // 只有当 status 不是 "-1" 或空值时才显示日期
                    let completionDate = '';
                    if (subtask.completeTime && subtask.status !== -1 && subtask.status !== '' && subtask.status !== null && subtask.status !== undefined) {
                        const date = new Date(subtask.completeTime);
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const day = date.getDate().toString().padStart(2, '0');
                        completionDate = `${month}-${day}`;
                    }
                    
                    // 创建子任务卡片内容
                    const cardContentDiv = document.createElement('div');
                    cardContentDiv.style.position = 'relative';
                    
                    // 添加完成日期
                    if (completionDate) {
                        const dateDiv = document.createElement('div');
                        dateDiv.style.cssText = 'position: absolute; top: 0; right: 0; font-size: 10px; color: red; font-weight: bold;';
                        dateDiv.textContent = completionDate;
                        cardContentDiv.appendChild(dateDiv);
                    }
                    
                    // 添加子任务名称
                    const nameDiv = document.createElement('div');
                    nameDiv.style.cssText = `font-weight: bold; ${completionDate ? 'padding-right: 30px;' : ''}`;
                    nameDiv.textContent = subtask.name;
                    cardContentDiv.appendChild(nameDiv);
                    
                    subtaskCard.appendChild(cardContentDiv);
                    

                    
                    // 为所有任务添加右键菜单功能
                    subtaskCard.addEventListener('contextmenu', (e) => {
                        e.preventDefault(); // 阻止默认右键菜单
                        showSubtaskContextMenu(e, subtask);
                    });
                    

                    
                    subtaskCardsContainer.appendChild(subtaskCard);
                });
                
                // 保存更新后的项目数据（包含唯一标识符）
                const projects = getProjects();
                const projectIndex = projects.findIndex(p => p.name === project.name);
                if (projectIndex !== -1) {
                    projects[projectIndex] = project;
                    saveProjects(projects);
                }
                
                // 初始化拖拽功能
                initDragAndDrop();
            } else {
                subtaskCardsContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px; width: 100%;">暂无子任务</div>';
            }
        }

        // 检查任务是否在当前日期的计划中
        function checkTaskInCurrentDatePlan(subtask) {
            // 如果任务没有完成时间，肯定不在当前日期计划中
            if (!subtask.completeTime) {
                return false;
            }
            
            // 检查任务的完成时间是否等于当前计划日期
            const taskDate = formatDate(new Date(subtask.completeTime));
            const currentDate = formatDate(currentPlanDate);
            
            // 检查任务状态是否为0（计划中的任务）
            return taskDate === currentDate && subtask.status === 0;
        }

        // 优化：通过索引直接更新任务卡边框样式
        function updateSubtaskCardBorderByIndex(index, isInPlan) {
            const subtaskCard = document.querySelector(`[data-subtask-index="${index}"]`);
            if (subtaskCard) {
                if (isInPlan) {
                    subtaskCard.classList.add('in-plan');
                } else {
                    subtaskCard.classList.remove('in-plan');
                }
            }
        }

        // 返回项目列表
        function backToProjects() {
            currentSelectedProject = null;
            
            // 切换标题显示
            document.getElementById('subtaskListHeader').style.display = 'none';
            document.getElementById('projectListHeader').style.display = 'flex';
            
            // 获取容器元素
            const projectListContent = document.getElementById('projectListContent');
            const subtaskListContent = document.getElementById('subtaskListContent');
            
            // 设置初始状态
            projectListContent.style.display = 'grid';
            projectListContent.style.transform = 'translateX(-100%)';
            projectListContent.style.transition = 'transform 0.3s ease-out';
            
            // 开始动画
            setTimeout(() => {
                // 子任务列表向右滑出
                subtaskListContent.style.transform = 'translateX(100%)';
                subtaskListContent.style.transition = 'transform 0.3s ease-out';
                
                // 项目列表从左侧滑入
                projectListContent.style.transform = 'translateX(0)';
                
                // 动画完成后清理
                setTimeout(() => {
                    subtaskListContent.style.display = 'none';
                    subtaskListContent.style.transform = '';
                    subtaskListContent.style.transition = '';
                    projectListContent.style.transform = '';
                    projectListContent.style.transition = '';
                }, 300);
            }, 50);
        }

        // 选择子任务 - 直接添加到已计划任务列表
        function selectSubtask(subtask) {
            // 为子任务添加唯一标识符（如果还没有的话）
            if (!subtask.uniqueId) {
                subtask.uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            // 检查是否已经添加过这个子任务
            const existingTask = currentPlannedTasks.find(task => task.subtaskUniqueId === subtask.uniqueId);
            if (existingTask) {
                alert('该任务已经添加到计划列表中');
                return;
            }
            
            // 添加到已计划任务列表
            const plannedTask = {
                projectName: currentSelectedProject.name,
                subtaskName: subtask.name,
                subtaskUniqueId: subtask.uniqueId,
                completeTime: '', // 初始为空，等待批量设置
                startTime: subtask.startTime || '',
                consumingTime: subtask.consumingTime || 30,
                status: 0
            };
            
            currentPlannedTasks.push(plannedTask);
            updatePlannedTasksDisplay();
            
            // 更新对应任务卡的边框样式
            updateSubtaskCardBorder(subtask.uniqueId, true);
        }

        // 显示编辑任务弹窗（已废弃，保留用于兼容性）
        function showEditTaskModal() {
            // 此功能已被新的批量添加逻辑替代
            console.log('编辑任务弹窗功能已废弃');
        }

        // 绑定添加计划弹窗事件
        function bindAddPlanEvents() {
            // 移除之前的事件监听器（避免重复绑定）
            const closeAddPlanBtn = document.getElementById('closeAddPlanBtn');
            const cancelAddPlanBtn = document.getElementById('cancelAddPlanBtn');
            const projectSearch = document.getElementById('projectSearch');
            const clearSearch = document.getElementById('clearSearch');
            const categoryTags = document.getElementById('categoryTags');
            
            // 克隆元素来移除所有事件监听器
            if (closeAddPlanBtn) {
                const newCloseBtn = closeAddPlanBtn.cloneNode(true);
                closeAddPlanBtn.parentNode.replaceChild(newCloseBtn, closeAddPlanBtn);
                newCloseBtn.addEventListener('click', closeAddPlanModal);
            }
            
            if (cancelAddPlanBtn) {
                const newCancelBtn = cancelAddPlanBtn.cloneNode(true);
                cancelAddPlanBtn.parentNode.replaceChild(newCancelBtn, cancelAddPlanBtn);
                newCancelBtn.addEventListener('click', closeAddPlanModal);
            }
            
            // 旧搜索功能已移除，使用新的搜索功能
            // if (projectSearch) {
            //     projectSearch.addEventListener('input', handleSearch);
            // }
            // 
            // if (clearSearch) {
            //     clearSearch.addEventListener('click', handleClearSearch);
            // }
            
            if (categoryTags) {
                categoryTags.addEventListener('click', handleCategoryFilter);
            }
            
            // 确认提交按钮已被移除，使用新的提交逻辑
            
            // 添加遮罩层点击事件
            const overlay = document.getElementById('modalOverlay');
            if (overlay) {
                // 移除之前的事件监听器避免重复绑定
                overlay.removeEventListener('click', closeAddPlanModal);
                overlay.addEventListener('click', closeAddPlanModal);
            }
            
            // 绑定日期导航按钮事件
            const prevDayBtn = document.getElementById('prevDayBtn');
            const nextDayBtn = document.getElementById('nextDayBtn');
            
            if (prevDayBtn) {
                prevDayBtn.addEventListener('click', () => changePlanDate(-1));
            }
            
            if (nextDayBtn) {
                nextDayBtn.addEventListener('click', () => changePlanDate(1));
            }
            
            // 初始化拖拽功能
            initDragAndDrop();
            
            // 初始化新的搜索功能
            initModalSearch();

        }

        // 初始化新的搜索功能
        function initModalSearch() {
            const searchIcon = document.getElementById('modalSearchIcon');
            const searchInputContainer = document.getElementById('modalSearchInputContainer');
            const searchInput = document.getElementById('modalProjectSearch');
            const clearSearchBtn = document.getElementById('modalClearSearch');
            
            if (searchIcon && searchInputContainer && searchInput && clearSearchBtn) {
                // 搜索图标点击和悬浮事件
                searchIcon.addEventListener('click', () => {
                    searchInputContainer.style.display = 'block';
                    searchInput.focus();
                });
                
                searchIcon.addEventListener('mouseenter', () => {
                    searchIcon.style.backgroundColor = 'rgba(80, 183, 103, 0.1)';
                    searchIcon.style.transform = 'scale(1.05)';
                });
                
                searchIcon.addEventListener('mouseleave', () => {
                    searchIcon.style.backgroundColor = '';
                    searchIcon.style.transform = 'scale(1)';
                });
                
                // 搜索输入事件
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value;
                    const projects = getProjects();
                    const activeCategory = document.querySelector('.category-tag.active')?.getAttribute('data-category') || 'all';
                    renderProjectList(projects, activeCategory, searchTerm);
                });
                
                // 清除搜索按钮
                clearSearchBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    const projects = getProjects();
                    const activeCategory = document.querySelector('.category-tag.active')?.getAttribute('data-category') || 'all';
                    renderProjectList(projects, activeCategory, '');
                    searchInputContainer.style.display = 'none';
                });
                
                // 点击外部关闭搜索框
                document.addEventListener('click', (e) => {
                    if (!searchIcon.contains(e.target) && !searchInputContainer.contains(e.target)) {
                        searchInputContainer.style.display = 'none';
                    }
                });
                
                // 回车键关闭搜索框
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        searchInputContainer.style.display = 'none';
                    }
                });
            }
        }

        // 处理搜索（保留原有函数以兼容）
        function handleSearch(e) {
            const searchTerm = e.target.value;
            const projects = getProjects();
            const activeCategory = document.querySelector('.category-tag.active')?.getAttribute('data-category') || 'all';
            renderProjectList(projects, activeCategory, searchTerm);
        }

        // 清除搜索
        function handleClearSearch() {
            const projectSearch = document.getElementById('projectSearch');
            const modalProjectSearch = document.getElementById('modalProjectSearch');
            
            if (projectSearch) {
                projectSearch.value = '';
            }
            if (modalProjectSearch) {
                modalProjectSearch.value = '';
            }
            
            const projects = getProjects();
            const activeCategory = document.querySelector('.category-tag.active')?.getAttribute('data-category') || 'all';
            renderProjectList(projects, activeCategory, '');
        }

        // 处理类别筛选
        function handleCategoryFilter(e) {
            if (e.target.classList.contains('category-tag')) {
                const clickedTag = e.target;
                const currentCategory = clickedTag.getAttribute('data-category');
                
                // 获取当前搜索词（兼容新旧搜索框）
                const projectSearch = document.getElementById('projectSearch');
                const modalProjectSearch = document.getElementById('modalProjectSearch');
                const searchTerm = (projectSearch ? projectSearch.value : '') || (modalProjectSearch ? modalProjectSearch.value : '');
                
                // 如果点击的是当前激活的标签，则恢复全部
                if (clickedTag.classList.contains('active')) {
                    // 移除所有活动状态，让CSS处理样式
                    document.querySelectorAll('.category-tag').forEach(tag => {
                        tag.classList.remove('active');
                    });
                    
                    // 重新渲染项目列表（显示全部）
                    const projects = getProjects();
                    renderProjectList(projects, 'all', searchTerm);
                } else {
                    // 更新活动标签，让CSS处理样式
                    document.querySelectorAll('.category-tag').forEach(tag => {
                        tag.classList.remove('active');
                    });
                    clickedTag.classList.add('active');
                    
                    // 重新渲染项目列表
                    const projects = getProjects();
                    renderProjectList(projects, currentCategory, searchTerm);
                }
            }
        }

        // 关闭编辑任务弹窗
        function closeEditTaskModal() {
            document.getElementById('editTaskModal').style.display = 'none';
        }

        // 确认编辑任务（已废弃，保留用于兼容性）
        function confirmEditTask() {
            // 此功能已被新的批量添加逻辑替代
            console.log('确认编辑任务功能已废弃');
        }

        // 更新已计划任务显示（重定向到新的函数）
        function updatePlannedTasksDisplay() {
            // 调用新的任务显示函数
            if (typeof updatePlanTasksDisplay === 'function') {
                updatePlanTasksDisplay();
            } else {
                // 如果新函数还没加载，显示默认内容
                const plannedTasksList = document.getElementById('plannedTasksList');
                if (plannedTasksList) {
                    plannedTasksList.innerHTML = '<div style="color: #999; font-style: italic;">正在加载任务...</div>';
                }
            }
        }

        // 删除已计划任务
        function removePlannedTask(index) {
            const removedTask = currentPlannedTasks[index];
            currentPlannedTasks.splice(index, 1);
            updatePlannedTasksDisplay();
            
            // 更新对应任务卡的边框样式
            if (removedTask && removedTask.subtaskUniqueId) {
                updateSubtaskCardBorder(removedTask.subtaskUniqueId, false);
            }
        }

        // 批量设置任务日期
        function setBatchCompleteTime() {
            const dateInput = document.getElementById('batchCompleteTime');
            if (!dateInput || !dateInput.value) {
                alert('请选择任务日期');
                return;
            }
            
            const selectedDate = dateInput.value;
            
            // 为所有已计划任务设置完成日期
            currentPlannedTasks.forEach(task => {
                task.completeTime = selectedDate;
            });
            
            // 重新渲染显示
            updatePlannedTasksDisplay();
            
            // 显示提交按钮
            const submitBtn = document.getElementById('submitPlannedTasksBtn');
            if (submitBtn) {
                submitBtn.style.display = 'block';
            }
        }

        // 提交已计划任务
        function submitPlannedTasks() {
            if (currentPlannedTasks.length === 0) {
                alert('没有任务需要提交');
                return;
            }
            
            // 检查是否有任务没有设置完成日期
            const tasksWithoutDate = currentPlannedTasks.filter(task => !task.completeTime);
            if (tasksWithoutDate.length > 0) {
                alert('以下任务还没有设置任务日期，请先设置：\n' + 
                      tasksWithoutDate.map(task => task.subtaskName).join('\n'));
                return;
            }
            
            // 更新project数组中的子任务数据
            const projects = getProjects();
            
            currentPlannedTasks.forEach(plannedTask => {
                // 找到对应的项目
                const project = projects.find(p => p.name === plannedTask.projectName);
                if (project && project.subtasks) {
                    // 优先使用唯一标识符查找子任务
                    let subtask = null;
                    if (plannedTask.subtaskUniqueId) {
                        subtask = project.subtasks.find(s => s.uniqueId === plannedTask.subtaskUniqueId);
                    }
                    
                    // 如果没有找到或没有唯一标识符，则使用名称查找（兼容性）
                    if (!subtask) {
                        subtask = project.subtasks.find(s => s.name === plannedTask.subtaskName);
                    }
                    
                    if (subtask) {
                        // 更新子任务数据
                        subtask.completeTime = plannedTask.completeTime;
                        subtask.startTime = plannedTask.startTime;
                        subtask.consumingTime = plannedTask.consumingTime;
                        subtask.status = 0; // 设置为未完成状态
                        
                        // 确保有唯一标识符
                        if (!subtask.uniqueId) {
                            subtask.uniqueId = plannedTask.subtaskUniqueId || (Date.now() + '_' + Math.random().toString(36).substr(2, 9));
                        }
                    }
                }
            });
            
            // 保存更新后的项目数据
            saveProjects(projects);
            
            // 清空当前计划任务列表前，先记录需要清除边框的任务
            const tasksToRemoveBorder = [...currentPlannedTasks];
            currentPlannedTasks = [];
            
            // 重新渲染显示
            updatePlannedTasksDisplay();
            
            // 隐藏提交按钮
            const submitBtn = document.getElementById('submitPlannedTasksBtn');
            if (submitBtn) {
                submitBtn.style.display = 'none';
            }
            
            // 清除所有已提交任务的绿色边框
            tasksToRemoveBorder.forEach(task => {
                if (task.subtaskUniqueId) {
                    updateSubtaskCardBorder(task.subtaskUniqueId, false);
                }
            });
            
            // 重新渲染当前项目的子任务列表以显示更新后的数据
            if (currentSelectedProject) {
                // 重新获取更新后的项目数据
                const updatedProjects = getProjects();
                const updatedProject = updatedProjects.find(p => p.name === currentSelectedProject.name);
                if (updatedProject) {
                    currentSelectedProject = updatedProject;
                    renderSubtaskList(updatedProject);
                }
            }
            
            alert('任务提交成功！可以继续设置其他任务。');
        }

        // 更新指定任务卡的边框样式
        function updateSubtaskCardBorder(subtaskUniqueId, isSelected) {
            const subtaskCard = document.querySelector(`[data-subtask-id="${subtaskUniqueId}"]`);
            if (!subtaskCard) return;
            
            if (isSelected) {
                // 显示绿色边框表示已被选中
                subtaskCard.style.borderColor = '#4CAF50';
                subtaskCard.style.borderWidth = '2px';
                subtaskCard.style.borderStyle = 'solid';
            } else {
                // 恢复默认边框
                subtaskCard.style.borderColor = '';
                subtaskCard.style.borderWidth = '';
                subtaskCard.style.borderStyle = '';
            }
        }

        // 显示子任务右键菜单
        function showSubtaskContextMenu(e, subtask) {
            // 移除已存在的右键菜单
            const existingMenu = document.getElementById('subtaskContextMenu');
            if (existingMenu) {
                existingMenu.remove();
            }
            
            // 创建右键菜单
            const contextMenu = document.createElement('div');
            contextMenu.id = 'subtaskContextMenu';
            contextMenu.style.cssText = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 10000;
                min-width: 150px;
                padding: 5px 0;
            `;
            
            // 创建菜单项样式函数
            const createMenuItem = (text, clickHandler, color = '#333') => {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 8px 15px;
                    cursor: pointer;
                    font-size: 14px;
                    color: ${color};
                    transition: background-color 0.2s;
                `;
                item.textContent = text;
                item.addEventListener('mouseenter', () => {
                    item.style.backgroundColor = '#f0f0f0';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.backgroundColor = 'transparent';
                });
                item.addEventListener('click', () => {
                    clickHandler(subtask);
                    contextMenu.remove();
                });
                return item;
            };
            
            // 修改任务名称
            const editItem = createMenuItem('修改任务名称', editSubtaskName);
            contextMenu.appendChild(editItem);
            
            // 添加分割线
            const separator1 = document.createElement('div');
            separator1.style.cssText = 'height: 1px; background: #e0e0e0; margin: 5px 0;';
            contextMenu.appendChild(separator1);
            
            // 根据任务状态显示不同的菜单项
            if (subtask.status === 1) {
                // 已完成任务：显示"标记计划"
                const planItem = createMenuItem('标记计划', markSubtaskPlanned, '#ffc107');
                contextMenu.appendChild(planItem);
            } else {
                // 未完成任务：显示"标记完成"和"取消计划"
                const completeItem = createMenuItem('标记完成', markSubtaskCompleted, '#28a745');
                contextMenu.appendChild(completeItem);
                
                const cancelItem = createMenuItem('取消计划', cancelSubtaskPlan, '#dc3545');
                contextMenu.appendChild(cancelItem);
            }
            
            // 添加分割线
            const separator2 = document.createElement('div');
            separator2.style.cssText = 'height: 1px; background: #e0e0e0; margin: 5px 0;';
            contextMenu.appendChild(separator2);
            
            // 删除任务
            const deleteItem = createMenuItem('❌删除任务', deleteSubtask, '#ff0000');
            contextMenu.appendChild(deleteItem);
            document.body.appendChild(contextMenu);
            
            // 点击其他地方关闭菜单
            const closeMenu = (event) => {
                if (!contextMenu.contains(event.target)) {
                    contextMenu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            // 延迟添加事件监听器，避免立即触发
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 100);
        }

        // 编辑子任务名称
        function editSubtaskName(subtask) {
            const newName = prompt('请输入新的任务名称：', subtask.name);
            if (newName && newName.trim() !== '' && newName !== subtask.name) {
                // 更新子任务名称
                subtask.name = newName.trim();
                
                // 更新localStorage中的项目数据
                const projects = getProjects();
                const project = projects.find(p => p.name === currentSelectedProject.name);
                if (project && project.subtasks) {
                    const subtaskIndex = project.subtasks.findIndex(s => s.uniqueId === subtask.uniqueId);
                    if (subtaskIndex !== -1) {
                        project.subtasks[subtaskIndex].name = newName.trim();
                        saveProjects(projects);
                    }
                }
                
                // 重新渲染子任务列表
                renderSubtaskList(currentSelectedProject);
                
                // 如果该任务在已计划列表中，也更新显示
                const plannedTaskIndex = currentPlannedTasks.findIndex(task => task.subtaskUniqueId === subtask.uniqueId);
                if (plannedTaskIndex !== -1) {
                    currentPlannedTasks[plannedTaskIndex].subtaskName = newName.trim();
                    updatePlannedTasksDisplay();
                }
            }
        }

        // 标记子任务完成
        function markSubtaskCompleted(subtask) {
            if (confirm(`确定要标记任务"${subtask.name}"为已完成吗？`)) {
                // 检查completeTime是否为空
                let completeTime = subtask.completeTime;
                if (!completeTime || completeTime.trim() === '') {
                    // 如果completeTime为空，弹窗提示输入任务日期
                    const inputDate = prompt('请输入任务完成日期（格式：YYYY-MM-DD）：', formatCurrentDate());
                    if (!inputDate) {
                        return; // 用户取消输入
                    }
                    // 验证日期格式
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(inputDate)) {
                        alert('日期格式错误！请使用YYYY-MM-DD格式。');
                        return;
                    }
                    completeTime = inputDate;
                }
                
                // 更新子任务状态为已完成
                subtask.status = 1;
                subtask.completeTime = completeTime;
                
                // 更新localStorage中的项目数据
                const projects = getProjects();
                const project = projects.find(p => p.name === currentSelectedProject.name);
                if (project && project.subtasks) {
                    const subtaskIndex = project.subtasks.findIndex(s => s.uniqueId === subtask.uniqueId);
                    if (subtaskIndex !== -1) {
                        project.subtasks[subtaskIndex].status = 1;
                        project.subtasks[subtaskIndex].completeTime = completeTime;
                        saveProjects(projects);
                    }
                }
                
                // 如果该任务在已计划列表中，移除它
                const plannedTaskIndex = currentPlannedTasks.findIndex(task => task.subtaskUniqueId === subtask.uniqueId);
                if (plannedTaskIndex !== -1) {
                    const removedTask = currentPlannedTasks[plannedTaskIndex];
                    currentPlannedTasks.splice(plannedTaskIndex, 1);
                    updatePlannedTasksDisplay();
                    // 更新边框样式
                    updateSubtaskCardBorder(removedTask.subtaskUniqueId, false);
                }
                
                // 重新渲染子任务列表
                renderSubtaskList(currentSelectedProject);
                
                alert('任务已标记为完成！');
            }
        }

        // 标记子任务为计划中
        function markSubtaskPlanned(subtask) {
            if (confirm(`确定要将任务"${subtask.name}"重新标记为计划中吗？`)) {
                // 更新子任务状态为计划中
                subtask.status = 0;
                // 保留完成日期作为计划日期
                
                // 更新localStorage中的项目数据
                const projects = getProjects();
                const project = projects.find(p => p.name === currentSelectedProject.name);
                if (project && project.subtasks) {
                    const subtaskIndex = project.subtasks.findIndex(s => s.uniqueId === subtask.uniqueId);
                    if (subtaskIndex !== -1) {
                        project.subtasks[subtaskIndex].status = 0;
                        // 保留completeTime作为计划日期
                        saveProjects(projects);
                    }
                }
                
                // 重新渲染子任务列表
                renderSubtaskList(currentSelectedProject);
                
                alert('任务已重新标记为计划中！');
            }
        }

        // 取消子任务计划
        function cancelSubtaskPlan(subtask) {
            if (confirm(`确定要取消任务"${subtask.name}"的计划吗？`)) {
                // 更新子任务状态为取消计划
                subtask.status = -1;
                
                // 更新localStorage中的项目数据
                const projects = getProjects();
                const project = projects.find(p => p.name === currentSelectedProject.name);
                if (project && project.subtasks) {
                    const subtaskIndex = project.subtasks.findIndex(s => s.uniqueId === subtask.uniqueId);
                    if (subtaskIndex !== -1) {
                        project.subtasks[subtaskIndex].status = -1;
                        // 清除相关的计划数据
                        project.subtasks[subtaskIndex].completeTime = '';
                        project.subtasks[subtaskIndex].startTime = '';
                        project.subtasks[subtaskIndex].consumingTime = '';
                        saveProjects(projects);
                    }
                }
                
                // 如果该任务在已计划列表中，移除它
                const plannedTaskIndex = currentPlannedTasks.findIndex(task => task.subtaskUniqueId === subtask.uniqueId);
                if (plannedTaskIndex !== -1) {
                    const removedTask = currentPlannedTasks[plannedTaskIndex];
                    currentPlannedTasks.splice(plannedTaskIndex, 1);
                    updatePlannedTasksDisplay();
                    // 更新边框样式
                    updateSubtaskCardBorder(removedTask.subtaskUniqueId, false);
                }
                
                // 重新渲染子任务列表
                renderSubtaskList(currentSelectedProject);
                
                alert('任务计划已取消！');
            }
        }

        // 删除子任务
        function deleteSubtask(subtask) {
            if (confirm(`⚠️ 警告：确定要彻底删除任务"${subtask.name}"吗？\n\n此操作无法撤销，任务将从项目中永久移除！`)) {
                // 从项目中移除该子任务
                const projects = getProjects();
                const project = projects.find(p => p.name === currentSelectedProject.name);
                if (project && project.subtasks) {
                    const subtaskIndex = project.subtasks.findIndex(s => s.uniqueId === subtask.uniqueId);
                    if (subtaskIndex !== -1) {
                        // 从数组中移除任务
                        project.subtasks.splice(subtaskIndex, 1);
                        saveProjects(projects);
                    }
                }
                
                // 如果该任务在已计划列表中，移除它
                const plannedTaskIndex = currentPlannedTasks.findIndex(task => task.subtaskUniqueId === subtask.uniqueId);
                if (plannedTaskIndex !== -1) {
                    const removedTask = currentPlannedTasks[plannedTaskIndex];
                    currentPlannedTasks.splice(plannedTaskIndex, 1);
                    updatePlannedTasksDisplay();
                    // 更新边框样式
                    updateSubtaskCardBorder(removedTask.subtaskUniqueId, false);
                }
                
                // 更新当前选择的项目对象
                currentSelectedProject = project;
                
                // 重新渲染子任务列表
                renderSubtaskList(currentSelectedProject);
                
                alert('任务已彻底删除！');
            }
        }

        // 关闭添加计划弹窗
        function closeAddPlanModal() {
            const addPlanModal = document.getElementById('addPlanModal');
            const overlay = document.getElementById('modalOverlay');
            if (addPlanModal) addPlanModal.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
            
            // 刷新计划管理页面的数据，显示最新数据
            if (typeof renderMonthView === 'function' && typeof currentViewDate !== 'undefined') {
                renderMonthView(currentViewDate);
            } else {
                // 如果变量不存在，使用当前日期
                renderMonthView(new Date());
            }
        }

        // 确认添加计划函数已被移除，使用新的提交逻辑

    // 确保DOM加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        const slider = document.getElementById('fontSizeSlider');
        const valueDisplay = document.getElementById('fontSizeValue');

        // 动态获取任务元素的函数
        function getTaskElements() {
            return document.querySelectorAll('.day-task, .task-info');
        }

        // 应用保存的字体大小到任务元素
        function applySavedFontSize(container = document) {
            try {
                const savedSize = localStorage.getItem(CONFIG.STORAGE_KEYS.TASK_FONT_SIZE);
                if (savedSize) {
                    const taskElements = container.querySelectorAll('.day-task, .task-info');
                    taskElements.forEach(task => {
                        task.style.fontSize = savedSize;
                    });
                }
            } catch (e) {
                console.warn('无法应用保存的字体大小设置:', e);
            }
        }

        if (slider && valueDisplay) {
            // 滑块事件监听
            slider.addEventListener('input', function() {
                const fontSize = this.value + 'px';
                valueDisplay.textContent = fontSize;
                
                // 应用到所有任务元素
                const tasks = getTaskElements();
                tasks.forEach(task => {
                    task.style.fontSize = fontSize;
                });
                
                // 保存设置到本地存储
                try {
                    localStorage.setItem(CONFIG.STORAGE_KEYS.TASK_FONT_SIZE, fontSize);
                    // 触发自动备份
                    triggerAutoBackup();
                    // 更新存储使用量显示
                    updateStorageUsageDisplay();
                } catch (e) {
                    console.warn('无法保存字体大小设置:', e);
                }
            });

            // 页面加载时恢复保存的设置
            try {
                const savedSize = localStorage.getItem(CONFIG.STORAGE_KEYS.TASK_FONT_SIZE);
                if (savedSize) {
                    slider.value = parseInt(savedSize);
                    valueDisplay.textContent = savedSize;
                    applySavedFontSize();
                }
            } catch (e) {
            console.warn('无法恢复字体大小设置:', e);
        }
    }
});

// 项目管理面板功能
let currentSelectedProjectPanel = null;
let projectPanelSearchTerm = '';
let projectPanelSelectedCategory = '';



// 初始化项目管理面板
function initProjectPanel() {
    renderProjectPanelList();
    renderProjectPanelCategoryTags();
    bindProjectPanelEvents();
    // 显示默认项目选择提示
    showDefaultProjectMessage();
    // 初始化项目列表滚动监听器
    initProjectListScrollListener();
}

// 渲染项目管理面板的项目列表
function renderProjectPanelList() {
    const projectList = document.getElementById('projectPanelList');
    if (!projectList) return;
    
    const projects = getProjects();
    let filteredProjects = [...projects];
    
    // 按分类筛选
    if (projectPanelSelectedCategory) {
        if (projectPanelSelectedCategory === 'warning') {
            // 筛选10天以上没做的项目
            filteredProjects = filteredProjects.filter(project => {
                const subtasks = project.subtasks || [];
                if (subtasks.length === 0) return false;
                
                // 检查是否有已完成的任务
                const completedSubtasks = subtasks.filter(s => s.status === 1);
                if (completedSubtasks.length === 0) return false;
                
                // 排除已经全部完成的项目
                if (completedSubtasks.length >= subtasks.length) return false;
                
                // 找到最近完成的任务
                const latestCompleted = completedSubtasks.sort((a, b) => 
                    new Date(b.completeTime) - new Date(a.completeTime)
                )[0];
                
                if (latestCompleted && latestCompleted.completeTime) {
                    const daysDiff = Math.floor((new Date() - new Date(latestCompleted.completeTime)) / (1000 * 60 * 60 * 24));
                    return daysDiff > 10;
                }
                
                return false;
            });
        } else {
            filteredProjects = filteredProjects.filter(p => p.category === projectPanelSelectedCategory);
        }
    }
    
    // 按搜索词筛选
    if (projectPanelSearchTerm) {
        filteredProjects = filteredProjects.filter(p => 
            p.name.toLowerCase().includes(projectPanelSearchTerm.toLowerCase())
        );
    }
    
    // 保留弹力区域，只清除项目内容
    let bounceArea = projectList.querySelector('.bounce-area');
    projectList.innerHTML = '';
    
    // 如果没有弹力区域，则创建一个
    if (!bounceArea) {
        bounceArea = document.createElement('div');
        bounceArea.className = 'bounce-area';
        bounceArea.innerHTML = `
            <div class="bounce-message">
                <span class="bounce-icon">🔝</span>
                <span>已经到顶啦！</span>
            </div>
        `;
    }
    projectList.appendChild(bounceArea);
    
    filteredProjects.forEach((project, index) => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card project-panel-card';
        
        // 计算任务完成情况
        const subtasks = project.subtasks || [];
        const totalTasks = subtasks.length;
        const completedTasks = subtasks.filter(s => s.status === 1).length;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        // 检查是否需要显示警告图标
        let warningIcon = '';
        if (completedTasks > 0 && completedTasks < totalTasks) {
            const completedSubtasks = subtasks.filter(s => s.status === 1);
            const latestCompleted = completedSubtasks.sort((a, b) => 
                new Date(b.completeTime) - new Date(a.completeTime)
            )[0];
            
            if (latestCompleted && latestCompleted.completeTime) {
                const daysDiff = Math.floor((new Date() - new Date(latestCompleted.completeTime)) / (1000 * 60 * 60 * 24));
                if (daysDiff > 10) {
                    warningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                    </svg>`;
                }
            }
        }
        
        // 检查是否全部完成
        const checkIcon = completedTasks === totalTasks && totalTasks > 0 ? 
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#50b767" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M9 12l2 2l4 -4" />
                <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9z" />
            </svg>` : '';
        
        projectCard.innerHTML = `
            <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${checkIcon}
                    <span style="
                        color: #666; 
                        font-size: 14px; 
                        font-weight: normal; 
                        margin-right: 4px;
                        opacity: 0.8;
                        font-family: 'Courier New', monospace;
                    ">${index + 1}.</span>
                    <div style="font-weight: bold;">${project.name}</div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <div style="width: 120px; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${completionRate}%; height: 100%; background: #50b767; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="font-size: 12px; color: #ff8c00; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                            已完成 ${completedTasks}/${totalTasks}
                            ${warningIcon}
                        </div>
                    </div>
                    <div class="project-card-actions">
                        <div class="project-action-btn" title="编辑项目" data-action="edit" data-project-id="${project.id || project.name}">✏️</div>
                        <div class="project-action-btn" title="项目详情" data-action="details" data-project-id="${project.id || project.name}">📋</div>
                    </div>
                </div>
            </div>
        `;
        
        projectCard.addEventListener('click', (e) => {
            // 如果点击的是操作按钮，不执行选择逻辑
            if (e.target.classList.contains('project-action-btn')) {
                return;
            }
            
            // 检查是否点击的是已选中的项目
            const isCurrentlySelected = projectCard.classList.contains('selected');
            
            // 移除所有项目的选中状态
            document.querySelectorAll('.project-panel-card').forEach(card => {
                card.classList.remove('selected');
            });
            
            if (isCurrentlySelected) {
                // 如果点击的是已选中的项目，取消选中
                currentSelectedProjectPanel = null;
                showDefaultProjectMessage();
            } else {
                // 为当前点击的项目添加选中状态
                projectCard.classList.add('selected');
                // 调用选择项目函数
                selectProjectPanel(project);
            }
        });
        
        // 为操作按钮添加事件监听器
        const actionBtns = projectCard.querySelectorAll('.project-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                const action = btn.dataset.action;
                if (action === 'edit') {
                    openProjectEditModal(project);
                } else if (action === 'details') {
                    openProjectDetailsModal(project);
                }
            });
        });
        
        // 如果是当前选中的项目，添加选中样式
        if (currentSelectedProjectPanel && currentSelectedProjectPanel.name === project.name) {
            projectCard.classList.add('selected');
        }
        
        projectList.appendChild(projectCard);
    });
    
    // 添加"到底啦！"提示（仅在有项目时显示）
    if (filteredProjects.length > 0) {
        const endTip = document.createElement('div');
        endTip.className = 'list-end-tip';
        endTip.style.cssText = `
            text-align: center;
            padding: 20px 10px;
            color: #999;
            font-size: 13px;
            font-style: italic;
            opacity: 0.6;
            margin-top: 10px;
            border-top: 1px dashed #e0e0e0;
            background: linear-gradient(135deg, rgba(248,249,250,0.8) 0%, rgba(240,242,245,0.6) 100%);
            border-radius: 6px;
        `;
        endTip.innerHTML = `
            <span style="display: inline-block; margin-right: 6px;">🎯</span>
            到底啦！共 ${filteredProjects.length} 个项目
        `;
        projectList.appendChild(endTip);
    }
    
    // 更新项目清单标题中的数量
    updateProjectListTitle(filteredProjects.length);
    
    // 检查滚动状态并应用相应的样式
    checkProjectListScrollState();
    
    // 确保在内容变化后重新检查滚动状态
    setTimeout(() => {
        checkProjectListScrollState();
    }, 150);
}

// 检查项目列表滚动状态
function checkProjectListScrollState() {
    const projectList = document.getElementById('projectPanelList');
    const projectListSection = document.querySelector('.project-list-section');
    
    if (!projectList || !projectListSection) return;
    
    // 延迟执行，确保DOM更新完成
    setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = projectList;
        const hasScroll = scrollHeight > clientHeight;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px容错
        
        // 处理底部提示
        if (hasScroll && !isAtBottom) {
            projectListSection.classList.add('has-more-content');
        } else {
            projectListSection.classList.remove('has-more-content');
        }
    }, 100);
}

// 为项目列表添加滚动监听器
function initProjectListScrollListener() {
    const projectList = document.getElementById('projectPanelList');
    const projectListSection = document.querySelector('.project-list-section');
    if (!projectList || !projectListSection) return;
    
    // 防抖函数，避免频繁触发
    let scrollTimeout;
    projectList.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(checkProjectListScrollState, 50);
    });
    
    // 弹力滚动相关变量
    let isAtTop = false;
    let bounceTimeout;
    let bounceBackTimeout;
    let wheelTimeout;
    
    // 滚轮事件监听器 - 实现弹力效果
    projectList.addEventListener('wheel', (e) => {
        const scrollTop = projectList.scrollTop;
        const isScrollingUp = e.deltaY < 0; // 向上滚动
        const { scrollHeight, clientHeight } = projectList;
        const hasScroll = scrollHeight > clientHeight;
        
        // 检查是否在顶部
        isAtTop = scrollTop <= 3; // 3px容错
        
        // 如果在顶部且有滚动内容，并且向上滚动，则触发弹力效果
        if (isAtTop && hasScroll && isScrollingUp) {
            e.preventDefault(); // 阻止默认滚动行为
            
            // 清除之前的定时器
            clearTimeout(bounceTimeout);
            clearTimeout(bounceBackTimeout);
            clearTimeout(wheelTimeout);
            
            // 添加弹力效果和头部边框发光效果
            projectList.classList.add('bouncing');
            projectList.classList.remove('bounce-back');
            projectListSection.classList.add('bounce-active');
            
            // 设置连续滚动检测
            wheelTimeout = setTimeout(() => {
                // 停止滚动后，开始弹回动画
                projectList.classList.remove('bouncing');
                projectList.classList.add('bounce-back');
                projectListSection.classList.remove('bounce-active');
                
                // 弹回动画完成后清除类
                bounceBackTimeout = setTimeout(() => {
                    projectList.classList.remove('bounce-back');
                }, 400);
            }, 150); // 150ms内没有新的滚动事件，则认为滚动停止
        }
    });
    
    // 监听滚动事件，如果离开顶部，则立即清除弹力效果
    projectList.addEventListener('scroll', () => {
        const scrollTop = projectList.scrollTop;
        if (scrollTop > 3) {
            clearTimeout(bounceTimeout);
            clearTimeout(bounceBackTimeout);
            clearTimeout(wheelTimeout);
            projectList.classList.remove('bouncing', 'bounce-back');
            projectListSection.classList.remove('bounce-active');
        }
    });
}

// 渲染项目管理面板的分类标签
function renderProjectPanelCategoryTags() {
    const categoryTagsContainer = document.getElementById('projectPanelCategoryTags');
    if (!categoryTagsContainer) return;
    
    const projects = getProjects();
    const categories = [...new Set(projects.map(p => p.category || '未分类'))];
    
    categoryTagsContainer.innerHTML = '';
    
    // 添加"全部"标签
    const allTag = document.createElement('span');
    allTag.className = `category-tag ${projectPanelSelectedCategory === '' ? 'active' : ''}`;
    allTag.textContent = `全部 (${projects.length})`;
    allTag.addEventListener('click', () => {
        // 如果当前已经是"全部"状态，则不做任何操作
        if (projectPanelSelectedCategory === '') {
            return;
        }
        projectPanelSelectedCategory = '';
        renderProjectPanelList();
        updateCategoryTags();
    });
    categoryTagsContainer.appendChild(allTag);
    
    // 添加分类标签
    categories.forEach(category => {
        const tag = document.createElement('span');
        tag.className = `category-tag ${projectPanelSelectedCategory === category ? 'active' : ''}`;
        // 计算该分类下的项目数量
        const categoryCount = projects.filter(p => (p.category || '未分类') === category).length;
        tag.textContent = `${category} (${categoryCount})`;
        tag.addEventListener('click', () => {
            // 如果点击的是当前激活的标签，则取消激活并回到"全部"状态
            if (projectPanelSelectedCategory === category) {
                projectPanelSelectedCategory = '';
            } else {
                projectPanelSelectedCategory = category;
            }
            renderProjectPanelList();
            updateCategoryTags();
        });
        categoryTagsContainer.appendChild(tag);
    });
    
    // 添加"10天以上没做的项目"标签
    const warningTag = document.createElement('span');
    warningTag.className = `category-tag warning-tag ${projectPanelSelectedCategory === 'warning' ? 'active' : ''}`;
    // 计算10天以上没做的项目数量
    const warningCount = projects.filter(project => {
        const subtasks = project.subtasks || [];
        const completedTasks = subtasks.filter(s => s.status === 1).length;
        const totalTasks = subtasks.length;
        
        if (completedTasks > 0 && completedTasks < totalTasks) {
            const completedSubtasks = subtasks.filter(s => s.status === 1);
            const latestCompleted = completedSubtasks.sort((a, b) => 
                new Date(b.completeTime) - new Date(a.completeTime)
            )[0];
            
            if (latestCompleted && latestCompleted.completeTime) {
                const daysDiff = Math.floor((new Date() - new Date(latestCompleted.completeTime)) / (1000 * 60 * 60 * 24));
                return daysDiff > 10;
            }
        }
        return false;
    }).length;
    warningTag.textContent = `10天以上没做的项目 (${warningCount})`;
    warningTag.addEventListener('click', () => {
        // 如果点击的是当前激活的标签，则取消激活并回到"全部"状态
        if (projectPanelSelectedCategory === 'warning') {
            projectPanelSelectedCategory = '';
        } else {
            projectPanelSelectedCategory = 'warning';
        }
        renderProjectPanelList();
        updateCategoryTags();
    });
    categoryTagsContainer.appendChild(warningTag);
}

// 更新分类标签状态
function updateCategoryTags() {
    const tags = document.querySelectorAll('#projectPanelCategoryTags .category-tag');
    tags.forEach(tag => {
        tag.classList.remove('active');
        const tagText = tag.textContent.split(' (')[0]; // 获取不包含数量的标签文本
        if ((projectPanelSelectedCategory === '' && tagText === '全部') ||
            (projectPanelSelectedCategory === 'warning' && tagText === '10天以上没做的项目') ||
            (projectPanelSelectedCategory !== '' && projectPanelSelectedCategory !== 'warning' && tagText === projectPanelSelectedCategory)) {
            tag.classList.add('active');
        }
    });
}

// 更新项目清单标题中的数量
function updateProjectListTitle(count) {
    const titleElement = document.querySelector('.project-list-header h3');
    if (titleElement) {
        titleElement.textContent = `项目清单(${count})`;
    }
}

// 更新子任务详情标题中的数量
function updateSubtaskListTitle(count) {
    const titleElement = document.querySelector('.subtask-header h3');
    if (titleElement) {
        titleElement.textContent = `子任务详情(${count})`;
    }
}

// 显示默认项目选择提示
function showDefaultProjectMessage() {
    const subtaskList = document.getElementById('projectPanelSubtaskList');
    if (!subtaskList) return;
    
    subtaskList.innerHTML = '';
    
    const defaultDiv = document.createElement('div');
    defaultDiv.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #999;
        font-size: 16px;
        text-align: center;
        width: 100%;
    `;
    
    defaultDiv.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">👈</div>
        <div>先从左边选择一个项目查看任务</div>
    `;
    
    subtaskList.appendChild(defaultDiv);
    
    // 隐藏底部操作栏
    const subtaskBottom = document.getElementById('subtaskBottom');
    if (subtaskBottom) {
        subtaskBottom.style.display = 'none';
    }
    
    // 清空选中状态
    selectedSubtasks.clear();
    
    // 重置全选复选框状态
    resetSelectAllCheckbox();
    
    // 更新标题显示为默认状态
    document.getElementById('selectedProjectName').textContent = '请选择项目';
    updateSubtaskListTitle(0);
}

// 选择项目管理面板中的项目
function selectProjectPanel(project) {
    currentSelectedProjectPanel = project;
    currentProjectForBatch = project;
    document.getElementById('selectedProjectName').textContent = project.name;
    renderProjectPanelSubtaskList(project);
}

// 渲染项目管理面板的子任务列表
function renderProjectPanelSubtaskList(project) {
    const subtaskList = document.getElementById('projectPanelSubtaskList');
    if (!subtaskList) return;
    
    subtaskList.innerHTML = '';
    
    // 显示底部操作栏
    const subtaskBottom = document.getElementById('subtaskBottom');
    if (subtaskBottom) {
        subtaskBottom.style.display = 'flex';
    }
    
    // 添加"添加任务"按钮（在子任务卡片之前）
    const addTaskBtn = document.createElement('div');
    addTaskBtn.className = 'add-task-btn';
    addTaskBtn.textContent = '+ 添加任务';
    addTaskBtn.style.cssText = `
        display: inline-block;
        padding: 8px 12px;

        background: #fff;
        color: #50b767;
        border: 2px dashed #979090;
        border-radius: 10px;
        cursor: pointer;
        font-size: 15px;
        font-weight: bold;
        transition: all 0.2s ease;
        text-align: center;
        user-select: none;
    `;
    addTaskBtn.addEventListener('mouseover', () => {
        addTaskBtn.style.backgroundColor = '#e9f7ef';
        addTaskBtn.style.borderColor = '#50b767';
        addTaskBtn.style.borderStyle = 'dashed';
    });
    addTaskBtn.addEventListener('mouseout', () => {
        addTaskBtn.style.backgroundColor = '#fff';
        addTaskBtn.style.borderColor = '#979090';
        addTaskBtn.style.borderStyle = 'dashed';
    });
    addTaskBtn.addEventListener('click', () => {
        showAddTaskModal(project);
    });
    subtaskList.appendChild(addTaskBtn);
    
    if (project.subtasks && project.subtasks.length > 0) {
        let needsSave = false;
        project.subtasks.forEach((subtask, index) => {
            // 确保每个子任务都有唯一标识符
            if (!subtask.uniqueId) {
                subtask.uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                needsSave = true;
            }
            
            const subtaskCard = document.createElement('div');
            subtaskCard.className = `subtask-card ${subtask.status === 1 ? 'completed' : ''}`;
            subtaskCard.setAttribute('data-subtask-index', index); // 添加索引属性以支持拖拽
            subtaskCard.setAttribute('data-subtask-unique-id', subtask.uniqueId); // 设置唯一标识符
            subtaskCard.style.position = 'relative'; // 为选中状态的对勾图标定位
            
            // 检查是否需要显示完成日期（只对状态0和1的任务显示）
            let completionDate = '';
            if ((subtask.status === 0 || subtask.status === 1) && subtask.completeTime) {
                const date = new Date(subtask.completeTime);
                const month = date.getMonth() + 1; // 不补零
                const day = date.getDate(); // 不补零
                completionDate = `${month}-${day}`;
            }
            
            // 生成title属性：显示完成时间和用时
            let titleText = '';
            if (subtask.completeTime) {
                const date = new Date(subtask.completeTime);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                titleText = `${year}-${month}-${day}`;
            }
            if (subtask.consumingTime && subtask.consumingTime > 0) {
                titleText += ` - 用时${subtask.consumingTime}分钟`;
            } else {
                titleText += ' - 用时未设置';
            }
            subtaskCard.title = titleText;
            
            subtaskCard.innerHTML = `
                <div style="position: relative; padding-right: ${completionDate ? '30px' : '8px'};">
                    ${completionDate ? `<div style="position: absolute; top: -2px; right: -8px; font-size: 10px; color: ${subtask.status === 0 ? '#28a745' : '#ff6b6b'}; font-weight: bold; background: ${subtask.status === 0 ? '#e8f5e8' : 'rgba(255, 255, 255, 0.9)'}; padding: 2px 4px; border-radius: 3px; border: ${subtask.status === 0 ? 'none' : '1px solid #ffebee'}; white-space: nowrap;">${completionDate}</div>` : ''}
                    <div style="font-weight: bold; word-wrap: break-word;">${subtask.name}</div>
                </div>
            `;
            
            // 为未完成的任务卡添加左键点击选中功能
            if (subtask.status !== 1) {
                subtaskCard.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSubtaskSelection(subtaskCard, subtask);
                });
            }
            
            // 为所有任务卡添加右键菜单功能
            subtaskCard.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showProjectSubtaskContextMenu(e, subtask, project);
            });
            
            subtaskList.appendChild(subtaskCard);
        });
        
        // 如果生成了新的uniqueId，保存项目数据
        if (needsSave) {
            const projects = getProjects();
            const projectIndex = projects.findIndex(p => p.name === project.name);
            if (projectIndex !== -1) {
                projects[projectIndex] = project;
                saveProjects(projects);
            }
        }
    } else {
        const noTasksDiv = document.createElement('div');
        noTasksDiv.style.cssText = 'text-align: center; color: #999; padding: 20px; width: 100%;';
        noTasksDiv.textContent = '暂无子任务，请点击左上角添加任务按钮';
        subtaskList.appendChild(noTasksDiv);
    }
    
    // 更新子任务详情标题中的数量
    const subtaskCount = project.subtasks ? project.subtasks.length : 0;
    updateSubtaskListTitle(subtaskCount);
}

// 显示项目管理页面的子任务右键菜单
function showProjectSubtaskContextMenu(e, subtask, project) {
    // 移除已存在的右键菜单
    const existingMenu = document.querySelector('.subtask-context-menu');
    if (existingMenu) existingMenu.remove();
    
    // 创建右键菜单
    const contextMenu = document.createElement('div');
    contextMenu.className = 'subtask-context-menu';
    
    // 计算菜单位置，确保菜单不会超出视口边界
    let menuX = e.clientX;
    let menuY = e.clientY;
    
    // 临时创建菜单来测量尺寸
    const tempMenu = document.createElement('div');
    tempMenu.style.cssText = `
        position: fixed;
        visibility: hidden;
        font-size: 14px;
        min-width: 180px;
        padding: 8px 0;
    `;
    // 添加菜单项来计算高度
    tempMenu.innerHTML = `
        <div style="padding: 10px 16px;">📝 修改任务名称</div>
        <div style="padding: 10px 16px;">🗓️ 添加计划</div>
        <div style="padding: 10px 16px;">✔️ 标记完成</div>
        <div style="padding: 10px 16px;">🔕 取消计划</div>
        <div style="padding: 10px 16px;">❌ 删除任务</div>
    `;
    document.body.appendChild(tempMenu);
    
    const menuWidth = tempMenu.offsetWidth;
    const menuHeight = tempMenu.offsetHeight;
    document.body.removeChild(tempMenu);
    
    // 确保菜单不会超出右边界
    if (menuX + menuWidth > window.innerWidth) {
        menuX = window.innerWidth - menuWidth - 10;
    }
    
    // 确保菜单不会超出底部边界
    if (menuY + menuHeight > window.innerHeight) {
        menuY = window.innerHeight - menuHeight - 10;
    }
    
    // 确保菜单不会超出左边界
    if (menuX < 0) {
        menuX = 10;
    }
    
    // 确保菜单不会超出顶部边界
    if (menuY < 0) {
        menuY = 10;
    }
    
    contextMenu.style.cssText = `
        position: fixed;
        left: ${menuX}px;
        top: ${menuY}px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        min-width: 180px;
        padding: 8px 0;
        max-height: 300px;
        overflow-y: auto;
    `;
    
    // 根据任务状态设置菜单项数据
    const menuItems = [];
    
    if (subtask.status === 1) {
        // 已完成任务的菜单项
        menuItems.push(
            { icon: '📝', text: '修改任务名称', action: 'editName' },
            { icon: '🗓️', text: '修改时间', action: 'editTime' },
            { icon: '↩️', text: '退回计划', action: 'backToPlan' },
            { icon: '🔕', text: '取消计划', action: 'cancelPlan' },
            { icon: '❌', text: '删除任务', action: 'deleteTask' }
        );
    } else {
        // 未完成任务的菜单项
        menuItems.push(
            { icon: '📝', text: '修改任务名称', action: 'editName' },
            { icon: '🗓️', text: '添加计划', action: 'addPlan' },
            { icon: '✔️', text: '标记完成', action: 'markComplete' },
            { icon: '🔕', text: '取消计划', action: 'cancelPlan' },
            { icon: '❌', text: '删除任务', action: 'deleteTask' }
        );
    }
    
    // 创建菜单项
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
            padding: 10px 16px;
            cursor: pointer;
            transition: background-color 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #f0f0f0;
        `;
        menuItem.innerHTML = `
            <span style="font-size: 16px;">${item.icon}</span>
            <span>${item.text}</span>
        `;
        
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = '#f8f9fa';
        });
        
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = 'white';
        });
        
        menuItem.addEventListener('click', () => {
            contextMenu.remove();
            handleSubtaskContextAction(item.action, subtask, project);
        });
        
        contextMenu.appendChild(menuItem);
    });
    
    // 移除最后一个菜单项的分隔线
    const lastItem = contextMenu.lastChild;
    if (lastItem) {
        lastItem.style.borderBottom = 'none';
    }
    
    document.body.appendChild(contextMenu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (event) => {
        if (!contextMenu.contains(event.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

// 处理子任务右键菜单操作
function handleSubtaskContextAction(action, subtask, project) {
    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.name === project.name);
    if (projectIndex === -1) {
        alert('项目不存在');
        return;
    }
    
    const subtaskIndex = projects[projectIndex].subtasks.findIndex(s => s.uniqueId === subtask.uniqueId);
    if (subtaskIndex === -1) {
        alert('任务不存在');
        return;
    }
    
    switch (action) {
        case 'editName':
            const newName = prompt('请输入新的任务名称：', subtask.name);
            if (newName !== null && newName.trim() !== '') {
                projects[projectIndex].subtasks[subtaskIndex].name = newName.trim();
                saveProjects(projects);
                renderProjectPanelSubtaskList(projects[projectIndex]);
            }
            break;
            
                 case 'addPlan':
             // 先确认计划完成时间
             const currentPlanTime = subtask.completeTime || '';
             const confirmedPlanTime = prompt('请输入计划完成时间（格式：YYYY-MM-DD）：', currentPlanTime);
             
             if (confirmedPlanTime === null) {
                 break; // 用户取消操作
             }
             
             if (confirmedPlanTime.trim() === '') {
                 alert('计划完成时间不能为空');
                 break;
             }
             
             // 验证日期格式
             const planDateRegex = /^\d{4}-\d{2}-\d{2}$/;
             if (!planDateRegex.test(confirmedPlanTime.trim())) {
                 alert('日期格式不正确，请使用YYYY-MM-DD格式');
                 break;
             }
             
             // 再确认任务用时
             const currentPlanConsumingTime = subtask.consumingTime || '30';
             const confirmedPlanConsumingTime = prompt('请确认任务用时（分钟）：', currentPlanConsumingTime);
             
             if (confirmedPlanConsumingTime === null) {
                 break; // 用户取消操作
             }
             
             if (confirmedPlanConsumingTime.trim() === '' || isNaN(confirmedPlanConsumingTime.trim()) || parseInt(confirmedPlanConsumingTime.trim()) <= 0) {
                 alert('任务用时必须是大于0的数字');
                 break;
             }
             
             // 最终确认
             if (confirm(`确定要为任务"${subtask.name}"添加计划吗？\n计划日期：${confirmedPlanTime.trim()}\n任务用时：${confirmedPlanConsumingTime.trim()}分钟`)) {
                 projects[projectIndex].subtasks[subtaskIndex].completeTime = confirmedPlanTime.trim();
                 projects[projectIndex].subtasks[subtaskIndex].consumingTime = parseInt(confirmedPlanConsumingTime.trim());
                 projects[projectIndex].subtasks[subtaskIndex].status = 0;
                 saveProjects(projects);
                 renderProjectPanelSubtaskList(projects[projectIndex]);
             }
             break;
             
         case 'editTime':
             const currentTime = subtask.completeTime || '';
             const newTime = prompt('请输入新的完成时间（格式：YYYY-MM-DD）：', currentTime);
             if (newTime !== null && newTime.trim() !== '') {
                 // 验证日期格式
                 const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                 if (!dateRegex.test(newTime.trim())) {
                     alert('日期格式不正确，请使用YYYY-MM-DD格式');
                     return;
                 }
                 projects[projectIndex].subtasks[subtaskIndex].completeTime = newTime.trim();
                 saveProjects(projects);
                 renderProjectPanelSubtaskList(projects[projectIndex]);
             }
             break;
             
         case 'backToPlan':
             if (confirm(`确定要将任务"${subtask.name}"退回到计划中吗？`)) {
                 projects[projectIndex].subtasks[subtaskIndex].status = 0;
                 saveProjects(projects);
                 renderProjectPanelSubtaskList(projects[projectIndex]);
             }
             break;
            
                 case 'markComplete':
             // 先确认任务日期
             const currentCompleteTime = subtask.completeTime || '';
             const confirmedCompleteTime = prompt('请确认任务完成日期（格式：YYYY-MM-DD）：', currentCompleteTime);
             
             if (confirmedCompleteTime === null) {
                 break; // 用户取消操作
             }
             
             if (confirmedCompleteTime.trim() === '') {
                 alert('任务完成日期不能为空');
                 break;
             }
             
             // 验证日期格式
             const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
             if (!dateRegex.test(confirmedCompleteTime.trim())) {
                 alert('日期格式不正确，请使用YYYY-MM-DD格式');
                 break;
             }
             
             // 再确认任务用时
             const currentConsumingTime = subtask.consumingTime || '30';
             const confirmedConsumingTime = prompt('请确认任务用时（分钟）：', currentConsumingTime);
             
             if (confirmedConsumingTime === null) {
                 break; // 用户取消操作
             }
             
             if (confirmedConsumingTime.trim() === '' || isNaN(confirmedConsumingTime.trim()) || parseInt(confirmedConsumingTime.trim()) <= 0) {
                 alert('任务用时必须是大于0的数字');
                 break;
             }
             
             // 最终确认
             if (confirm(`确定要标记任务"${subtask.name}"为已完成吗？\n完成日期：${confirmedCompleteTime.trim()}\n任务用时：${confirmedConsumingTime.trim()}分钟`)) {
                 projects[projectIndex].subtasks[subtaskIndex].status = 1;
                 projects[projectIndex].subtasks[subtaskIndex].completeTime = confirmedCompleteTime.trim();
                 projects[projectIndex].subtasks[subtaskIndex].consumingTime = parseInt(confirmedConsumingTime.trim());
                 saveProjects(projects);
                 renderProjectPanelSubtaskList(projects[projectIndex]);
             }
             break;
            
        case 'cancelPlan':
            if (confirm(`确定要取消任务"${subtask.name}"的计划吗？`)) {
                projects[projectIndex].subtasks[subtaskIndex].status = -1;
                saveProjects(projects);
                renderProjectPanelSubtaskList(projects[projectIndex]);
            }
            break;
            
        case 'deleteTask':
            if (confirm(`确定要删除任务"${subtask.name}"吗？此操作无法撤销。`)) {
                projects[projectIndex].subtasks.splice(subtaskIndex, 1);
                saveProjects(projects);
                renderProjectPanelSubtaskList(projects[projectIndex]);
            }
            break;
    }
}

// 防止重复绑定的标记
let projectPanelEventsBinding = false;

// 切换搜索框显示状态
function toggleSearchBox() {
    const searchIconContainer = document.getElementById('searchIconContainer');
    const searchInputExpanded = document.getElementById('searchInputExpanded');
    const headerSearchInput = document.getElementById('headerProjectSearch');
    
    if (searchInputExpanded.classList.contains('expanded')) {
        collapseSearchBox();
    } else {
        expandSearchBox();
    }
}

// 展开搜索框
function expandSearchBox() {
    const searchIconContainer = document.getElementById('searchIconContainer');
    const searchInputExpanded = document.getElementById('searchInputExpanded');
    const headerSearchInput = document.getElementById('headerProjectSearch');
    
    searchIconContainer.classList.add('active');
    searchInputExpanded.classList.add('expanded');
    
    // 延迟聚焦，等待动画完成
    setTimeout(() => {
        headerSearchInput.focus();
    }, 200);
}

// 收起搜索框
function collapseSearchBox() {
    const searchIconContainer = document.getElementById('searchIconContainer');
    const searchInputExpanded = document.getElementById('searchInputExpanded');
    const headerSearchInput = document.getElementById('headerProjectSearch');
    
    searchIconContainer.classList.remove('active');
    searchInputExpanded.classList.remove('expanded');
    
    // 移除焦点
    headerSearchInput.blur();
}

// 绑定项目管理面板事件
function bindProjectPanelEvents() {
    // 如果已经绑定过事件，就不重复绑定
    if (projectPanelEventsBinding) {
        return;
    }
    projectPanelEventsBinding = true;
    
    // 头部搜索功能
    const searchIconContainer = document.getElementById('searchIconContainer');
    const searchInputExpanded = document.getElementById('searchInputExpanded');
    const headerSearchInput = document.getElementById('headerProjectSearch');
    const headerClearBtn = document.getElementById('headerClearSearch');
    
    if (searchIconContainer && searchInputExpanded && headerSearchInput) {
        // 搜索图标点击事件
        searchIconContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSearchBox();
        });
        
        // 搜索输入事件
        headerSearchInput.addEventListener('input', (e) => {
            projectPanelSearchTerm = e.target.value;
            renderProjectPanelList();
            
            // 根据输入内容显示/隐藏清除按钮
            if (headerClearBtn) {
                if (e.target.value.trim()) {
                    headerClearBtn.style.opacity = '1';
                    headerClearBtn.style.transform = 'scale(1)';
                } else {
                    headerClearBtn.style.opacity = '0';
                    headerClearBtn.style.transform = 'scale(0.8)';
                }
            }
        });
        
        // 清除搜索按钮
        if (headerClearBtn) {
            headerClearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                projectPanelSearchTerm = '';
                headerSearchInput.value = '';
                renderProjectPanelList();
                
                // 隐藏清除按钮
                headerClearBtn.style.opacity = '0';
                headerClearBtn.style.transform = 'scale(0.8)';
                
                // 重新聚焦到搜索框
                headerSearchInput.focus();
            });
        }
        
        // 点击其他地方收起搜索框
        document.addEventListener('click', (e) => {
            if (!searchIconContainer.contains(e.target) && !searchInputExpanded.contains(e.target)) {
                collapseSearchBox();
            }
        });
        
        // 按键事件处理
        headerSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                collapseSearchBox();
            } else if (e.key === 'Enter') {
                // 回车键聚焦到第一个项目（可选功能）
                const firstProject = document.querySelector('.project-panel-card');
                if (firstProject) {
                    firstProject.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
    
    // 添加项目按钮
    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', () => {
            addNewProject();
        });
    }
    

}



// 添加新项目
function addNewProject() {
    showAddProjectModal();
}

// 显示添加项目弹窗
function showAddProjectModal() {
    const modal = document.createElement('div');
    modal.className = 'project-modal-overlay';
    modal.innerHTML = `
        <div class="project-modal">
            <div class="project-modal-header">
                <h3>添加项目</h3>
                <button class="project-modal-close">&times;</button>
            </div>
            <div class="project-modal-body">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                    <div style="display:flex; flex-direction:column; gap:15px;">
                        <div class="form-group">
                            <label for="addProjectImg">项目封面:</label>
                            <div style="display:flex; gap:5px; margin-top:5px;" class="input-group">
                                <input type="text" id="addProjectImg" placeholder="图片路径或URL" value="">
                                <button id="addProjectImgBtn" class="image-select-btn">选择图片</button>
                            </div>
                            <div class="preview-img" style="margin-top:5px;"></div>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:15px;">
                        <div class="form-group">
                            <label>项目名称:</label>
                            <input style="width:100%;" type="text" id="addProjectName" placeholder="项目名称" required>
                        </div>

                        <div class="form-group">
                            <label for="addCategoryInput">类别：</label>
                            <input type="text" id="addCategoryInput" placeholder="选择或输入类别">
                            <div class="category-tags">
                                <button class="add-tag-btn" onclick="showAddTagInput('addCategoryInput')">+ 添加标签</button>
                            </div>
                        </div>
                         <div class="form-group">
                            <label>项目备注:</label>
                            <textarea style="width:100%;" id="addProjectNote" placeholder="项目备注"></textarea>
                        </div>
                    </div>
                </div>
            </div>
            <div class="project-modal-footer">
                <button class="project-modal-btn save-btn" id="addProjectSubmitBtn">保存</button>
                <button class="project-modal-btn cancel-btn" id="addProjectCancelBtn">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 确保样式已添加
    addProjectModalStyles();
    
    // 立即初始化标签库和渲染标签
    initTagLibrary();
    
    // 同时加载项目中已有的分类到标签库
    const projects = getProjects();
    const existingCategories = [...new Set(projects.map(p => p.category).filter(c => c && c !== '未分类'))];
    existingCategories.forEach(category => {
        saveTagToLibrary(category);
    });
    
    // 确保DOM完全渲染后再加载标签
    setTimeout(() => {
        renderAddProjectCategoryTags();
    }, 200);
    
    // 绑定事件
    modal.querySelector('.project-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#addProjectCancelBtn').addEventListener('click', () => modal.remove());
    
    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // 选择图片按钮事件
    modal.querySelector('#addProjectImgBtn').addEventListener('click', function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const fileName = file.name;
                
                // 生成建议的相对路径 (存储在项目的images目录下)
                const suggestedPath = `images/${fileName}`;
                
                // 显示图片预览
                const reader = new FileReader();
                reader.onload = function(e) {
                    // 更新预览图
                    const previewContainer = modal.querySelector('.preview-img');
                    if (previewContainer) {
                        previewContainer.innerHTML = `<img src="${e.target.result}" alt="项目封面" style="max-width:100%;">`;
                        
                        // 将建议的路径填入输入框
                        modal.querySelector('#addProjectImg').value = suggestedPath;
                        
                        // 添加提示信息
                        const pathHint = document.createElement('div');
                        pathHint.className = 'path-hint';
                        pathHint.style.color = '#50b767';
                        pathHint.style.fontSize = '12px';
                        pathHint.style.marginTop = '5px';
                        pathHint.textContent = `已建议路径: ${suggestedPath} - 请将图片保存到项目目录下`;
                        
                        // 清理旧的提示信息并添加新的提示
                        const oldHint = previewContainer.nextSibling;
                        if (oldHint && oldHint.className === 'path-hint') {
                            previewContainer.parentNode.replaceChild(pathHint, oldHint);
                        } else {
                            previewContainer.parentNode.appendChild(pathHint);
                        }
                    }
                };
                
                reader.readAsDataURL(file);
            }
        });
        
        fileInput.click();
    });
    
    // 提交按钮事件
    modal.querySelector('#addProjectSubmitBtn').addEventListener('click', function() {
        const projectName = modal.querySelector('#addProjectName').value.trim();
        
        if (!projectName) {
            alert('请输入项目名称');
            return;
        }
        
        const newProject = {
            id: Date.now(),
            name: projectName,
            category: modal.querySelector('#addCategoryInput').value.trim() || '未分类',
            note: modal.querySelector('#addProjectNote').value.trim(),
            projectimg: modal.querySelector('#addProjectImg').value.trim(),
            subtasks: [],
            createTime: new Date().toISOString(),
            weight: 1,
            is_pinned: false
        };
        
        // 获取现有项目并添加新项目
        const projects = getProjects();
        projects.push(newProject);
        saveProjects(projects);
        
        // 重新渲染项目列表
        renderProjectPanelList();
        renderProjectPanelCategoryTags();
        
        modal.remove();
        
        // 选中新创建的项目
        setTimeout(() => {
            selectProjectPanel(newProject);
            
            // 再次延迟以确保DOM完全更新
            setTimeout(() => {
                // 确保项目卡片显示为选中状态并滚动到位置
                const projectCards = document.querySelectorAll('.project-panel-card');
                projectCards.forEach(card => {
                    card.classList.remove('selected');
                });
                const newProjectCard = Array.from(projectCards).find(card => 
                    card.textContent.includes(newProject.name)
                );
                if (newProjectCard) {
                    newProjectCard.classList.add('selected');
                    
                    // 滚动到新项目的位置
                    scrollToSelectedProject(newProjectCard);
                }
                
                // 显示5秒的遮罩层，只显示子任务详情容器
                showSubtaskFocusOverlay();
            }, 100);
        }, 200);
        
        alert('项目添加成功！');
    });
}

// 滚动到选中的项目位置
function scrollToSelectedProject(projectCard) {
    // 找到项目清单容器
    const projectListContainer = document.getElementById('projectPanelList');
    if (!projectListContainer || !projectCard) {
        return;
    }
    
    // 获取容器的滚动信息
    const containerHeight = projectListContainer.clientHeight;
    const scrollHeight = projectListContainer.scrollHeight;
    const maxScrollTop = scrollHeight - containerHeight;
    
    // 获取项目卡片相对于容器的位置
    const cardOffsetTop = projectCard.offsetTop;
    const cardHeight = projectCard.offsetHeight;
    
    // 计算目标滚动位置（让项目卡片显示在容器中央）
    let targetScrollTop = cardOffsetTop - (containerHeight - cardHeight) / 2;
    
    // 处理边界情况
    if (targetScrollTop < 0) {
        // 如果计算出的位置小于0，滚动到顶部
        targetScrollTop = 0;
    } else if (targetScrollTop > maxScrollTop) {
        // 如果计算出的位置超过最大滚动距离，滚动到底部
        targetScrollTop = maxScrollTop;
        
        // 为了确保完全显示，额外添加一些像素
        targetScrollTop = Math.min(maxScrollTop, targetScrollTop + 10);
    }
    
    // 检查是否是最后几个项目，如果是则直接滚动到底部确保完全显示
    const allProjectCards = projectListContainer.querySelectorAll('.project-panel-card');
    const cardIndex = Array.from(allProjectCards).indexOf(projectCard);
    const isNearBottom = cardIndex >= allProjectCards.length - 2; // 最后两个项目
    
    if (isNearBottom) {
        targetScrollTop = maxScrollTop;
    }
    
    // 平滑滚动到目标位置
    projectListContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
    });
    
    // 添加一个临时的高亮效果
    projectCard.style.transition = 'all 0.3s ease';
    projectCard.style.transform = 'scale(1.02)';
    projectCard.style.boxShadow = '0 4px 12px rgba(80, 183, 103, 0.3)';
    
    // 2秒后恢复正常样式
    setTimeout(() => {
        projectCard.style.transform = '';
        projectCard.style.boxShadow = '';
        // 保持transition以便平滑恢复
        setTimeout(() => {
            projectCard.style.transition = '';
        }, 300);
    }, 2000);
}

// 专门为添加项目弹窗渲染分类标签
function renderAddProjectCategoryTags() {
    const inputElement = document.getElementById('addCategoryInput');
    if (!inputElement) {
        console.error('未找到addCategoryInput输入框');
        return;
    }
    
    const tagsContainer = inputElement.parentElement.querySelector('.category-tags');
    if (!tagsContainer) {
        console.error('未找到category-tags容器');
        return;
    }
    
    const currentValue = inputElement.value;
    
    // 保存添加按钮
    const addButton = tagsContainer.querySelector('.add-tag-btn');
    const addButtonHTML = addButton ? addButton.outerHTML : '<button class="add-tag-btn">+ 添加标签</button>';
    
    // 清空现有标签
    tagsContainer.innerHTML = '';
    
    // 获取标签库中的所有标签
    const tags = getTagLibrary();
    
    // 添加所有标签
    tags.forEach(tagName => {
        const tag = document.createElement('span');
        tag.className = `category-tag ${currentValue === tagName ? 'selected' : ''}`;
        tag.textContent = tagName;
        
        // 左键点击选择标签
        tag.addEventListener('click', () => {
            inputElement.value = tagName;
            // 更新选中状态
            tagsContainer.querySelectorAll('.category-tag').forEach(t => {
                t.classList.remove('selected');
            });
            tag.classList.add('selected');
        });

        // 右键点击删除标签
        tag.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`确定要删除标签 "${tagName}" 吗？`)) {
                removeTagFromLibrary(tagName);
                renderAddProjectCategoryTags();
                if (inputElement.value === tagName) {
                    inputElement.value = '';
                }
            }
        });
        
        tagsContainer.appendChild(tag);
    });
    
    // 重新添加添加按钮
    tagsContainer.insertAdjacentHTML('beforeend', addButtonHTML);
    
    // 为新的添加按钮绑定事件
    const newAddButton = tagsContainer.querySelector('.add-tag-btn');
    if (newAddButton) {
        newAddButton.addEventListener('click', () => {
            const tagName = prompt('请输入新标签名称:');
            if (tagName && tagName.trim()) {
                const trimmedTagName = tagName.trim();
                if (saveTagToLibrary(trimmedTagName)) {
                    renderAddProjectCategoryTags();
                    // 选中新添加的标签
                    inputElement.value = trimmedTagName;
                    renderAddProjectCategoryTags();
                } else {
                    alert('该标签已存在！');
                    // 选中已存在的标签
                    inputElement.value = trimmedTagName;
                    renderAddProjectCategoryTags();
                }
            }
        });
    }
    
    // 标签渲染完成
}

// 显示子任务详情聚焦遮罩层
function showSubtaskFocusOverlay() {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.id = 'subtask-focus-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1000;
        pointer-events: none;
    `;
    
    // 找到子任务详情容器
    const subtaskSection = document.querySelector('.subtask-section');
    if (subtaskSection) {
        // 获取子任务详情容器的位置和大小
        const rect = subtaskSection.getBoundingClientRect();
        
        // 创建一个透明的窗口，让子任务详情容器显示出来
        const cutout = document.createElement('div');
        cutout.style.cssText = `
            position: absolute;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: transparent;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
            border-radius: 8px;
        `;
        
        overlay.appendChild(cutout);
        
        // 高亮子任务详情容器
        subtaskSection.style.position = 'relative';
        subtaskSection.style.zIndex = '1001';
        subtaskSection.style.boxShadow = '0 0 20px rgba(80, 183, 103, 0.5)';
        subtaskSection.style.borderRadius = '8px';
        
        // 为添加任务按钮添加3秒的脉冲效果
        const addTaskBtn = subtaskSection.querySelector('.add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.style.animation = 'pulse-glow 1s ease-in-out infinite';
            // 3秒后停止脉冲效果
            setTimeout(() => {
                addTaskBtn.style.animation = '';
            }, 3000);
        }
    }
    
    document.body.appendChild(overlay);
    
    // 5秒后移除遮罩层
    setTimeout(() => {
        overlay.remove();
        
        // 恢复子任务详情容器的样式
        if (subtaskSection) {
            subtaskSection.style.position = '';
            subtaskSection.style.zIndex = '';
            subtaskSection.style.boxShadow = '';
            subtaskSection.style.borderRadius = '';
        }
    }, 5000);
}

// 标签库管理函数（从学习计划表.html复制）
function initTagLibrary() {
    let tags = [];
    try {
        tags = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TAG_LIBRARY) || '[]');
        // 验证数据格式
        if (!Array.isArray(tags)) {
            console.error('标签库数据格式错误，重置为默认值');
            tags = [];
        }
    } catch (error) {
        console.error('解析标签库数据失败:', error);
        tags = [];
    }
    if (!tags.length) {
        tags = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
        
        // 同时加载项目中已有的分类
        const projects = getProjects();
        const existingCategories = [...new Set(projects.map(p => p.category).filter(c => c && c !== '未分类'))];
        existingCategories.forEach(category => {
            if (!tags.includes(category)) {
                tags.push(category);
            }
        });
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.TAG_LIBRARY, JSON.stringify(tags));
        // 触发自动备份
        triggerAutoBackup();
        // 更新存储使用量显示
        updateStorageUsageDisplay();
    }
}

function getTagLibrary() {
    try {
        const data = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TAG_LIBRARY) || '[]');
        // 验证数据格式
        if (!Array.isArray(data)) {
            console.error('标签库数据格式错误，返回空数组');
            return [];
        }
        return data;
    } catch (error) {
        console.error('解析标签库数据失败:', error);
        return [];
    }
}

function saveTagToLibrary(tagName) {
    const tags = getTagLibrary();
    if (!tags.includes(tagName)) {
        tags.push(tagName);
        localStorage.setItem(CONFIG.STORAGE_KEYS.TAG_LIBRARY, JSON.stringify(tags));
        // 触发自动备份
        triggerAutoBackup();
        // 更新存储使用量显示
        updateStorageUsageDisplay();
        return true;
    }
    return false;
}

function removeTagFromLibrary(tagName) {
    let tags = getTagLibrary();
    tags = tags.filter(tag => tag !== tagName);
    localStorage.setItem(CONFIG.STORAGE_KEYS.TAG_LIBRARY, JSON.stringify(tags));
    // 触发自动备份
    triggerAutoBackup();
    // 更新存储使用量显示
    updateStorageUsageDisplay();
    if (!tags.length) {
        initTagLibrary();
    }
}

function renderCategoryTags(inputId) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) return;
    
    const tagsContainer = inputElement.parentElement.querySelector('.category-tags');
    if (!tagsContainer) return;
    
    const currentValue = inputElement.value;
    
    // 保存添加按钮
    const addButton = tagsContainer.querySelector('.add-tag-btn');
    // 清空现有标签
    tagsContainer.innerHTML = '';
    // 重新添加添加按钮
    if (addButton) tagsContainer.appendChild(addButton);

    // 添加所有标签
    const tags = getTagLibrary();
    tags.forEach(tagName => {
        const tag = document.createElement('span');
        tag.className = `category-tag ${currentValue === tagName ? 'selected' : ''}`;
        tag.textContent = tagName;
        
        // 左键点击选择标签
        tag.addEventListener('click', () => {
            inputElement.value = tagName;
            // 更新选中状态
            tagsContainer.querySelectorAll('.category-tag').forEach(t => {
                t.classList.remove('selected');
            });
            tag.classList.add('selected');
        });

        // 右键点击删除标签
        tag.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`确定要删除标签 "${tagName}" 吗？`)) {
                removeTagFromLibrary(tagName);
                renderCategoryTags(inputId);
                if (inputElement.value === tagName) {
                    inputElement.value = '';
                }
            }
        });
        
        // 添加到容器（添加按钮之前）
        tagsContainer.insertBefore(tag, addButton);
    });
}

function showAddTagInput(inputId) {
    const tagName = prompt('请输入新标签名称:');
    if (tagName && tagName.trim()) {
        const trimmedTagName = tagName.trim();
        if (saveTagToLibrary(trimmedTagName)) {
            renderCategoryTags(inputId);
            // 选中新添加的标签
            document.getElementById(inputId).value = trimmedTagName;
            renderCategoryTags(inputId);
        } else {
            alert('该标签已存在！');
            // 选中已存在的标签
            document.getElementById(inputId).value = trimmedTagName;
            renderCategoryTags(inputId);
        }
    }
}

// 安全的ID生成器
let nextSubtaskId = 1;
function generateUniqueSubtaskId() {
    const projects = getProjects();
    let maxId = 0;
    projects.forEach(project => {
        if (project.subtasks) {
            project.subtasks.forEach(subtask => {
                if (typeof subtask.id === 'number' && subtask.id > maxId) {
                    maxId = subtask.id;
                }
            });
        }
    });
    return maxId + nextSubtaskId++;
}

// 验证子任务数据
function validateSubtask(subtask) {
    const required = ['id', 'name', 'status', 'completeTime', 'consumingTime', 'weight'];
    
    // 检查必需字段
    for (const field of required) {
        if (!(field in subtask)) {
            console.error(`缺少必需字段: ${field}`);
            return false;
        }
    }

    // 类型检查
    if (typeof subtask.id !== 'number' || subtask.id <= 0) {
        console.error('ID必须是正整数');
        return false;
    }

    if (typeof subtask.name !== 'string' || subtask.name.trim() === '') {
        console.error('任务名称不能为空');
        return false;
    }

    if (![-1, 0, 1].includes(subtask.status)) {
        console.error('状态值无效');
        return false;
    }

    if (typeof subtask.consumingTime !== 'number' || subtask.consumingTime < 0) {
        console.error('用时必须是非负数');
        return false;
    }

    if (typeof subtask.weight !== 'number' || subtask.weight <= 0) {
        console.error('权重必须是正整数');
        return false;
    }

    return true;
}

// 安全的批量添加子任务
function addSubtasksSafely(project, newSubtasks) {
    try {
        // 1. 验证所有新任务数据
        const validSubtasks = newSubtasks.filter(validateSubtask);
        if (validSubtasks.length !== newSubtasks.length) {
            throw new Error('部分任务数据无效');
        }

        // 2. 检查ID冲突
        const existingIds = new Set(project.subtasks.map(st => st.id));
        const hasConflict = validSubtasks.some(st => existingIds.has(st.id));
        if (hasConflict) {
            throw new Error('任务ID冲突');
        }

        // 3. 计算正确的权重
        const baseWeight = project.subtasks.length;
        validSubtasks.forEach((st, index) => {
            st.weight = baseWeight + index + 1;
        });

        // 4. 一次性添加所有任务
        project.subtasks.push(...validSubtasks);

        // 5. 立即保存到localStorage
        const projects = getProjects();
        const projectIndex = projects.findIndex(p => p.id === project.id || p.name === project.name);
        if (projectIndex !== -1) {
            projects[projectIndex] = project;
            saveProjects(projects);
        }

        return { success: true, count: validSubtasks.length };
    } catch (error) {
        console.error('批量添加任务失败:', error);
        return { success: false, error: error.message };
    }
}

// 文件导入处理
function handleFileImportForTasks(file) {
    return new Promise((resolve, reject) => {
        if (!file || file.type !== 'text/plain') {
            reject(new Error('请选择.txt文本文件'));
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const lines = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                if (lines.length === 0) {
                    reject(new Error('文件中没有有效的任务名称'));
                    return;
                }

                if (lines.length > 100) {
                    reject(new Error('任务数量过多，请分批导入（最多100个）'));
                    return;
                }

                resolve(lines);
            } catch (error) {
                reject(new Error('文件解析失败'));
            }
        };

        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}

// 防重复提交机制
let isProcessing = false;

function safeSubmit(handler) {
    if (isProcessing) {
        alert('正在处理中，请稍候...');
        return;
    }
    
    isProcessing = true;
    try {
        handler();
    } finally {
        setTimeout(() => {
            isProcessing = false;
        }, 1000);
    }
}

// 显示添加任务弹窗
function showAddTaskModal(project) {
    const modal = document.createElement('div');
    modal.id = 'addTaskModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 3000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 25px;
        border-radius: 10px;
        width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;

    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #50b767;">添加任务</h3>
            <button id="closeAddTaskModal" style="background: transparent; border: none; font-size: 20px; cursor: pointer;">&times;</button>
        </div>
        
        <!-- 标签按钮组 -->
        <div style="display: flex; margin-bottom: 20px; border-bottom: 1px solid #eee;">
            <button class="tab-btn active" data-tab="manual" style="flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; font-weight: bold; color: #50b767; border-bottom: 2px solid #50b767;">手动添加</button>
            <button class="tab-btn" data-tab="import" style="flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; font-weight: bold; color: #666;">批量导入</button>
        </div>
        
        <!-- 手动添加界面 -->
        <div id="manualTab" class="tab-content">
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">任务数量：</label>
                <input type="number" id="taskCount" min="1" max="50" value="1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">批量任务名称：</label>
                <input type="text" id="taskName" placeholder="请输入任务名称" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="background-color: #fff3cd; color: #dc3545; padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 14px;">
                <strong>注意：</strong>批量子任务名称会在生成后自动在名称后面加一个-序号，后期可以自行修改
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="submitManualAdd" style="padding: 8px 16px; background: #50b767; color: white; border: none; border-radius: 4px; cursor: pointer;">提交</button>
                <button id="cancelAddTask" style="padding: 8px 16px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        </div>
        
        <!-- 批量导入界面 -->
        <div id="importTab" class="tab-content" style="display: none;">
            <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
                <p style="margin: 0; color: #666; font-size: 14px;">请用.txt文本编辑好需要导入的任务名称，注意每条任务单独一行区分</p>
            </div>
            <div style="margin-bottom: 15px;">
                <input type="file" id="fileInput" accept=".txt" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <button id="importFileBtn" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">导入文件</button>
            </div>
            <div id="taskPreview" style="display: none; margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">任务预览：</label>
                <div id="taskPreviewList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background-color: #f8f9fa;"></div>
                <button id="confirmImport" style="width: 100%; padding: 10px; background: #50b767; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">确认生成全部任务</button>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="cancelAddTask2" style="padding: 8px 16px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 存储预览的任务名称
    let previewTasks = [];

    // 标签切换功能
    const tabBtns = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // 更新按钮样式
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.color = '#666';
                b.style.borderBottom = 'none';
            });
            btn.classList.add('active');
            btn.style.color = '#50b767';
            btn.style.borderBottom = '2px solid #50b767';
            
            // 显示对应内容
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(targetTab + 'Tab').style.display = 'block';
        });
    });

    // 关闭弹窗
    function closeModal() {
        modal.remove();
    }

    // 手动添加功能
    function handleManualAdd() {
        safeSubmit(() => {
            const count = parseInt(document.getElementById('taskCount').value);
            const taskName = document.getElementById('taskName').value.trim();
            
            if (!count || count <= 0 || count > 50) {
                alert('请输入有效的任务数量（1-50）');
                return;
            }
            
            if (!taskName) {
                alert('请输入任务名称');
                return;
            }

            const newSubtasks = [];
            const baseWeight = project.subtasks.length;
            const today = new Date().toISOString().split('T')[0];
            
            for (let i = 0; i < count; i++) {
                newSubtasks.push({
                    id: generateUniqueSubtaskId(),
                    name: `${taskName}-${i + 1}`,
                    status: -1,
                    completeTime: today,
                    consumingTime: 0,
                    weight: baseWeight + i + 1,
                    startTime: '',
                    endTime: ''
                });
            }

            const result = addSubtasksSafely(project, newSubtasks);
            if (result.success) {
                alert(`成功添加 ${result.count} 个任务`);
                closeModal();
                renderProjectPanelSubtaskList(project); // 刷新显示
            } else {
                alert(`添加失败: ${result.error}`);
            }
        });
    }

    // 文件导入功能
    function handleFileImport() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('请选择文件');
            return;
        }

        handleFileImportForTasks(file)
            .then(taskNames => {
                previewTasks = taskNames;
                renderTaskPreview(taskNames);
                document.getElementById('taskPreview').style.display = 'block';
            })
            .catch(error => {
                alert(`文件处理失败: ${error.message}`);
            });
    }

    // 渲染任务预览
    function renderTaskPreview(taskNames) {
        const previewList = document.getElementById('taskPreviewList');
        previewList.innerHTML = '';
        
        taskNames.forEach((name, index) => {
            const tag = document.createElement('span');
            tag.style.cssText = `
                display: inline-block;
                background-color: #e3f2fd;
                color: #1976d2;
                padding: 4px 8px;
                margin: 2px;
                border-radius: 12px;
                font-size: 12px;
                position: relative;
                padding-right: 20px;
            `;
            tag.textContent = name;
            
            // 添加删除按钮
            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = '×';
            deleteBtn.style.cssText = `
                position: absolute;
                top: -2px;
                right: 4px;
                cursor: pointer;
                font-weight: bold;
                color: #d32f2f;
            `;
            deleteBtn.addEventListener('click', () => {
                previewTasks.splice(index, 1);
                renderTaskPreview(previewTasks);
            });
            
            tag.appendChild(deleteBtn);
            previewList.appendChild(tag);
        });
    }

    // 确认导入
    function handleConfirmImport() {
        safeSubmit(() => {
            if (previewTasks.length === 0) {
                alert('没有任务需要导入');
                return;
            }

            const newSubtasks = [];
            const baseWeight = project.subtasks.length;
            const today = new Date().toISOString().split('T')[0];
            
            previewTasks.forEach((name, index) => {
                newSubtasks.push({
                    id: generateUniqueSubtaskId(),
                    name: name,
                    status: -1,
                    completeTime: today,
                    consumingTime: 0,
                    weight: baseWeight + index + 1,
                    startTime: '',
                    endTime: ''
                });
            });

            const result = addSubtasksSafely(project, newSubtasks);
            if (result.success) {
                alert(`成功导入 ${result.count} 个任务`);
                closeModal();
                renderProjectPanelSubtaskList(project); // 刷新显示
            } else {
                alert(`导入失败: ${result.error}`);
            }
        });
    }

    // 绑定事件
    document.getElementById('closeAddTaskModal').addEventListener('click', closeModal);
    document.getElementById('cancelAddTask').addEventListener('click', closeModal);
    document.getElementById('cancelAddTask2').addEventListener('click', closeModal);
    document.getElementById('submitManualAdd').addEventListener('click', handleManualAdd);
    document.getElementById('importFileBtn').addEventListener('click', handleFileImport);
    document.getElementById('confirmImport').addEventListener('click', handleConfirmImport);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// 打开项目编辑模态框
function openProjectEditModal(project) {
    // 初始化标签库
    initTagLibrary();
    
    const modal = document.createElement('div');
    modal.className = 'project-modal-overlay';
    modal.innerHTML = `
        <div class="project-modal">
            <div class="project-modal-header">
                <h3>编辑项目</h3>
                <button class="project-modal-close">&times;</button>
            </div>
            <div class="project-modal-body">
                <div class="form-group">
                    <label>项目名称：</label>
                    <input type="text" id="editProjectName" value="${project.name}" />
                </div>
                <div class="form-group">
                    <label>项目分类：</label>
                    <input type="text" id="editProjectCategory" placeholder="选择或输入类别" value="${project.category || ''}" />
                    <div class="category-tags">
                        <button class="add-tag-btn" onclick="showAddTagInput('editProjectCategory')">+ 添加标签</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>项目封面：</label>
                    <div style="display:flex; gap:8px; margin-top:5px;">
                        <input type="text" id="editProjectImg" placeholder="图片路径或URL" value="${project.projectimg || ''}" style="flex: 1;" />
                        <button type="button" id="editProjectImgBtn" class="image-select-btn">选择图片</button>
                    </div>
                    <div class="preview-img" style="margin-top:8px;">
                        ${project.projectimg ? `<img src="${project.projectimg}" alt="项目封面" style="max-width:200px; border-radius: 8px;">` : ''}
                    </div>
                </div>
                <div class="form-group">
                    <label>项目备注：</label>
                    <textarea id="editProjectNote" rows="3">${project.note || ''}</textarea>
                </div>
            </div>
            <div class="project-modal-footer">
                <button class="project-modal-btn save-btn">保存</button>
                <button class="project-modal-btn cancel-btn">取消</button>
                <button class="project-modal-btn delete-btn">删除项目</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加样式
    addProjectModalStyles();
    
    // 渲染分类标签
    setTimeout(() => {
        renderCategoryTags('editProjectCategory');
    }, 10);
    
    // 绑定图片选择事件
    modal.querySelector('#editProjectImgBtn').addEventListener('click', function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const fileName = file.name;
                const suggestedPath = `images/${fileName}`;
                
                // 显示图片预览
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewContainer = modal.querySelector('.preview-img');
                    previewContainer.innerHTML = `
                        <img src="${e.target.result}" alt="项目封面" style="max-width:200px; border-radius: 8px;">
                        <div style="color: #50b767; font-size: 12px; margin-top: 5px;">
                            已建议路径: ${suggestedPath} - 请将图片保存到项目目录下
                        </div>
                    `;
                    
                    // 将建议的路径填入输入框
                    document.getElementById('editProjectImg').value = suggestedPath;
                };
                
                reader.readAsDataURL(file);
            }
        });
        
        fileInput.click();
    });
    
    // 绑定其他事件
    modal.querySelector('.project-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('.save-btn').addEventListener('click', () => {
        // 保存项目修改
        const projects = getProjects();
        const projectIndex = projects.findIndex(p => p.name === project.name);
        if (projectIndex !== -1) {
            projects[projectIndex].name = document.getElementById('editProjectName').value;
            projects[projectIndex].category = document.getElementById('editProjectCategory').value;
            projects[projectIndex].note = document.getElementById('editProjectNote').value;
            projects[projectIndex].projectimg = document.getElementById('editProjectImg').value;
            saveProjects(projects);
            renderProjectPanelList();
            modal.remove();
            alert('项目保存成功！');
        }
    });
    modal.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm('确定要删除该项目吗？此操作不可恢复！')) {
            const projects = getProjects();
            const projectIndex = projects.findIndex(p => p.name === project.name);
            if (projectIndex !== -1) {
                projects.splice(projectIndex, 1);
                saveProjects(projects);
                renderProjectPanelList();
                modal.remove();
                alert('项目删除成功！');
            }
        }
    });
    
    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// 打开项目详情模态框
function openProjectDetailsModal(project) {
    const subtasks = project.subtasks || [];
    const totalTasks = subtasks.length;
    const completedTasks = subtasks.filter(t => t.status === 1).length;
    const pendingTasks = subtasks.filter(t => t.status === 0).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;
    
    const modal = document.createElement('div');
    modal.className = 'project-modal-overlay';
    modal.innerHTML = `
        <div class="project-modal project-details-modal">
            <div class="project-modal-header">
                <h3>项目详情</h3>
                <button class="project-modal-close">&times;</button>
            </div>
            <div class="project-modal-body">
                <div class="project-info-grid">
                    <div class="project-info-item">
                        <label>项目名称：</label>
                        <span>${project.name}</span>
                    </div>
                    <div class="project-info-item">
                        <label>项目分类：</label>
                        <span>${project.category || '未分类'}</span>
                    </div>
                    <div class="project-info-item">
                        <label>总任务数：</label>
                        <span>${totalTasks}</span>
                    </div>
                    <div class="project-info-item">
                        <label>已完成：</label>
                        <span style="color: #50b767;">${completedTasks}</span>
                    </div>
                    <div class="project-info-item">
                        <label>待完成：</label>
                        <span style="color: #ff8c00;">${pendingTasks}</span>
                    </div>
                    <div class="project-info-item">
                        <label>完成率：</label>
                        <span style="color: #50b767;">${completionRate}%</span>
                    </div>
                    <div class="project-info-item full-width">
                        <label>项目备注：</label>
                        <span>${project.note || '暂无备注'}</span>
                    </div>
                </div>
                
                ${project.projectimg ? `
                    <div class="project-image-preview">
                        <label>项目封面：</label>
                        <img src="${project.projectimg}" alt="项目封面" style="max-width: 200px; border-radius: 8px;" />
                    </div>
                ` : ''}
                
                <div class="progress-bar-container">
                    <label>完成进度：</label>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionRate}%;"></div>
                    </div>
                    <span class="progress-text">${completionRate}%</span>
                </div>
            </div>
            <div class="project-modal-footer">
                <button class="project-modal-btn cancel-btn">关闭</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加样式
    addProjectModalStyles();
    
    // 绑定事件
    modal.querySelector('.project-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    
    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// 添加模态框样式
function addProjectModalStyles() {
    if (document.getElementById('project-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'project-modal-styles';
    style.textContent = `
        .project-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        
        .project-modal {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 750px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .project-details-modal {
            max-width: 600px;
        }
        
        .project-modal-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
        }
        
        .project-modal-header h3 {
            margin: 0;
            color: #333;
        }
        
        .project-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }
        
        .project-modal-close:hover {
            color: #333;
        }
        
        .project-modal-body {
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        
        .project-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .project-info-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .project-info-item.full-width {
            grid-column: 1 / -1;
        }
        
        .project-info-item label {
            font-weight: bold;
            color: #666;
            font-size: 12px;
        }
        
        .project-info-item span {
            color: #333;
            font-size: 14px;
        }
        
        .progress-bar-container {
            margin-top: 20px;
        }
        
        .progress-bar-container label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #333;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #50b767, #66d982);
            transition: width 0.3s ease;
        }
        
        .progress-text {
            position: absolute;
            right: 10px;
            top: -25px;
            font-size: 12px;
            color: #666;
            font-weight: bold;
        }
        
        .project-image-preview {
            margin: 15px 0;
            text-align: center;
        }
        
        .project-image-preview label {
            display: block;
            margin-bottom: 10px;
            font-weight: bold;
            color: #333;
        }
        
        .project-modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            background: #f8f9fa;
        }
        
        .project-modal-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .save-btn {
            background: #50b767;
            color: white;
        }
        
        .save-btn:hover {
            background: #45a049;
        }
        
        .cancel-btn {
            background: #f0f0f0;
            color: #333;
            border: 1px solid #ddd;
        }
        
        .cancel-btn:hover {
            background: #e0e0e0;
        }
        
        .delete-btn {
            background: #dc3545;
            color: white;
        }
        
        .delete-btn:hover {
            background: #c82333;
        }
        
        /* 分类标签样式 */
        .category-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        
        .category-tag {
            display: inline-block;
            padding: 4px 8px;
            background: #e9ecef;
            color: #495057;
            border-radius: 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 1px solid transparent;
        }
        
        .category-tag:hover {
            background: #dee2e6;
            transform: translateY(-1px);
        }
        
        .category-tag.selected {
            background: #50b767;
            color: white;
            border-color: #45a049;
        }
        
        .add-tag-btn {
            padding: 4px 8px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .add-tag-btn:hover {
            background: #0056b3;
            transform: translateY(-1px);
        }
        
        /* 图片选择按钮样式 */
        .image-select-btn {
            padding: 8px 12px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        
        .image-select-btn:hover {
            background: #5a6268;
        }
        
        /* 预览图片容器样式 */
        .preview-img {
            text-align: center;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 10px;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .preview-img:empty::before {
            content: "暂无封面图片";
            color: #6c757d;
            font-size: 12px;
        }
        
        .preview-img img {
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        /* 脉冲晕染动画 */
        @keyframes pulse-glow {
            0% {
                box-shadow: 0 0 5px rgba(80, 183, 103, 0.5);
                transform: scale(1);
            }
            50% {
                box-shadow: 0 0 20px rgba(80, 183, 103, 0.8), 0 0 30px rgba(80, 183, 103, 0.6);
                transform: scale(1.05);
            }
            100% {
                box-shadow: 0 0 5px rgba(80, 183, 103, 0.5);
                transform: scale(1);
            }
        }
    `;
    
    document.head.appendChild(style);
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 初始化节假日数据
        initSettingsData();
        
        // 初始化导航菜单
        initNavigationMenu();
        
        // 初始化项目管理面板
        initProjectPanel();
        
        // 初始化设置弹窗
        initSettingsModal();
        
        // 初始化日期选择器
        initDatePicker();
        
        // 初始化日期显示
        updatePlanDateDisplay();
        
        // 初始化月视图
        renderMonthView(currentViewDate);
    } catch (error) {
        console.error('页面初始化过程中出错:', error);
    }
});

// 添加全局错误监听
window.addEventListener('error', (event) => {
    console.error('全局错误:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

// 添加未处理的Promise拒绝监听
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});

// 批量设置任务计划区相关功能
let currentPlanDate = new Date(); // 当前查看的日期

// 日期导航功能
function changePlanDate(dayOffset) {
    currentPlanDate.setDate(currentPlanDate.getDate() + dayOffset);
    updatePlanDateDisplay();
    updatePlanTasksDisplay();
    
    // 如果当前有选中的项目，重新渲染子任务列表以更新状态
    if (currentSelectedProject) {
        renderSubtaskList(currentSelectedProject);
    }
}

// 更新日期显示
function updatePlanDateDisplay() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    
    if (dateDisplay) {
        try {
            const options = { month: 'long', day: 'numeric', weekday: 'long' };
            const dateText = currentPlanDate.toLocaleDateString('zh-CN', options);
            dateDisplay.textContent = dateText;
        } catch (error) {
            console.error('更新日期显示时出错:', error);
        }
    }
}

// 初始化日期选择器
function initDatePicker() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    const hiddenDatePicker = document.getElementById('hiddenDatePicker');
    
    // 点击日期显示区域触发原生日期选择器
    if (dateDisplay && hiddenDatePicker) {
        
        dateDisplay.addEventListener('click', () => {
            try {
                // 设置当前日期到隐藏的日期选择器
                hiddenDatePicker.value = formatDate(currentPlanDate);
                
                // 触发原生日期选择器
                hiddenDatePicker.click();
                
                // 如果浏览器支持showPicker方法，也尝试使用
                if (typeof hiddenDatePicker.showPicker === 'function') {
                    setTimeout(() => {
                        try {
                            hiddenDatePicker.showPicker();
                        } catch (error) {
                            // showPicker失败时忽略错误，因为click()已经工作
                        }
                    }, 50);
                }
                
            } catch (error) {
                console.error('点击日期选择器时出错:', error);
            }
        });
        
        // 监听日期选择器的change事件
        hiddenDatePicker.addEventListener('change', (e) => {
            const selectedDate = e.target.value;
            if (selectedDate) {
                try {
                    // 更新当前计划日期
                    currentPlanDate = new Date(selectedDate);
                    
                    // 更新显示
                    updatePlanDateDisplay();
                    
                    // 更新任务显示
                    updatePlanTasksDisplay();
                    
                    // 如果当前有选中的项目，重新渲染子任务列表以更新状态
                    if (currentSelectedProject) {
                        renderSubtaskList(currentSelectedProject);
                    }
                } catch (error) {
                    console.error('处理日期选择时出错:', error);
                }
            }
        });
        

        
        // 添加悬停效果
        dateDisplay.addEventListener('mouseenter', () => {
            dateDisplay.style.backgroundColor = 'rgba(80, 183, 103, 0.1)';
            dateDisplay.style.borderColor = '#50b767';
            dateDisplay.style.transform = 'scale(1.02)';
        });
        
        dateDisplay.addEventListener('mouseleave', () => {
            dateDisplay.style.backgroundColor = '';
            dateDisplay.style.borderColor = 'transparent';
            dateDisplay.style.transform = 'scale(1)';
        });
        

    }
}

// 初始化拖拽功能
function initDragAndDrop() {
    // 设置拖拽目标区域
    setupDropArea();
    
    // 使用事件委托为动态添加的任务卡片绑定拖拽事件
    const subtaskContainer = document.getElementById('subtaskCardsContainer');
    if (subtaskContainer) {
        // 移除旧的事件监听器
        subtaskContainer.removeEventListener('mousedown', handleDragStart);
        // 添加新的事件监听器
        subtaskContainer.addEventListener('mousedown', handleDragStart);
    }
}

// 处理拖拽开始
function handleDragStart(e) {
    console.log('mousedown事件触发');
    const taskCard = e.target.closest('.subtask-card');
    if (!taskCard) {
        console.log('未找到subtask-card元素');
        return;
    }
    
    console.log('找到任务卡片:', taskCard);
    
    // 验证数据有效性
    const subtaskIndex = taskCard.dataset.subtaskIndex;
    if (subtaskIndex === undefined || subtaskIndex === null || subtaskIndex === '') {
        console.error('handleDragStart: 无效的subtaskIndex', subtaskIndex);
        return;
    }
    
    console.log('子任务索引:', subtaskIndex);
    
    // 设置拖拽属性
    taskCard.draggable = true;
    taskCard.classList.add('draggable-task');
    
    console.log('已设置draggable和draggable-task类');
    
    // 添加拖拽开始事件监听器（只添加一次）
    if (!taskCard.hasAttribute('data-drag-initialized')) {
        taskCard.setAttribute('data-drag-initialized', 'true');
        
        taskCard.addEventListener('dragstart', (dragEvent) => {
            console.log('拖拽开始:', subtaskIndex);
            dragEvent.dataTransfer.setData('text/plain', subtaskIndex);
            dragEvent.dataTransfer.effectAllowed = 'move';
            
            // 添加拖拽时的视觉效果
            taskCard.classList.add('dragging');
            taskCard.style.opacity = '0.5';
            taskCard.style.transform = 'rotate(5deg) scale(1.05)';
            
            // 激活拖拽提示区域 - 增加高度和视觉效果
            const dropHint = document.getElementById('dropHintArea');
            if (dropHint) {
                dropHint.classList.remove('drop-hint-hidden');
                dropHint.classList.add('drag-active');
                console.log('拖拽区域已激活，高度增加');
            }
        });
        
        taskCard.addEventListener('dragend', (dragEvent) => {
            console.log('拖拽结束');
            // 移除拖拽时的视觉效果
            taskCard.classList.remove('dragging');
            taskCard.style.opacity = '';
            taskCard.style.transform = '';
            
            // 恢复拖拽提示区域到初始状态
            const dropHint = document.getElementById('dropHintArea');
            if (dropHint) {
                dropHint.classList.remove('drag-active');
                dropHint.classList.remove('drop-hint-hidden');
                console.log('拖拽区域已恢复初始状态');
            }
        });


        
        console.log('已添加拖拽事件监听器');
    } else {
        console.log('拖拽事件已初始化');
    }
}

// 设置拖拽目标区域
function setupDropArea() {
    // 更精确地选择拖拽目标区域
    const dropHintArea = document.getElementById('dropHintArea');
    const plannedTasksContent = document.getElementById('plannedTasksContent');
    
    // 优化：使用防抖处理拖拽样式更新
    let dragOverTimeout;
    
    // 为拖拽提示区域添加拖拽事件
    if (dropHintArea) {
        dropHintArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // 优化：使用 requestAnimationFrame 节流样式更新
            if (dragOverTimeout) {
                clearTimeout(dragOverTimeout);
            }
            
            dragOverTimeout = setTimeout(() => {
                dropHintArea.classList.add('drag-over');
            }, 16); // 约60fps
        });
        
        dropHintArea.addEventListener('dragleave', (e) => {
            if (dragOverTimeout) {
                clearTimeout(dragOverTimeout);
            }
            dropHintArea.classList.remove('drag-over');
        });
        
        dropHintArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (dragOverTimeout) {
                clearTimeout(dragOverTimeout);
            }
            dropHintArea.classList.remove('drag-over');
            dropHintArea.classList.remove('drag-active');
            
            const subtaskIndex = e.dataTransfer.getData('text/plain');
            console.log('拖拽到目标区域:', subtaskIndex);
            if (subtaskIndex !== '') {
                handleTaskDrop(subtaskIndex);
            }
        });
    }
    
    // 为计划任务内容区域也添加拖拽事件
    if (plannedTasksContent) {
        plannedTasksContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            plannedTasksContent.classList.add('drag-over');
        });
        
        plannedTasksContent.addEventListener('dragleave', (e) => {
            plannedTasksContent.classList.remove('drag-over');
        });
        
        plannedTasksContent.addEventListener('drop', (e) => {
            e.preventDefault();
            plannedTasksContent.classList.remove('drag-over');
            
            const subtaskIndex = e.dataTransfer.getData('text/plain');
            console.log('拖拽到任务区域:', subtaskIndex);
            if (subtaskIndex !== '') {
                handleTaskDrop(subtaskIndex);
            }
        });
    }
}

// 处理任务放置
function handleTaskDrop(subtaskIndex) {
    // 数据验证
    if (!currentSelectedProject) {
        console.error('handleTaskDrop: currentSelectedProject为空');
        return;
    }
    
    if (!currentSelectedProject.subtasks || !Array.isArray(currentSelectedProject.subtasks)) {
        console.error('handleTaskDrop: 项目子任务数据无效', currentSelectedProject);
        return;
    }
    
    const index = parseInt(subtaskIndex);
    if (isNaN(index) || index < 0 || index >= currentSelectedProject.subtasks.length) {
        console.error('handleTaskDrop: 无效的子任务索引', subtaskIndex);
        return;
    }
    
    const subtask = currentSelectedProject.subtasks[index];
    if (!subtask || typeof subtask !== 'object') {
        console.error('handleTaskDrop: 子任务数据无效', subtask);
        return;
    }
    
    // 优化：一次性获取项目数据，减少重复操作
    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.name === currentSelectedProject.name);
    if (projectIndex === -1) {
        console.error('handleTaskDrop: 未找到当前项目');
        return;
    }
    
    // 修复：拖拽操作需要改变的字段值
    // 1. completeTime - 设置任务的完成时间为当前选择的日期
    subtask.completeTime = formatDate(currentPlanDate);
    
    // 2. consumingTime - 如果没有consumingTime，设置默认值30分钟
    if (!subtask.consumingTime) {
        subtask.consumingTime = 30;
    }
    
    // 3. status - 设置为0（计划中的任务）
    subtask.status = 0;
    
    console.log('拖拽完成，更新子任务:', {
        name: subtask.name,
        completeTime: subtask.completeTime,
        consumingTime: subtask.consumingTime,
        status: subtask.status
    });
    
    // 更新项目数据
    projects[projectIndex] = currentSelectedProject;
    currentSelectedProject = projects[projectIndex];
    
    // 保存数据
    saveProjects(projects);
    
    // 优化：只更新必要的显示，不重新渲染整个界面
    updatePlanTasksDisplay();
    
    // 优化：直接更新对应任务卡的边框样式，不重新渲染整个列表
    updateSubtaskCardBorderByIndex(index, true);
}



// 处理任务取消（从计划中移除）
function handleTaskCancel(subtaskIndex) {
    // 数据验证
    if (!currentSelectedProject) {
        console.error('handleTaskCancel: currentSelectedProject为空');
        return;
    }
    
    if (!currentSelectedProject.subtasks || !Array.isArray(currentSelectedProject.subtasks)) {
        console.error('handleTaskCancel: 项目子任务数据无效', currentSelectedProject);
        return;
    }
    
    const index = parseInt(subtaskIndex);
    if (isNaN(index) || index < 0 || index >= currentSelectedProject.subtasks.length) {
        console.error('handleTaskCancel: 无效的子任务索引', subtaskIndex);
        return;
    }
    
    const subtask = currentSelectedProject.subtasks[index];
    if (!subtask || typeof subtask !== 'object') {
        console.error('handleTaskCancel: 子任务数据无效', subtask);
        return;
    }
    
    // 优化：一次性获取项目数据，减少重复操作
    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.name === currentSelectedProject.name);
    if (projectIndex === -1) {
        console.error('handleTaskCancel: 未找到当前项目');
        return;
    }
    
    // 取消操作：将任务状态重置为未计划
    subtask.status = -1;
    delete subtask.completeTime;
    
    console.log('取消任务，重置子任务:', {
        name: subtask.name,
        status: subtask.status,
        completeTime: subtask.completeTime
    });
    
    // 更新项目数据
    projects[projectIndex] = currentSelectedProject;
    currentSelectedProject = projects[projectIndex];
    
    // 保存数据
    saveProjects(projects);
    
    // 优化：只更新必要的显示，不重新渲染整个界面
    updatePlanTasksDisplay();
    
    // 优化：直接更新对应任务卡的边框样式，不重新渲染整个列表
    updateSubtaskCardBorderByIndex(index, false);
}





// 更新计划任务显示（参考day-panel逻辑）
function updatePlanTasksDisplay() {
    const plannedContent = document.getElementById('plannedTasksContent');
    const completedContent = document.getElementById('completedTasksContent');
    
    if (!plannedContent || !completedContent) return;
    
    const dateStr = formatDate(currentPlanDate);
    const allProjects = getProjects();
    
    let plannedTasks = [];
    let completedTasks = [];
    
    // 参考day-panel逻辑：收集当天的所有任务
    allProjects.forEach(project => {
        if (!project || !project.subtasks || !Array.isArray(project.subtasks)) {
            return; // 跳过无效的项目数据
        }
        project.subtasks.forEach(subtask => {
            if (subtask && subtask.completeTime && subtask.status !== undefined) {
                // 使用和day-panel相同的日期比较逻辑
                const taskCompleteDate = new Date(subtask.completeTime);
                if (formatDate(taskCompleteDate) === dateStr) {
                    const taskInfo = {
                        projectName: project.name,
                        subtask: subtask
                    };
                    
                    if (subtask.status === 1) {
                        completedTasks.push(taskInfo);
                    } else if (subtask.status === 0) {
                        plannedTasks.push(taskInfo);
                    }
                }
            }
        });
    });
    
    // 渲染计划中的任务
    plannedContent.innerHTML = plannedTasks.length > 0 
        ? plannedTasks.map(task => createPlanTaskCard(task, false)).join('')
        : '<div style="color: #999; font-style: italic; text-align: center; padding: 20px;">暂无计划中的任务</div>';
    
    // 渲染已完成的任务
    completedContent.innerHTML = completedTasks.length > 0
        ? completedTasks.map(task => createPlanTaskCard(task, true)).join('')
        : '<div style="color: #999; font-style: italic; text-align: center; padding: 20px;">暂无已完成的任务</div>';
}

// 创建计划任务卡片（参考day-panel格式）
function createPlanTaskCard(taskInfo, isCompleted) {
    const cardClass = isCompleted ? 'planned-task-card completed-task-card' : 'planned-task-card';
    const subtask = taskInfo.subtask;
    const projectName = taskInfo.projectName;
    
    // 构建时间信息字符串
    let timeInfo = `${subtask.consumingTime || 30}分钟`;
    if (subtask.startTime) {
        timeInfo = `${subtask.startTime} - ${timeInfo}`;
    }
    
    // 编辑用时图标（仅对未完成任务显示）
    const editTimeIcon = !isCompleted ? 
        `<span class="edit-time-icon" onclick="editTaskTime('${subtask.name}', '${projectName}')" title="编辑用时">✏️</span>` : '';
    
    return `
        <div class="${cardClass}" data-task-name="${subtask.name}" data-project-name="${projectName}">
            <!-- 右上角移除图标 -->
            <div class="remove-task-icon" onclick="removeTaskFromPlan('${subtask.name}', '${projectName}')" title="移除任务">↩️</div>
            
            <div class="planned-task-info">
                <div class="planned-task-name">
                    ${projectName}: (${subtask.name}) 
                    <span style="font-size: 11px; color: #666; margin-left: 8px;">${timeInfo}</span>
                    ${editTimeIcon}
                </div>
            </div>
        </div>
    `;
}

// 绑定计划任务事件（已简化为内联事件处理）

// 编辑任务用时
function editTaskTime(taskName, projectName) {
    const projects = getProjects();
    const project = projects.find(p => p.name === projectName);
    if (!project) return;
    
    const subtask = project.subtasks.find(s => s.name === taskName);
    if (!subtask) return;
    
    const currentTime = subtask.consumingTime || 30;
    const newTime = prompt(`请输入新的用时（分钟）:`, currentTime);
    
    if (newTime !== null && !isNaN(newTime) && parseInt(newTime) > 0) {
        subtask.consumingTime = parseInt(newTime);
        saveProjects(projects);
        updatePlanTasksDisplay();
        
        // 优化：如果是当前项目，只更新项目引用，不重新渲染
        if (currentSelectedProject && currentSelectedProject.name === projectName) {
            currentSelectedProject = project;
        }
    }
}

// 从计划中移除任务
function removeTaskFromPlan(taskName, projectName) {
    if (!confirm('确定要将此任务从计划中移除吗？')) return;
    
    const projects = getProjects();
    const project = projects.find(p => p.name === projectName);
    if (!project) return;
    
    const subtask = project.subtasks.find(s => s.name === taskName);
    if (!subtask) return;
    
    // 找到子任务的索引，用于更新边框样式
    const subtaskIndex = project.subtasks.findIndex(s => s.name === taskName);
    
    // 根据任务当前状态决定移除操作
    if (subtask.status === 1) {
        // 从已完成任务区移除：status变0，completeTime保持不变
        subtask.status = 0;
        console.log('从已完成任务区移除:', {
            name: subtask.name,
            status: subtask.status,
            completeTime: subtask.completeTime
        });
    } else if (subtask.status === 0) {
        // 从计划中任务区移除：status变-1，清除completeTime
        subtask.status = -1;
        delete subtask.completeTime;
        console.log('从计划中任务区移除:', {
            name: subtask.name,
            status: subtask.status,
            completeTime: subtask.completeTime
        });
    }
    
    saveProjects(projects);
    updatePlanTasksDisplay();
    
    // 优化：如果是当前项目，直接更新任务卡边框样式，不重新渲染整个列表
    if (currentSelectedProject && currentSelectedProject.name === projectName) {
        currentSelectedProject = project;
        
        // 根据新状态更新任务卡边框
        if (subtask.status === 0) {
            // 状态为0（计划中），显示绿色边框
            updateSubtaskCardBorderByIndex(subtaskIndex, true);
        } else if (subtask.status === -1) {
            // 状态为-1（未计划），移除绿色边框
            updateSubtaskCardBorderByIndex(subtaskIndex, false);
        }
    }
}

// 绑定备份按钮事件
document.addEventListener('DOMContentLoaded', function() {
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', function() {
            // 页面头部的备份按钮总是使用手动下载模式
            manualDownloadBackup();
        });
    }
    
    // 绑定手动备份按钮事件
    const manualBackupBtn = document.getElementById('manualBackupBtn');
    if (manualBackupBtn) {
        manualBackupBtn.addEventListener('click', function() {
            // 手动备份总是使用下载模式
            manualDownloadBackup();
        });
    }
    
    // 绑定数据恢复按钮事件
    const restoreDataBtn = document.getElementById('restoreDataBtn');
    const restoreFileInput = document.getElementById('restoreFileInput');
    if (restoreDataBtn && restoreFileInput) {
        restoreDataBtn.addEventListener('click', function() {
            restoreFileInput.click();
        });
        
        restoreFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                restoreDataFromFile(file);
            }
        });
    }
    
    // 初始化存储使用量显示
    updateStorageUsageDisplay();
    
    // 绑定设置弹窗标签页切换事件
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // 更新按钮状态
            tabBtns.forEach(b => {
                b.style.color = '#666';
                b.style.fontWeight = 'normal';
            });
            this.style.color = '#50b767';
            this.style.fontWeight = 'bold';
            
            // 更新内容显示
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            const targetContent = document.getElementById(tabName + 'Content');
            if (targetContent) {
                targetContent.style.display = 'block';
                
                // 如果切换到自动备份设置标签页，初始化设置界面
                if (tabName === 'autoBackup') {
                    setTimeout(() => {
                        initAutoBackupSettings();
                    }, 100);
                }
                
                // 如果切换到数据备份标签页，更新存储使用量显示
                if (tabName === 'backup') {
                    setTimeout(() => {
                        updateStorageUsageDisplay();
                    }, 100);
                }
            }
        });
    });
});

// 从备份文件恢复数据
function restoreDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            // 验证备份文件格式
            if (!backupData || typeof backupData !== 'object') {
                throw new Error('备份文件不是有效的JSON对象');
            }
            
            if (!backupData.data || !backupData.timestamp) {
                throw new Error('无效的备份文件格式：缺少必要字段');
            }
            
            // 验证数据结构
            const data = backupData.data;
            if (data.projects && !Array.isArray(data.projects)) {
                throw new Error('项目数据格式错误');
            }
            if (data.tagLibrary && !Array.isArray(data.tagLibrary)) {
                throw new Error('标签库数据格式错误');
            }
            if (data.calendarSettings && typeof data.calendarSettings !== 'object') {
                throw new Error('日历设置数据格式错误');
            }
            
            // 确认恢复操作
            const confirmMessage = `确定要恢复数据吗？\n\n备份时间：${new Date(backupData.timestamp).toLocaleString()}\n\n⚠️ 这将覆盖当前所有数据！`;
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // 恢复数据
            if (backupData.data.projects) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(backupData.data.projects));
            }
            if (backupData.data.tagLibrary) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.TAG_LIBRARY, JSON.stringify(backupData.data.tagLibrary));
            }
            if (backupData.data.calendarSettings) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.CALENDAR_SETTINGS, JSON.stringify(backupData.data.calendarSettings));
            }
            if (backupData.data.showTime !== undefined) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.SHOW_TIME, backupData.data.showTime);
            }
            if (backupData.data.showCount !== undefined) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.SHOW_COUNT, backupData.data.showCount);
            }
            if (backupData.data.taskFontSize) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.TASK_FONT_SIZE, backupData.data.taskFontSize);
            }
            if (backupData.data.navMenuActiveIndex !== undefined) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.NAV_MENU_ACTIVE_INDEX, backupData.data.navMenuActiveIndex);
            }
            
            // 显示成功消息
            showBackupStatus('✅ 数据恢复成功！页面将重新加载...');
            
            // 重新加载页面以应用恢复的数据
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('恢复数据失败:', error);
            alert('恢复数据失败：' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('读取文件失败，请重试');
    };
    
    reader.readAsText(file);
}

// 任务选择器切换功能
function toggleTaskPicker() {
    const monthPanel = document.getElementById('monthPanel');
    const taskpickerPanel = document.getElementById('taskpickerPanel');
    const addTaskIcon = document.getElementById('addTaskIcon');
    const greenPreviewBox = document.querySelector('.green-preview-box');
    
    if (!monthPanel || !taskpickerPanel || !addTaskIcon) {
        console.error('必要的DOM元素未找到');
        return;
    }
    
    // 检查当前状态
    const isPickerMode = taskpickerPanel.classList.contains('active');
    
    if (isPickerMode) {
        // 切换回月视图模式
        monthPanel.classList.remove('hidden');
        taskpickerPanel.classList.remove('active');
        addTaskIcon.classList.remove('picker-mode');
        addTaskIcon.querySelector('.text-button').textContent = '添加计划';
        
        // 隐藏绿色虚线框
        if (greenPreviewBox) {
            greenPreviewBox.classList.remove('active');
        }
    } else {
        // 切换到任务选择器模式
        monthPanel.classList.add('hidden');
        taskpickerPanel.classList.add('active');
        addTaskIcon.classList.add('picker-mode');
        addTaskIcon.querySelector('.text-button').textContent = '退出';
        
        // 渲染任务选择器
        renderTaskPicker();
        
        // 渲染分类标签
        renderTaskPickerCategoryTags();
        
        // 绑定搜索和筛选事件
        bindTaskPickerEvents();
        
        // 显示绿色虚线框
        ensureGreenPreviewBox();
    }
}

// 全局变量存储任务选择器中选中的任务
let taskPickerSelectedTasks = [];
// 任务选择器筛选变量
let taskPickerSearchTerm = '';
let taskPickerSelectedCategory = '';

// 确保绿色虚线框存在并显示
function ensureGreenPreviewBox() {
    const dayPanel = document.getElementById('dayPanel');
    if (!dayPanel) return;
    
    // 查找"计划中"标题
    const plannedTitle = dayPanel.querySelector('h3');
    if (!plannedTitle) return;
    
    // 检查是否已经存在绿色虚线框
    let greenPreviewBox = dayPanel.querySelector('.green-preview-box');
    
    if (!greenPreviewBox) {
        // 创建绿色虚线框
        greenPreviewBox = document.createElement('div');
        greenPreviewBox.className = 'green-preview-box';
        greenPreviewBox.innerHTML = `
            <div class="preview-title">任务预览区域</div>
            <div class="preview-content" id="previewTaskList">
                <!-- 预览的任务将在这里显示 -->
            </div>
            <div class="preview-action-buttons" id="previewActionButtons">
                <button class="preview-action-btn preview-confirm-btn" id="confirmAllBtn">全部确定</button>
                <button class="preview-action-btn preview-cancel-btn" id="cancelAllBtn">全部取消</button>
            </div>
        `;
        
        // 插入到"计划中"标题之后
        plannedTitle.insertAdjacentElement('afterend', greenPreviewBox);
        
        // 绑定操作按钮事件
        bindPreviewActionButtons();
    }
    
    // 显示绿色虚线框
    greenPreviewBox.classList.add('active');
}

// 渲染任务选择器
function renderTaskPicker() {
    const container = document.getElementById('projectListContainer');
    if (!container) return;
    
    const projects = getProjects();
    let filteredProjects = [...projects];
    
    // 按分类筛选
    if (taskPickerSelectedCategory && taskPickerSelectedCategory !== 'warning') {
        filteredProjects = filteredProjects.filter(p => p.category === taskPickerSelectedCategory);
    }
    
    // 筛选10天以上没做的任务
    if (taskPickerSelectedCategory === 'warning') {
        filteredProjects = filteredProjects.filter(project => {
            const subtasks = project.subtasks || [];
            const completedTasks = subtasks.filter(s => s.status === 1).length;
            const totalTasks = subtasks.length;
            
            if (completedTasks > 0 && completedTasks < totalTasks) {
                const completedSubtasks = subtasks.filter(s => s.status === 1);
                const latestCompleted = completedSubtasks.sort((a, b) => 
                    new Date(b.completeTime) - new Date(a.completeTime)
                )[0];
                
                if (latestCompleted && latestCompleted.completeTime) {
                    const daysDiff = Math.floor((new Date() - new Date(latestCompleted.completeTime)) / (1000 * 60 * 60 * 24));
                    return daysDiff > 10;
                }
            }
            return false;
        });
    }
    
    // 按搜索词筛选
    if (taskPickerSearchTerm) {
        filteredProjects = filteredProjects.filter(project => {
            // 检查项目名是否匹配
            if (project.name.toLowerCase().includes(taskPickerSearchTerm.toLowerCase())) {
                return true;
            }
            // 检查任务名是否匹配
            if (project.subtasks && Array.isArray(project.subtasks)) {
                return project.subtasks.some(subtask => 
                    subtask.name.toLowerCase().includes(taskPickerSearchTerm.toLowerCase())
                );
            }
            return false;
        });
    }
    
    container.innerHTML = '';
    
    filteredProjects.forEach((project, index) => {
        if (!project || !project.subtasks || !Array.isArray(project.subtasks)) return;
        
        // 创建项目卡片
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card-compact';
        
        // 计算已完成任务数
        const completedTasks = project.subtasks.filter(task => task.status === 1).length;
        const totalTasks = project.subtasks.length;
        
        // 检查近7天内的已完成任务数量
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentCompletedTasks = project.subtasks.filter(task => {
            if (task.status === 1 && task.completeTime) {
                const completeDate = new Date(task.completeTime);
                return completeDate >= sevenDaysAgo;
            }
            return false;
        });
        
        // 检查近10天内是否有已完成任务（用于判断是否显示🐢图标）
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        const hasRecentCompletedTasks = project.subtasks.some(task => {
            if (task.status === 1 && task.completeTime) {
                const completeDate = new Date(task.completeTime);
                return completeDate >= tenDaysAgo;
            }
            return false;
        });
        
        // 根据近7天完成任务数量决定显示的图标
        let progressIcon = '';
        if (recentCompletedTasks.length >= 3) {
            progressIcon = '🚀 '; // 近7天有3条或以上已完成任务，显示火箭
        } else if (!hasRecentCompletedTasks) {
            progressIcon = '🐢 '; // 近10天没有完成任务，显示乌龟
        }
        
        // 获取最近完成任务的日期
        let latestCompleteDate = '';
        if (completedTasks > 0) {
            const completedSubtasks = project.subtasks.filter(task => task.status === 1 && task.completeTime);
            if (completedSubtasks.length > 0) {
                const latestCompleted = completedSubtasks.sort((a, b) => 
                    new Date(b.completeTime) - new Date(a.completeTime)
                )[0];
                if (latestCompleted && latestCompleted.completeTime) {
                    const date = new Date(latestCompleted.completeTime);
                    const month = date.getMonth() + 1; // 获取月份（0-11，需要+1）
                    const day = date.getDate(); // 获取日期
                    latestCompleteDate = `${month}-${day}`; // 格式化为 MM-DD
                }
            }
        }
        
        projectCard.innerHTML = `
            <div class="project-card-content">
                <span class="project-sequence-number">${index + 1}</span>
                <span class="project-name">${project.name}</span>
                <span class="task-stats">(${progressIcon}已完成：${completedTasks} / ${totalTasks})</span>
                ${latestCompleteDate ? `<span class="latest-complete-date">（更新于：${latestCompleteDate}）</span>` : ''}
            </div>
        `;
        
        // 创建任务列表容器
        const taskListContainer = document.createElement('div');
        taskListContainer.className = 'task-list-container';
        
        // 渲染任务卡片
        project.subtasks.forEach(subtask => {
            const taskCard = document.createElement('div');
            
            // 根据status设置不同的样式类
            if (subtask.status === 1) {
                taskCard.className = 'task-card-compact completed-task';
                // 禁止左键点击已完成的任务，但允许右键编辑
                taskCard.style.cursor = 'not-allowed';
                
                // 绑定右键点击事件 - 修改任务名称（已完成任务也可以编辑）
                taskCard.addEventListener('contextmenu', (e) => {
                    e.preventDefault(); // 阻止默认右键菜单
                    editTaskName(project.name, subtask, taskCard);
                });
                
                // 添加完成日期显示
                if (subtask.completeTime) {
                    const dateMatch = subtask.completeTime.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                    if (dateMatch) {
                        const month = dateMatch[2];
                        const day = dateMatch[3];
                        taskCard.innerHTML = `
                            <span class="task-date-badge">${month}-${day}</span>
                            <span class="task-name">${subtask.name}</span>
                        `;
                    } else {
                        taskCard.innerHTML = `
                            <span class="task-name">${subtask.name}</span>
                        `;
                    }
                } else {
                    taskCard.innerHTML = `
                        <span class="task-name">${subtask.name}</span>
                    `;
                }
                
                // 阻止左键点击事件
                taskCard.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            } else {
                // status为0、-1或空值的任务使用虚线边框
                taskCard.className = 'task-card-compact pending-task';
                taskCard.textContent = subtask.name;
                
                // 绑定任务卡片点击事件
                taskCard.addEventListener('click', () => toggleTaskSelection(project.name, subtask));
                
                // 绑定右键点击事件 - 修改任务名称
                taskCard.addEventListener('contextmenu', (e) => {
                    e.preventDefault(); // 阻止默认右键菜单
                    editTaskName(project.name, subtask, taskCard);
                });
            }
            
            taskCard.dataset.projectName = project.name;
            taskCard.dataset.taskName = subtask.name;
            
            taskListContainer.appendChild(taskCard);
        });
        
        // 绑定项目卡片点击事件
        projectCard.addEventListener('click', () => toggleProjectExpansion(projectCard, taskListContainer));
        
        container.appendChild(projectCard);
        container.appendChild(taskListContainer);
    });
    
    // 添加底部提示
    const bottomTip = document.createElement('div');
    bottomTip.className = 'taskpicker-bottom-tip';
    bottomTip.textContent = '已经到底啦！';
    container.appendChild(bottomTip);
}

// 切换项目展开状态
function toggleProjectExpansion(projectCard, taskListContainer) {
    const isExpanded = taskListContainer.classList.contains('show');
    
    if (isExpanded) {
        taskListContainer.classList.remove('show');
        projectCard.classList.remove('expanded');
    } else {
        taskListContainer.classList.add('show');
        projectCard.classList.add('expanded');
    }
}

// 编辑任务名称
function editTaskName(projectName, subtask, taskCard) {
    const currentName = subtask.name;
    const newName = prompt('请输入新的任务名称:', currentName);
    
    if (newName && newName.trim() && newName.trim() !== currentName) {
        const trimmedName = newName.trim();
        
        // 更新项目数据
        const projects = getProjects();
        const project = projects.find(p => p.name === projectName);
        
        if (project) {
            const targetSubtask = project.subtasks.find(s => s.name === currentName);
            if (targetSubtask) {
                // 检查新名称是否已存在
                const nameExists = project.subtasks.some(s => s.name === trimmedName && s !== targetSubtask);
                if (nameExists) {
                    alert('该任务名称已存在，请使用其他名称！');
                    return;
                }
                
                // 更新任务名称
                targetSubtask.name = trimmedName;
                
                // 保存到localStorage
                saveProjects(projects);
                
                // 更新任务卡片显示
                if (subtask.status === 1) {
                    // 已完成任务，保持HTML结构
                    const taskNameElement = taskCard.querySelector('.task-name');
                    if (taskNameElement) {
                        taskNameElement.textContent = trimmedName;
                    } else {
                        // 如果没有找到.task-name元素，直接更新整个内容
                        taskCard.textContent = trimmedName;
                    }
                } else {
                    // 未完成任务，直接更新文本内容
                    taskCard.textContent = trimmedName;
                }
                taskCard.dataset.taskName = trimmedName;
                
                // 更新预览区中的任务名称（如果该任务在预览区中）
                const taskKey = `${projectName}-${currentName}`;
                const previewTask = taskPickerSelectedTasks.find(task => task.key === taskKey);
                if (previewTask) {
                    previewTask.key = `${projectName}-${trimmedName}`;
                    previewTask.subtask.name = trimmedName;
                    updatePreviewDisplay();
                }
                
                // 触发自动备份
                triggerAutoBackup();
                
                console.log(`任务名称已更新: ${currentName} -> ${trimmedName}`);
            }
        }
    }
}

// 切换任务选择状态
function toggleTaskSelection(projectName, subtask) {
    const taskCard = document.querySelector(`[data-project-name="${projectName}"][data-task-name="${subtask.name}"]`);
    if (!taskCard) return;
    
    // 检查任务是否已完成，如果已完成则不允许选择
    if (subtask.status === 1) {
        return;
    }
    
    const isSelected = taskCard.classList.contains('selected');
    
    if (isSelected) {
        // 取消选择
        taskCard.classList.remove('selected');
        removeTaskFromPreview(projectName, subtask);
    } else {
        // 选择任务
        taskCard.classList.add('selected');
        addTaskToPreview(projectName, subtask);
    }
}

// 添加任务到预览区
function addTaskToPreview(projectName, subtask) {
    // 检查任务是否已完成，如果已完成则不允许添加到预览区
    if (subtask.status === 1) {
        return;
    }
    
    const taskKey = `${projectName}-${subtask.name}`;
    
    // 检查是否已经存在
    if (taskPickerSelectedTasks.find(task => task.key === taskKey)) return;
    
    taskPickerSelectedTasks.push({
        key: taskKey,
        projectName: projectName,
        subtask: subtask
    });
    
    updatePreviewDisplay();
}

// 从预览区移除任务
function removeTaskFromPreview(projectName, subtask) {
    const taskKey = `${projectName}-${subtask.name}`;
    taskPickerSelectedTasks = taskPickerSelectedTasks.filter(task => task.key !== taskKey);
    
    // 同步清除任务选择器中对应任务卡的选中状态
    const taskCard = document.querySelector(`[data-project-name="${projectName}"][data-task-name="${subtask.name}"]`);
    if (taskCard && !taskCard.classList.contains('completed-task')) {
        taskCard.classList.remove('selected');
    }
    
    updatePreviewDisplay();
}

// 更新预览区显示
function updatePreviewDisplay() {
    const previewTaskList = document.getElementById('previewTaskList');
    const actionButtons = document.getElementById('previewActionButtons');
    
    if (!previewTaskList || !actionButtons) return;
    
    previewTaskList.innerHTML = '';
    
    taskPickerSelectedTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'preview-task-item';
        taskItem.innerHTML = `
            <div class="preview-task-info">
                <div class="preview-task-content">${task.projectName}: ${task.subtask.name}</div>
            </div>
            <button class="preview-task-remove">×</button>
        `;
        
        // 绑定移除按钮事件
        const removeBtn = taskItem.querySelector('.preview-task-remove');
        removeBtn.addEventListener('click', () => removeTaskFromPreview(task.projectName, task.subtask));
        
        previewTaskList.appendChild(taskItem);
    });
    
    // 显示/隐藏操作按钮
    if (taskPickerSelectedTasks.length > 0) {
        actionButtons.classList.add('show');
    } else {
        actionButtons.classList.remove('show');
    }
}

// 绑定预览区操作按钮事件
function bindPreviewActionButtons() {
    const confirmBtn = document.getElementById('confirmAllBtn');
    const cancelBtn = document.getElementById('cancelAllBtn');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmAllTasks);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelAllTasks);
    }
}

// 确认所有任务
function confirmAllTasks() {
    const dayPanel = document.getElementById('dayPanel');
    if (!dayPanel) return;
    
    // 获取当前显示的日期
    const dateTitle = dayPanel.querySelector('h2');
    if (!dateTitle) return;
    
    const dateText = dateTitle.textContent.trim();
    const dateMatch = dateText.match(/(\d{1,2})-(\d{1,2})/);
    if (!dateMatch) return;
    
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = new Date().getFullYear();
    const targetDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // 更新项目数据
    const projects = getProjects();
    let hasChanges = false;
    
    taskPickerSelectedTasks.forEach(task => {
        const project = projects.find(p => p.name === task.projectName);
        if (project) {
            const subtask = project.subtasks.find(s => s.name === task.subtask.name);
            if (subtask) {
                subtask.completeTime = targetDate;
                subtask.status = 0; // 计划中状态
                hasChanges = true;
            }
        }
    });
    
    if (hasChanges) {
        // 保存到localStorage
        saveProjects(projects);
        
        // 刷新day-panel显示
        const currentDate = new Date(targetDate);
        renderDayView(currentDate, dayPanel);
    }
    
    // 清空选中任务
    taskPickerSelectedTasks = [];
    
    // 退出任务选择器
    toggleTaskPicker();
}

// 取消所有任务
function cancelAllTasks() {
    // 清空选中任务
    taskPickerSelectedTasks = [];
    
    // 清除所有任务卡的选择状态（排除已完成的任务）
    document.querySelectorAll('.task-card-compact.selected').forEach(card => {
        if (!card.classList.contains('completed-task')) {
            card.classList.remove('selected');
        }
    });
    
    // 更新预览区显示
    updatePreviewDisplay();
}

// 渲染任务选择器分类标签
function renderTaskPickerCategoryTags() {
    const container = document.getElementById('taskpickerCategoryTags');
    if (!container) return;
    
    const projects = getProjects();
    const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];
    
    container.innerHTML = '';
    
    // 计算每个分类的项目数量
    const categoryCounts = {};
    projects.forEach(project => {
        if (project.category) {
            categoryCounts[project.category] = (categoryCounts[project.category] || 0) + 1;
        }
    });
    
    // 计算总项目数
    const totalProjects = projects.length;
    
    // 添加"全部"选项
    const allTag = document.createElement('div');
    allTag.className = `taskpicker-category-tag ${!taskPickerSelectedCategory ? 'active' : ''}`;
    allTag.textContent = `全部 (${totalProjects})`;
    allTag.addEventListener('click', () => {
        taskPickerSelectedCategory = '';
        renderTaskPickerCategoryTags();
        renderTaskPicker();
    });
    container.appendChild(allTag);
    
    // 添加分类标签
    categories.forEach(category => {
        const tag = document.createElement('div');
        tag.className = `taskpicker-category-tag ${taskPickerSelectedCategory === category ? 'active' : ''}`;
        tag.textContent = `${category} (${categoryCounts[category]})`;
        tag.addEventListener('click', () => {
            taskPickerSelectedCategory = category;
            renderTaskPickerCategoryTags();
            renderTaskPicker();
        });
        container.appendChild(tag);
    });
    
    // 添加"10天以上没做的任务"标签
    const warningCount = projects.filter(project => {
        const subtasks = project.subtasks || [];
        const completedTasks = subtasks.filter(s => s.status === 1).length;
        const totalTasks = subtasks.length;
        
        if (completedTasks > 0 && completedTasks < totalTasks) {
            const completedSubtasks = subtasks.filter(s => s.status === 1);
            const latestCompleted = completedSubtasks.sort((a, b) => 
                new Date(b.completeTime) - new Date(a.completeTime)
            )[0];
            
            if (latestCompleted && latestCompleted.completeTime) {
                const daysDiff = Math.floor((new Date() - new Date(latestCompleted.completeTime)) / (1000 * 60 * 60 * 24));
                return daysDiff > 10;
            }
        }
        return false;
    }).length;
    
    if (warningCount > 0) {
        const warningTag = document.createElement('div');
        warningTag.className = `taskpicker-category-tag warning-tag ${taskPickerSelectedCategory === 'warning' ? 'active' : ''}`;
        warningTag.textContent = `10天以上没做的任务 (${warningCount})`;
        warningTag.addEventListener('click', () => {
            // 如果点击的是当前激活的标签，则取消激活并回到"全部"状态
            if (taskPickerSelectedCategory === 'warning') {
                taskPickerSelectedCategory = '';
            } else {
                taskPickerSelectedCategory = 'warning';
            }
            renderTaskPickerCategoryTags();
            renderTaskPicker();
        });
        container.appendChild(warningTag);
    }
}

// 绑定任务选择器事件
function bindTaskPickerEvents() {
    const searchInput = document.getElementById('taskpickerSearchInput');
    const clearBtn = document.getElementById('taskpickerClearSearch');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            taskPickerSearchTerm = e.target.value.trim();
            renderTaskPicker();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            taskPickerSearchTerm = '';
            taskPickerSelectedCategory = '';
            if (searchInput) {
                searchInput.value = '';
            }
            renderTaskPickerCategoryTags();
            renderTaskPicker();
        });
    }
}

    
    
    <!-- 批量操作相关函数 -->

        // 全局变量存储选中的任务
        let selectedSubtasks = new Set();
        let currentProjectForBatch = null;
        
        // 切换任务选中状态
        function toggleSubtaskSelection(subtaskCard, subtask) {
            if (subtask.status === 1) return; // 已完成任务不能选中
            
            const isSelected = subtaskCard.classList.contains('selected');
            
            if (isSelected) {
                subtaskCard.classList.remove('selected');
                selectedSubtasks.delete(subtask.uniqueId);
            } else {
                subtaskCard.classList.add('selected');
                selectedSubtasks.add(subtask.uniqueId);
            }
            
            updateBatchButtons();
            updateSelectAllCheckbox();
        }
        
        // 更新批量操作按钮状态
        function updateBatchButtons() {
            const batchDeleteBtn = document.getElementById('batchDeleteSubtasks');
            const batchEditBtn = document.getElementById('batchEditSubtasks');
            
            if (selectedSubtasks.size > 0) {
                batchDeleteBtn.disabled = false;
                batchEditBtn.disabled = false;
            } else {
                batchDeleteBtn.disabled = true;
                batchEditBtn.disabled = true;
            }
        }
        
        // 更新全选复选框状态
        function updateSelectAllCheckbox() {
            const selectAllCheckbox = document.getElementById('selectAllSubtasks');
            const selectedCountSpan = document.querySelector('.selected-count');
            const uncompletedSubtasks = document.querySelectorAll('.subtask-card:not(.completed)');
            const selectedUncompleted = document.querySelectorAll('.subtask-card:not(.completed).selected');
            
            // 更新选择数量显示
            if (selectedCountSpan) {
                selectedCountSpan.textContent = `(${selectedSubtasks.size})`;
            }
            
            if (selectedUncompleted.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (selectedUncompleted.length === uncompletedSubtasks.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }
        
        // 重置全选复选框状态
        function resetSelectAllCheckbox() {
            const selectAllCheckbox = document.getElementById('selectAllSubtasks');
            const selectedCountSpan = document.querySelector('.selected-count');
            
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
            
            // 重置计数显示
            if (selectedCountSpan) {
                selectedCountSpan.textContent = '(0)';
            }
        }
        
        // 全选/取消全选
        function toggleSelectAllSubtasks() {
            const selectAllCheckbox = document.getElementById('selectAllSubtasks');
            const uncompletedSubtasks = document.querySelectorAll('.subtask-card:not(.completed)');
            
            if (selectAllCheckbox.checked) {
                // 全选
                uncompletedSubtasks.forEach(card => {
                    card.classList.add('selected');
                    const subtaskId = card.getAttribute('data-subtask-unique-id');
                    if (subtaskId) {
                        selectedSubtasks.add(subtaskId);
                    }
                });
            } else {
                // 取消全选
                uncompletedSubtasks.forEach(card => {
                    card.classList.remove('selected');
                });
                selectedSubtasks.clear();
            }
            
            // 强制更新按钮状态和统计数据
            setTimeout(() => {
                updateBatchButtons();
                updateSelectAllCheckbox(); // 添加更新统计数据的调用
            }, 0);
        }
        
        // 批量删除任务
        function batchDeleteSubtasks() {
            if (selectedSubtasks.size === 0) return;
            
            if (!confirm(`确定要删除选中的 ${selectedSubtasks.size} 个任务吗？`)) {
                return;
            }
            
            const projects = getProjects();
            const projectIndex = projects.findIndex(p => p.name === currentSelectedProjectPanel.name);
            
            if (projectIndex === -1) return;
            
            const project = projects[projectIndex];
            project.subtasks = project.subtasks.filter(subtask => !selectedSubtasks.has(subtask.uniqueId));
            
            // 保存更新
            projects[projectIndex] = project;
            saveProjects(projects);
            
            const deletedCount = selectedSubtasks.size;
            
            // 清空选中状态
            selectedSubtasks.clear();
            
            // 重置全选复选框状态
            resetSelectAllCheckbox();
            
            // 重新渲染列表
            renderProjectPanelSubtaskList(project);
            
            alert(`成功删除 ${deletedCount} 个任务`);
        }
        
        // 批量编辑菜单切换
        function toggleBatchEditMenu() {
            const menu = document.getElementById('batchEditMenu');
            menu.classList.toggle('show');
        }
        
        // 批量改用时
        function batchEditConsumingTime() {
            const consumingTime = prompt('请输入用时（分钟）：');
            if (!consumingTime || isNaN(consumingTime)) return;
            
            batchUpdateSubtasks('consumingTime', parseInt(consumingTime));
        }
        
        // 批量排期
        function batchEditSchedule() {
            alert('批量排期功能待开发');
        }
        
        // 批量开始时间
        function batchEditStartTime() {
            const time = prompt('请输入开始时间（格式：HH:MM）：');
            if (!time || !/^\d{2}:\d{2}$/.test(time)) {
                alert('请输入正确的时间格式（HH:MM）');
                return;
            }
            
            batchUpdateSubtasks('startTime', time);
        }
        
        // 批量完成
        async function batchEditComplete() {
            // 检查选中的任务中是否有缺少consumingTime的
            const projects = getProjects();
            const projectIndex = projects.findIndex(p => p.name === currentSelectedProjectPanel.name);
            
            if (projectIndex === -1) return;
            
            const project = projects[projectIndex];
            const tasksWithoutConsumingTime = project.subtasks.filter(subtask => 
                selectedSubtasks.has(subtask.uniqueId) && 
                (!subtask.consumingTime || subtask.consumingTime === 0)
            );
            
            // 如果有任务缺少consumingTime，先提示输入
            if (tasksWithoutConsumingTime.length > 0) {
                const consumingTime = prompt(`检测到 ${tasksWithoutConsumingTime.length} 个任务缺少用时，请输入任务用时（分钟）：`);
                if (!consumingTime || isNaN(consumingTime)) {
                    alert('请输入有效的用时数值');
                    return;
                }
                
                // 先更新这些任务的consumingTime
                tasksWithoutConsumingTime.forEach(subtask => {
                    subtask.consumingTime = parseInt(consumingTime);
                });
                
                // 保存更新
                projects[projectIndex] = project;
                saveProjects(projects);
            }
            
            // 使用日期选择器输入完成日期
            const today = new Date().toISOString().split('T')[0];
            const completeDate = await showDatePicker('请选择完成日期', today);
            if (!completeDate) return;
            
            batchUpdateSubtasks('complete', completeDate);
        }
        
        // 批量无计划
        function batchEditNoPlan() {
            if (!confirm('确定要将选中的任务设置为无计划状态吗？')) return;
            
            batchUpdateSubtasks('noPlan', null);
        }
        
        // 批量计划每天
        async function batchEditDailyPlan() {
            // 检查选中的任务中是否有缺少consumingTime的
            const projects = getProjects();
            const projectIndex = projects.findIndex(p => p.name === currentSelectedProjectPanel.name);
            
            if (projectIndex === -1) return;
            
            const project = projects[projectIndex];
            const selectedTaskIds = Array.from(selectedSubtasks);
            const tasksWithoutConsumingTime = project.subtasks.filter(subtask => 
                selectedSubtasks.has(subtask.uniqueId) && 
                (!subtask.consumingTime || subtask.consumingTime === 0)
            );
            
            let unifiedConsumingTime = null;
            
            // 如果有任务缺少consumingTime，要求填写统一用时
            if (tasksWithoutConsumingTime.length > 0) {
                const consumingTime = prompt(`检测到 ${tasksWithoutConsumingTime.length} 个任务缺少用时，请输入统一的任务用时（分钟）：`);
                if (!consumingTime || isNaN(consumingTime)) {
                    alert('请输入有效的用时数值');
                    return;
                }
                unifiedConsumingTime = parseInt(consumingTime);
            }
            
            // 使用日期选择器输入起始日期
            const today = new Date().toISOString().split('T')[0];
            const startDate = await showDatePicker('请选择计划的起始日期', today);
            if (!startDate) return;
            
            // 按任务ID顺序分配日期
            const startDateObj = new Date(startDate);
            let currentDate = new Date(startDateObj);
            
            selectedTaskIds.forEach((taskId, index) => {
                const subtask = project.subtasks.find(s => s.uniqueId === taskId);
                if (subtask) {
                    // 设置完成日期（按顺序递增）
                    const dateToSet = new Date(currentDate);
                    dateToSet.setDate(currentDate.getDate() + index);
                    subtask.completeTime = dateToSet.toISOString().split('T')[0] + 'T00:00:00.000Z';
                    
                    // 设置状态为计划中
                    subtask.status = 0;
                    
                    // 如果有统一用时，则更新
                    if (unifiedConsumingTime !== null) {
                        subtask.consumingTime = unifiedConsumingTime;
                    }
                }
            });
            
            // 保存更新
            projects[projectIndex] = project;
            saveProjects(projects);
            
            // 清空选中状态
            selectedSubtasks.clear();
            
            // 重置全选复选框状态
            resetSelectAllCheckbox();
            
            // 重新渲染列表
            renderProjectPanelSubtaskList(project);
            
            const endDate = new Date(currentDate);
            endDate.setDate(currentDate.getDate() + selectedTaskIds.length - 1);
            const endDateStr = endDate.toISOString().split('T')[0];
            
            alert(`成功为 ${selectedTaskIds.length} 个任务制定每日计划！\n起始日期：${startDate}\n结束日期：${endDateStr}`);
        }
        
        // 批量计划每周
        async function batchEditWeeklyPlan() {
            // 检查选中的任务中是否有缺少consumingTime的
            const projects = getProjects();
            const projectIndex = projects.findIndex(p => p.name === currentSelectedProjectPanel.name);
            
            if (projectIndex === -1) return;
            
            const project = projects[projectIndex];
            const selectedTaskIds = Array.from(selectedSubtasks);
            const tasksWithoutConsumingTime = project.subtasks.filter(subtask => 
                selectedSubtasks.has(subtask.uniqueId) && 
                (!subtask.consumingTime || subtask.consumingTime === 0)
            );
            
            let unifiedConsumingTime = null;
            
            // 如果有任务缺少consumingTime，要求填写统一用时
            if (tasksWithoutConsumingTime.length > 0) {
                const consumingTime = prompt(`检测到 ${tasksWithoutConsumingTime.length} 个任务缺少用时，请输入统一的任务用时（分钟）：`);
                if (!consumingTime || isNaN(consumingTime)) {
                    alert('请输入有效的用时数值');
                    return;
                }
                unifiedConsumingTime = parseInt(consumingTime);
            }
            
            // 使用日期选择器输入起始日期
            const today = new Date().toISOString().split('T')[0];
            let startDate = await showDatePicker('请选择计划的起始日期', today);
            if (!startDate) return;
            
            // 验证起始日期不能早于今天
            const todayObj = new Date(today);
            const startDateObj = new Date(startDate);
            if (startDateObj < todayObj) {
                alert('起始日期不能早于今天，请重新选择！');
                return;
            }
            
            // 显示星期选择器
            const selectedWeekdays = await showWeekdayPicker();
            if (!selectedWeekdays || selectedWeekdays.length === 0) return;
            
            // 将选中的星期几转换为getDay()格式并排序
            const targetWeekdays = selectedWeekdays.map(w => w === 7 ? 0 : w).sort((a, b) => a - b);
            
            // 计算第一周的第一个日期（从起始日期开始，找到第一个匹配的星期几）
            const firstWeekday = targetWeekdays[0];
            const startWeekday = startDateObj.getDay();
            const daysToFirstWeekday = (firstWeekday - startWeekday + 7) % 7;
            const firstDate = new Date(startDateObj);
            firstDate.setDate(firstDate.getDate() + daysToFirstWeekday);
            
            // 检查第一周是否能从第一个选中的星期几开始
            if (firstDate < startDateObj) {
                // 如果第一周的第一个日期早于起始日期，需要调整到下周一
                const nextMonday = new Date(startDateObj);
                const daysToNextMonday = (1 - startDateObj.getDay() + 7) % 7; // 1代表周一
                nextMonday.setDate(startDateObj.getDate() + daysToNextMonday);
                
                const adjustedStartDate = nextMonday.toISOString().split('T')[0];
                const adjustedStartDateObj = new Date(adjustedStartDate);
                
                if (!confirm(`第一周无法从第一个选中的星期几开始。\n任务起始日期将调整为：${adjustedStartDate}（下周一）\n是否继续？`)) {
                    return;
                }
                
                // 更新起始日期
                startDate = adjustedStartDate;
                startDateObj.setTime(adjustedStartDateObj.getTime());
                
                // 重新计算第一周的第一个日期
                const newStartWeekday = startDateObj.getDay();
                const newDaysToFirstWeekday = (firstWeekday - newStartWeekday + 7) % 7;
                firstDate.setTime(startDateObj.getTime());
                firstDate.setDate(startDateObj.getDate() + newDaysToFirstWeekday);
            }
            
            // 生成所有可用的日期列表
            const availableDates = [];
            
            // 生成足够多的日期来分配所有任务
            let weekCount = 0;
            
            while (availableDates.length < selectedTaskIds.length) {
                // 为当前周生成所有选中的星期几的日期
                targetWeekdays.forEach(weekday => {
                    const dateForWeekday = new Date(firstDate);
                    dateForWeekday.setDate(firstDate.getDate() + (weekCount * 7));
                    
                    // 调整到当前周的指定星期几
                    const currentWeekday = dateForWeekday.getDay();
                    const daysToAdd = (weekday - currentWeekday + 7) % 7;
                    dateForWeekday.setDate(dateForWeekday.getDate() + daysToAdd);
                    
                    availableDates.push(new Date(dateForWeekday));
                });
                
                weekCount++;
            }
            
            // 按时间顺序排序日期
            availableDates.sort((a, b) => a.getTime() - b.getTime());
            
            // 分配任务到日期
            selectedTaskIds.forEach((taskId, index) => {
                const subtask = project.subtasks.find(s => s.uniqueId === taskId);
                if (subtask && availableDates[index]) {
                    const dateToSet = availableDates[index];
                    subtask.completeTime = dateToSet.toISOString().split('T')[0] + 'T00:00:00.000Z';
                    
                    // 设置状态为计划中
                    subtask.status = 0;
                    
                    // 如果有统一用时，则更新
                    if (unifiedConsumingTime !== null) {
                        subtask.consumingTime = unifiedConsumingTime;
                    }
                }
            });
            
            // 保存更新
            projects[projectIndex] = project;
            saveProjects(projects);
            
            // 清空选中状态
            selectedSubtasks.clear();
            
            // 重置全选复选框状态
            resetSelectAllCheckbox();
            
            // 重新渲染列表
            renderProjectPanelSubtaskList(project);
            
            const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']; // 与选择器对应
            const selectedWeekdayNames = selectedWeekdays.map(w => weekdays[w - 1]).join('、');
            
            // 计算结束日期（使用最后一个分配的日期）
            const lastAssignedDate = availableDates[availableDates.length - 1];
            const endDateStr = lastAssignedDate.toISOString().split('T')[0];
            
            alert(`成功为 ${selectedTaskIds.length} 个任务制定每周计划！\n起始日期：${startDate}\n每周：${selectedWeekdayNames}\n结束日期：${endDateStr}`);
        }
        
        // 显示星期选择器
        function showWeekdayPicker() {
            return new Promise((resolve) => {
                // 创建模态框
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                `;
                
                // 创建对话框
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    min-width: 350px;
                    text-align: center;
                `;
                
                const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                const weekdayOptions = weekdays.map((day, index) => 
                    `<label style="display: block; margin: 8px 0; cursor: pointer;">
                        <input type="checkbox" name="weekday" value="${index + 1}" style="margin-right: 8px;">
                        ${day}
                    </label>`
                ).join('');
                
                dialog.innerHTML = `
                    <h3 style="margin: 0 0 15px 0; color: #333;">请选择每周的哪些天（可多选）</h3>
                    <div style="margin-bottom: 15px;">
                        ${weekdayOptions}
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="confirmWeekdayBtn" style="
                            padding: 8px 16px;
                            background: #50b767;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">确定</button>
                        <button id="cancelWeekdayBtn" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            color: #333;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">取消</button>
                    </div>
                `;
                
                modal.appendChild(dialog);
                document.body.appendChild(modal);
                
                // 绑定事件
                const confirmBtn = dialog.querySelector('#confirmWeekdayBtn');
                const cancelBtn = dialog.querySelector('#cancelWeekdayBtn');
                
                const handleConfirm = () => {
                    const selectedCheckboxes = dialog.querySelectorAll('input[name="weekday"]:checked');
                    if (selectedCheckboxes.length === 0) {
                        alert('请至少选择一个星期几');
                        return;
                    }
                    const selectedWeekdays = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
                    document.body.removeChild(modal);
                    resolve(selectedWeekdays);
                };
                
                const handleCancel = () => {
                    document.body.removeChild(modal);
                    resolve(null);
                };
                
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
                
                // 点击模态框背景取消
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        handleCancel();
                    }
                });
            });
        }
        
        // 统一名称
        function batchEditUnifyName() {
            const baseName = prompt('请输入基础名称：');
            if (!baseName) return;
            
            batchUpdateSubtasks('unifyName', baseName);
        }
        
        // 统一日期
        async function batchEditUnifyDate() {
            const today = new Date().toISOString().split('T')[0];
            const date = await showDatePicker('请选择日期', today);
            if (!date) return;
            
            batchUpdateSubtasks('unifyDate', date);
        }
        
        // 批量更新任务
        function batchUpdateSubtasks(action, value) {
            if (selectedSubtasks.size === 0) return;
            
            const projects = getProjects();
            const projectIndex = projects.findIndex(p => p.name === currentSelectedProjectPanel.name);
            
            if (projectIndex === -1) return;
            
            const project = projects[projectIndex];
            let updateCount = 0;
            
            project.subtasks.forEach((subtask, index) => {
                if (selectedSubtasks.has(subtask.uniqueId)) {
                    switch (action) {
                        case 'consumingTime':
                            subtask.consumingTime = value;
                            break;
                        case 'startTime':
                            subtask.startTime = value;
                            break;
                        case 'complete':
                            subtask.status = 1;
                            subtask.completeTime = value + 'T00:00:00.000Z';
                            break;
                        case 'noPlan':
                            subtask.status = -1;
                            break;
                        case 'unifyName':
                            const taskIndex = Array.from(selectedSubtasks).indexOf(subtask.uniqueId) + 1;
                            subtask.name = `${value}-${taskIndex}`;
                            break;
                        case 'unifyDate':
                            subtask.completeTime = value + 'T00:00:00.000Z';
                            break;
                    }
                    updateCount++;
                }
            });
            
            // 保存更新
            projects[projectIndex] = project;
            saveProjects(projects);
            
            // 清空选中状态
            selectedSubtasks.clear();
            
            // 重置全选复选框状态
            resetSelectAllCheckbox();
            
            // 重新渲染列表
            renderProjectPanelSubtaskList(project);
            
            alert(`成功更新 ${updateCount} 个任务`);
        }
        
        // 初始化批量操作事件监听器
        function initBatchOperations() {
            // 全选复选框
            const selectAllCheckbox = document.getElementById('selectAllSubtasks');
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', toggleSelectAllSubtasks);
            }
            
            // 批量删除按钮
            const batchDeleteBtn = document.getElementById('batchDeleteSubtasks');
            if (batchDeleteBtn) {
                batchDeleteBtn.addEventListener('click', batchDeleteSubtasks);
            }
            
            // 批量编辑按钮
            const batchEditBtn = document.getElementById('batchEditSubtasks');
            if (batchEditBtn) {
                batchEditBtn.addEventListener('click', toggleBatchEditMenu);
            }
            
            // 批量编辑菜单项
            const batchEditMenu = document.getElementById('batchEditMenu');
            if (batchEditMenu) {
                batchEditMenu.addEventListener('click', (e) => {
                    const menuItem = e.target.closest('.batch-menu-item');
                    if (!menuItem) return;
                    
                    const action = menuItem.dataset.action;
                    batchEditMenu.classList.remove('show');
                    
                    switch (action) {
                        case 'consumingTime':
                            batchEditConsumingTime();
                            break;
                        case 'schedule':
                            batchEditSchedule();
                            break;
                        case 'startTime':
                            batchEditStartTime();
                            break;
                        case 'complete':
                            batchEditComplete();
                            break;
                        case 'dailyPlan':
                            batchEditDailyPlan();
                            break;
                        case 'weeklyPlan':
                            batchEditWeeklyPlan();
                            break;
                        case 'noPlan':
                            batchEditNoPlan();
                            break;
                        case 'unifyName':
                            batchEditUnifyName();
                            break;
                        case 'unifyDate':
                            batchEditUnifyDate();
                            break;
                    }
                });
            }
            
            // 点击其他地方关闭菜单
            document.addEventListener('click', (e) => {
                const batchEditMenu = document.getElementById('batchEditMenu');
                const batchEditBtn = document.getElementById('batchEditSubtasks');
                
                if (batchEditMenu && !batchEditMenu.contains(e.target) && !batchEditBtn.contains(e.target)) {
                    batchEditMenu.classList.remove('show');
                }
            });
        }
        
        // 显示日期选择器
        function showDatePicker(title, defaultValue) {
            return new Promise((resolve) => {
                // 创建模态框
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                `;
                
                // 创建对话框
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    min-width: 300px;
                    text-align: center;
                `;
                
                dialog.innerHTML = `
                    <h3 style="margin: 0 0 15px 0; color: #333;">${title}</h3>
                    <input type="date" id="datePickerInput" value="${defaultValue}" style="
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 14px;
                        margin-bottom: 15px;
                        width: 200px;
                    ">
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="confirmDateBtn" style="
                            padding: 8px 16px;
                            background: #50b767;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">确定</button>
                        <button id="cancelDateBtn" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            color: #333;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">取消</button>
                    </div>
                `;
                
                modal.appendChild(dialog);
                document.body.appendChild(modal);
                
                // 聚焦到日期输入框
                const dateInput = dialog.querySelector('#datePickerInput');
                dateInput.focus();
                
                // 绑定事件
                const confirmBtn = dialog.querySelector('#confirmDateBtn');
                const cancelBtn = dialog.querySelector('#cancelDateBtn');
                
                const handleConfirm = () => {
                    const selectedDate = dateInput.value;
                    document.body.removeChild(modal);
                    resolve(selectedDate);
                };
                
                const handleCancel = () => {
                    document.body.removeChild(modal);
                    resolve(null);
                };
                
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
                
                // 回车键确认
                dateInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleConfirm();
                    }
                });
                
                // 点击模态框背景取消
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        handleCancel();
                    }
                });
            });
        }
        
        // 更新统计卡片数据
        function updateStatsCards() {
            const projects = getProjects();
            if (!projects || !Array.isArray(projects)) {
                return;
            }

            const today = new Date();
            const todayStr = formatDate(today);
            const weekStart = getWeekStart(today);
            const weekEnd = getWeekEnd(today);
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            let todayCompleted = 0, todayTotal = 0, todayTime = 0;
            let weekCompleted = 0, weekTotal = 0, weekTime = 0;
            let monthCompleted = 0, monthTotal = 0, monthTime = 0;
            let yearCompleted = 0, yearTotal = 0, yearTime = 0;

            projects.forEach(project => {
                if (project && project.subtasks && Array.isArray(project.subtasks)) {
                    project.subtasks.forEach(subtask => {
                        if (!subtask || !subtask.name) return;

                        const subtaskDate = subtask.completeTime ? new Date(subtask.completeTime) : null;
                        const consumingTime = subtask.consumingTime || 0;

                        // 只统计status为0（计划中）和1（已完成）的任务
                        if (subtask.status === 0 || subtask.status === 1) {
                            // 年统计
                            yearTotal++;
                            if (subtask.status === 1) {
                                yearCompleted++;
                                yearTime += consumingTime;
                            }

                            // 今日统计
                            if (subtaskDate && formatDate(subtaskDate) === todayStr) {
                                todayTotal++;
                                if (subtask.status === 1) {
                                    todayCompleted++;
                                    todayTime += consumingTime;
                                }
                            }

                            // 本周统计
                            if (subtaskDate && subtaskDate >= weekStart && subtaskDate <= weekEnd) {
                                weekTotal++;
                                if (subtask.status === 1) {
                                    weekCompleted++;
                                    weekTime += consumingTime;
                                }
                            }

                            // 本月统计
                            if (subtaskDate && subtaskDate >= monthStart && subtaskDate <= monthEnd) {
                                monthTotal++;
                                if (subtask.status === 1) {
                                    monthCompleted++;
                                    monthTime += consumingTime;
                                }
                            }
                        }
                    });
                }
            });

            // 更新DOM
            document.getElementById('todayCompleted').textContent = todayCompleted;
            document.getElementById('todayTotal').textContent = todayTotal;
            document.getElementById('todayTime').textContent = formatTime(todayTime);

            document.getElementById('weekCompleted').textContent = weekCompleted;
            document.getElementById('weekTotal').textContent = weekTotal;
            document.getElementById('weekTime').textContent = formatTime(weekTime);

            document.getElementById('monthCompleted').textContent = monthCompleted;
            document.getElementById('monthTotal').textContent = monthTotal;
            document.getElementById('monthTime').textContent = formatTime(monthTime);

            document.getElementById('yearCompleted').textContent = yearCompleted;
            document.getElementById('yearTotal').textContent = yearTotal;
            document.getElementById('yearTime').textContent = formatTime(yearTime);
            
            // 更新分类用时统计
            updateCategoryTimeStats();
            
            // 更新项目用时排名
            updateProjectTimeRanking();
            
            // 更新任务用时统计
            updateTaskTimeStats();
            
            // 绑定分类用时统计时间筛选事件
            bindCategoryTimeFilter();
        }

        // 绑定分类用时统计时间筛选事件
        function bindCategoryTimeFilter() {
            const timeFilter = document.getElementById('categoryTimeFilter');
            if (timeFilter) {
                timeFilter.addEventListener('change', function() {
                    categoryTimeFilter = this.value;
                    updateCategoryTimeStats();
                });
            }
        }

        // 格式化时间显示
        function formatTime(minutes) {
            if (minutes < 60) {
                return `${minutes}分钟`;
            } else {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
            }
        }

        // 获取周开始日期
        function getWeekStart(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(d.setDate(diff));
        }

        // 获取周结束日期
        function getWeekEnd(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? 0 : 7);
            return new Date(d.setDate(diff));
        }

        // 项目用时排名相关变量
        let projectTimeRankingData = [];
        let currentDisplayCount = 10;
        
        // 分类用时统计时间筛选变量
        let categoryTimeFilter = 'all';

        // 更新分类用时统计
        function updateCategoryTimeStats() {
            const projects = getProjects();
            if (!projects || !Array.isArray(projects)) {
                return;
            }

            // 获取当前时间筛选条件
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1; // 1-12

            // 统计各分类的用时
            const categoryTimes = {};
            
            projects.forEach(project => {
                if (project && project.subtasks && Array.isArray(project.subtasks)) {
                    const category = project.category || '未分类';
                    
                    if (!categoryTimes[category]) {
                        categoryTimes[category] = 0;
                    }
                    
                    project.subtasks.forEach(subtask => {
                        if (subtask && subtask.status === 1 && subtask.consumingTime && subtask.completeTime) {
                            // 根据时间筛选条件过滤任务
                            let shouldInclude = false;
                            
                            switch (categoryTimeFilter) {
                                case 'all':
                                    shouldInclude = true;
                                    break;
                                case 'thisYear':
                                    const taskYear1 = new Date(subtask.completeTime).getFullYear();
                                    shouldInclude = taskYear1 === currentYear;
                                    break;
                                case 'thisMonth':
                                    const taskDate = new Date(subtask.completeTime);
                                    const taskYear2 = taskDate.getFullYear();
                                    const taskMonth1 = taskDate.getMonth() + 1;
                                    shouldInclude = taskYear2 === currentYear && taskMonth1 === currentMonth;
                                    break;
                                default:
                                    // 具体月份筛选
                                    const taskMonth2 = new Date(subtask.completeTime).getMonth() + 1;
                                    const filterMonth = parseInt(categoryTimeFilter);
                                    shouldInclude = taskMonth2 === filterMonth;
                                    break;
                            }
                            
                            if (shouldInclude) {
                                categoryTimes[category] += subtask.consumingTime;
                            }
                        }
                    });
                }
            });

            // 按用时排序（从高到低）
            const sortedCategories = Object.entries(categoryTimes)
                .filter(([category, time]) => time > 0) // 只显示有用时的分类
                .sort(([, timeA], [, timeB]) => timeB - timeA);

            // 生成HTML
            const categoryTimeBars = document.getElementById('categoryTimeBars');
            if (!categoryTimeBars) return;

            if (sortedCategories.length === 0) {
                categoryTimeBars.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无已完成任务的用时数据</div>';
                return;
            }

            // 计算最大用时用于百分比计算
            const maxTime = sortedCategories[0][1];

            // 预定义的颜色数组
            const colors = [
                '#50b767', '#ff6b6b', '#4ecdc4', '#45b7d1', 
                '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff',
                '#5f27cd', '#00d2d3', '#ff9f43', '#10ac84'
            ];

            categoryTimeBars.innerHTML = sortedCategories.map(([category, time], index) => {
                const percentage = maxTime > 0 ? (time / maxTime) * 100 : 0;
                const color = colors[index % colors.length];
                
                return `
                    <div class="category-time-bar">
                        <div class="category-time-label">${category}</div>
                        <div class="category-time-progress">
                            <div class="category-time-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                        </div>
                        <div class="category-time-value">${formatTime(time)}</div>
                    </div>
                `;
            }).join('');
        }

        // 更新项目用时排名
        function updateProjectTimeRanking() {
            const projects = getProjects();
            if (!projects || !Array.isArray(projects)) {
                return;
            }

            // 计算各项目的已完成任务用时
            const projectTimes = [];
            
            projects.forEach(project => {
                if (project && project.subtasks && Array.isArray(project.subtasks)) {
                    let totalTime = 0;
                    let completedTasks = 0;
                    
                    project.subtasks.forEach(subtask => {
                        if (subtask && subtask.status === 1 && subtask.consumingTime) {
                            totalTime += subtask.consumingTime;
                            completedTasks++;
                        }
                    });
                    
                    if (totalTime > 0) {
                        projectTimes.push({
                            name: project.name,
                            time: totalTime,
                            completedTasks: completedTasks
                        });
                    }
                }
            });

            // 按用时从高到低排序
            projectTimes.sort((a, b) => b.time - a.time);
            
            // 保存数据
            projectTimeRankingData = projectTimes;
            currentDisplayCount = 10;
            
            // 渲染列表
            renderProjectTimeRanking();
        }

        // 渲染项目用时排名
        function renderProjectTimeRanking() {
            const rankingList = document.getElementById('projectTimeRankingList');
            const loadMoreContainer = document.getElementById('loadMoreContainer');
            
            if (!rankingList) return;

            if (projectTimeRankingData.length === 0) {
                rankingList.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">暂无已完成任务的用时数据</div>';
                loadMoreContainer.style.display = 'none';
                return;
            }

            // 计算最大用时用于百分比
            const maxTime = projectTimeRankingData[0].time;
            
            // 获取要显示的项目
            const displayData = projectTimeRankingData.slice(0, currentDisplayCount);
            
            // 生成HTML
            rankingList.innerHTML = displayData.map((project, index) => {
                const percentage = maxTime > 0 ? (project.time / maxTime) * 100 : 0;
                
                return `
                    <div class="ranking-item">
                        <div class="ranking-item-name">${project.name}</div>
                        <div class="ranking-item-time">${formatTime(project.time)}</div>
                        <div class="ranking-item-progress">
                            <div class="ranking-progress-bar">
                                <div class="ranking-progress-fill" style="width: ${percentage}%;"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // 显示/隐藏加载更多按钮
            if (currentDisplayCount < projectTimeRankingData.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }

        // 加载更多项目
        function loadMoreProjects() {
            currentDisplayCount += 10;
            renderProjectTimeRanking();
        }

        // 任务用时统计相关变量
        let currentTaskView = 'daily';

        // 更新任务用时统计
        function updateTaskTimeStats() {
            const projects = getProjects();
            if (!projects || !Array.isArray(projects)) {
                return;
            }

            if (currentTaskView === 'daily') {
                updateDailyTaskStats(projects);
            } else {
                updateMonthlyTaskStats(projects);
            }
        }

        // 更新日任务统计
        function updateDailyTaskStats(projects) {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            
            const dailyStats = {};
            
            // 初始化当月所有日期的统计数据
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                dailyStats[dateStr] = {
                    completedCount: 0,
                    totalTime: 0
                };
            }
            
            // 统计各项目的已完成任务
            projects.forEach(project => {
                if (project && project.subtasks && Array.isArray(project.subtasks)) {
                    project.subtasks.forEach(subtask => {
                        if (subtask && subtask.status === 1 && subtask.completeTime) {
                            const taskDate = new Date(subtask.completeTime);
                            const taskMonth = taskDate.getMonth();
                            const taskYear = taskDate.getFullYear();
                            
                            // 只统计当月的任务
                            if (taskMonth === currentMonth && taskYear === currentYear) {
                                const dateStr = formatDate(taskDate);
                                if (dailyStats[dateStr]) {
                                    dailyStats[dateStr].completedCount++;
                                    dailyStats[dateStr].totalTime += subtask.consumingTime || 0;
                                }
                            }
                        }
                    });
                }
            });
            
            // 应用排序
            const sortedDailyStats = sortTaskData(dailyStats, currentSortField, currentSortDirection);
            
            // 渲染日任务列表
            renderDailyTaskList(sortedDailyStats);
        }

        // 更新月任务统计
        function updateMonthlyTaskStats(projects) {
            const monthlyStats = {};
            
            // 初始化12个月的统计数据
            for (let month = 0; month < 12; month++) {
                const monthKey = `${month}`;
                monthlyStats[monthKey] = {
                    monthName: `${month + 1}月`,
                    completedCount: 0,
                    totalTime: 0
                };
            }
            
            // 统计各项目的已完成任务
            projects.forEach(project => {
                if (project && project.subtasks && Array.isArray(project.subtasks)) {
                    project.subtasks.forEach(subtask => {
                        if (subtask && subtask.status === 1 && subtask.completeTime) {
                            const taskDate = new Date(subtask.completeTime);
                            const taskMonth = taskDate.getMonth();
                            const monthKey = `${taskMonth}`;
                            
                            if (monthlyStats[monthKey]) {
                                monthlyStats[monthKey].completedCount++;
                                monthlyStats[monthKey].totalTime += subtask.consumingTime || 0;
                            }
                        }
                    });
                }
            });
            
            // 应用排序
            const sortedMonthlyStats = sortTaskData(monthlyStats, currentSortField, currentSortDirection);
            
            // 渲染月任务列表
            renderMonthlyTaskList(sortedMonthlyStats);
        }

        // 渲染日任务列表
        function renderDailyTaskList(dailyStats) {
            const dailyTaskList = document.getElementById('dailyTaskList');
            if (!dailyTaskList) return;
            
            const entries = Object.entries(dailyStats);
            if (entries.length === 0) {
                dailyTaskList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无数据</div>';
                return;
            }
            
            // 计算最大用时用于百分比
            const maxTime = Math.max(...entries.map(([, stats]) => stats.totalTime));
            
            dailyTaskList.innerHTML = entries.map(([dateStr, stats]) => {
                const date = new Date(dateStr);
                const dayStr = `${date.getMonth() + 1}/${date.getDate()}`;
                const percentage = maxTime > 0 ? (stats.totalTime / maxTime) * 100 : 0;
                
                return `
                    <div class="task-time-item">
                        <div class="task-time-item-date">${dayStr}</div>
                        <div class="task-time-item-count">${stats.completedCount}</div>
                        <div class="task-time-item-duration">${formatTime(stats.totalTime)}</div>
                        <div class="task-time-item-progress">
                            <div class="task-time-progress-bar">
                                <div class="task-time-progress-fill" style="width: ${percentage}%;"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 渲染月任务列表
        function renderMonthlyTaskList(monthlyStats) {
            const monthlyTaskList = document.getElementById('monthlyTaskList');
            if (!monthlyTaskList) return;
            
            const entries = Object.entries(monthlyStats);
            if (entries.length === 0) {
                monthlyTaskList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无数据</div>';
                return;
            }
            
            // 计算最大用时用于百分比
            const maxTime = Math.max(...entries.map(([, stats]) => stats.totalTime));
            
            monthlyTaskList.innerHTML = entries.map(([monthKey, stats]) => {
                const percentage = maxTime > 0 ? (stats.totalTime / maxTime) * 100 : 0;
                
                return `
                    <div class="task-time-item">
                        <div class="task-time-item-month">${stats.monthName}</div>
                        <div class="task-time-item-count">${stats.completedCount}</div>
                        <div class="task-time-item-duration">${formatTime(stats.totalTime)}</div>
                        <div class="task-time-item-progress">
                            <div class="task-time-progress-bar">
                                <div class="task-time-progress-fill" style="width: ${percentage}%;"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 切换视图
        function switchTaskView(view) {
            currentTaskView = view;
            
            // 更新按钮状态
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-view="${view}"]`).classList.add('active');
            
            // 切换视图显示
            const dailyView = document.getElementById('dailyTaskView');
            const monthlyView = document.getElementById('monthlyTaskView');
            
            if (view === 'daily') {
                dailyView.style.display = 'block';
                monthlyView.style.display = 'none';
            } else {
                dailyView.style.display = 'none';
                monthlyView.style.display = 'block';
            }
            
            // 更新数据
            updateTaskTimeStats();
        }

        // 排序相关变量
        let currentSortField = '';
        let currentSortDirection = 'asc';

        // 排序功能
        function initSorting() {
            // 绑定排序事件
            document.querySelectorAll('.sortable').forEach(element => {
                element.addEventListener('click', function() {
                    const sortField = this.getAttribute('data-sort');
                    handleSort(sortField);
                });
            });
        }

        // 处理排序
        function handleSort(sortField) {
            // 如果点击的是当前排序字段，切换排序方向
            if (currentSortField === sortField) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                // 如果是新字段，设置为升序
                currentSortField = sortField;
                currentSortDirection = 'asc';
            }

            // 更新排序图标
            updateSortIcons(sortField, currentSortDirection);

            // 重新渲染数据
            updateTaskTimeStats();
        }

        // 更新排序图标
        function updateSortIcons(activeField, direction) {
            // 清除所有排序图标
            document.querySelectorAll('.sortable').forEach(element => {
                element.classList.remove('sort-asc', 'sort-desc');
            });

            // 设置当前排序字段的图标
            const activeElement = document.querySelector(`[data-sort="${activeField}"]`);
            if (activeElement) {
                activeElement.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }

        // 排序数据
        function sortTaskData(data, sortField, direction) {
            const entries = Object.entries(data);
            
            entries.sort((a, b) => {
                let aValue, bValue;
                
                switch (sortField) {
                    case 'date':
                    case 'month':
                        // 日期排序
                        aValue = new Date(a[0]);
                        bValue = new Date(b[0]);
                        break;
                    case 'count':
                        // 已完成数量排序
                        aValue = a[1].completedCount;
                        bValue = b[1].completedCount;
                        break;
                    case 'duration':
                        // 用时排序
                        aValue = a[1].totalTime;
                        bValue = b[1].totalTime;
                        break;
                    default:
                        return 0;
                }
                
                if (direction === 'asc') {
                    return aValue > bValue ? 1 : -1;
                } else {
                    return aValue < bValue ? 1 : -1;
                }
            });
            
            return Object.fromEntries(entries);
        }

        // 页面加载时初始化批量操作和统计卡片
        document.addEventListener('DOMContentLoaded', function() {
            initBatchOperations();
            updateStatsCards();
            initSorting(); // 初始化排序功能
            
            // 绑定加载更多按钮事件
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', loadMoreProjects);
            }
            
            // 绑定任务用时统计切换按钮事件
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const view = this.getAttribute('data-view');
                    switchTaskView(view);
                });
            });
        });