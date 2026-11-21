/** Order of the request register. */
export enum CaseSort {
  /** Oldest received first (default). */
  ReceivedAsc = 'RECEIVED_ASC',
  ReceivedDesc = 'RECEIVED_DESC',
  /** Nearest deadline in force first; answered cases last. */
  DeadlineAsc = 'DEADLINE_ASC',
}
