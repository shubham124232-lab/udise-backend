const mongoose = require('mongoose');

// Define the School schema with clear validation and structure
const schoolSchema = new mongoose.Schema({
    // Unique identifier for each school (required and must be unique)
    udise_code: {
        type: String,
        required: [true, 'UDISE code is required'],
        unique: true, // Ensures no duplicate UDISE codes
        trim: true    // Removes whitespace from beginning and end
    },
    
    // School name (required field)
    school_name: {
        type: String,
        required: [true, 'School name is required'],
        trim: true    // Removes whitespace
    },
    
    // Geographic hierarchy - State level (required)
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
    },
    
    // Geographic hierarchy - District level (required)
    district: {
        type: String,
        required: [true, 'District is required'],
        trim: true
    },
    
    // Geographic hierarchy - Block level (required)
    block: {
        type: String,
        required: [true, 'Block is required'],
        trim: true
    },
    
    // Geographic hierarchy - Village level (required)
    village: {
        type: String,
        required: [true, 'Village is required'],
        trim: true
    },
    
    // School management type (required, must be one of the specified values)
    management: {
        type: String,
        required: [true, 'Management type is required'],
        enum: ['Government', 'Private Unaided', 'Private Aided', 'Central Government', 'Other']
        // enum ensures only these values are allowed
    },
    
    // School location type (required, must be Rural or Urban)
    location: {
        type: String,
        required: [true, 'Location is required'],
        enum: ['Rural', 'Urban']
    },
    
    // School type based on gender (required, must be one of the specified values)
    school_type: {
        type: String,
        required: [true, 'School type is required'],
        enum: ['Co-Ed', 'Girls', 'Boys']
    },
    
    // Year when school was established (optional, with validation)
    establishment_year: {
        type: Number,
        min: [1900, 'Establishment year must be after 1900'],
        max: [new Date().getFullYear(), 'Establishment year cannot be in the future']
    },
    
    // Total number of students (optional, with validation)
    total_students: {
        type: Number,
        min: [0, 'Total students cannot be negative']
    },
    
    // Total number of teachers (optional, with validation)
    total_teachers: {
        type: Number,
        min: [0, 'Total teachers cannot be negative']
    },
    
    // Infrastructure details (all boolean fields with default false)
    infrastructure: {
        has_electricity: { type: Boolean, default: false },      // Does school have electricity?
        has_drinking_water: { type: Boolean, default: false },   // Does school have drinking water?
        has_toilets: { type: Boolean, default: false },          // Does school have toilets?
        has_library: { type: Boolean, default: false },          // Does school have library?
        has_computer_lab: { type: Boolean, default: false }      // Does school have computer lab?
    },
    
    // Academic performance metrics (optional, with percentage validation)
    academic_performance: {
        pass_percentage: {
            type: Number,
            min: [0, 'Pass percentage cannot be negative'],
            max: [100, 'Pass percentage cannot exceed 100']
        },
        dropout_rate: {
            type: Number,
            min: [0, 'Dropout rate cannot be negative'],
            max: [100, 'Dropout rate cannot exceed 100']
        }
    },
    
    // Contact information (all optional)
    contact_info: {
        phone: String,    // School phone number
        email: String,    // School email address
        website: String   // School website URL
    },
    
    // Geographic coordinates (optional, for mapping)
    coordinates: {
        latitude: Number,   // Latitude coordinate
        longitude: Number   // Longitude coordinate
    },
    
    // School status (boolean with default true)
    isActive: {
        type: Boolean,
        default: true  // School is active by default
    }
}, {
    timestamps: true  // Automatically adds createdAt and updatedAt fields
});

// Create simple indexes for common query fields to improve performance
// Indexes help MongoDB find documents faster when filtering by these fields
schoolSchema.index({ state: 1 });        // Index for state-based queries
schoolSchema.index({ district: 1 });     // Index for district-based queries
schoolSchema.index({ management: 1 });   // Index for management type queries
schoolSchema.index({ location: 1 });     // Index for rural/urban queries
schoolSchema.index({ school_type: 1 });  // Index for school type queries

// Virtual field - computed property that doesn't get stored in database
// This creates a full address string by combining village, block, district, and state
schoolSchema.virtual('fullAddress').get(function() {
    return `${this.village}, ${this.block}, ${this.district}, ${this.state}`;
});

// Instance method - can be called on individual school documents
// Returns calculated statistics for the school
schoolSchema.methods.getStats = function() {
    return {
        totalStudents: this.total_students || 0,  // Return 0 if undefined
        totalTeachers: this.total_teachers || 0,  // Return 0 if undefined
        // Calculate teacher-student ratio if both values exist
        teacherStudentRatio: this.total_students && this.total_teachers 
            ? (this.total_students / this.total_teachers).toFixed(2)  // Round to 2 decimal places
            : 0
    };
};

// Static method - can be called on the School model itself
// Gets distribution data for charts based on filters
schoolSchema.statics.getDistribution = async function(filters = {}) {
    const matchStage = {};  // Object to hold filter conditions
    
    // Build filter object based on provided parameters
    // Only add filters that are actually provided
    if (filters.state) matchStage.state = filters.state;
    if (filters.district) matchStage.district = filters.district;
    if (filters.block) matchStage.block = filters.block;
    if (filters.village) matchStage.village = filters.village;

    // MongoDB aggregation pipeline for data analysis
    const pipeline = [
        { $match: matchStage },  // First stage: filter documents based on criteria
        {
            $facet: {  // $facet allows multiple aggregations in parallel
                // Group schools by management type and count them
                managementTypeDistribution: [
                    { $group: { _id: '$management', count: { $sum: 1 } } },  // Group by management, count each group
                    { $project: { label: '$_id', count: 1, _id: 0 } }        // Rename _id to label, remove _id field
                ],
                // Group schools by location (Rural/Urban) and count them
                locationDistribution: [
                    { $group: { _id: '$location', count: { $sum: 1 } } },
                    { $project: { label: '$_id', count: 1, _id: 0 } }
                ],
                // Group schools by type (Co-Ed/Girls/Boys) and count them
                schoolTypeDistribution: [
                    { $group: { _id: '$school_type', count: { $sum: 1 } } },
                    { $project: { label: '$_id', count: 1, _id: 0 } }
                ]
            }
        }
    ];

    // Execute the aggregation pipeline and return results
    const result = await this.aggregate(pipeline);
    return result[0];  // Return first (and only) result from aggregation
};

// Export the School model
module.exports = mongoose.model('School', schoolSchema); 