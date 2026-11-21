import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Mocked } from 'vitest';
import { CaseStatus } from '../generated/prisma/enums.js';
import type { FileStorageService } from '../storage/file-storage.service.js';
import type { CaseDocumentsRepository } from './case-documents.repository.js';
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
    receivedAt: d('2026-11-08'),
    dueAt: d('2026-11-23'),
    extendedDueAt: null,
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
    ...overrides,
  };
}

describe('CasesService', () => {
  let repository: Mocked<CasesRepository>;
  let documentsRepository: Mocked<CaseDocumentsRepository>;
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
    storage = { deleteMany: vi.fn().mockResolvedValue(undefined) } as unknown as Mocked<FileStorageService>;
    const config = { getOrThrow: () => 'BKS.IV.1431' } as unknown as ConfigService;

    service = new CasesService(repository, documentsRepository, storage, config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('computes the deadline and takes the sequence from an explicit case number', async () => {
      await service.create(
        { subject: 'Zwierzęta', receivedAt: '2026-08-19', caseNumber: 'BKS.IV.1431.543.2026' },
        user,
      );

      const data = repository.create.mock.calls[0][0];
      expect(formatDateOnly(data.dueAt)).toBe('2026-09-02');
      expect(data.year).toBe(2026);
      expect(data.sequenceNumber).toBe(543);
      expect(data.caseNumber).toBe('BKS.IV.1431.543.2026');
    });

    it('generates the case number from the assigned sequence when none is given', async () => {
      await service.create({ subject: 'x', receivedAt: '2026-11-20' }, user);

      const { caseNumber, sequenceNumber } = repository.create.mock.calls[0][0];
      expect(sequenceNumber).toBeUndefined();
      expect(typeof caseNumber === 'function' && caseNumber(7)).toBe('BKS.IV.1431.7.2026');
    });

    it('rejects a receipt date in the future', async () => {
      await expect(service.create({ subject: 'x', receivedAt: '2026-11-22' }, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('maps a taken case number to 409', async () => {
      repository.create.mockRejectedValue(new CaseNumberTakenError('BKS.IV.1431.1.2026'));
      await expect(service.create({ subject: 'x', receivedAt: '2026-11-20' }, user)).rejects.toThrow(ConflictException);
    });
  });

  describe('changeStatus', () => {
    it('rejects a transition the workflow does not allow', async () => {
      await expect(service.changeStatus('case-1', { status: CaseStatus.RESPONSE_SENT }, user)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.changeStatus.mock.calls).toHaveLength(0);
    });

    it('records today as the response date when marking as sent', async () => {
      repository.findById.mockResolvedValue(caseRecord({ status: CaseStatus.RESPONSE_PREPARED }));

      await service.changeStatus('case-1', { status: CaseStatus.RESPONSE_SENT, comment: 'ePUAP' }, user);

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
      repository.findById.mockResolvedValue(caseRecord({ status: CaseStatus.RESPONSE_PREPARED }));
      await expect(
        service.changeStatus('case-1', { status: CaseStatus.RESPONSE_SENT, respondedAt: '2026-11-01' }, user),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a response date with any other status', async () => {
      await expect(
        service.changeStatus('case-1', { status: CaseStatus.RESPONSE_PREPARED, respondedAt: '2026-11-20' }, user),
      ).rejects.toThrow(BadRequestException);
    });

    it('clears the response date when a sent case is reopened', async () => {
      repository.findById.mockResolvedValue(
        caseRecord({ status: CaseStatus.RESPONSE_SENT, respondedAt: d('2026-11-20') }),
      );

      await service.changeStatus('case-1', { status: CaseStatus.RESPONSE_PREPARED }, user);

      expect(repository.changeStatus.mock.calls[0][1].fields).toEqual({ respondedAt: null });
    });

    it('returns 404 for an unknown case', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.changeStatus('nope', { status: CaseStatus.RESPONSE_PREPARED }, user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('extendDeadline', () => {
    it('moves the case to EXTENDED with the new date and reason', async () => {
      await service.extendDeadline('case-1', { extendedDueAt: '2026-12-15', reason: 'Dane z WIM' }, user);

      const change = repository.changeStatus.mock.calls[0][1];
      expect(change.toStatus).toBe(CaseStatus.EXTENDED);
      expect(formatDateOnly(change.fields!.extendedDueAt!)).toBe('2026-12-15');
      expect(change.fields!.extensionReason).toBe('Dane z WIM');
    });

    it.each([
      ['not after the statutory deadline', '2026-11-23'],
      ['more than 2 months from receipt', '2027-01-11'],
    ])('rejects a date %s', async (_, extendedDueAt) => {
      await expect(service.extendDeadline('case-1', { extendedDueAt, reason: 'x' }, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not extend an answered case', async () => {
      repository.findById.mockResolvedValue(caseRecord({ status: CaseStatus.RESPONSE_SENT }));
      await expect(
        service.extendDeadline('case-1', { extendedDueAt: '2026-12-15', reason: 'x' }, user),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('recomputes the deadline when the receipt date changes', async () => {
      await service.update('case-1', { receivedAt: '2026-10-28' });

      const data = repository.update.mock.calls[0][2];
      expect(formatDateOnly(data.receivedAt!)).toBe('2026-10-28');
      expect(formatDateOnly(data.dueAt!)).toBe('2026-11-12'); // 11 Nov is a holiday
    });

    it('keeps the case in its year', async () => {
      await expect(service.update('case-1', { receivedAt: '2025-12-30' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a receipt date that would invalidate the existing extension', async () => {
      repository.findById.mockResolvedValue(caseRecord({ extendedDueAt: d('2026-12-15') }));
      // Received 1 Oct allows extensions only until 1 Dec.
      await expect(service.update('case-1', { receivedAt: '2026-10-01' })).rejects.toThrow(BadRequestException);
    });

    it('syncs the sequence number with a new case number', async () => {
      await service.update('case-1', { caseNumber: 'BKS.IV.1431.601.2026' });

      expect(repository.update.mock.calls[0][2]).toMatchObject({
        caseNumber: 'BKS.IV.1431.601.2026',
        sequenceNumber: 601,
      });
    });

    it('refuses to clear required fields', async () => {
      await expect(service.update('case-1', { subject: null as unknown as string })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('setDepartments', () => {
    it('moves a NEW case to SENT_TO_DEPARTMENTS in the same call', async () => {
      await service.setDepartments('case-1', { departmentIds: ['dept-1'] }, user);

      const data = repository.setDepartments.mock.calls[0][1];
      expect(data.departmentIds).toEqual(['dept-1']);
      expect(formatDateOnly(data.requestedAt)).toBe('2026-11-21');
      expect(data.statusChange).toMatchObject({
        fromStatus: CaseStatus.NEW,
        toStatus: CaseStatus.SENT_TO_DEPARTMENTS,
      });
    });

    it.each([
      ['the case is past NEW', CaseStatus.EXTENDED, ['dept-1']],
      ['the list is empty', CaseStatus.NEW, []],
    ])('leaves the status alone when %s', async (_, status, departmentIds) => {
      repository.findById.mockResolvedValue(caseRecord({ status }));

      await service.setDepartments('case-1', { departmentIds }, user);

      expect(repository.setDepartments.mock.calls[0][1].statusChange).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('removes the stored files after deleting the case', async () => {
      documentsRepository.findStorageKeysByCase.mockResolvedValue(['key-1', 'key-2']);

      await service.delete('case-1');

      expect(repository.delete.mock.calls).toEqual([['case-1']]);
      expect(storage.deleteMany.mock.calls).toEqual([[['key-1', 'key-2']]]);
    });
  });
});
