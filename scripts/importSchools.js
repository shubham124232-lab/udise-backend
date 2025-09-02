const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const csv = require('csv-parser');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const School = require('../models/School');

console.log('Starting import.js...');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shubham124232_db_user:wwRxf9l5sGbXjZcZ@udise-cluster.rjaqicc.mongodb.net/udise_db?retryWrites=true&w=majority&appName=udise-cluster';
const BATCH_SIZE = 1000;
const MAX_RECORDS = 2000000;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    console.log(`Collection: ${School.collection.name}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

const cleanPrefix = (val) => {
  if (!val) return val;
  return val.toString().replace(/^\d+\-\s*/, '').trim();
};

const processSchoolData = (data) => {
  let management = cleanPrefix(data.state_mgmt || data.national_mgmt);
  if (management === 'MPP_ZPP SCHOOLS' || management === 'Department of Education') {
    management = 'Government';
  } else if (management === 'Pvt.Unaided' || management === 'Private Unaided (Recognized)') {
    management = 'Private Unaided';
  } else if (management === 'Aided' || management === 'Private Aided (Recognized)') {
    management = 'Aided';
  } else {
    management = 'Other';
  }

  let school_type = cleanPrefix(data.school_type);
  if (school_type === 'Co-educational') {
    school_type = 'Co-Ed';
  } else if (!['Girls', 'Boys', 'Other'].includes(school_type)) {
    school_type = 'Other';
  }

  let school_status = cleanPrefix(data.school_status);
  if (school_status === 'Closed') {
    school_status = 'Permanently Closed';
  } else if (!['Operational', 'Permanently Closed', 'Other'].includes(school_status)) {
    school_status = 'Other';
  }

  const block = data.block?.trim() && data.block !== 'null' ? data.block.trim() : 'Unknown';
  const village = data.village?.trim() && data.village !== 'null' ? data.village.trim() : 'Unknown';

  return {
    udise_code: data.udise_code?.trim(),
    school_name: data.school_name?.trim(),
    state: data.state?.trim(),
    district: data.district?.trim(),
    block,
    village,
    cluster: data.cluster?.trim(),
    management,
    location: cleanPrefix(data.location) || 'Other',
    school_category: cleanPrefix(data.school_category),
    school_type,
    school_status,
    isActive: school_status === 'Operational',
  };
};

async function importSchools() {
  await connectDB();

  let batch = [];
  let count = 0;
  let totalProcessed = 0;

  const csvFilePath = path.resolve(__dirname, '../data/schools.csv');
  console.log('Reading CSV from:', csvFilePath);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found at: ${csvFilePath}`);
    await mongoose.connection.close();
    process.exit(1);
  }

  const stream = fs.createReadStream(csvFilePath).pipe(csv());

  stream.on('headers', (headers) => {
    console.log('CSV Headers:', headers);
  });

  stream.on('data', async (data) => {
    if (totalProcessed >= MAX_RECORDS) {
      stream.destroy();
      console.log(`Reached max records limit: ${MAX_RECORDS}`);
      return;
    }

    stream.pause();
    totalProcessed++;

    const processed = processSchoolData(data);
    if (processed.udise_code && processed.school_name && processed.state && processed.district) {
      batch.push(processed);
    } else {
      console.warn(`Skipped invalid record: ${data.udise_code || 'unknown'}`);
    }

    if (batch.length >= BATCH_SIZE) {
      try {
        console.log(`Inserting batch of ${batch.length} records...`);
        await School.insertMany(batch, { ordered: false });
        count += batch.length;
        console.log(`Inserted ${count} records total`);
        batch = [];
      } catch (err) {
        console.error('Error inserting batch:', err);
        if (err.code === 11000) {
          console.error('Duplicate UDISE codes:', err.keyValue);
        }
        batch = [];
      }
    }
    stream.resume();
  });

  stream.on('end', async () => {
    if (batch.length > 0) {
      try {
        console.log(`Inserting final batch of ${batch.length} records...`);
        await School.insertMany(batch, { ordered: false });
        count += batch.length;
        console.log(`Inserted ${count} records total`);
      } catch (err) {
        console.error('Error inserting last batch:', err);
        if (err.code === 11000) {
          console.error('Duplicate UDISE codes:', err.keyValue);
        }
      }
    }
    console.log(`✅ Import completed successfully! Total records processed: ${totalProcessed}, Inserted: ${count}`);
    const totalRecords = await School.countDocuments();
    console.log(`Total documents in ${School.collection.name} collection: ${totalRecords}`);
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  });

  stream.on('error', async (err) => {
    console.error('❌ CSV read error:', err);
    await mongoose.connection.close();
    process.exit(1);
  });
}

importSchools();