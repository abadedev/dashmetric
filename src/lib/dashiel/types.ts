export type DashielRole = 'user' | 'assistant';

export type DashielTrend = 'up' | 'down' | 'neutral';

export interface DashielSummaryContext extends Record<string, unknown> {
  totalAttendances?: number;
  averageSlaHours?: number;
  topCategory?: string;
}

export interface DashielScreenContext {
  periodLabel?: string;
  visibleChart?: string;
  chartTitle?: string;
  summary?: DashielSummaryContext;
}

export interface DashielInsightCard {
  label: string;
  value: string;
  trend?: DashielTrend;
}

export interface DashielQuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export interface DashielMessage {
  id: string;
  role: DashielRole;
  content: string;
  createdAt: string;
  suggestions?: string[];
  insightCards?: DashielInsightCard[];
}

export interface DashielApiRequest {
  message: string;
  context?: DashielScreenContext;
  history?: Array<{
    role: DashielRole;
    content: string;
  }>;
}

export interface DashielApiResponse {
  success: true;
  answer: string;
  suggestions?: string[];
  insightCards?: DashielInsightCard[];
}

export interface DashielErrorResponse {
  success: false;
  error: string;
}

export interface DashielInitialView {
  title: string;
  description: string;
  insightCards: DashielInsightCard[];
  quickActions: DashielQuickAction[];
  suggestions: string[];
}
