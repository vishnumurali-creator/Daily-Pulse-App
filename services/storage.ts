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

// Robust Date Normalizer
// Fixes "Day -1" for European timezones without causing "Day +1" for American afternoons.
export const normalizeDate = (d: any): string => {
  if (!d) return '';
  
  // 1. Handle Date objects directly
  if (d instanceof Date) {
     return formatDateObject(d);
  }

  const s = String(d).trim();
  
  // 2. Strict YYYY-MM-DD (Exact match, no time)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // 3. ISO String Analysis
  if (s.includes('T') || s.includes(':')) {
      const date = new Date(s);
      if (!isNaN(date.getTime())) {
          return formatDateObject(date);
      }
  }

  // 4. Legacy/International Formats (DD/MM/YYYY)
  const dmyMatch = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})/);
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1], 10);
    let p2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];
    
    // Heuristic: swap if P1 looks like month (<=12) and P2 looks like day (>12)
    let day = p1;
    let month = p2;
    if (p1 <= 12 && p2 > 12) {
        month = p1;
        day = p2;
    } 
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return s.substring(0, 10);
};

// Helper: Formats a date object to YYYY-MM-DD
// Includes specific logic to fix the "Day -1" bug caused by Timezone shifts.
const formatDateObject = (date: Date): string => {
    const hours = date.getUTCHours();
    
    // "Day -1" Detection:
    // If the time is 22:00 or 23:00 UTC, it is extremely likely to be "Midnight" 
    // in a European/African timezone (UTC+1 or UTC+2) that was shifted back.
    // We round these UP to the next day.
    // We DO NOT round up 21:00 or earlier, to protect "Afternoon" tasks in the Americas.
    if (hours >= 22) {
        date.setUTCDate(date.getUTCDate() + 1);
    }

    // Now extract the UTC date components. 
    // Note: For American timezones (e.g. EST midnight = 05:00 UTC), this correctly 
    // extracts the same day because 05:00 is still the same calendar day in UTC.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

// Helper: Ensure a date string snaps to the Monday of that week
export const snapToMonday = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const cleanDate = normalizeDate(dateStr);
  const parts = cleanDate.split('-').map(Number);
  if (parts.length < 3) return cleanDate;
  
  const [y, m, d] = parts;
  // Construct Date in Local Time
  const date = new Date(y, m - 1, d);
  
  if (isNaN(date.getTime())) return cleanDate;
  
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  
  date.setDate(diff);
  
  const yearStr = date.getFullYear();
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  
  return `${yearStr}-${monthStr}-${dayStr}`;
};

// Safe string trim
const safeStr = (s: any): string => {
  return s ? String(s).trim() : '';
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
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Map and normalize data
    const rawTasks = (data.tasks || []).map((t: any, index: number) => {
        // Handle Capitalized Headers often returned by Google Sheets
        const weekDateRaw = t.weekOfDate || t.WeekOfDate;
        const scheduledDateRaw = t.scheduledDate || t.ScheduledDate;
        
        const normalizedScheduled = normalizeDate(scheduledDateRaw);

        // DEBUGGING: Help identify date shifts
        // Only log for the first few items to avoid console spam
        if (index < 3 && scheduledDateRaw && String(scheduledDateRaw).includes('T')) {
             console.groupCollapsed(`🔍 Date Debug (Task ${index})`);
             console.log("Raw from Sheet:", scheduledDateRaw);
             console.log("UTC Hour:", new Date(scheduledDateRaw).getUTCHours());
             console.log("Normalized:", normalizedScheduled);
             console.groupEnd();
        }

        return {
            ...t,
            taskId: safeStr(t.taskId || t.TaskId),
            userId: safeStr(t.userId || t.UserId),
            taskDescription: t.taskDescription || t.TaskDescription || 'Untitled Task',
            estimatedPomodoros: Number(t.estimatedPomodoros || t.EstimatedPomodoros || 0),
            actualPomodoros: Number(t.actualPomodoros || t.ActualPomodoros || 0),
            status: safeStr(t.status || t.Status || 'To Do'),
            weekOfDate: snapToMonday(weekDateRaw), 
            scheduledDate: normalizedScheduled,
        };
    });

    const rawWeeklyGoals = (data.weeklyGoals || []).map((g: any) => {
      const rawDate = g.weekOfDate || g.WeekOfDate;
      const weekStart = snapToMonday(rawDate);

      return {
        ...g,
        goalId: safeStr(g.goalId || g.GoalId),
        userId: safeStr(g.userId || g.UserId),
        title: g.title || g.Title || 'Untitled Goal',
        definitionOfDone: g.definitionOfDone || g.DefinitionOfDone || '',
        priority: g.priority || g.Priority || 'Medium',
        dependency: g.dependency || g.Dependency || '',
        status: safeStr(g.status || g.Status || 'Not Started'),
        retroText: g.retroText || g.RetroText || '',
        weekOfDate: weekStart,
      };
    });

    const rawCheckouts = (data.checkouts || []).map((c: any) => ({
       ...c,
       checkoutId: safeStr(c.checkoutId || c.CheckoutId),
       userId: safeStr(c.userId || c.UserId),
       date: normalizeDate(c.date || c.Date),
       timestamp: Number(c.timestamp || c.Timestamp || 0)
    }));

    const rawUsers: User[] = (data.users || []).map((u: any) => ({
        userId: safeStr(u.userId || u.UserId),
        name: u.name || u.Name,
        role: (u.role || u.Role) as UserRole,
        avatar: u.avatar || u.Avatar
    }));
    
    const finalUsers = rawUsers.length > 0 ? dedupeById(rawUsers, 'userId') : INITIAL_USERS;

    return {
      users: finalUsers,
      checkouts: dedupeById(rawCheckouts, 'checkoutId'),
      tasks: dedupeById(rawTasks, 'taskId'),
      weeklyGoals: dedupeById(rawWeeklyGoals, 'goalId'),
      interactions: data.interactions || []
    };
  } catch (error) {
    console.error("Failed to fetch data:", error);
    return { users: INITIAL_USERS, checkouts: [], tasks: [], weeklyGoals: [], interactions: [] };
  }
};

export const syncItem = async (type: 'Users' | 'Checkouts' | 'Tasks' | 'Interactions' | 'WeeklyGoals', payload: any) => {
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