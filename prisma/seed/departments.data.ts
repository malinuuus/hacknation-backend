import { DepartmentKind } from '../../src/generated/prisma/enums.js';

/**
 * Organisational units of Urząd Miasta Bydgoszczy, as listed in BIP on 2026-11-21:
 * https://bip.um.bydgoszcz.pl/artykuly/198/wydzialy and https://bip.um.bydgoszcz.pl/artykuly/1158/biura
 */
export const BYDGOSZCZ_DEPARTMENTS: ReadonlyArray<{ symbol: string; name: string; kind: DepartmentKind }> = [
  { symbol: 'WAB', name: 'Wydział Administracji Budowlanej', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WE', name: 'Wydział Edukacji i Sportu', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WF', name: 'Wydział Funduszy Europejskich', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WGO', name: 'Wydział Gospodarki Odpadami', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WI', name: 'Wydział Informatyki', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WIM', name: 'Wydział Inwestycji Miasta', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WK', name: 'Wydział Księgowości', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WMG', name: 'Wydział Mienia i Geodezji', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WOŚ', name: 'Wydział Ochrony Środowiska', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WOA', name: 'Wydział Organizacyjno-Administracyjny', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WPL', name: 'Wydział Podatków i Opłat Lokalnych', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WSO', name: 'Wydział Spraw Obywatelskich', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WSR', name: 'Wydział Świadczeń Rodzinnych', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WUK', name: 'Wydział Uprawnień Komunikacyjnych', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WW', name: 'Wydział Windykacji', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WZP', name: 'Wydział Zamówień Publicznych', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WZB', name: 'Wydział Zarządzania Budżetem Miasta', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WZK', name: 'Wydział Zarządzania Kryzysowego i Ochrony Ludności', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'WGK', name: 'Wydział Zieleni i Gospodarki Komunalnej', kind: DepartmentKind.DEPARTMENT },
  { symbol: 'BAS', name: 'Biuro Aktywności Społecznej', kind: DepartmentKind.OFFICE },
  { symbol: 'BCB', name: 'Biuro Cyfryzacji i Bezpieczeństwa Informacji', kind: DepartmentKind.OFFICE },
  { symbol: 'BZS', name: 'Biuro ds. Zdrowia i Polityki Społecznej', kind: DepartmentKind.OFFICE },
  { symbol: 'BKS', name: 'Biuro Komunikacji Społecznej', kind: DepartmentKind.OFFICE },
  { symbol: 'BKZ', name: 'Biuro Konserwatora Zabytków', kind: DepartmentKind.OFFICE },
  { symbol: 'BKB', name: 'Biuro Kultury Bydgoskiej', kind: DepartmentKind.OFFICE },
  { symbol: 'BPR', name: 'Biuro Prasowe', kind: DepartmentKind.OFFICE },
  { symbol: 'BP', name: 'Biuro Promocji Miasta i Współpracy z Zagranicą', kind: DepartmentKind.OFFICE },
  { symbol: 'BRM', name: 'Biuro Rady Miasta', kind: DepartmentKind.OFFICE },
  { symbol: 'BZIT', name: 'Biuro ZIT', kind: DepartmentKind.OFFICE },
];
