import { GoogleGenAI } from "@google/genai";
import { DailyCheckout, Task } from "../types";

// Standard workaround for process.env in Vite without @types/node explicit usage in some configs
declare const process: any;

const apiKey = process.env.API_KEY || '';
// Initialize safe AI client, assuming key might be missing during initial dev
const ai = new GoogleGenAI({ apiKey });

export const getAiCoachingInsight = async (
  checkouts: DailyCheckout[],
  tasks: Task[],
  userName: string
): Promise<string> => {
  if (!apiKey) return "Please configure your API Key to get AI coaching insights.";

  const recentCheckouts = checkouts.slice(0, 5);
  const blockerHistory = recentCheckouts
    .filter(c => c.blockerText)
    .map(c => `- Date: ${c.date}, Blocker: ${c.blockerText}`)
    .join('\n');
  
  const vibeHistory = recentCheckouts.map(c => c.vibeScore).join(', ');

  // Calculate task stats
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const totalTasks = tasks.length;

  const prompt = `
    You are a supportive, agile team coach. 
    Analyze the recent performance data for team member: ${userName}.
    
    Data:
    - Recent Vibe Scores (1-10): [${vibeHistory}]
    - Recent Blockers:
    ${blockerHistory || "None reported recently."}
    - Weekly Tasks: ${completedTasks} completed out of ${totalTasks} planned.
    
    Provide a concise, 2-sentence coaching insight or encouraging tip. 
    If vibe is low, suggest a small win. If blockers are frequent, suggest a strategy to unblock.
    Keep it friendly and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Keep up the good work!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate insight at this moment. Focus on your top goal!";
  }
};