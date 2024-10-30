const { default: axios } = require('axios');
const braintree = require('../config/braintreeConfig');
const { saveOrder } = require('../models/orderModel');
require('dotenv').config();

function getCardType(card_number) {
  const firstDigit = card_number[0];
  if (firstDigit === '4') return 'visa';
  if (firstDigit === '5') return 'mastercard';
  if (card_number.startsWith('34') || card_number.startsWith('37')) return 'amex';
  return 'discover';
}

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(`${process.env.PAYPAL_API_BASE_URL}/v1/oauth2/token`, 'grant_type=client_credentials', {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data.access_token;
}

// Process PayPal Payment
exports.processPayPalPayment = async (paymentData, res) => {
  const { amount, currency, card_name, card_number, expiration_month, expiration_year, cvv } = paymentData;

  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "credit_card",
      funding_instruments: [{
        credit_card: {
          type: getCardType(card_number),
          number: card_number,
          expire_month: expiration_month,
          expire_year: expiration_year,
          cvv2: cvv,
          first_name: card_name.split(' ')[0],
          last_name: card_name.split(' ')[1] || ''
        }
      }]
    },
    transactions: [{
      amount: {
        total: amount,
        currency: currency
      },
      description: `Payment of ${amount} ${currency}`
    }]
  };
  try {
    const accessToken = await getAccessToken();
    const paymentResponse = await axios.post(`${PAYPAL_API_BASE_URL}/v1/payments/payment`, create_payment_json, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    await saveOrder({
      customer_name: card_name,
      amount: amount,
      currency: currency,
      payment_gateway: 'PayPal',
      payment_status: 'Success',
    });
    res.status(200).json({ success: true, payment: paymentResponse.data });
  }
  catch (error) {
    console.error('PayPal Error:', error.response ? error.response.data : error);
    res.status(500).json({ success: false, message: 'Payment failed', error: error.response ? error.response.data : error });
  }
};

exports.processBraintreePayment = (paymentData, res) => {
  const { amount, card_number, expiration_month, expiration_year, cvv } = paymentData;

  const saleRequest = {
    amount: amount,
    creditCard: {
      number: card_number,
      expirationMonth: expiration_month,
      expirationYear: expiration_year,
      cvv: cvv
    },
    options: {
      submitForSettlement: true
    }
  };

  braintree.transaction.sale(saleRequest, async (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Payment failed.');
    }

    if (result.success) {
      console.log('Braintree Payment Success:', result);

      try {
        await saveOrder({
          customer_name: paymentData.card_name,
          amount: amount,
          currency: paymentData.currency,
          payment_gateway: 'Braintree',
          payment_status: 'Success',
        });
      } catch (dbError) {
        return res.status(500).send('Payment successful, but failed to save order to database.');
      }

      return res.status(200).send('Payment successful and order saved!');
    } else {
      console.log('Braintree Payment Failed:', result);
      return res.status(400).send('Payment failed.');
    }
  });
};
