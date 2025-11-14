const { expect } = require('chai');
const handlerConfig = require('../endpoints/payment-instructions');

describe('Payment Instructions Handler - Valid Cases', () => {
  it('should execute DEBIT transaction successfully', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'N90394', balance: 1000, currency: 'USD' },
          { id: 'N9122', balance: 500, currency: 'USD' },
        ],
        instruction: 'DEBIT 500 USD FROM ACCOUNT N90394 FOR CREDIT TO ACCOUNT N9122',
      },
    });
    expect(result.status).to.equal(200);
    expect(result.data.status_code).to.equal('AP00');
  });

  it('should mark CREDIT transaction with future date as pending', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 1000, currency: 'NGN' },
          { id: 'b', balance: 500, currency: 'NGN' },
        ],
        instruction: 'CREDIT 300 NGN TO ACCOUNT b FOR DEBIT FROM ACCOUNT a ON 2099-12-31',
      },
    });
    expect(result.status).to.equal(200);
    expect(result.data.status_code).to.equal('AP02');
  });

  it('should handle case insensitive keywords', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 500, currency: 'GBP' },
          { id: 'b', balance: 200, currency: 'GBP' },
        ],
        instruction: 'debit 100 gbp from account a for credit to account b',
      },
    });
    expect(result.status).to.equal(200);
    expect(result.data.currency).to.equal('GBP');
  });
});

describe('Payment Instructions Handler - Invalid Cases', () => {
  it('should reject currency mismatch (CU01)', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 100, currency: 'USD' },
          { id: 'b', balance: 500, currency: 'GBP' },
        ],
        instruction: 'DEBIT 50 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('CU01');
  });

  it('should reject insufficient funds (AC01)', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 100, currency: 'USD' },
          { id: 'b', balance: 500, currency: 'USD' },
        ],
        instruction: 'DEBIT 500 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('AC01');
  });

  it('should reject unsupported currency (CU02)', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 100, currency: 'EUR' },
          { id: 'b', balance: 500, currency: 'EUR' },
        ],
        instruction: 'DEBIT 50 EUR FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('CU02');
  });

  it('should reject same account debit/credit (AC02)', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [{ id: 'a', balance: 500, currency: 'USD' }],
        instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT a',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('AC02');
  });

  it('should reject negative amount (AM01)', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 500, currency: 'USD' },
          { id: 'b', balance: 200, currency: 'USD' },
        ],
        instruction: 'DEBIT -100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('AM01');
  });

  it('should reject account not found (AC03)', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [{ id: 'a', balance: 500, currency: 'USD' }],
        instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT xyz',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('AC03');
  });

  it('should reject decimal amount (AM01)', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 500, currency: 'USD' },
          { id: 'b', balance: 200, currency: 'USD' },
        ],
        instruction: 'DEBIT 100.50 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('AM01');
  });

  it('should reject malformed instruction (SY01/SY03)', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 500, currency: 'USD' },
          { id: 'b', balance: 200, currency: 'USD' },
        ],
        instruction: 'SEND 100 USD TO ACCOUNT b',
      },
    });
    expect(result.status).to.equal(400);
    expect(['SY01', 'SY02', 'SY03']).to.include(result.data.status_code);
  });
});

describe('Payment Instructions Handler - Edge Cases', () => {
  it('should handle zero amount as invalid', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 500, currency: 'USD' },
          { id: 'b', balance: 200, currency: 'USD' },
        ],
        instruction: 'DEBIT 0 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('AM01');
  });

  it('should reject invalid date format', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'a', balance: 500, currency: 'USD' },
          { id: 'b', balance: 200, currency: 'USD' },
        ],
        instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b ON 2024/01/15',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('DT01');
  });

  it('should handle account IDs with special characters', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'acc-001', balance: 500, currency: 'USD' },
          { id: 'acc@bank.com', balance: 200, currency: 'USD' },
        ],
        instruction: 'DEBIT 100 USD FROM ACCOUNT acc-001 FOR CREDIT TO ACCOUNT acc@bank.com',
      },
    });
    expect(result.status).to.equal(200);
    expect(result.data.status_code).to.equal('AP00');
  });

  it('should reject account ID with invalid characters', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'acc#001', balance: 500, currency: 'USD' },
          { id: 'acc002', balance: 200, currency: 'USD' },
        ],
        instruction: 'DEBIT 100 USD FROM ACCOUNT acc#001 FOR CREDIT TO ACCOUNT acc002',
      },
    });
    expect(result.status).to.equal(400);
    expect(result.data.status_code).to.equal('AC04');
  });

  it('should handle multiple spaces between tokens', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'acc1', balance: 500, currency: 'USD' },
          { id: 'acc2', balance: 200, currency: 'USD' },
        ],
        instruction: 'DEBIT 100 USD FROM ACCOUNT acc1 FOR CREDIT TO ACCOUNT acc2',
      },
    });
    expect(result.status).to.equal(200);
    expect(result.data.status_code).to.equal('AP00');
  });

  it('should support CREDIT format correctly', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [
          { id: 'payer', balance: 1000, currency: 'USD' },
          { id: 'payee', balance: 500, currency: 'USD' },
        ],
        instruction: 'CREDIT 250 USD TO ACCOUNT payee FOR DEBIT FROM ACCOUNT payer',
      },
    });
    expect(result.status).to.equal(200);
    expect(result.data.type).to.equal('CREDIT');
    expect(result.data.debit_account).to.equal('payer');
    expect(result.data.credit_account).to.equal('payee');
  });

  it('should handle empty instruction', async () => {
    const result = await handlerConfig.handler({
      body: {
        accounts: [{ id: 'a', balance: 500, currency: 'USD' }],
        instruction: '',
      },
    });
    expect(result.status).to.equal(400);
  });
});
