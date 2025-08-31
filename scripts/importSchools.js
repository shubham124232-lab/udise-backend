require('dotenv').config({ path: './.env' });

const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const School = require('../models/School');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

const importSchools = async () => {
  await connectDB();
  const results = [];
  fs.createReadStream('data/schools.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await School.insertMany(results);
        console.log('🎉 Data Imported Successfully');
        process.exit();
      } catch (err) {
        console.error('❌ Error importing data:', err);
        process.exit(1);
      }
    });
};

importSchools();
