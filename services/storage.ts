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
// Solves the "Google Sheet Date Shift" problem where dates like 2025-12-29 become 2025-12-28T23:00:00Z
export const normalizeDate = (d: any): string => {
  if (!d) return '';
  
  // Handle Date objects directly
  if (d instanceof Date) {
     const year = d.getFullYear();
     const month = String(d.getMonth() + 1).padStart(2, '0');
     const day = String(d.getDate()).padStart(2, '0');
     return `${year}-${month}-${day}`;
  }

  const s = String(d).trim();
  
  // Case 1: Strictly YYYY-MM-DD (No time component)
  // We trust this literal value 100%
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // Case 2: DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1], 10);
    let p2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];
    
    // Heuristic for Ambiguous Dates
    let day = p1;
    let month = p2;
    if (p1 <= 12 && p2 > 12) {
        month = p1;
        day = p2;
    } 
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Case 3: ISO Strings (with time) or Timestamps
  // We apply "Nearest UTC Midnight" rounding to fix timezone shifts.
  const date = new Date(isNaN(Number(s)) ? s : Number(s));
  
  if (!isNaN(date.getTime())) {
    // ROUNDING LOGIC:
    // Google Sheets dates are often "Midnight" in a specific timezone.
    // When serialized to UTC, they might become 23:00 (prev day) or 05:00 (same day).
    // We round to the nearest UTC day.
    
    // Threshold: 12:00 PM UTC. 
    // If >= 12, it implies the date drifted back from the NEXT day (e.g. 23:00 UTC = Midnight CET).
    // If < 12, it implies the date drifted forward from CURRENT day (e.g. 05:00 UTC = Midnight EST).
    const hours = date.getUTCHours();
    
    if (hours >= 12) {
      date.setUTCDate(date.getUTCDate() + 1);
    }
    
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Fallback
  return s.substring(0, 10);
};

// Helper: Ensure a date string snaps to the Monday of that week
// Uses Local Time construction to prevent UTC-offset shifts
export const snapToMonday = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Parse manually to avoid "new Date('YYYY-MM-DD')" being treated as UTC
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  
  const [y, m, d] = parts;
  // Construct Date in Local Time (Month is 0-indexed)
  const date = new Date(y, m - 1, d);
  
  if (isNaN(date.getTime())) return dateStr;
  
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  
  // Set date modifies the object in place and handles month/year rollovers
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

// Deduplicate array by ID, keeping the LAST occurrence (Latest update wins)
const dedupeById = <T>(items: T[], idKey: keyof T): T[] => {
  const map = new Map<any, T>();
  items.forEach(item => {
    map.set(item[idKey], item);
  });
  return Array.from(map.values());
};

export const fetchAppData = async (): Promise<AppData> => {
  if (!API_URL) {
    console.warn("Using Mock Data (Configure API_URL in services/storage.ts to go live)");
    // Simulate network delay
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
    // Append timestamp to prevent browser caching
    const response = await fetch(`${API_URL}?t=${Date.now()}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Map and normalize data
    const rawTasks = (data.tasks || []).map((t: any) => {
        const rawWeekDate = normalizeDate(t.weekOfDate || t.WeekOfDate);
        return {
            ...t,
            taskId: safeStr(t.taskId || t.TaskId),
            userId: safeStr(t.userId || t.UserId),
            taskDescription: t.taskDescription || t.TaskDescription || 'Untitled Task',
            estimatedPomodoros: Number(t.estimatedPomodoros || t.EstimatedPomodoros || 0),
            actualPomodoros: Number(t.actualPomodoros || t.ActualPomodoros || 0),
            status: safeStr(t.status || t.Status || 'To Do'),
            weekOfDate: snapToMonday(rawWeekDate), // Ensure tasks are also snapped to Monday
            scheduledDate: normalizeDate(t.scheduledDate || t.ScheduledDate),
        };
    });

    const rawWeeklyGoals = (data.weeklyGoals || []).map((g: any) => {
      // Normalize the input date
      const rawDate = normalizeDate(g.weekOfDate || g.WeekOfDate);
      // Ensure it is mapped to the Monday of that week for consistent grouping
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
        weekOfDate: weekStart, // Use the snapped date
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
    
    // Fallback to initial users if sheet is empty (prevents lockout)
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
    // Return empty state on failure rather than mock data to avoid confusion
    return { users: INITIAL_USERS, checkouts: [], tasks: [], weeklyGoals: [], interactions: [] };
  }
};

export const syncItem = async (type: 'Users' | 'Checkouts' | 'Tasks' | 'Interactions' | 'WeeklyGoals', payload: any) => {
  if (!API_URL) return;

  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script simple POST requirement
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    });
  } catch (error) {
    console.error("Sync failed:", error);
  }
};