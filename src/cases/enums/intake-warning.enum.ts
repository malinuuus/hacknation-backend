/** Things the official should check after registering a request from a file. */
export enum IntakeWarning {
  /** No text layer, probably a scan: fill in the data by hand. */
  TextNotFound = 'TEXT_NOT_FOUND',
  /** Old .doc format: the file is stored, but its text is not read. */
  TextExtractionUnsupported = 'TEXT_EXTRACTION_UNSUPPORTED',
  TextExtractionFailed = 'TEXT_EXTRACTION_FAILED',
  /** No office stamp found, so the receipt date (and deadline) assume today. */
  ReceivedAtDefaultedToToday = 'RECEIVED_AT_DEFAULTED_TO_TODAY',
  /** The stamp date was in the future, so today was used instead. */
  ReceivedAtInFutureIgnored = 'RECEIVED_AT_IN_FUTURE_IGNORED',
  /** No subject found in the text; the file name was used. */
  SubjectFromFileName = 'SUBJECT_FROM_FILE_NAME',
  /** No case number found; the next number of the year was assigned. */
  CaseNumberGenerated = 'CASE_NUMBER_GENERATED',
}
