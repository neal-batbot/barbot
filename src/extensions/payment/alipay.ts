import { AlipaySdk } from 'alipay-sdk';

import {
  CheckoutSession,
  PaymentConfigs,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  PaymentType,
} from './types';

/**
 * Alipay payment provider configs
 * @docs https://opendocs.alipay.com/open/54/cyz7do
 */
export interface AlipayConfigs extends PaymentConfigs {
  /** 支付宝应用 App ID */
  appId: string;
  /** 应用私钥（PKCS8 格式，以 -----BEGIN PRIVATE KEY----- 开头） */
  privateKey: string;
  /** 支付宝公钥（用于验签，在支付宝开放平台管理台获取） */
  alipayPublicKey: string;
  /** 网关地址，默认生产环境 */
  gateway?: string;
  /** 异步通知 URL（服务器端回调，需公网可访问） */
  notifyUrl?: string;
  /** 同步跳转 URL（支付成功后跳转到该地址） */
  returnUrl?: string;
}

const GATEWAY_PROD = 'https://openapi.alipay.com/gateway.do';
const GATEWAY_SANDBOX = 'https://openapi-sandbox.dl.alipay.com/gateway.do';

/**
 * Alipay payment provider (支付宝官方接口 — PC 网页支付)
 * @website https://open.alipay.com/
 *
 * 支持场景：
 *  - alipay.trade.page.pay  → PC 网页跳转支付（月/年付订阅用 one-time 模式）
 *
 * 注意：支付宝不支持周期性自动扣款（自动续费需另接 alipay.trade.pay + ISV），
 * 本实现将所有订单统一为一次性收款，到期前由平台提醒用户手动续费。
 */
export class AlipayProvider implements PaymentProvider {
  readonly name = 'alipay';
  configs: AlipayConfigs;

  private client: AlipaySdk;

  constructor(configs: AlipayConfigs) {
    this.configs = configs;
    this.client = new AlipaySdk({
      appId: configs.appId,
      privateKey: configs.privateKey,
      alipayPublicKey: configs.alipayPublicKey,
      gateway: configs.gateway || GATEWAY_PROD,
    });
  }

  async createPayment({ order }: { order: PaymentOrder }): Promise<CheckoutSession> {
    if (!order.price) {
      throw new Error('price is required');
    }

    const outTradeNo = order.metadata?.order_no || order.orderNo || Date.now().toString();
    const totalAmount = (order.price.amount / 100).toFixed(2); // 分 → 元

    const bizContent = {
      out_trade_no: outTradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: totalAmount,
      subject: order.description || 'BatBot 订阅',
      body: order.description || '',
    };

    // alipay.trade.page.pay 返回的是一段 HTML 表单，浏览器提交即跳转支付宝
    const pagePayUrl = this.client.pageExec('alipay.trade.page.pay', {
      bizContent,
      notify_url: this.configs.notifyUrl,
      return_url: order.successUrl || this.configs.returnUrl,
    });

    return {
      provider: this.name,
      checkoutParams: bizContent,
      checkoutInfo: {
        sessionId: outTradeNo,
        checkoutUrl: pagePayUrl,
      },
      checkoutResult: { pagePayUrl },
      metadata: order.metadata || {},
    };
  }

  /**
   * 主动查询订单状态（支付宝 alipay.trade.query）
   */
  async getPaymentSession({ sessionId }: { sessionId: string }): Promise<PaymentSession> {
    const result = await this.client.exec('alipay.trade.query', {
      bizContent: { out_trade_no: sessionId },
    });

    const tradeStatus: string = result.trade_status || '';

    let paymentStatus: PaymentStatus;
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      paymentStatus = PaymentStatus.SUCCESS;
    } else if (tradeStatus === 'WAIT_BUYER_PAY') {
      paymentStatus = PaymentStatus.PROCESSING;
    } else {
      paymentStatus = PaymentStatus.CANCELED;
    }

    return {
      provider: this.name,
      paymentStatus,
      paymentInfo: {
        transactionId: result.trade_no,
        paymentAmount: Math.round(parseFloat(result.total_amount || '0') * 100),
        paymentCurrency: 'cny',
        paymentEmail: result.buyer_logon_id || '',
        paymentUserName: result.buyer_user_id || '',
        paidAt: result.send_pay_date ? new Date(result.send_pay_date) : undefined,
      },
      paymentResult: result,
      metadata: {},
    };
  }

  /**
   * 处理支付宝异步通知（POST 到 notifyUrl）
   */
  async getPaymentEvent({ req }: { req: Request }): Promise<any> {
    const body = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(body).forEach((v, k) => { params[k] = v; });

    // 验签
    const isValid = this.client.checkNotifySign(params);
    if (!isValid) {
      throw new Error('Alipay notify signature verification failed');
    }

    const tradeStatus: string = params.trade_status || '';
    let paymentStatus: PaymentStatus;
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      paymentStatus = PaymentStatus.SUCCESS;
    } else if (tradeStatus === 'TRADE_CLOSED') {
      paymentStatus = PaymentStatus.CANCELED;
    } else {
      paymentStatus = PaymentStatus.PROCESSING;
    }

    const paymentSession: PaymentSession = {
      provider: this.name,
      paymentStatus,
      paymentInfo: {
        transactionId: params.trade_no,
        paymentAmount: Math.round(parseFloat(params.total_amount || '0') * 100),
        paymentCurrency: 'cny',
        paymentEmail: params.buyer_logon_id || '',
        paymentUserName: params.buyer_user_id || '',
        paidAt: params.gmt_payment ? new Date(params.gmt_payment) : undefined,
      },
      paymentResult: params,
      metadata: {
        order_no: params.out_trade_no,
      },
    };

    return {
      eventType: paymentStatus === PaymentStatus.SUCCESS
        ? PaymentEventType.CHECKOUT_SUCCESS
        : PaymentEventType.PAYMENT_FAILED,
      eventResult: params,
      paymentSession,
    };
  }
}

export function createAlipayProvider(configs: AlipayConfigs): AlipayProvider {
  return new AlipayProvider(configs);
}
