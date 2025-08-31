const csv = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const School = require('../models/School');
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udise-dashboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Data cleaning and mapping functions
const cleanString = (str) => {
    if (!str) return '';
    return str.toString().trim().replace(/\s+/g, ' ');
};

const cleanNumber = (num) => {
    if (!num || isNaN(num)) return 0;
    return parseInt(num) || 0;
};

const mapManagementType = (management) => {
    const clean = cleanString(management).toLowerCase();
    
    if (clean.includes('government') || clean.includes('govt')) return 'Government';
    if (clean.includes('private unaided') || clean.includes('private')) return 'Private Unaided';
    if (clean.includes('aided')) return 'Private Aided';
    if (clean.includes('central')) return 'Central Government';
    return 'Other';
};

const mapLocation = (location) => {
    const clean = cleanString(location).toLowerCase();
    
    if (clean.includes('rural')) return 'Rural';
    if (clean.includes('urban')) return 'Urban';
    return 'Rural'; // Default to Rural if unclear
};

const mapSchoolType = (type) => {
    const clean = cleanString(type).toLowerCase();
    
    if (clean.includes('girls') || clean.includes('girl')) return 'Girls';
    if (clean.includes('boys') || clean.includes('boy')) return 'Boys';
    return 'Co-Ed'; // Default to Co-Ed
};

const processSchoolData = (row) => {
    return {
        udise_code: cleanString(row.udise_code || row.UDISE_CODE || row.udise),
        school_name: cleanString(row.school_name || row.SCHOOL_NAME || row.school || row.name),
        state: cleanString(row.state || row.STATE),
        district: cleanString(row.district || row.DISTRICT),
        block: cleanString(row.block || row.BLOCK),
        village: cleanString(row.village || row.VILLAGE || row.town || row.city),
        management: mapManagementType(row.management || row.MANAGEMENT || row.management_type),
        location: mapLocation(row.location || row.LOCATION || row.rural_urban),
        school_type: mapSchoolType(row.school_type || row.SCHOOL_TYPE || row.type),
        establishment_year: cleanNumber(row.establishment_year || row.ESTABLISHMENT_YEAR || row.year),
        total_students: cleanNumber(row.total_students || row.TOTAL_STUDENTS || row.students),
        total_teachers: cleanNumber(row.total_teachers || row.TOTAL_TEACHERS || row.teachers),
        infrastructure: {
            has_electricity: Boolean(row.electricity || row.ELECTRICITY),
            has_drinking_water: Boolean(row.drinking_water || row.DRINKING_WATER),
            has_toilets: Boolean(row.toilets || row.TOILETS),
            has_library: Boolean(row.library || row.LIBRARY),
            has_computer_lab: Boolean(row.computer_lab || row.COMPUTER_LAB)
        },
        academic_performance: {
            pass_percentage: cleanNumber(row.pass_percentage || row.PASS_PERCENTAGE),
            dropout_rate: cleanNumber(row.dropout_rate || row.DROPOUT_RATE)
        },
        contact_info: {
            phone: cleanString(row.phone || row.PHONE),
            email: cleanString(row.email || row.EMAIL),
            website: cleanString(row.website || row.WEBSITE)
        },
        coordinates: {
            latitude: parseFloat(row.latitude || row.LATITUDE) || null,
            longitude: parseFloat(row.longitude || row.LONGITUDE) || null
        }
    };
};

const seedData = async (csvFilePath, limit = null) => {
    try {
        console.log('🚀 Starting data import...');
        
        // Clear existing data
        await School.deleteMany({});
        console.log('🗑️  Cleared existing school data');
        
        const schools = [];
        let count = 0;
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    try {
                        const schoolData = processSchoolData(row);
                        
                        // Validate required fields
                        if (schoolData.udise_code && schoolData.school_name && 
                            schoolData.state && schoolData.district && 
                            schoolData.block && schoolData.village) {
                            
                            schools.push(schoolData);
                            count++;
                            
                            // Log progress
                            if (count % 1000 === 0) {
                                console.log(`📊 Processed ${count} records...`);
                            }
                            
                            // Check limit
                            if (limit && count >= limit) {
                                this.destroy(); // Stop reading
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️  Skipping invalid row:', error.message);
                    }
                })
                .on('end', async () => {
                    try {
                        console.log(`📝 Total records processed: ${count}`);
                        
                        if (schools.length === 0) {
                            console.log('❌ No valid records found');
                            resolve();
                            return;
                        }
                        
                        // Insert in batches to avoid memory issues
                        const batchSize = 1000;
                        for (let i = 0; i < schools.length; i += batchSize) {
                            const batch = schools.slice(i, i + batchSize);
                            await School.insertMany(batch, { ordered: false });
                            console.log(`💾 Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(schools.length / batchSize)}`);
                        }
                        
                        console.log(`✅ Successfully imported ${schools.length} schools`);
                        
                        // Get some statistics
                        const totalSchools = await School.countDocuments();
                        const states = await School.distinct('state');
                        const districts = await School.distinct('district');
                        
                        console.log(`📊 Database Statistics:`);
                        console.log(`   Total Schools: ${totalSchools}`);
                        console.log(`   States: ${states.length}`);
                        console.log(`   Districts: ${districts.length}`);
                        
                        resolve();
                        
                    } catch (error) {
                        console.error('❌ Error during database insertion:', error);
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    console.error('❌ Error reading CSV file:', error);
                    reject(error);
                });
        });
        
    } catch (error) {
        console.error('❌ Seeding error:', error);
        throw error;
    }
};

// CLI usage
if (require.main === module) {
    const csvPath = process.argv[2];
    const limit = process.argv[3] ? parseInt(process.argv[3]) : null;
    
    if (!csvPath) {
        console.log('Usage: node dataSeeder.js <csv-file-path> [limit]');
        console.log('Example: node dataSeeder.js ./schools.csv 800000');
        process.exit(1);
    }
    
    seedData(csvPath, limit)
        .then(() => {
            console.log('🎉 Data seeding completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Data seeding failed:', error);
            process.exit(1);
        });
}

module.exports = { seedData, processSchoolData }; 