export type ResearchStep = 
  | "planning" 
  | "searching" 
  | "analyzing" 
  | "reporting" 
  | "completed" 
  | "error";

export interface ResearchActivity {
  id: string;
  type: "search" | "source" | "analysis" | "report";
  title: string;
  description?: string;
  status: "pending" | "active" | "completed" | "error";
  url?: string;
  sourceName?: string;
}

export interface DeepResearchProgress {
  step: ResearchStep;
  title: string;
  description?: string;
  sourcesFound: number;
  sourcesRead: number;
  round: number;
  totalRounds: number;
  activities: ResearchActivity[];
  isStarted: boolean;
  planItems: string[];
  queries: string[];
  sources: Array<{
    name: string;
    url?: string;
    status: "pending" | "reading" | "analyzed" | "error";
    snippet?: string;
  }>;
  errorMessage?: string;
  executionLogs?: string[];
}
