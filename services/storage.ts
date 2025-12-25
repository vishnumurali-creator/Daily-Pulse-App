import { DailyCheckout, Task, Interaction, User } from '../types';
import { INITIAL_USERS, INITIAL_CHECKOUTS, INITIAL_TASKS, INITIAL_INTERACTIONS } from '../constants';

// ==========================================
// 🚀 DEPLOYMENT INSTRUCTIONS
// ==========================================
/*
To make this app live with real shared data:

1. Create a new Google Sheet.
2. Create 4 tabs named EXACTLY: "Users", "Checkouts", "Tasks", "Interactions".
   - Add Header Rows (Row 1) for each sheet matching the interface keys in types.ts.
     e.g., Checkouts: checkoutId, userId, date, vibeScore, winText, blockerText, tomorrowGoalText, timestamp
3. Go to Extensions > Apps Script in the Google Sheet.
4. Paste the code below into the script editor:

```javascript
function doGet() {
  const wb = SpreadsheetApp.getActiveSpreadsheet();
  const getData = (name) => {
    const s = wb.getSheetByName(name);
    if (!s) return [];
    const d = s.getDataRange().getValues();
    const h = d.shift();
    return d.map(r => h.reduce((o, k, i) => ({...o, [k]: r[i]}), {}));
  };
  return ContentService.createTextOutput(JSON.stringify({
    users: getData("Users"),
    checkouts: getData("Checkouts"),
    tasks: getData("Tasks"),
    interactions: getData("Interactions")
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const wb = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const sheet = wb.getSheetByName(data.type);
  // Simple append for demo purposes. Real apps need update logic.
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data.payload[h] || "");
  sheet.appendRow(row);
  return ContentService.createTextOutput(JSON.stringify({status: "ok"}));
}
```

5. Deploy > New Deployment > Web App.
   - Execute as: "Me"
   - Who has access: "Anyone"
6. Copy the resulting 'Web App URL' and paste it below.
*/

const API_URL = ""; // 🔴 PASTE YOUR GOOGLE SCRIPT URL HERE

export interface AppData {
  users: User[];
  checkouts: DailyCheckout[];
  tasks: Task[];
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
      interactions: data.interactions || []
    };
  } catch (error) {
    console.error("Failed to fetch data:", error);
    return { users: INITIAL_USERS, checkouts: [], tasks: [], interactions: [] };
  }
};

export const syncItem = async (type: 'Checkouts' | 'Tasks' | 'Interactions', payload: any) => {
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