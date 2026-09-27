import { legacyCompatibleCategoryFilter, normalizeExpenseSummary } from './expense-query.models';

describe('normalizeExpenseSummary', () => {
  it('fills the fields an older backend does not send', () => {
    expect(normalizeExpenseSummary({
      total: 2,
      totalAmount: 30,
      byCategory: [{ category: 'food', total: 2, totalAmount: 30 }],
    })).toEqual({
      total: 2,
      totalAmount: 30,
      byCategory: [{ category: 'food', total: 2, totalAmount: 30 }],
      byDate: [],
      activeDays: 0,
      biggestExpense: null,
    });
  });

  it('returns the empty contract for an empty object', () => {
    expect(normalizeExpenseSummary({})).toEqual({
      total: 0,
      totalAmount: 0,
      byCategory: [],
      byDate: [],
      activeDays: 0,
      biggestExpense: null,
    });
  });

  it('collapses a full ISO timestamp bucket to its calendar day', () => {
    const summary = normalizeExpenseSummary({
      byDate: [{ date: '2026-09-02T12:00:00.000Z', total: 1, totalAmount: 20 }],
    });

    expect(summary.byDate).toEqual([{ date: '2026-09-02', total: 1, totalAmount: 20 }]);
    expect(summary.activeDays).toBe(1);
  });

  it('repairs and sorts a malformed payload without throwing', () => {
    const summary = normalizeExpenseSummary({
      total: '3',
      totalAmount: null,
      byCategory: [
        { category: 'food', totalAmount: 10 },
        { totalAmount: 99 },
        { category: 'transport', totalAmount: 20 },
      ],
      byDate: [
        { date: '2026-09-02T12:00:00.000Z', totalAmount: 5 },
        { date: 7 },
        { date: '2026-09-01', totalAmount: 1 },
      ],
      activeDays: 'many',
      biggestExpense: { amount: 5 },
    });

    expect(summary.total).toBe(0);
    expect(summary.totalAmount).toBe(0);
    expect(summary.byCategory.map(entry => entry.category)).toEqual(['transport', 'food']);
    expect(summary.byDate.map(entry => entry.date)).toEqual(['2026-09-01', '2026-09-02']);
    expect(summary.activeDays).toBe(2);
    expect(summary.biggestExpense).toBeNull();
  });

  it('keeps byDate ascending and byCategory descending when the backend order is skewed', () => {
    const summary = normalizeExpenseSummary({
      byCategory: [
        { category: 'food', total: 1, totalAmount: 10 },
        { category: 'housing', total: 1, totalAmount: 90 },
        { category: 'travel', total: 1, totalAmount: 50 },
      ],
      byDate: [
        { date: '2026-09-30', total: 1, totalAmount: 3 },
        { date: '2026-09-01', total: 1, totalAmount: 1 },
        { date: '2026-09-15', total: 1, totalAmount: 2 },
      ],
    });

    expect(summary.byCategory.map(entry => entry.category)).toEqual(['housing', 'travel', 'food']);
    expect(summary.byDate.map(entry => entry.date))
      .toEqual(['2026-09-01', '2026-09-15', '2026-09-30']);
  });

  it('merges legacy category casing and duplicate calendar-day buckets', () => {
    const summary = normalizeExpenseSummary({
      byCategory: [
        { category: ' Other ', total: 1, totalAmount: 10 },
        { category: 'other', total: 2, totalAmount: 25 },
      ],
      byDate: [
        { date: '2026-09-02T08:00:00.000Z', total: 1, totalAmount: 10 },
        { date: '2026-09-02T18:00:00.000Z', total: 2, totalAmount: 25 },
      ],
    });

    expect(summary.byCategory).toEqual([
      { category: 'other', total: 3, totalAmount: 35 },
    ]);
    expect(summary.byDate).toEqual([
      { date: '2026-09-02', total: 3, totalAmount: 35 },
    ]);
    expect(summary.activeDays).toBe(1);
  });

  it('queries both spellings of the legacy Other category only', () => {
    expect(legacyCompatibleCategoryFilter('other')).toEqual(['other', 'Other']);
    expect(legacyCompatibleCategoryFilter(' Other ')).toEqual(['other', 'Other']);
    expect(legacyCompatibleCategoryFilter('food')).toBe('food');
    expect(legacyCompatibleCategoryFilter('   ')).toBeUndefined();
  });

  it('keeps a well-formed biggestExpense and degrades a malformed one to null', () => {
    const item = {
      id: '000000000000000000000004',
      type: 'income' as const,
      amount: 40,
      category: 'food',
      expenseDate: '2026-10-01T00:00:00.000Z',
      description: 'Dinner',
      attachmentUrl: null,
      createdAt: '2026-01-04T00:00:00.000Z',
    };

    expect(normalizeExpenseSummary({ biggestExpense: item }).biggestExpense).toEqual(item);
    expect(normalizeExpenseSummary({ biggestExpense: null }).biggestExpense).toBeNull();
    expect(normalizeExpenseSummary({ biggestExpense: 'nope' }).biggestExpense).toBeNull();
    expect(normalizeExpenseSummary({ biggestExpense: { _id: 'x', amount: 1 } }).biggestExpense)
      .toBeNull();
    expect(normalizeExpenseSummary({
      biggestExpense: { id: 'x', amount: 'lots', category: 7 },
    }).biggestExpense).toEqual({
      id: 'x',
      type: 'expense',
      amount: 0,
      category: '',
      expenseDate: '',
      description: null,
      attachmentUrl: null,
      createdAt: null,
    });
  });

  it('treats a biggestExpense without a valid type as an expense', () => {
    expect(normalizeExpenseSummary({ biggestExpense: { id: 'x' } }).biggestExpense?.type).toBe('expense');
    expect(normalizeExpenseSummary({ biggestExpense: { id: 'x', type: 'bogus' } }).biggestExpense?.type)
      .toBe('expense');
    expect(normalizeExpenseSummary({ biggestExpense: { id: 'x', type: 'income' } }).biggestExpense?.type)
      .toBe('income');
  });

  it('survives garbage bodies of any type', () => {
    for (const body of [null, undefined, 'summary', 42, true, [], [1, 2, 3]]) {
      expect(normalizeExpenseSummary(body)).toEqual({
        total: 0,
        totalAmount: 0,
        byCategory: [],
        byDate: [],
        activeDays: 0,
        biggestExpense: null,
      });
    }
  });

  it('ignores a non-array byDate and a non-finite activeDays', () => {
    expect(normalizeExpenseSummary({ byDate: 'nope', activeDays: NaN }).byDate).toEqual([]);
    expect(normalizeExpenseSummary({ byDate: 'nope', activeDays: NaN }).activeDays).toBe(0);
    expect(normalizeExpenseSummary({ byDate: null, activeDays: Infinity }).activeDays).toBe(0);
  });
});
