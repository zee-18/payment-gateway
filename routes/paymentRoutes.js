const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/process-payment', (req, res) => {
  const { amount, currency, card_name, card_number, expiration_month, expiration_year, cvv } = req.body;

  if (!amount || !currency || !card_name || !card_number || !expiration_month || !expiration_year || !cvv) {
    return res.status(400).send('All fields are required.');
  }

  const isAmex = card_number.startsWith('34') || card_number.startsWith('37');

  if (isAmex && currency !== 'USD') {
    return res.status(400).send('AMEX is only available for USD payments.');
  }

  if (isAmex || ['USD', 'EUR', 'AUD'].includes(currency)) {
    paymentController.processPayPalPayment(req.body, res);
  } else {

    paymentController.processBraintreePayment(req.body, res);
  }
});

module.exports = router;
