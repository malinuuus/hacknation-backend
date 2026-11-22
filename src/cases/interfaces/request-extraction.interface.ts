import type { RequestMetadata } from './request-metadata.interface.js';

export interface ExtractedQuestion {
  text: string;
  departmentIds: string[];
}

export interface ExtractedDepartment {
  departmentId: string;
  symbol: string;
  name: string;
  reason: string;
}

/** What the AI read from a request; values are checked, null when missing or implausible. */
export interface RequestExtraction {
  fields: Record<keyof RequestMetadata, string | null>;
  questions: ExtractedQuestion[];
  departments: ExtractedDepartment[];
}
