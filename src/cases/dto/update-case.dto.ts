import { PartialType } from '@nestjs/swagger';
import { CreateCaseDto } from './create-case.dto.js';

/**
 * Every field is optional. Send `null` to clear an optional field such as
 * `handlerInitials`; `subject`, `receivedAt` and `caseNumber` cannot be cleared.
 */
export class UpdateCaseDto extends PartialType(CreateCaseDto) {}
