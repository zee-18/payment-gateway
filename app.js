const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const paymentRoutes = require('./routes/paymentRoutes');
const pool = require('./config/db');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(paymentRoutes);

app.use(cors()); 
app.use(express.json()); 

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error connecting to Postgres:', err);
    } else {
      console.log('Postgres connected:', res.rows);
    }
  });
