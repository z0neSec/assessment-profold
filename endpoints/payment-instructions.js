const { createHandler } = require('@app-core/server');

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'GHS'];

function splitByWhitespace(s) {
  const tokens = [];
  let cur = '';
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (cur.length > 0) {
        tokens.push(cur);
        cur = '';
      }
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) tokens.push(cur);
  return tokens;
}

function isPositiveIntegerString(str) {
  if (!str || typeof str !== 'string') return false;
  // no decimals, no signs
  if (str.indexOf('.') !== -1) return false;
  if (str[0] === '+') return false;

  for (let i = 0; i < str.length; i += 1) {
    const c = str[i];
    if (c < '0' || c > '9') return false;
  }

  const num = Number(str);
  return Number.isInteger(num) && num > 0;
}

function isValidAccountId(id) {
  if (typeof id !== 'string' || id.length === 0) return false;
  for (let i = 0; i < id.length; i += 1) {
    const ch = id[i];
    const code = ch.charCodeAt(0);
    const isAlpha = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    const isNum = code >= 48 && code <= 57;
    if (isAlpha || isNum) {
      // allowed
    } else if (ch === '-' || ch === '.' || ch === '@') {
      // allowed
    } else {
      return false;
    }
  }
  return true;
}

function parseDateString(dateStr) {
  // expect YYYY-MM-DD with numeric parts
  if (typeof dateStr !== 'string') return null;
  const parts = [];
  // split by '-' without regex
  let cur = '';
  for (let i = 0; i < dateStr.length; i += 1) {
    const ch = dateStr[i];
    if (ch === '-') {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (y.length !== 4 || m.length !== 2 || d.length !== 2) return null;
  // numeric check
  for (let i = 0; i < y.length; i += 1) if (y[i] < '0' || y[i] > '9') return null;
  for (let i = 0; i < m.length; i += 1) if (m[i] < '0' || m[i] > '9') return null;
  for (let i = 0; i < d.length; i += 1) if (d[i] < '0' || d[i] > '9') return null;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day, iso: `${y}-${m}-${d}` };
}

function compareDateToTodayUTC({ year, month, day }) {
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const providedUTC = Date.UTC(year, month - 1, day);
  if (providedUTC > todayUTC) return 1; // future
  if (providedUTC < todayUTC) return -1; // past
  return 0;
}

module.exports = createHandler({
  method: 'post',
  path: '/payment-instructions',
  handler: async (request) => {
    const body = request.body || {};
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    const rawInstruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';

    // default unparseable response
    const baseUnparseable = {
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: 'failed',
      status_reason: 'Malformed instruction: unable to parse keywords',
      status_code: 'SY03',
      accounts: [],
    };

    if (!rawInstruction) {
      return { status: 400, data: baseUnparseable };
    }

    const tokens = splitByWhitespace(rawInstruction);
    if (tokens.length === 0) return { status: 400, data: baseUnparseable };

    const up = tokens.map((t) => (typeof t === 'string' ? t.toUpperCase() : t));

    let type = null;
    let amountStr = null;
    let currency = null;
    let debitAccountId = null;
    let creditAccountId = null;
    let executeBy = null;

    // helper to build error response
    function buildError(parsedObj, reason, code) {
      const resp = {
        type: parsedObj.type || null,
        amount: parsedObj.amount !== undefined ? parsedObj.amount : null,
        currency: parsedObj.currency || null,
        debit_account: parsedObj.debit_account || null,
        credit_account: parsedObj.credit_account || null,
        execute_by: parsedObj.execute_by || null,
        status: 'failed',
        status_reason: reason,
        status_code: code,
        accounts: parsedObj.accounts || [],
      };
      return { status: 400, data: resp };
    }

    // try DEBIT format
    if (up[0] === 'DEBIT') {
      type = 'DEBIT';
      // DEBIT amount currency FROM ACCOUNT a FOR CREDIT TO ACCOUNT b [ON date]
      if (tokens.length < 11) {
        return { status: 400, data: baseUnparseable };
      }
      const [, amt, curr, , , debitId, , , , , creditId, , maybeDate] = tokens;
      amountStr = amt;
      currency = curr ? curr.toUpperCase() : null;
      if (up[3] !== 'FROM' || up[4] !== 'ACCOUNT') {
        return {
          status: 400,
          data: {
            ...baseUnparseable,
            status_reason: 'Missing required keyword',
            status_code: 'SY01',
          },
        };
      }
      debitAccountId = debitId;
      if (up[6] !== 'FOR' || up[7] !== 'CREDIT' || up[8] !== 'TO' || up[9] !== 'ACCOUNT') {
        return {
          status: 400,
          data: { ...baseUnparseable, status_reason: 'Invalid keyword order', status_code: 'SY02' },
        };
      }
      creditAccountId = creditId;
      if (tokens.length > 11) {
        if (up[11] === 'ON') {
          if (tokens.length < 13) {
            return {
              status: 400,
              data: {
                ...baseUnparseable,
                status_reason: 'Invalid date format',
                status_code: 'DT01',
              },
            };
          }
          executeBy = maybeDate;
        } else {
          return { status: 400, data: baseUnparseable };
        }
      }
    } else if (up[0] === 'CREDIT') {
      type = 'CREDIT';
      // CREDIT amount currency TO ACCOUNT b FOR DEBIT FROM ACCOUNT a [ON date]
      if (tokens.length < 11) {
        return { status: 400, data: baseUnparseable };
      }
      const [, amt, curr, , , creditId, , , , , debitId, , maybeDate] = tokens;
      amountStr = amt;
      currency = curr ? curr.toUpperCase() : null;
      if (up[3] !== 'TO' || up[4] !== 'ACCOUNT') {
        return {
          status: 400,
          data: {
            ...baseUnparseable,
            status_reason: 'Missing required keyword',
            status_code: 'SY01',
          },
        };
      }
      creditAccountId = creditId;
      if (up[6] !== 'FOR' || up[7] !== 'DEBIT' || up[8] !== 'FROM' || up[9] !== 'ACCOUNT') {
        return {
          status: 400,
          data: { ...baseUnparseable, status_reason: 'Invalid keyword order', status_code: 'SY02' },
        };
      }
      debitAccountId = debitId;
      if (tokens.length > 11) {
        if (up[11] === 'ON') {
          if (tokens.length < 13) {
            return {
              status: 400,
              data: {
                ...baseUnparseable,
                status_reason: 'Invalid date format',
                status_code: 'DT01',
              },
            };
          }
          executeBy = maybeDate;
        } else {
          return { status: 400, data: baseUnparseable };
        }
      }
    } else {
      return { status: 400, data: baseUnparseable };
    }

    // validate amount
    if (!isPositiveIntegerString(amountStr)) {
      const parsed = {
        type,
        amount: null,
        currency: currency || null,
        debit_account: debitAccountId || null,
        credit_account: creditAccountId || null,
        execute_by: executeBy || null,
        accounts: [],
      };
      return buildError(parsed, 'Amount must be a positive integer', 'AM01');
    }
    const amount = Number(amountStr);

    // validate currency supported
    if (!currency || SUPPORTED_CURRENCIES.indexOf(currency.toUpperCase()) === -1) {
      const parsed = {
        type,
        amount,
        currency: currency || null,
        debit_account: debitAccountId || null,
        credit_account: creditAccountId || null,
        execute_by: executeBy || null,
        accounts: [],
      };
      return buildError(
        parsed,
        'Unsupported currency. Only NGN, USD, GBP, and GHS are supported',
        'CU02'
      );
    }

    // validate account id format
    if (!isValidAccountId(debitAccountId) || !isValidAccountId(creditAccountId)) {
      const parsed = {
        type,
        amount,
        currency,
        debit_account: debitAccountId,
        credit_account: creditAccountId,
        execute_by: executeBy || null,
        accounts: [],
      };
      return buildError(parsed, 'Invalid account ID format', 'AC04');
    }

    if (debitAccountId === creditAccountId) {
      const parsed = {
        type,
        amount,
        currency,
        debit_account: debitAccountId,
        credit_account: creditAccountId,
        execute_by: executeBy || null,
        accounts: [],
      };
      return buildError(parsed, 'Debit and credit accounts cannot be the same', 'AC02');
    }

    const accountsMap = {};
    for (let i = 0; i < accounts.length; i += 1) {
      const a = accounts[i];
      if (a && a.id) {
        accountsMap[a.id] = a;
      }
    }

    const debitAccount = accountsMap[debitAccountId] || null;
    const creditAccount = accountsMap[creditAccountId] || null;
    if (!debitAccount || !creditAccount) {
      const parsed = {
        type,
        amount,
        currency,
        debit_account: debitAccountId,
        credit_account: creditAccountId,
        execute_by: executeBy || null,
        accounts: [],
      };
      return buildError(parsed, 'Account not found', 'AC03');
    }

    // validate account currencies match instruction and each other
    const debitCurrency = (debitAccount.currency || '').toUpperCase();
    const creditCurrency = (creditAccount.currency || '').toUpperCase();
    if (debitCurrency !== creditCurrency) {
      const parsed = {
        type,
        amount,
        currency,
        debit_account: debitAccountId,
        credit_account: creditAccountId,
        execute_by: executeBy || null,
        accounts: [],
      };
      return buildError(parsed, 'Account currency mismatch', 'CU01');
    }
    if (debitCurrency !== currency) {
      const parsed = {
        type,
        amount,
        currency,
        debit_account: debitAccountId,
        credit_account: creditAccountId,
        execute_by: executeBy || null,
        accounts: [],
      };
      return buildError(parsed, 'Account currency mismatch', 'CU01');
    }

    // validate date if present
    let executeByIso = null;
    let isFuture = false;
    if (executeBy) {
      const parsedDate = parseDateString(executeBy);
      if (!parsedDate) {
        const parsed = {
          type,
          amount,
          currency,
          debit_account: debitAccountId,
          credit_account: creditAccountId,
          execute_by: executeBy || null,
          accounts: [],
        };
        return buildError(parsed, 'Invalid date format', 'DT01');
      }
      executeByIso = parsedDate.iso;
      const cmp = compareDateToTodayUTC(parsedDate);
      if (cmp === 1) isFuture = true;
    }

    if (!isFuture) {
      const available = Number(debitAccount.balance);
      if (!Number.isFinite(available)) {
        const parsed = {
          type,
          amount,
          currency,
          debit_account: debitAccountId,
          credit_account: creditAccountId,
          execute_by: executeByIso || null,
          accounts: [],
        };
        return buildError(parsed, 'Insufficient funds in debit account', 'AC01');
      }
      if (available < amount) {
        const parsed = {
          type,
          amount,
          currency,
          debit_account: debitAccountId,
          credit_account: creditAccountId,
          execute_by: executeByIso || null,
          accounts: [],
        };
        return buildError(
          parsed,
          `Insufficient funds in debit account: has ${available} ${currency}, needs ${amount} ${currency}`,
          'AC01'
        );
      }
    }

    // build accounts response in the original request order but only include involved accounts
    const accountsResponse = [];
    for (let i = 0; i < accounts.length; i += 1) {
      const a = accounts[i];
      if (a && a.id) {
        if (a.id === debitAccountId || a.id === creditAccountId) {
          accountsResponse.push({
            id: a.id,
            balance: a.balance,
            balance_before: a.balance,
            currency: (a.currency || '').toUpperCase(),
          });
        }
      }
    }

    if (!isFuture) {
      // update balances in the response objects
      for (let i = 0; i < accountsResponse.length; i += 1) {
        const acc = accountsResponse[i];
        if (acc.id === debitAccountId) {
          const before = Number(debitAccount.balance);
          acc.balance_before = before;
          acc.balance = before - amount;
        }
        if (acc.id === creditAccountId) {
          const before = Number(creditAccount.balance);
          acc.balance_before = before;
          acc.balance = before + amount;
        }
      }
      const data = {
        type,
        amount,
        currency,
        debit_account: debitAccountId,
        credit_account: creditAccountId,
        execute_by: executeByIso || null,
        status: 'successful',
        status_reason: 'Transaction executed successfully',
        status_code: 'AP00',
        accounts: accountsResponse,
      };
      return { status: 200, data };
    }

    // future scheduled
    const data = {
      type,
      amount,
      currency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeByIso || null,
      status: 'pending',
      status_reason: 'Transaction scheduled for future execution',
      status_code: 'AP02',
      accounts: accountsResponse,
    };
    return { status: 200, data };
  },
});
