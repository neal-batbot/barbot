import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PaymentInterval,
  PaymentStatus,
  PaymentType,
  type PaymentSession,
} from '../src/extensions/payment/types';
import { buildManualCycleSubscriptionInfo } from '../src/shared/services/payment';

function createOrder(overrides: Record<string, unknown> = {}) {
  return {
    orderNo: '202605170001',
    userId: 'user-1',
    userEmail: 'buyer@example.com',
    paymentProvider: 'alipay',
    paymentType: PaymentType.SUBSCRIPTION,
    paymentInterval: PaymentInterval.MONTH,
    productId: 'pro-monthly',
    productName: 'BatBot Pro',
    planName: 'pro',
    amount: 9900,
    currency: 'cny',
    ...overrides,
  } as any;
}

test('alipay successful subscription payment creates a manual monthly cycle', () => {
  const paidAt = new Date('2026-05-17T00:00:00Z');
  const session: PaymentSession = {
    provider: 'alipay',
    paymentStatus: PaymentStatus.SUCCESS,
    paymentInfo: {
      paymentAmount: 9900,
      paymentCurrency: 'cny',
      paidAt,
    },
  };

  const subscriptionInfo = buildManualCycleSubscriptionInfo({
    order: createOrder(),
    session,
  });

  assert.equal(subscriptionInfo?.subscriptionId, 'alipay:202605170001');
  assert.equal(subscriptionInfo?.interval, PaymentInterval.MONTH);
  assert.equal(
    subscriptionInfo?.currentPeriodStart.toISOString(),
    paidAt.toISOString()
  );
  assert.equal(
    subscriptionInfo?.currentPeriodEnd.toISOString(),
    '2026-06-17T00:00:00.000Z'
  );
});

test('alipay successful subscription payment creates a manual yearly cycle', () => {
  const paidAt = new Date('2026-05-17T00:00:00Z');
  const session: PaymentSession = {
    provider: 'alipay',
    paymentStatus: PaymentStatus.SUCCESS,
    paymentInfo: {
      paymentAmount: 99900,
      paymentCurrency: 'cny',
      paidAt,
    },
  };

  const subscriptionInfo = buildManualCycleSubscriptionInfo({
    order: createOrder({
      orderNo: '202605170002',
      paymentInterval: PaymentInterval.YEAR,
      productId: 'pro-yearly',
    }),
    session,
  });

  assert.equal(subscriptionInfo?.subscriptionId, 'alipay:202605170002');
  assert.equal(subscriptionInfo?.interval, PaymentInterval.YEAR);
  assert.equal(
    subscriptionInfo?.currentPeriodEnd.toISOString(),
    '2027-05-17T00:00:00.000Z'
  );
});
