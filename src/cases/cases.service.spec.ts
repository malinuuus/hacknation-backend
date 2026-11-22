import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Mocked } from 'vitest';
import { CaseStatus } from '../generated/prisma/enums.js';
import type { FileStorageService } from '../storage/file-storage.service.js';
import type { CaseDocumentsRepository } from './case-documents.repository.js';
import type { CaseDocumentsService } from './case-documents.service.js';
import type { CaseDetailRecord, CasesRepository } from './cases.repository.js';
import { CasesService } from './cases.service.js';
import { CaseNumberTakenError } from './errors/case-number-taken.error.js';
import { formatDateOnly, parseDateOnly } from './helpers/date-only.helper.js';

const user = { id: 'user-1', email: 'urzednik@example.com' };
const d = parseDateOnly;

function caseRecord(overrides: Partial<CaseDetailRecord> = {}): CaseDetailRecord {
  return {
    id: 'case-1',
    year: 2026,
    sequenceNumber: 590,
    caseNumber: 'BKS.IV.1431.590.2026',
    subject: 'Astoria',
    requestText: null,
    receivedAt: d('2026-11-08'),
    writtenAt: null,
    dueAt: d('2026-11-23'),
    extendedDueAt: null,
    effectiveDueAt: d('2026-11-23'),
    extensionReason: null,
    respondedAt: null,
    status: CaseStatus.NEW,
    handlerInitials: null,
    requesterName: null,
    requesterEmail: null,
    requesterAddress: null,
    notes: null,
    assigneeId: null,
    createdById: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignee: null,
    createdBy: user,
    statusChanges: [],
    departments: [],
    documents: [],
    questions: [],
    ...overrides,
  };
}

const upload = {
  originalName: 'wniosek.pdf',
  mimeType: 'application/pdf',
  stored: { storageKey: 'key-1', sizeBytes: 10, sha256: 'abc' },
  extraction: { status: 'EXTRACTED', text: 'Wnoszę o udostępnienie informacji' },
};
const file = { originalname: 'wniosek.pdf' } as Express.Multer.File;

describe('CasesService', () => {
  let repository: Mocked<CasesRepository>;
  let documentsRepository: Mocked<CaseDocumentsRepository>;
  let documentsService: Mocked<CaseDocumentsService>;
  let storage: Mocked<FileStorageService>;
  let service: CasesService;

  beforeEach(() => {
    // Saturday 21 Nov 2026, midday in Poland.
    vi.useFakeTimers({ now: new Date('2026-11-21T11:00:00Z'), toFake: ['Date'] });

    repository = {
      create: vi.fn().mockResolvedValue(caseRecord()),
      update: vi.fn().mockResolvedValue(caseRecord()),
      changeStatus: vi.fn().mockResolvedValue(caseRecord()),
      setDepartments: vi.fn().mockResolvedValue(caseRecord()),
      delete: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(caseRecord()),
    } as unknown as Mocked<CasesRepository>;
    documentsRepository = {
      findStorageKeysByCase: vi.fn().mockResolvedValue([]),
    } as unknown as Mocked<CaseDocumentsRepository>;
    documentsService = {
      processUpload: vi.fn().mockResolvedValue(upload),
      toDocumentData: vi.fn().mockReturnValue({ storageKey: 'key-1' }),
      discard: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<CaseDocumentsService>;
    storage = { deleteMany: vi.fn().mockResolvedValue(undefined) } as unknown as Mocked<FileStorageService>;
    const config = { getOrThrow: () => 'BKS.IV.1431' } as unknown as ConfigService;

    service = new CasesService(repository, documentsRepository, documentsService, storage, config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('computes the deadline and takes the sequence from an explicit case number', async () => {
      // arrange
      const dto = { subject: 'Zwierzęta', receivedAt: '2026-08-19', caseNumber: 'BKS.IV.1431.543.2026' };

      // act
      await service.create(dto, user);

      // assert
      const data = repository.create.mock.calls[0][0];
      expect(formatDateOnly(data.dueAt)).toBe('2026-09-02');
      expect(data.year).toBe(2026);
      expect(data.sequenceNumber).toBe(543);
      expect(data.caseNumber).toBe('BKS.IV.1431.543.2026');
      expect(data.effectiveDueAt).toEqual(data.dueAt);
    });

    it('attaches the request file and takes the request text from it', async () => {
      // arrange
      const dto = { subject: 'x', receivedAt: '2026-11-20' };

      // act
      await service.create(dto, user, file);

      // assert
      const data = repository.create.mock.calls[0][0];
      expect(data.requestText).toBe('Wnoszę o udostępnienie informacji');
      expect(data.document).toEqual({ storageKey: 'key-1' });
    });

    it('keeps the request text verified by the official', async () => {
      // arrange
      const dto = { subject: 'x', receivedAt: '2026-11-20', requestText: 'Poprawiona treść' };

      // act
      await service.create(dto, user, file);

      // assert
      expect(repository.create.mock.calls[0][0].requestText).toBe('Poprawiona treść');
    });

    it('removes the stored file when the case cannot be saved', async () => {
      // arrange
      repository.create.mockRejectedValue(new CaseNumberTakenError('BKS.IV.1431.1.2026'));

      // act
      const result = service.create({ subject: 'x', receivedAt: '2026-11-20' }, user, file);

      // assert
      await expect(result).rejects.toThrow(ConflictException);
      expect(documentsService.discard.mock.calls).toEqual([[upload]]);
    });

    it('generates the case number from the assigned sequence when none is given', async () => {
      // arrange
      const dto = { subject: 'x', receivedAt: '2026-11-20' };

      // act
      await service.create(dto, user);

      // assert
      const { caseNumber, sequenceNumber } = repository.create.mock.calls[0][0];
      expect(sequenceNumber).toBeUndefined();
      expect(typeof caseNumber === 'function' && caseNumber(7)).toBe('BKS.IV.1431.7.2026');
    });

    it('rejects a receipt date in the future', async () => {
      // arrange
      const dto = { subject: 'x', receivedAt: '2026-11-22' };

      // act
      const result = service.create(dto, user);

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });

    it('maps a taken case number to 409 with a code', async () => {
      // arrange
      repository.create.mockRejectedValue(new CaseNumberTakenError('BKS.IV.1431.1.2026'));

      // act
      const error = await service.create({ subject: 'x', receivedAt: '2026-11-20' }, user).catch((e: unknown) => e);

      // assert
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({ statusCode: 409, code: 'CASE_NUMBER_TAKEN' });
    });

    it('stores the date the letter was written', async () => {
      // arrange
      const dto = { subject: 'x', receivedAt: '2026-11-20', writtenAt: '2026-11-18' };

      // act
      await service.create(dto, user);

      // assert
      expect(formatDateOnly(repository.create.mock.calls[0][0].writtenAt!)).toBe('2026-11-18');
    });

    it('rejects a letter written after it was received', async () => {
      // arrange
      const dto = { subject: 'x', receivedAt: '2026-11-20', writtenAt: '2026-11-21' };

      // act
      const result = service.create(dto, user);

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });
  });

  describe('previewDeadline', () => {
    it('moves the deadline past a weekend', () => {
      // arrange
      // 2026-11-07 + 14 days = Saturday 21 Nov, so the deadline is Monday 23 Nov.
      const dto = { receivedAt: '2026-11-07' };

      // act
      const result = service.previewDeadline(dto);

      // assert
      expect(result).toEqual({
        receivedAt: '2026-11-07',
        dueAt: '2026-11-23',
        maxExtendedDueAt: '2027-01-07',
      });
    });

    it('rejects a future receipt date', () => {
      // arrange
      const dto = { receivedAt: '2026-11-22' };

      // act
      const act = () => service.previewDeadline(dto);

      // assert
      expect(act).toThrow(BadRequestException);
    });
  });

  describe('calendar', () => {
    it('finds cases by the deadline in force and maps them to summaries', async () => {
      // arrange
      const findByDeadlineRange = vi.fn().mockResolvedValue([caseRecord()]);
      repository.findByDeadlineRange = findByDeadlineRange;
      const dto = { from: '2026-11-01', to: '2026-11-30' };

      // act
      const result = await service.calendar(dto);

      // assert
      expect(findByDeadlineRange).toHaveBeenCalledWith(d('2026-11-01'), d('2026-11-30'));
      expect(result.from).toBe('2026-11-01');
      expect(result.to).toBe('2026-11-30');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ id: 'case-1', effectiveDueAt: '2026-11-23', daysLeft: 2 });
    });

    it('accepts a single-day range', async () => {
      // arrange
      repository.findByDeadlineRange = vi.fn().mockResolvedValue([]);
      const dto = { from: '2026-11-23', to: '2026-11-23' };

      // act
      const result = await service.calendar(dto);

      // assert
      expect(result.items).toEqual([]);
    });

    it.each([
      ['an impossible date', { from: '2026-02-30', to: '2026-03-31' }],
      ['to before from', { from: '2026-12-01', to: '2026-11-30' }],
      ['a range longer than 93 days', { from: '2026-01-01', to: '2026-04-30' }],
    ])('rejects %s', async (_, dto) => {
      // arrange
      const findByDeadlineRange = vi.fn();
      repository.findByDeadlineRange = findByDeadlineRange;

      // act
      const result = service.calendar(dto);

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
      expect(findByDeadlineRange).not.toHaveBeenCalled();
    });
  });

  describe('checkCaseNumber', () => {
    beforeEach(() => {
      repository.caseNumberExists = vi.fn().mockResolvedValue(false);
      repository.sequenceNumberExists = vi.fn().mockResolvedValue(false);
    });

    it('reports a free number', async () => {
      // arrange
      const dto = { caseNumber: 'BKS.IV.1431.600.2026' };

      // act
      const result = await service.checkCaseNumber(dto);

      // assert
      expect(result).toEqual({ caseNumber: 'BKS.IV.1431.600.2026', available: true, conflict: null });
      expect(repository.sequenceNumberExists.mock.calls).toEqual([[2026, 600, undefined]]);
    });

    it('reports a taken case number, ignoring the case being edited', async () => {
      // arrange
      repository.caseNumberExists.mockResolvedValue(true);

      // act
      const result = await service.checkCaseNumber({ caseNumber: 'BKS.IV.1431.590.2026', exceptId: 'case-1' });

      // assert
      expect(result).toMatchObject({ available: false, conflict: 'CASE_NUMBER_TAKEN' });
      expect(repository.caseNumberExists.mock.calls).toEqual([['BKS.IV.1431.590.2026', 'case-1']]);
    });

    it('reports a sequence number used by another case of the year', async () => {
      // arrange
      repository.sequenceNumberExists.mockResolvedValue(true);

      // act
      const result = await service.checkCaseNumber({ caseNumber: 'WIM.590.2026' });

      // assert
      expect(result).toMatchObject({ available: false, conflict: 'SEQUENCE_NUMBER_TAKEN' });
    });

    it('skips the sequence check when the number is of another year than the case', async () => {
      // arrange
      const dto = { caseNumber: 'BKS.IV.1431.590.2025', year: 2026 };

      // act
      await service.checkCaseNumber(dto);

      // assert
      expect(repository.sequenceNumberExists.mock.calls).toEqual([]);
    });
  });

  describe('changeStatus', () => {
    it('rejects a transition the workflow does not allow', async () => {
      // arrange
      const dto = { status: CaseStatus.RESPONSE_SENT };

      // act
      const result = service.changeStatus('case-1', dto, user);

      // assert
      await expect(result).rejects.toThrow(ConflictException);
      expect(repository.changeStatus.mock.calls).toHaveLength(0);
    });

    it('records today as the response date when marking as sent', async () => {
      // arrange
      repository.findById.mockResolvedValue(caseRecord({ status: CaseStatus.RESPONSE_PREPARED }));

      // act
      await service.changeStatus('case-1', { status: CaseStatus.RESPONSE_SENT, comment: 'ePUAP' }, user);

      // assert
      const change = repository.changeStatus.mock.calls[0][1];
      expect(change).toMatchObject({
        fromStatus: CaseStatus.RESPONSE_PREPARED,
        toStatus: CaseStatus.RESPONSE_SENT,
        changedById: user.id,
        comment: 'ePUAP',
      });
      expect(formatDateOnly(change.fields!.respondedAt!)).toBe('2026-11-21');
    });

    it('rejects a response date before receipt', async () => {
      // arrange
      repository.findById.mockResolvedValue(caseRecord({ status: CaseStatus.RESPONSE_PREPARED }));

      // act
      const result = service.changeStatus(
        'case-1',
        { status: CaseStatus.RESPONSE_SENT, respondedAt: '2026-11-01' },
        user,
      );

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });

    it('rejects a response date with any other status', async () => {
      // arrange
      const dto = { status: CaseStatus.RESPONSE_PREPARED, respondedAt: '2026-11-20' };

      // act
      const result = service.changeStatus('case-1', dto, user);

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });

    it('clears the response date when a sent case is reopened', async () => {
      // arrange
      repository.findById.mockResolvedValue(
        caseRecord({ status: CaseStatus.RESPONSE_SENT, respondedAt: d('2026-11-20') }),
      );

      // act
      await service.changeStatus('case-1', { status: CaseStatus.RESPONSE_PREPARED }, user);

      // assert
      expect(repository.changeStatus.mock.calls[0][1].fields).toEqual({ respondedAt: null });
    });

    it('returns 404 for an unknown case', async () => {
      // arrange
      repository.findById.mockResolvedValue(null);

      // act
      const result = service.changeStatus('nope', { status: CaseStatus.RESPONSE_PREPARED }, user);

      // assert
      await expect(result).rejects.toThrow(NotFoundException);
    });
  });

  describe('extendDeadline', () => {
    it('sets the new deadline and reason without changing the status', async () => {
      // arrange
      repository.findById.mockResolvedValue(caseRecord({ status: CaseStatus.SENT_TO_DEPARTMENTS }));

      // act
      await service.extendDeadline('case-1', { extendedDueAt: '2026-12-15', reason: 'Dane z WIM' }, user);

      // assert
      const change = repository.changeStatus.mock.calls[0][1];
      expect(change.fromStatus).toBe(CaseStatus.SENT_TO_DEPARTMENTS);
      expect(change.toStatus).toBe(CaseStatus.SENT_TO_DEPARTMENTS);
      expect(formatDateOnly(change.fields!.extendedDueAt!)).toBe('2026-12-15');
      expect(formatDateOnly(change.fields!.effectiveDueAt!)).toBe('2026-12-15');
      expect(change.fields!.extensionReason).toBe('Dane z WIM');
    });

    it.each([
      ['not after the statutory deadline', '2026-11-23'],
      ['more than 2 months from receipt', '2027-01-11'],
    ])('rejects a date %s', async (_, extendedDueAt) => {
      // act
      const result = service.extendDeadline('case-1', { extendedDueAt, reason: 'x' }, user);

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });

    it('does not extend an answered case', async () => {
      // arrange
      repository.findById.mockResolvedValue(caseRecord({ status: CaseStatus.RESPONSE_SENT }));

      // act
      const result = service.extendDeadline('case-1', { extendedDueAt: '2026-12-15', reason: 'x' }, user);

      // assert
      await expect(result).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelExtension', () => {
    it('restores the statutory deadline', async () => {
      // arrange
      repository.findById.mockResolvedValue(
        caseRecord({ extendedDueAt: d('2026-12-15'), effectiveDueAt: d('2026-12-15'), extensionReason: 'x' }),
      );

      // act
      await service.cancelExtension('case-1', user);

      // assert
      const change = repository.changeStatus.mock.calls[0][1];
      expect(change.toStatus).toBe(CaseStatus.NEW);
      expect(change.fields).toEqual({ extendedDueAt: null, extensionReason: null, effectiveDueAt: d('2026-11-23') });
    });

    it('rejects a case without an extension', async () => {
      // act
      const result = service.cancelExtension('case-1', user);

      // assert
      await expect(result).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('recomputes the deadline when the receipt date changes', async () => {
      // arrange
      const dto = { receivedAt: '2026-10-28' };

      // act
      await service.update('case-1', dto);

      // assert
      const data = repository.update.mock.calls[0][2];
      expect(formatDateOnly(data.receivedAt!)).toBe('2026-10-28');
      expect(formatDateOnly(data.dueAt!)).toBe('2026-11-12'); // 11 Nov is a holiday
      expect(data.effectiveDueAt).toEqual(data.dueAt);
    });

    it('keeps the extended deadline in force when the receipt date changes', async () => {
      // arrange
      repository.findById.mockResolvedValue(caseRecord({ extendedDueAt: d('2026-12-15') }));

      // act
      await service.update('case-1', { receivedAt: '2026-11-02' });

      // assert
      expect(formatDateOnly(repository.update.mock.calls[0][2].effectiveDueAt!)).toBe('2026-12-15');
    });

    it('keeps the case in its year', async () => {
      // arrange
      const dto = { receivedAt: '2025-12-30' };

      // act
      const result = service.update('case-1', dto);

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });

    it('rejects a receipt date that would invalidate the existing extension', async () => {
      // arrange
      // Received 1 Oct allows extensions only until 1 Dec.
      repository.findById.mockResolvedValue(caseRecord({ extendedDueAt: d('2026-12-15') }));

      // act
      const result = service.update('case-1', { receivedAt: '2026-10-01' });

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });

    it('syncs the sequence number with a new case number', async () => {
      // arrange
      const dto = { caseNumber: 'BKS.IV.1431.601.2026' };

      // act
      await service.update('case-1', dto);

      // assert
      expect(repository.update.mock.calls[0][2]).toMatchObject({
        caseNumber: 'BKS.IV.1431.601.2026',
        sequenceNumber: 601,
      });
    });

    it('clears the date the letter was written', async () => {
      // arrange
      const dto = { writtenAt: null as unknown as string };

      // act
      await service.update('case-1', dto);

      // assert
      expect(repository.update.mock.calls[0][2].writtenAt).toBeNull();
    });

    it('rejects a receipt date before the stored date the letter was written', async () => {
      // arrange
      repository.findById.mockResolvedValue(caseRecord({ writtenAt: d('2026-11-05') }));

      // act
      const result = service.update('case-1', { receivedAt: '2026-11-04' });

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });

    it('refuses to clear required fields', async () => {
      // arrange
      const dto = { subject: null as unknown as string };

      // act
      const result = service.update('case-1', dto);

      // assert
      await expect(result).rejects.toThrow(BadRequestException);
    });
  });

  describe('setDepartments', () => {
    it('moves a NEW case to SENT_TO_DEPARTMENTS in the same call', async () => {
      // arrange
      const dto = { departmentIds: ['dept-1'] };

      // act
      await service.setDepartments('case-1', dto, user);

      // assert
      const data = repository.setDepartments.mock.calls[0][1];
      expect(data.departmentIds).toEqual(['dept-1']);
      expect(formatDateOnly(data.requestedAt)).toBe('2026-11-21');
      expect(data.statusChange).toMatchObject({
        fromStatus: CaseStatus.NEW,
        toStatus: CaseStatus.SENT_TO_DEPARTMENTS,
      });
    });

    it.each([
      ['the case is past NEW', CaseStatus.RESPONSE_PREPARED, ['dept-1']],
      ['the list is empty', CaseStatus.NEW, []],
    ])('leaves the status alone when %s', async (_, status, departmentIds) => {
      // arrange
      repository.findById.mockResolvedValue(caseRecord({ status }));

      // act
      await service.setDepartments('case-1', { departmentIds }, user);

      // assert
      expect(repository.setDepartments.mock.calls[0][1].statusChange).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('removes the stored files after deleting the case', async () => {
      // arrange
      documentsRepository.findStorageKeysByCase.mockResolvedValue(['key-1', 'key-2']);

      // act
      await service.delete('case-1');

      // assert
      expect(repository.delete.mock.calls).toEqual([['case-1']]);
      expect(storage.deleteMany.mock.calls).toEqual([[['key-1', 'key-2']]]);
    });
  });
});
