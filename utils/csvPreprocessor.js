const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const cleanString = (str) => {
    if (!str) return '';
    return str.toString().trim().replace(/\s+/g, ' ');
};

const cleanNumber = (num) => {
    if (!num || isNaN(num)) return 0;
    return parseInt(num) || 0;
};

const transformRow = (row) => {
    return {
        udise_code: cleanString(row.udise_cod),
        school_name: cleanString(row.school_na),
        state: cleanString(row.state),
        district: cleanString(row.district),
        block: cleanString(row.block),
        village: cleanString(row.village),
        management: transformManagement(row.state_mgn),
        location: transformLocation(row.location),
        school_type: transformSchoolType(row.school_typ),
        school_category: cleanString(row.school_cat),
        school_status: cleanString(row.school_status),
        establishment_year: cleanNumber(row.establishment_year),
        total_students: cleanNumber(row.total_students),
        total_teachers: cleanNumber(row.total_teachers),
        infrastructure: {
            has_electricity: Boolean(row.electricity),
            has_drinking_water: Boolean(row.drinking_water),
            has_toilets: Boolean(row.toilets),
            has_library: Boolean(row.library),
            has_computer_lab: Boolean(row.computer_lab)
        },
        academic_performance: {
            pass_percentage: cleanNumber(row.pass_percentage),
            dropout_rate: cleanNumber(row.dropout_rate)
        },
        contact_info: {
            phone: cleanString(row.phone),
            email: cleanString(row.email),
            website: cleanString(row.website)
        },
        coordinates: {
            latitude: parseFloat(row.latitude) || null,
            longitude: parseFloat(row.longitude) || null
        }
    };
};

const transformManagement = (stateMgn) => {
    const clean = cleanString(stateMgn);
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
            return 'Government';
    }
};

const transformLocation = (location) => {
    const clean = cleanString(location);
    switch (clean) {
        case '1':
        case '1-Rural':
            return 'Rural';
        case '2':
        case '2-Urban':
            return 'Urban';
        default:
            return 'Rural';
    }
};

const transformSchoolType = (schoolTyp) => {
    const clean = cleanString(schoolTyp);
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
            return 'Co-Ed';
    }
};

const preprocessCSV = async (inputPath, outputPath, limit = null) => {
    try {
        console.log('🔄 Starting CSV preprocessing...');
        console.log(`📁 Input: ${inputPath}`);
        console.log(`📁 Output: ${outputPath}`);
        
        const transformedRows = [];
        let count = 0;
        let skipped = 0;
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(inputPath)
                .pipe(csv())
                .on('data', (row) => {
                    try {
                        if (!row.udise_cod || !row.school_na || !row.state || !row.district || !row.block || !row.village) {
                            skipped++;
                            return;
                        }
                        
                        const transformedRow = transformRow(row);
                        transformedRows.push(transformedRow);
                        count++;
                        
                        if (count % 10000 === 0) {
                            console.log(`📊 Processed ${count} records...`);
                        }
                        
                        if (limit && count >= limit) {
                            this.destroy();
                        }
                    } catch (error) {
                        console.warn('⚠️  Skipping invalid row:', error.message);
                        skipped++;
                    }
                })
                .on('end', async () => {
                    try {
                        console.log(`📝 Total records processed: ${count}`);
                        console.log(`⚠️  Records skipped: ${skipped}`);
                        
                        if (transformedRows.length === 0) {
                            console.log('❌ No valid records found');
                            resolve();
                            return;
                        }
                        
                        const csvHeader = Object.keys(transformedRows[0]).join(',');
                        const csvRows = transformedRows.map(row => 
                            Object.values(row).map(value => 
                                typeof value === 'object' ? JSON.stringify(value) : value
                            ).join(',')
                        );
                        
                        const csvContent = [csvHeader, ...csvRows].join('\n');
                        fs.writeFileSync(outputPath, csvContent);
                        
                        console.log(`✅ Successfully created transformed CSV: ${outputPath}`);
                        console.log(`📊 Transformed ${transformedRows.length} records`);
                        
                        resolve();
                        
                    } catch (error) {
                        console.error('❌ Error during CSV writing:', error);
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    console.error('❌ Error reading CSV file:', error);
                    reject(error);
                });
        });
        
    } catch (error) {
        console.error('❌ Preprocessing error:', error);
        throw error;
    }
};

if (require.main === module) {
    const inputPath = process.argv[2];
    const outputPath = process.argv[3] || './transformed_schools.csv';
    const limit = process.argv[4] ? parseInt(process.argv[4]) : null;
    
    if (!inputPath) {
        console.log('Usage: node csvPreprocessor.js <input-csv-path> [output-csv-path] [limit]');
        console.log('Example: node csvPreprocessor.js ./schools.csv ./transformed_schools.csv 800000');
        process.exit(1);
    }
    
    preprocessCSV(inputPath, outputPath, limit)
        .then(() => {
            console.log('🎉 CSV preprocessing completed successfully!');
            console.log(`📁 Transformed file: ${outputPath}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 CSV preprocessing failed:', error);
            process.exit(1);
        });
}

module.exports = { preprocessCSV, transformRow }; 