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
  cluster: {
    type: String,
    trim: true
  },
  management: {
    type: String,
    enum: ['Government', 'Private Unaided', 'Private Aided', 'Central Government', 'Other'],
    required: true
  },
  location: {
    type: String,
    enum: ['Rural', 'Urban', 'Other'],
    required: true
  },
  school_type: {
    type: String,
    enum: ['Co-Ed', 'Girls', 'Boys', 'Other'],
    required: true
  },
  school_category: {
    type: String,
    trim: true
  },
  school_status: {
    type: String,
    enum: ['Active', 'Inactive', 'Closed'],
    default: 'Active'
  },
  establishment_year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear()
  },
  total_students: {
    type: Number,
    min: 0,
    default: 0
  },
  total_teachers: {
    type: Number,
    min: 0,
    default: 0
  },
  facilities: {
    has_electricity: { type: Boolean, default: false },
    has_drinking_water: { type: Boolean, default: false },
    has_toilets: { type: Boolean, default: false },
    has_library: { type: Boolean, default: false },
    has_computer_lab: { type: Boolean, default: false },
    has_playground: { type: Boolean, default: false },
    has_medical_room: { type: Boolean, default: false }
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  contact_info: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    principal_name: {
      type: String,
      trim: true
    }
  },
  academic_info: {
    medium_of_instruction: {
      type: String,
      trim: true
    },
    classes_offered: [{
      type: String,
      enum: ['Primary', 'Upper Primary', 'Secondary', 'Higher Secondary']
    }],
    board_affiliation: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
schoolSchema.index({ udise_code: 1 });
schoolSchema.index({ state: 1, district: 1 });
schoolSchema.index({ school_name: 'text', udise_code: 'text' });
schoolSchema.index({ isActive: 1 });

// Static method to get distribution data
schoolSchema.statics.getDistribution = async function(filters = {}) {
  const pipeline = [
    { $match: { ...filters, isActive: true } },
    {
      $group: {
        _id: null,
        total_schools: { $sum: 1 },
        total_students: { $sum: '$total_students' },
        total_teachers: { $sum: '$total_teachers' },
        by_management: {
          $push: '$management'
        },
        by_location: {
          $push: '$location'
        },
        by_type: {
          $push: '$school_type'
        }
      }
    },
    {
      $project: {
        total_schools: 1,
        total_students: 1,
        total_teachers: 1,
        management_distribution: {
          $reduce: {
            input: '$by_management',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                { $literal: { $concat: ['$$this', ': ', { $toString: { $size: { $filter: { input: '$by_management', cond: { $eq: ['$$this', '$$this'] } } } } } } } }
              ]
            }
          }
        }
      }
    }
  ];

  return await this.aggregate(pipeline);
};

// Instance method to get school statistics
schoolSchema.methods.getStats = function() {
  return {
    student_teacher_ratio: this.total_teachers > 0 ? (this.total_students / this.total_teachers).toFixed(2) : 0,
    facilities_count: Object.values(this.facilities).filter(Boolean).length,
    has_coordinates: !!(this.coordinates.latitude && this.coordinates.longitude)
  };
};

module.exports = mongoose.model('School', schoolSchema);