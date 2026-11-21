export class AssigneeNotFoundError extends Error {
  constructor(userId: string) {
    super(`Assignee "${userId}" does not exist`);
    this.name = 'AssigneeNotFoundError';
  }
}
