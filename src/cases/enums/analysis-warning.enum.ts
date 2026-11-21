/** Things the official should check before registering a request from its file. */
export enum AnalysisWarning {
  /** No text layer, probably a scan: fill in the data by hand. */
  TextNotFound = 'TEXT_NOT_FOUND',
  /** Old .doc format: the file can be stored, but its text is not read. */
  TextExtractionUnsupported = 'TEXT_EXTRACTION_UNSUPPORTED',
  TextExtractionFailed = 'TEXT_EXTRACTION_FAILED',
  /** The stamp date was in the future, so no receipt date is suggested. */
  ReceivedAtInFutureIgnored = 'RECEIVED_AT_IN_FUTURE_IGNORED',
  /** The case number from the file is already registered: probably a duplicate. */
  CaseNumberTaken = 'CASE_NUMBER_TAKEN',
}
