const mongoose = require('mongoose');

// --- Normalization Helpers ---
const normalizeManagement = (stateMgmt, nationalMgmt) => {
  if (stateMgmt) {
    if (stateMgmt.toLowerCase().includes('gov')) return 'Government';
    if (stateMgmt.toLowerCase().includes('private unaided')) return 'Private Unaided';
    if (stateMgmt.toLowerCase().includes('private aided')) return 'Private Aided';
  }
  if (nationalMgmt && nationalMgmt.toLowerCase().includes('central')) return 'Central Government';
  return 'Other';
};

const normalizeLocation = (val) => {
  if (!val) return 'Other';
  if (val.toUpperCase().startsWith('R')) return 'Rural';
  if (val.toUpperCase().startsWith('U')) return 'Urban';
  return 'Other';
};

const normalizeSchoolType = (val) => {
  if (!val) return 'Other';
  const lower = val.toLowerCase();
  if (lower.includes('co')) return 'Co-Ed';
  if (lower.includes('girl')) return 'Girls';
  if (lower.includes('boy')) return 'Boys';
  return 'Other';
};

// --- Schema ---
const schoolSchema = new mongoose.Schema({
  udise_code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  school_name: {
    type: String,
    required: true,
    trim: true,
  },

  state: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  block: { type: String, required: true, trim: true },
  village: { type: String, required: true, trim: true },
  cluster: { type: String, trim: true },

  // Raw fields from CSV
  state_mgmt: { type: String, trim: true },
  national_mgmt: { type: String, trim: true },

  // Normalized fields
  management: {
    type: String,
    enum: ['Government', 'Private Unaided', 'Private Aided', 'Central Government', 'Other'],
    set: function () {
      return normalizeManagement(this.state_mgmt, this.national_mgmt);
    },
  },

  location: {
    type: String,
    enum: ['Rural', 'Urban', 'Other'],
    set: normalizeLocation,
  },

  school_type: {
    type: String,
    enum: ['Co-Ed', 'Girls', 'Boys', 'Other'],
    set: normalizeSchoolType,
  },

  school_category: { type: String, trim: true },
  school_status: { type: String, trim: true },

  // Optional enrichments
  establishment_year: Number,
  total_students: { type: Number, min: 0 },
  total_teachers: { type: Number, min: 0 },

  has_electricity: { type: Boolean, default: false },
  has_drinking_water: { type: Boolean, default: false },
  has_toilets: { type: Boolean, default: false },
  has_library: { type: Boolean, default: false },
  has_computer_lab: { type: Boolean, default: false },

  coordinates: {
    latitude: Number,
    longitude: Number,
  },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// --- Indexes ---
schoolSchema.index({ state: 1 });
schoolSchema.index({ district: 1 });
schoolSchema.index({ management: 1 });
schoolSchema.index({ location: 1 });
schoolSchema.index({ school_type: 1 });

// --- Virtual ---
schoolSchema.virtual('fullAddress').get(function () {
  return `${this.village}, ${this.block}, ${this.district}, ${this.state}`;
});

// --- Methods ---
schoolSchema.methods.getStats = function () {
  return {
    totalStudents: this.total_students || 0,
    totalTeachers: this.total_teachers || 0,
    teacherStudentRatio: this.total_students && this.total_teachers
      ? (this.total_students / this.total_teachers).toFixed(2)
      : 0,
  };
};

// --- Aggregation Helper ---
schoolSchema.statics.getDistribution = async function (filters = {}) {
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
