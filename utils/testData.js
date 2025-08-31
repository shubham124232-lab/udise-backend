const mongoose = require('mongoose');
const School = require('../models/School');
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udise-dashboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const testData = async () => {
    try {
        console.log('🧪 Testing imported data...\n');
        
        // Test 1: Count total schools
        const totalSchools = await School.countDocuments();
        console.log(`📊 Total Schools: ${totalSchools.toLocaleString()}`);
        
        if (totalSchools === 0) {
            console.log('❌ No schools found. Data import may have failed.');
            return;
        }
        
        // Test 2: Get sample schools
        const sampleSchools = await School.find().limit(3).select('udise_code school_name state district');
        console.log('\n🏫 Sample Schools:');
        sampleSchools.forEach((school, index) => {
            console.log(`   ${index + 1}. ${school.school_name} (${school.udise_code})`);
            console.log(`      Location: ${school.village}, ${school.block}, ${school.district}, ${school.state}`);
        });
        
        // Test 3: Test hierarchical filters
        const states = await School.distinct('state');
        console.log(`\n🗺️  Total States: ${states.length}`);
        console.log(`   Sample States: ${states.slice(0, 5).join(', ')}`);
        
        if (states.length > 0) {
            const firstState = states[0];
            const districts = await School.distinct('district', { state: firstState });
            console.log(`\n📍 Districts in ${firstState}: ${districts.length}`);
            console.log(`   Sample Districts: ${districts.slice(0, 5).join(', ')}`);
            
            if (districts.length > 0) {
                const firstDistrict = districts[0];
                const blocks = await School.distinct('block', { state: firstState, district: firstDistrict });
                console.log(`\n🏘️  Blocks in ${firstDistrict}, ${firstState}: ${blocks.length}`);
                console.log(`   Sample Blocks: ${blocks.slice(0, 5).join(', ')}`);
            }
        }
        
        // Test 4: Test management distribution
        const managementStats = await School.aggregate([
            { $group: { _id: '$management', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\n🏛️  Management Distribution:');
        managementStats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count.toLocaleString()} schools`);
        });
        
        // Test 5: Test location distribution
        const locationStats = await School.aggregate([
            { $group: { _id: '$location', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\n🌍 Location Distribution:');
        locationStats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count.toLocaleString()} schools`);
        });
        
        // Test 6: Test school type distribution
        const schoolTypeStats = await School.aggregate([
            { $group: { _id: '$school_type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\n👥 School Type Distribution:');
        schoolTypeStats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count.toLocaleString()} schools`);
        });
        
        // Test 7: Test the distribution API method
        console.log('\n📈 Testing Distribution API Method:');
        const distribution = await School.getDistribution();
        console.log('   Management Types:', distribution.managementTypeDistribution.length);
        console.log('   Locations:', distribution.locationDistribution.length);
        console.log('   School Types:', distribution.schoolTypeDistribution.length);
        
        // Test 8: Test pagination
        const paginatedSchools = await School.find()
            .sort({ school_name: 1 })
            .skip(0)
            .limit(5)
            .select('udise_code school_name state district');
        
        console.log('\n📄 Pagination Test (First 5 schools):');
        paginatedSchools.forEach((school, index) => {
            console.log(`   ${index + 1}. ${school.school_name}`);
        });
        
        console.log('\n✅ All tests passed! Your data import was successful.');
        console.log('\n🚀 Next steps:');
        console.log('   1. Test your API endpoints');
        console.log('   2. Test your frontend dashboard');
        console.log('   3. Deploy to production');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Run tests if called directly
if (require.main === module) {
    testData();
}

module.exports = { testData }; 