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
     e.g., Checkouts Sheet Row 1: checkoutId, userId, date, vibeScore, winText, blockerText, tomorrowGoalText, timestamp
     e.g., Tasks Sheet Row 1: taskId, userId, taskDescription, weekOfDate, scheduledDate, estimatedPomodoros, actualPomodoros, status

3. Go to Extensions > Apps Script in the Google Sheet.
4. Paste the code below into the script editor:

```javascript
function doGet() {
  const wb = SpreadsheetApp.getActiveSpreadsheet();
  // Map Sheet Names to API Response Keys
  const sheets = {
    'Users': 'users',
    'Checkouts': 'checkouts',
    'Tasks': 'tasks',
    'Interactions': 'interactions'
  };
  
  const result = {};
  
  for (const [sheetName, apiKey] of Object.entries(sheets)) {
    const sheet = wb.getSheetByName(sheetName);
    if (!sheet) {
      result[apiKey] = [];
      continue;
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      result[apiKey] = [];
      continue;
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    result[apiKey] = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        // Handle data types if necessary, but raw value usually works for JSON
        obj[header] = row[index];
      });
      return obj;
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const wb = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.type; // Matches Sheet Name (e.g., "Checkouts")
    const payload = data.payload;
    
    const sheet = wb.getSheetByName(type);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Sheet not found"}));
    }
    
    // Map payload to headers to ensure correct column order
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(header => {
      return payload[header] === undefined ? "" : payload[header];
    });
    
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()}));
  }
}
```

5. Deploy > New Deployment > Web App.
   - Execute as: "Me"
   - Who has access: "Anyone"
6. Copy the resulting 'Web App URL' and paste it below.
*/

const API_URL = "https://script.google.com/macros/s/AKfycbwlMoaW5noKmqa9rmDLN_hbf6wP0Ho027WXLenwRe3ytg-8S3DUzooKx52u2SHI1m86/exec"; // 🔴 PASTE YOUR GOOGLE SCRIPT URL HERE

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

export const syncItem = async (type: 'Users' | 'Checkouts' | 'Tasks' | 'Interactions', payload: any) => {
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