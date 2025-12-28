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
    const response = await fetch(API_URL);
    const data = await response.json();
    return {
      users: data.users || INITIAL_USERS,
      checkouts: data.checkouts || [],
      tasks: data.tasks || [],
      weeklyGoals: data.weeklyGoals || [],
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