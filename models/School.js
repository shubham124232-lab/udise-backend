const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    udise_code: {
        type: String,
        required: [true, 'UDISE code is required'],
        unique: true,
        trim: true
    },
    
    school_name: {
        type: String,
        required: [true, 'School name is required'],
        trim: true
    },
    
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
    },
    
    district: {
        type: String,
        required: [true, 'District is required'],
        trim: true
    },
    
    block: {
        type: String,
        required: [true, 'Block is required'],
        trim: true
    },
    
    village: {
        type: String,
        required: [true, 'Village is required'],
        trim: true
    },
    
    management: {
        type: String,
        required: [true, 'Management type is required'],
        enum: ['Government', 'Private Unaided', 'Private Aided', 'Central Government', 'Other'],
        trim: true
    },
    
    location: {
        type: String,
        required: [true, 'Location is required'],
        enum: ['Rural', 'Urban'],
        trim: true
    },
    
    school_type: {
        type: String,
        required: [true, 'School type is required'],
        enum: ['Co-Ed', 'Girls', 'Boys'],
        trim: true
    },
    
    school_category: {
        type: String,
        trim: true
    },
    
    school_status: {
        type: String,
        trim: true
    },
    
    establishment_year: {
        type: Number,
        min: [1900, 'Establishment year must be after 1900'],
        max: [new Date().getFullYear(), 'Establishment year cannot be in the future']
    },
    
    total_students: {
        type: Number,
        min: [0, 'Total students cannot be negative']
    },
    
    total_teachers: {
        type: Number,
        min: [0, 'Total teachers cannot be negative']
    },
    
    infrastructure: {
        has_electricity: { type: Boolean, default: false },
        has_drinking_water: { type: Boolean, default: false },
        has_toilets: { type: Boolean, default: false },
        has_library: { type: Boolean, default: false },
        has_computer_lab: { type: Boolean, default: false }
    },
    
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
    
    contact_info: {
        phone: String,
        email: String,
        website: String
    },
    
    coordinates: {
        latitude: Number,
        longitude: Number
    },
    
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

schoolSchema.index({ state: 1 });
schoolSchema.index({ district: 1 });
schoolSchema.index({ management: 1 });
schoolSchema.index({ location: 1 });
schoolSchema.index({ school_type: 1 });

schoolSchema.virtual('fullAddress').get(function() {
    return `${this.village}, ${this.block}, ${this.district}, ${this.state}`;
});

schoolSchema.methods.getStats = function() {
    return {
        totalStudents: this.total_students || 0,
        totalTeachers: this.total_teachers || 0,
        teacherStudentRatio: this.total_students && this.total_teachers 
            ? (this.total_students / this.total_teachers).toFixed(2)
            : 0
    };
};

schoolSchema.statics.getDistribution = async function(filters = {}) {
    const matchStage = {};
    
    if (filters.state) matchStage.state = filters.state;
    if (filters.district) matchStage.district = filters.district;
    if (filters.block) matchStage.block = filters.block;
    if (filters.village) matchStage.village = filters.village;

    const pipeline = [
        { $match: matchStage },
        {
            $facet: {
                managementTypeDistribution: [
                    { $group: { _id: '$management', count: { $sum: 1 } } },
                    { $project: { label: '$_id', count: 1, _id: 0 } }
                ],
                locationDistribution: [
                    { $group: { _id: '$location', count: { $sum: 1 } } },
                    { $project: { label: '$_id', count: 1, _id: 0 } }
                ],
                schoolTypeDistribution: [
                    { $group: { _id: '$school_type', count: { $sum: 1 } } },
                    { $project: { label: '$_id', count: 1, _id: 0 } }
                ]
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    return result[0];
};

module.exports = mongoose.model('School', schoolSchema); 