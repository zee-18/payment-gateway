const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'admin',       
  host: 'localhost',           
  database: 'payment_gateway',
  password: process.env.DB_PASS,   
  port: 5432,                  
});

module.exports = pool;
