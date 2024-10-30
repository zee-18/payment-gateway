const pool = require('../config/db');

const saveOrder = async (orderData) => {
  const { customer_name, amount, currency, payment_gateway, payment_status } = orderData;

  try {
    const query = `
      INSERT INTO orders (customer_name, amount, currency, payment_gateway, payment_status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [customer_name, amount, currency, payment_gateway, payment_status];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error saving order:', err);
    throw err;
  }
};

module.exports = { saveOrder };
