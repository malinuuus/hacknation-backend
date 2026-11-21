/** `code` of a 409 response, so the client can tell which field clashed. */
export enum CaseConflict {
  /** Another case already has this case number. */
  CaseNumberTaken = 'CASE_NUMBER_TAKEN',
  /** The sequence number in the case number (`….<sequence>.<year>`) is used by another case of that year. */
  SequenceNumberTaken = 'SEQUENCE_NUMBER_TAKEN',
  /** The case was changed meanwhile (e.g. its status moved on); reload it and retry. */
  CaseStatusChanged = 'CASE_STATUS_CHANGED',
}
