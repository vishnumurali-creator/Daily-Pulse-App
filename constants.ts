import { User, UserRole, DailyCheckout, Task, Interaction, WeeklyGoal } from './types';

// Mock Users
export const INITIAL_USERS: User[] = [
  { userId: 'u1', name: 'Alice (Manager)', role: UserRole.MANAGER, avatar: 'https://picsum.photos/seed/alice/40/40' },
  { userId: 'u2', name: 'Bob (Junior)', role: UserRole.EMPLOYEE, avatar: 'https://picsum.photos/seed/bob/40/40' },
  { userId: 'u3', name: 'Charlie (Junior)', role: UserRole.EMPLOYEE, avatar: 'https://picsum.photos/seed/charlie/40/40' },
];

// Helper to generate past dates
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];

const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

// Mock Checkouts
export const INITIAL_CHECKOUTS: DailyCheckout[] = [
  {
    checkoutId: 'c1',
    userId: 'u2',
    date: yesterdayStr,
    vibeScore: 8,
    winText: 'Fixed the login bug finally!',
    blockerText: '',
    tomorrowGoalText: 'Start on the dashboard UI',
    timestamp: yesterday.getTime(),
  },
  {
    checkoutId: 'c2',
    userId: 'u3',
    date: yesterdayStr,
    vibeScore: 4,
    winText: 'Researched API endpoints',
    blockerText: 'Waiting on backend documentation from the legacy team.',
    tomorrowGoalText: 'Follow up with backend team',
    timestamp: yesterday.getTime() + 1000,
  },
  {
    checkoutId: 'c3',
    userId: 'u2',
    date: twoDaysAgoStr,
    vibeScore: 7,
    winText: 'Cleared the backlog',
    blockerText: '',
    tomorrowGoalText: 'Fix login bug',
    timestamp: twoDaysAgo.getTime(),
  }
];

// Mock Tasks (Daily Pomodoros)
export const INITIAL_TASKS: Task[] = [
  {
    taskId: 't1',
    userId: 'u2',
    taskDescription: 'Implement Login Flow',
    weekOfDate: '2023-10-23',
    scheduledDate: yesterdayStr,
    estimatedPomodoros: 8,
    actualPomodoros: 6,
    status: 'Done',
  },
  {
    taskId: 't2',
    userId: 'u2',
    taskDescription: 'Design Dashboard Components',
    weekOfDate: '2023-10-23',
    scheduledDate: todayStr,
    estimatedPomodoros: 12,
    actualPomodoros: 4,
    status: 'To Do',
  },
  {
    taskId: 't3',
    userId: 'u3',
    taskDescription: 'API Integration',
    weekOfDate: '2023-10-23',
    scheduledDate: todayStr,
    estimatedPomodoros: 10,
    actualPomodoros: 2,
    status: 'To Do',
  }
];

// Mock Weekly Goals
export const INITIAL_WEEKLY_GOALS: WeeklyGoal[] = [
  {
    goalId: 'g1',
    userId: 'u2',
    weekOfDate: '2023-10-23',
    title: 'Ship the MVP Authentication',
    definitionOfDone: 'Users can login, logout, and session persists.',
    priority: 'High',
    dependency: 'Backend API readiness',
    status: 'In Progress',
    retroText: ''
  },
  {
    goalId: 'g2',
    userId: 'u2',
    weekOfDate: '2023-10-23',
    title: 'Clean up technical debt',
    definitionOfDone: 'Remove all unused imports and console logs.',
    priority: 'Low',
    status: 'Not Started',
  }
];

// Mock Interactions
export const INITIAL_INTERACTIONS: Interaction[] = [
  {
    interactionId: 'i1',
    checkoutId: 'c1',
    commenterId: 'u1',
    type: 'kudos',
    timestamp: yesterday.getTime() + 50000,
  },
  {
    interactionId: 'i2',
    checkoutId: 'c2',
    commenterId: 'u1',
    commentText: 'I can jump on a call with them if you need backup.',
    type: 'reply',
    timestamp: yesterday.getTime() + 60000,
  }
];