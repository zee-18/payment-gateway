const axios = require('axios');
const { processPayPalPayment, processBraintreePayment } = require('../controllers/paymentController');
const { saveOrder } = require('../models/orderModel');

jest.mock('axios');
jest.mock('../models/orderModel', () => ({
  saveOrder: jest.fn(),
}));

describe('Payment Controller', () => {
  describe('processPayPalPayment', () => {
    it('should return success response on valid PayPal payment', async () => {
      const req = {
        body: {
          amount: '10.00',
          currency: 'USD',
          card_name: 'John Doe',
          card_number: '4111111111111111',
          expiration_month: '12',
          expiration_year: '2025',
          cvv: '123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      
      axios.post.mockResolvedValueOnce({ data: { access_token: 'test_access_token' } });

      
      axios.post.mockResolvedValueOnce({ data: { id: 'PAY-12345' } });

      await processPayPalPayment(req.body, res);

      expect(axios.post).toHaveBeenCalled();
      expect(saveOrder).toHaveBeenCalledWith({
        customer_name: 'John Doe',
        amount: '10.00',
        currency: 'USD',
        payment_gateway: 'PayPal',
        payment_status: 'Success',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payment: { id: 'PAY-12345' }
      });
    });

    it('should handle PayPal payment failure', async () => {
      const req = {
        body: {
          amount: '10.00',
          currency: 'USD',
          card_name: 'John Doe',
          card_number: '4111111111111111',
          expiration_month: '12',
          expiration_year: '2025',
          cvv: '123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      
      axios.post.mockResolvedValueOnce({ data: { access_token: 'test_access_token' } });

      
      axios.post.mockRejectedValueOnce({ response: { data: { message: 'Payment error' } } });

      await processPayPalPayment(req.body, res);

      expect(axios.post).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Payment failed',
        error: { message: 'Payment error' }
      });
    });
  });

  describe('processBraintreePayment', () => {
    let braintree;

    beforeAll(() => {
      braintree = require('../config/braintreeConfig');
      jest.spyOn(braintree.transaction, 'sale').mockImplementation((saleRequest, callback) => {
        callback(null, { success: true, transaction: { id: 'BT-12345' } });
      });
    });

    it('should return success response on valid Braintree payment', async () => {
      const req = {
        body: {
          amount: '10.00',
          card_number: '4111111111111111',
          expiration_month: '12',
          expiration_year: '2025',
          cvv: '123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };

      await processBraintreePayment(req.body, res);

      expect(braintree.transaction.sale).toHaveBeenCalledWith(expect.any(Object), expect.any(Function));
      expect(saveOrder).toHaveBeenCalledWith({
        customer_name: undefined, 
        amount: '10.00',
        currency: undefined,
        payment_gateway: 'Braintree',
        payment_status: 'Success',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('Payment successful and order saved!');
    });

    it('should handle Braintree payment failure', async () => {
      braintree.transaction.sale.mockImplementationOnce((saleRequest, callback) => {
        callback(null, { success: false });
      });

      const req = {
        body: {
          amount: '10.00',
          card_number: '4111111111111111',
          expiration_month: '12',
          expiration_year: '2025',
          cvv: '123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };

      await processBraintreePayment(req.body, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Payment failed.');
    });
  });
});
