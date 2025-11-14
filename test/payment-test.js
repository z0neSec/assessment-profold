const handlerConfig = require('../endpoints/payment-instructions');

async function runTest(caseName, payload) {
  try {
    const req = { body: payload };
    const result = await handlerConfig.handler(req);
    console.log('---', caseName, '---');
    console.log('HTTP status:', result.status);
    console.log(JSON.stringify(result.data, null, 2));
    console.log('\n');
  } catch (err) {
    console.error('Error running test', caseName, err);
  }
}

async function main() {
  await runTest('Valid DEBIT', {
    accounts: [
      { id: 'N90394', balance: 1000, currency: 'USD' },
      { id: 'N9122', balance: 500, currency: 'USD' },
    ],
    instruction: 'DEBIT 500 USD FROM ACCOUNT N90394 FOR CREDIT TO ACCOUNT N9122',
  });

  await runTest('Future CREDIT', {
    accounts: [
      { id: 'acc-001', balance: 1000, currency: 'NGN' },
      { id: 'acc-002', balance: 500, currency: 'NGN' },
    ],
    instruction: 'CREDIT 300 NGN TO ACCOUNT acc-002 FOR DEBIT FROM ACCOUNT acc-001 ON 2099-12-31',
  });

  await runTest('Case Insensitive', {
    accounts: [
      { id: 'a', balance: 500, currency: 'GBP' },
      { id: 'b', balance: 200, currency: 'GBP' },
    ],
    instruction: 'debit 100 gbp from account a for credit to account b',
  });

  await runTest('Unsupported currency', {
    accounts: [
      { id: 'a', balance: 100, currency: 'EUR' },
      { id: 'b', balance: 500, currency: 'EUR' },
    ],
    instruction: 'DEBIT 50 EUR FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
  });

  await runTest('Malformed', {
    accounts: [
      { id: 'a', balance: 500, currency: 'USD' },
      { id: 'b', balance: 200, currency: 'USD' },
    ],
    instruction: 'SEND 100 USD TO ACCOUNT b',
  });
}

main();
