import { addFailedRequestFixture } from './failed-request-fixture.ts';
import { applyRecentTierFixture } from './recent-tier-fixture.ts';
import { extendUsageCalendar } from './usage-calendar.ts';
import { spreadOctoberUsage } from './spread-usage-fixture.ts';
import { BILL_MOCK_PERIOD, makeBillMockRequests } from './bill-fixture.ts';
import { chargeCents, rateFor } from './pricing-data.ts';
import { dateKey, distributeMockUsageKeys, makeUsageRequests, type RequestRecord } from './data.ts';

export const HISTORICAL_BILL_PERIOD = { from: '2026-09-01', to: '2026-09-07' };
const DATABASE = 'moss-platform-usage';
const TABLE = 'ledgers';
const LEDGER_KEY = 'account-usage-v1';

export type UsageLedger = { version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; createdAt: number; rows: RequestRecord[] };

// Seed once, then read the saved requests and their settlement snapshots.
// The earlier billing period keeps the current month and recent trend unchanged.
export function makeInitialUsageLedger(anchor: number): RequestRecord[] {
  const offset = Date.parse(`${HISTORICAL_BILL_PERIOD.from}T00:00:00+08:00`) - Date.parse(`${BILL_MOCK_PERIOD.from}T00:00:00+08:00`);
  const history = makeBillMockRequests().map(row => ({ ...row, id: row.id.replace('req_bill_oct_', 'req_ledger_sep_'), start: row.start + offset, end: row.end + offset }));
  const daily = makeUsageRequests(anchor).filter(row => row.context !== 'enterprise' || dateKey(row.start) < HISTORICAL_BILL_PERIOD.from || dateKey(row.start) > HISTORICAL_BILL_PERIOD.to);
  return [...daily, ...history].sort((a, b) => b.start - a.start);
}

export function migrateUsageLedger(ledger: UsageLedger, anchor: number): UsageLedger {
  if (ledger.version === 9) return ledger;
  const migrated = migrateUsageLedgerV8(ledger, anchor);
  return { ...migrated, version: 9, rows: addFailedRequestFixture(migrated.rows) };
}

function migrateUsageLedgerV8(ledger: UsageLedger, anchor: number): UsageLedger {
  if (ledger.version === 8) return ledger;
  if (ledger.version === 7) return { ...ledger, version: 8, rows: spreadOctoberUsage(ledger.rows, anchor) };
  // Version 2 accidentally backfilled daily seeds into the historical tier period.
  const rows = ledger.version === 2 ? ledger.rows.filter(row => row.context !== 'enterprise' || dateKey(row.start) < HISTORICAL_BILL_PERIOD.from || dateKey(row.start) > HISTORICAL_BILL_PERIOD.to || row.id.startsWith('req_ledger_sep_')) : ledger.rows;
  const calendar = ledger.version >= 4 ? rows : extendUsageCalendar(applyRecentTierFixture(rows), anchor);
  // Repair only the obsolete personal fixture snapshot, not real historical rates
  // or enterprise settlements. Preserve request identity, usage, status and dates.
  const corrected = calendar.map(row => {
    if (row.context !== 'personal' || row.rate?.version !== 'platform-list-2026-09' || row.billing) return row;
    const rate = rateFor('personal', row.model);
    return { ...row, rate, cents: chargeCents(row.units, rate) };
  });
  // Upgrade only the generated October Kimi/ASR fixtures in existing caches.
  // Keep September history, personal data, other models and November snapshots.
  const octoberFixture = (row: RequestRecord) => row.context === 'enterprise' && ['kimi-k3', 'moss-transcribe'].includes(row.model) && row.id.startsWith('req_ledger_2026-10-');
  const completed = ledger.version >= 4 && corrected.some(octoberFixture)
    ? [...corrected.filter(row => !octoberFixture(row)), ...extendUsageCalendar(corrected, anchor).filter(octoberFixture)].sort((a, b) => b.start - a.start)
    : corrected;
  return { ...ledger, version: 8, rows: spreadOctoberUsage(distributeMockUsageKeys(completed, anchor), anchor) };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(TABLE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('账单数据库被其他窗口占用，请关闭其他窗口后重试。'));
  });
}

export async function loadUsageLedger(anchor: number): Promise<RequestRecord[]> {
  const database = await openDatabase();
  try {
    // One read/write transaction makes first-time initialization atomic across tabs.
    return await new Promise<RequestRecord[]>((resolve, reject) => {
      const transaction = database.transaction(TABLE, 'readwrite');
      const table = transaction.objectStore(TABLE);
      const request = table.get(LEDGER_KEY);
      let ledger: UsageLedger;
      let issue: unknown;
      request.onsuccess = () => {
        try {
          if (request.result !== undefined) {
            ledger = request.result as UsageLedger;
            if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(ledger.version) || !Array.isArray(ledger.rows) || !ledger.rows.length) throw new Error('账单数据格式不兼容，已保留原数据。');
            if (ledger.version !== 9) {
              ledger = migrateUsageLedger(ledger, anchor);
              table.put(ledger, LEDGER_KEY);
            }
          } else {
            ledger = migrateUsageLedger({ version: 5, createdAt: Date.now(), rows: extendUsageCalendar(applyRecentTierFixture(makeInitialUsageLedger(anchor)), anchor) }, anchor);
            table.add(ledger, LEDGER_KEY);
          }
        } catch (error) { issue = error; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(ledger.rows);
      transaction.onerror = () => reject(issue ?? transaction.error);
      transaction.onabort = () => reject(issue ?? transaction.error ?? new Error('账单保存未完成，请重试。'));
    });
  } finally { database.close(); }
}
