export enum UserRole {
  MANAGER = 'Manager',
  EMPLOYEE = 'Employee'
}

export interface User {
  userId: string;
  name: string;
  role: UserRole;
  avatar: string;
}

export interface DailyCheckout {
  checkoutId: string;
  userId: string;
  date: string; // ISO Date string YYYY-MM-DD
  vibeScore: number; // 1-10
  winText: string;
  blockerText: string;
  tomorrowGoalText: string;
  timestamp: number;
}

export interface Task {
  taskId: string;
  userId: string;
  taskDescription: string;
  weekOfDate: string; // Start of week date
  scheduledDate?: string; // Optional: specific date for daily planning
  estimatedPomodoros: number;
  actualPomodoros: number;
  status: 'To Do' | 'Done';
}

export interface Interaction {
  interactionId: string;
  checkoutId: string;
  commenterId: string;
  commentText?: string;
  type: 'kudos' | 'reply';
  timestamp: number;
}

export enum TabView {
  CHECKOUT = 'Checkout',
  FEED = 'Team Feed',
  DASHBOARD = 'Dashboard',
  PLANNER = 'Planner'
}