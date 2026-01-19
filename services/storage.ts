import { DailyCheckout, Task, Interaction, User, WeeklyGoal, UserRole } from '../types';
import { INITIAL_USERS, INITIAL_CHECKOUTS, INITIAL_TASKS, INITIAL_INTERACTIONS, INITIAL_WEEKLY_GOALS } from '../constants';

// ==========================================
// 🚀 DEPLOYMENT INSTRUCTIONS
// ==========================================
/*
To make this app live with real shared data:

1. Create a new Google Sheet.
2. Create 5 tabs named EXACTLY: "Users", "Checkouts", "Tasks", "WeeklyGoals", "Interactions".
   - Add Header Rows (Row 1) for each sheet matching the interface keys in types.ts.
*/

const API_URL = "https://script.google.com/macros/s/AKfycbwlMoaW5noKmqa9rmDLN_hbf6wP0Ho027WXLenwRe3ytg-8S3DUzooKx52u2SHI1m86/exec";

export interface AppData {
  users: User[];
  checkouts: DailyCheckout[];
  tasks: Task[];
  weeklyGoals: WeeklyGoal[];
  interactions: Interaction[];
}

// ==========================================
// 📅 ROBUST DATE PARSING ENGINE
// ==========================================

const toLocalISOString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateWithNoonPivot = (d: Date): string => {
  const adjusted = new Date(d.getTime());
  adjusted.setTime(adjusted.getTime() + 43200000); // +12 Hours
  
  const y = adjusted.getUTCFullYear();
  const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const dStr = String(adjusted.getUTCDate()).padStart(2, '0');
  
  return `${y}-${m}-${dStr}`;
};

export const normalizeDate = (input: any): string => {
  if (!input) return '';

  if (input instanceof Date) {
    return formatDateWithNoonPivot(input);
  }

  const str = String(input).trim();

  if (str.includes('T') && str.length > 10) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return formatDateWithNoonPivot(parsed);
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const wordMonthMatch = str.match(/^(\d{1,2})[\s\-\/]+([a-zA-Z]{3,})[\s\-\/]+(\d{4})/);
  if (wordMonthMatch) {
    const day = parseInt(wordMonthMatch[1], 10);
    const monthStr = wordMonthMatch[2].toLowerCase().substring(0, 3);
    const year = parseInt(wordMonthMatch[3], 10);

    const months: {[key: string]: number} = {
      jan:0, feb:1, mar:2, apr:3, may:4, jun:5, 
      jul:6, aug:7, sep:8, oct:9, nov:10, dec:11
    };
    
    const month = months[monthStr];
    if (month !== undefined) {
      const d = new Date(year, month, day, 12, 0, 0);
      return toLocalISOString(d);
    }
  }

  if (str.startsWith('Date(')) {
    const timestamp = parseInt(str.substring(5, str.length - 1));
    if (!isNaN(timestamp)) {
      return formatDateWithNoonPivot(new Date(timestamp));
    }
  }

  const dmy = str.match(/^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2,4})/);
  if (dmy) {
    const p1 = parseInt(dmy[1], 10);
    const p2 = parseInt(dmy[2], 10);
    let y = parseInt(dmy[3], 10);

    if (y < 100) y += 2000;

    let day, month;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      day = p2;
      month = p1;
    } else {
      day = p1;
      month = p2;
    }
    
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatDateWithNoonPivot(parsed);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.substring(0, 10);
  }

  return '';
};

export const snapToMonday = (dateStr: string): string => {
  const cleanStr = normalizeDate(dateStr);
  if (!cleanStr) return '';
  
  const parts = cleanStr.split('-').map(Number);
  if (parts.length !== 3) return cleanStr;
  
  const [y, m, d] = parts;
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = utcDate.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  
  const newY = utcDate.getUTCFullYear();
  const newM = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const newD = String(utcDate.getUTCDate()).padStart(2, '0');
  
  return `${newY}-${newM}-${newD}`;
};

// ==========================================
// 🛠️ DATA FETCHING
// ==========================================

const safeStr = (s: any): string => s ? String(s).trim() : '';
const safeNum = (n: any): number => {
  const parsed = Number(n);
  return isNaN(parsed) ? 0 : parsed;
};

const dedupeById = <T>(items: T[], idKey: keyof T): T[] => {
  const map = new Map<any, T>();
  items.forEach(item => {
    // @ts-ignore
    const id = item[idKey];
    if (id) {
        map.set(id, item);
    } else {
        const randomId = Math.random().toString(36).substr(2, 9);
        // @ts-ignore
        item[idKey] = randomId;
        map.set(randomId, item);
    }
  });
  return Array.from(map.values());
};

export const fetchAppData = async (): Promise<AppData> => {
  if (!API_URL) {
    console.warn("Using Mock Data");
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      users: INITIAL_USERS,
      checkouts: INITIAL_CHECKOUTS,
      tasks: INITIAL_TASKS,
      weeklyGoals: INITIAL_WEEKLY_GOALS,
      interactions: INITIAL_INTERACTIONS
    };
  }

  try {
    const response = await fetch(`${API_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();

    const rawTasks = (data.tasks || []).map((t: any) => ({
      ...t,
      taskId: safeStr(t.taskId || t.TaskId),
      userId: safeStr(t.userId || t.UserId),
      taskDescription: t.taskDescription || t.TaskDescription || 'Untitled Task',
      estimatedPomodoros: safeNum(t.estimatedPomodoros || t.EstimatedPomodoros),
      actualPomodoros: safeNum(t.actualPomodoros || t.ActualPomodoros),
      status: safeStr(t.status || t.Status || 'To Do'),
      weekOfDate: snapToMonday(t.weekOfDate || t.WeekOfDate),
      scheduledDate: normalizeDate(t.scheduledDate || t.ScheduledDate),
    }));

    const rawGoals = (data.weeklyGoals || []).map((g: any, index: number) => {
        const gid = safeStr(g.goalId || g.GoalId);
        
        // 1. Get raw values for legacy field
        const rawWeekDate = g.weekOfDate || g.WeekOfDate || g['Week Of Date'] || g['Week of Date'];
        
        // 2. Intelligent Fetch for Start/End Date
        // Fallback: If 'startDate' column is empty, use 'weekOfDate' column value.
        // This ensures that even if the new columns fail to save, we get the date from the legacy column.
        const sDateRaw = g.startDate || g.StartDate || g.startdate || rawWeekDate; 
        
        // Fallback: If 'endDate' is empty, default to 'startDate'
        const eDateRaw = g.endDate || g.EndDate || g.enddate || sDateRaw;

        const sDate = normalizeDate(sDateRaw);
        const eDate = normalizeDate(eDateRaw);
        
        return {
            ...g,
            goalId: gid || `gen-g-${index}-${Date.now()}`,
            userId: safeStr(g.userId || g.UserId),
            title: g.title || g.Title || 'Untitled Goal',
            definitionOfDone: g.definitionOfDone || g.DefinitionOfDone || '',
            priority: g.priority || g.Priority || 'Medium',
            dependency: g.dependency || g.Dependency || '',
            status: safeStr(g.status || g.Status || 'Not Started'),
            retroText: g.retroText || g.RetroText || '',
            
            // Legacy support: We still try to populate this, but we use the start date we found
            weekOfDate: snapToMonday(sDate || rawWeekDate), 
            
            // New Fields: These now robustly fallback to the WeekOfDate column if needed
            startDate: sDate,
            endDate: eDate
        };
    });

    const rawCheckouts = (data.checkouts || []).map((c: any) => ({
      ...c,
      checkoutId: safeStr(c.checkoutId || c.CheckoutId),
      userId: safeStr(c.userId || c.UserId),
      vibeScore: safeNum(c.vibeScore || c.VibeScore),
      winText: c.winText || c.WinText || '',
      blockerText: c.blockerText || c.BlockerText || '',
      tomorrowGoalText: c.tomorrowGoalText || c.TomorrowGoalText || '',
      date: normalizeDate(c.date || c.Date),
      timestamp: safeNum(c.timestamp || c.Timestamp),
    }));

    const rawInteractions = (data.interactions || []).map((i: any) => ({
        ...i,
        interactionId: safeStr(i.interactionId || i.InteractionId),
        checkoutId: safeStr(i.checkoutId || i.CheckoutId),
        commenterId: safeStr(i.commenterId || i.CommenterId),
        commentText: i.commentText || i.CommentText,
        type: i.type || i.Type,
        timestamp: safeNum(i.timestamp || i.Timestamp),
    }));

    const rawUsers: User[] = (data.users || []).map((u: any) => ({
        userId: safeStr(u.userId || u.UserId),
        name: u.name || u.Name,
        role: (u.role || u.Role) as UserRole,
        avatar: u.avatar || u.Avatar
    }));

    return {
      users: rawUsers.length > 0 ? dedupeById(rawUsers, 'userId') : INITIAL_USERS,
      checkouts: dedupeById(rawCheckouts, 'checkoutId'),
      tasks: dedupeById(rawTasks, 'taskId'),
      weeklyGoals: dedupeById(rawGoals, 'goalId'),
      interactions: dedupeById(rawInteractions, 'interactionId')
    };

  } catch (error) {
    console.error("Failed to fetch data:", error);
    return { users: INITIAL_USERS, checkouts: [], tasks: [], weeklyGoals: [], interactions: [] };
  }
};

export const syncItem = async (type: string, payload: any) => {
  if (!API_URL) return;
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    });
  } catch (error) {
    console.error("Sync failed:", error);
  }
};