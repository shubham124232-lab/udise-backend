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

// Map management type from CSV values to schema values
const mapManagementType = (stateMgn) => {
    const clean = cleanString(stateMgn);
    
    // Based on your CSV: 1-Department, 5-Private
    switch (clean) {
        case '1':
        case '1-Department':
            return 'Government';
        case '5':
        case '5-Private':
            return 'Private Unaided';
        case '2':
        case '2-Tribal':
            return 'Government';
        case '3':
        case '3-Minority':
            return 'Private Aided';
        case '4':
        case '4-Other':
            return 'Other';
        default:
            return 'Government'; // Default to Government
    }
};

// Map location from CSV values to schema values
const mapLocation = (location) => {
    const clean = cleanString(location);
    
    // Based on your CSV: 1-Rural, 2-Urban
    switch (clean) {
        case '1':
        case '1-Rural':
            return 'Rural';
        case '2':
        case '2-Urban':
            return 'Urban';
        default:
            return 'Rural'; // Default to Rural
    }
};

// Map school type from CSV values to schema values
const mapSchoolType = (schoolTyp) => {
    const clean = cleanString(schoolTyp);
    
    // Based on your CSV: 3-Co-educational
    switch (clean) {
        case '3':
        case '3-Co-educational':
            return 'Co-Ed';
        case '1':
        case '1-Boys':
            return 'Boys';
        case '2':
        case '2-Girls':
            return 'Girls';
        default:
            return 'Co-Ed'; // Default to Co-Ed
    }
};

// Process school data from CSV row to match schema
const processSchoolData = (row) => {
    return {
        udise_code: cleanString(row.udise_cod || row.udise_code), // CSV: udise_cod
        school_name: cleanString(row.school_na || row.school_name), // CSV: school_na
        state: cleanString(row.state),
        district: cleanString(row.district),
        block: cleanString(row.block),
        village: cleanString(row.village),
        management: mapManagementType(row.state_mgn), // CSV: state_mgn
        location: mapLocation(row.location), // CSV: location
        school_type: mapSchoolType(row.school_typ), // CSV: school_typ
        establishment_year: cleanNumber(row.establishment_year || row.year),
        total_students: cleanNumber(row.total_students || row.students),
        total_teachers: cleanNumber(row.total_teachers || row.teachers),
        infrastructure: {
            has_electricity: Boolean(row.electricity || row.elec),
            has_drinking_water: Boolean(row.drinking_water || row.water),
            has_toilets: Boolean(row.toilets || row.toilet),
            has_library: Boolean(row.library),
            has_computer_lab: Boolean(row.computer_lab || row.comp_lab)
        },
        academic_performance: {
            pass_percentage: cleanNumber(row.pass_percentage || row.pass_rate),
            dropout_rate: cleanNumber(row.dropout_rate || row.dropout)
        },
        contact_info: {
            phone: cleanString(row.phone || row.telephone),
            email: cleanString(row.email),
            website: cleanString(row.website || row.web)
        },
        coordinates: {
            latitude: parseFloat(row.latitude || row.lat) || null,
            longitude: parseFloat(row.longitude || row.lng) || null
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