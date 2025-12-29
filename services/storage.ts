import { DailyCheckout, Task, Interaction, User, WeeklyGoal } from '../types';
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

// Helper to ensure dates are YYYY-MM-DD string format
const normalizeDate = (d: any): string => {
  if (!d) return '';
  if (typeof d === 'string') {
    // If it's an ISO string like "2023-10-23T00:00:00.000Z", split it.
    return d.split('T')[0];
  }
  return String(d);
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
    const data = await response.json();

    // Map and normalize data
    const tasks = (data.tasks || []).map((t: any) => ({
      ...t,
      // Handle potential casing issues from sheet headers or missing fields
      taskId: t.taskId || t.TaskId,
      userId: t.userId || t.UserId,
      taskDescription: t.taskDescription || t.TaskDescription,
      estimatedPomodoros: Number(t.estimatedPomodoros || t.EstimatedPomodoros || 0),
      actualPomodoros: Number(t.actualPomodoros || t.ActualPomodoros || 0),
      status: t.status || t.Status || 'To Do',
      // Date normalization
      weekOfDate: normalizeDate(t.weekOfDate || t.WeekOfDate),
      scheduledDate: normalizeDate(t.scheduledDate || t.ScheduledDate),
    }));

    const weeklyGoals = (data.weeklyGoals || []).map((g: any) => ({
      ...g,
      goalId: g.goalId || g.GoalId,
      userId: g.userId || g.UserId,
      title: g.title || g.Title,
      definitionOfDone: g.definitionOfDone || g.DefinitionOfDone,
      priority: g.priority || g.Priority || 'Medium',
      dependency: g.dependency || g.Dependency || '',
      status: g.status || g.Status || 'Not Started',
      retroText: g.retroText || g.RetroText || '',
      weekOfDate: normalizeDate(g.weekOfDate || g.WeekOfDate),
    }));

    const checkouts = (data.checkouts || []).map((c: any) => ({
       ...c,
       date: normalizeDate(c.date || c.Date),
       timestamp: Number(c.timestamp || c.Timestamp || 0)
    }));

    return {
      users: data.users || INITIAL_USERS,
      checkouts,
      tasks,
      weeklyGoals,
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
      mode: 'no-cors', // Google Apps Script simple POST requirement
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    });
  } catch (error) {
    console.error("Sync failed:", error);
  }
};