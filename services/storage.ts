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

const API_URL = "https://script.google.com/macros/s/AKfycbwlMoaW5noKmqa9rmDLN_hbf6wP0Ho027WXLenwRe3ytg-8S3DUzooKx52u2SHI1m86/exec"; // 🔴 PASTE YOUR GOOGLE SCRIPT URL HERE

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

/**
 * normalizeDate
 * 
 * Purpose: Extracts the "Business Date" (YYYY-MM-DD) from a potentially timezone-shifted source.
 * 
 * The Problem: Google Sheets stores dates as "Midnight Local Time". When exported to JSON,
 * they convert to UTC. 
 * - In Europe (UTC+1), Midnight becomes 23:00 Previous Day.
 * - In NY (UTC-5), Midnight becomes 05:00 Current Day.
 * 
 * The Fix ("Noon Pivot"): We add 12 hours to the timestamp before extracting the date.
 * - 23:00 Prev Day + 12h = 11:00 Current Day.
 * - 05:00 Current Day + 12h = 17:00 Current Day.
 * 
 * This safely lands us in the middle of the correct calendar day for any timezone 
 * between UTC-12 and UTC+12.
 */
export const normalizeDate = (input: any): string => {
  if (!input) return '';

  // 1. Handle Date objects
  if (input instanceof Date) {
    return formatDateWithNoonPivot(input);
  }

  const str = String(input).trim();

  // 2. Optimization: If it's already YYYY-MM-DD, trust it.
  // This handles local creation or text-stored dates.
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 3. Handle ISO Strings or Google's "Date(123...)" format
  // We try to parse it as a Date object.
  let date: Date | null = null;

  // Handle Google Script's specific "Date(milliseconds)" format
  if (str.startsWith('Date(')) {
    const timestamp = parseInt(str.substring(5, str.length - 1));
    if (!isNaN(timestamp)) {
      date = new Date(timestamp);
    }
  } else {
    // Standard Parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (date) {
    return formatDateWithNoonPivot(date);
  }

  // 4. Fallback: DD/MM/YYYY or DD-MM-YYYY (Common in Sheets)
  const dmy = str.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})/);
  if (dmy) {
    const p1 = parseInt(dmy[1], 10);
    const p2 = parseInt(dmy[2], 10);
    const y = dmy[3];
    // Heuristic: If p1 > 12, it must be Day. If p2 > 12, it must be Day.
    // Defaulting to International DD/MM/YYYY if ambiguous.
    const day = (p1 > 12 || (p2 <= 12 && p1 <= 31)) ? p1 : p2;
    const month = (p1 > 12) ? p2 : p1;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // 5. Last Resort: return first 10 chars (e.g. "2023-10-25 junk")
  return str.substring(0, 10);
};

const formatDateWithNoonPivot = (d: Date): string => {
  // Clone to avoid mutating original
  const adjusted = new Date(d.getTime());
  
  // Pivot: Add 12 hours (43,200,000 ms)
  // This pushes "Late Prev Day" and "Early Current Day" into "Middle Current Day"
  adjusted.setTime(adjusted.getTime() + 43200000);
  
  const y = adjusted.getUTCFullYear();
  const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const dStr = String(adjusted.getUTCDate()).padStart(2, '0');
  
  return `${y}-${m}-${dStr}`;
};

/**
 * snapToMonday
 * Ensures a date string is backed up to the preceding Monday.
 */
export const snapToMonday = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const cleanStr = normalizeDate(dateStr);
  const parts = cleanStr.split('-').map(Number);
  if (parts.length < 3) return cleanStr;
  
  const [y, m, d] = parts;
  // Create date in Local time to interpret "Day of Week" correctly
  const date = new Date(y, m - 1, d); 
  
  if (isNaN(date.getTime())) return cleanStr;
  
  const dayOfWeek = date.getDay(); // 0 (Sun) - 6 (Sat)
  const dist = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  
  date.setDate(dist);
  
  // Format back manually
  const newY = date.getFullYear();
  const newM = String(date.getMonth() + 1).padStart(2, '0');
  const newD = String(date.getDate()).padStart(2, '0');
  
  return `${newY}-${newM}-${newD}`;
};

// ==========================================
// 🛠️ DATA FETCHING & MAPPING
// ==========================================

const safeStr = (s: any): string => s ? String(s).trim() : '';
const safeNum = (n: any): number => {
  const parsed = Number(n);
  return isNaN(parsed) ? 0 : parsed;
};

// Deduplicate array by ID, keeping the LAST occurrence
const dedupeById = <T>(items: T[], idKey: keyof T): T[] => {
  const map = new Map<any, T>();
  items.forEach(item => {
    map.set(item[idKey], item);
  });
  return Array.from(map.values());
};

export const fetchAppData = async (): Promise<AppData> => {
  if (!API_URL) {
    console.warn("Using Mock Data (Configure API_URL in services/storage.ts)");
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

    // 1. Map Tasks
    const rawTasks = (data.tasks || []).map((t: any) => ({
      ...t,
      taskId: safeStr(t.taskId || t.TaskId),
      userId: safeStr(t.userId || t.UserId),
      taskDescription: t.taskDescription || t.TaskDescription || 'Untitled Task',
      estimatedPomodoros: safeNum(t.estimatedPomodoros || t.EstimatedPomodoros),
      actualPomodoros: safeNum(t.actualPomodoros || t.ActualPomodoros),
      status: safeStr(t.status || t.Status || 'To Do'),
      // Apply Date Normalization
      weekOfDate: snapToMonday(t.weekOfDate || t.WeekOfDate),
      scheduledDate: normalizeDate(t.scheduledDate || t.ScheduledDate),
    }));

    // 2. Map Weekly Goals
    const rawGoals = (data.weeklyGoals || []).map((g: any) => ({
      ...g,
      goalId: safeStr(g.goalId || g.GoalId),
      userId: safeStr(g.userId || g.UserId),
      title: g.title || g.Title || 'Untitled Goal',
      definitionOfDone: g.definitionOfDone || g.DefinitionOfDone || '',
      priority: g.priority || g.Priority || 'Medium',
      dependency: g.dependency || g.Dependency || '',
      status: safeStr(g.status || g.Status || 'Not Started'),
      retroText: g.retroText || g.RetroText || '',
      // Apply Date Normalization
      weekOfDate: snapToMonday(g.weekOfDate || g.WeekOfDate),
    }));

    // 3. Map Checkouts
    const rawCheckouts = (data.checkouts || []).map((c: any) => ({
      ...c,
      checkoutId: safeStr(c.checkoutId || c.CheckoutId),
      userId: safeStr(c.userId || c.UserId),
      vibeScore: safeNum(c.vibeScore || c.VibeScore),
      winText: c.winText || c.WinText || '',
      blockerText: c.blockerText || c.BlockerText || '',
      tomorrowGoalText: c.tomorrowGoalText || c.TomorrowGoalText || '',
      // Apply Date Normalization
      date: normalizeDate(c.date || c.Date),
      // Timestamps are numbers, keep them as is
      timestamp: safeNum(c.timestamp || c.Timestamp),
    }));

    // 4. Map Interactions
    const rawInteractions = (data.interactions || []).map((i: any) => ({
        ...i,
        interactionId: safeStr(i.interactionId || i.InteractionId),
        checkoutId: safeStr(i.checkoutId || i.CheckoutId),
        commenterId: safeStr(i.commenterId || i.CommenterId),
        commentText: i.commentText || i.CommentText,
        type: i.type || i.Type,
        timestamp: safeNum(i.timestamp || i.Timestamp),
    }));

    // 5. Map Users
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
    // Return empty structures on failure, not initial mock data, to avoid confusion
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
