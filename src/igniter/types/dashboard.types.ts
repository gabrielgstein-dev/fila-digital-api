export interface TokenInfo {
  token: string;
  expiresAt: Date;
  expiresIn: number;
  shouldRefresh: boolean;
  timeToExpire: string;
}

export interface SessionInfo {
  userId: string;
  tenantId: string;
  role: string;
  tokenInfo: TokenInfo;
  sessionStart: Date;
  lastActivity: Date;
}

export interface DashboardMetrics {
  userMetrics: {
    userId: string;
    tenantId: string;
    lastLogin: string;
  };
  tenantMetrics: {
    totalTickets: number;
    activeAgents: number;
    avgWaitTime: string;
    queueLength: number;
  };
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface PerformanceMetrics {
  requestCount: number;
  cacheHits: number;
  cacheMisses: number;
  avgResponseTime: number;
  lastUpdated: Date;
}
