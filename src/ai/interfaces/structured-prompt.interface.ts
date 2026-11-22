export interface StructuredPrompt {
  /** Instructions; never contains user-supplied text. */
  system: string;
  /** The task with the data, user-supplied parts wrapped in `dataBlock`. */
  user: string;
}
