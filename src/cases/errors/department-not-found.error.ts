export class DepartmentNotFoundError extends Error {
  constructor() {
    super('One or more departments do not exist');
    this.name = 'DepartmentNotFoundError';
  }
}
