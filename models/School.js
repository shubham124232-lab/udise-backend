const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  udise_code: {
    type: String,
    required: [true, 'UDISE code is required'],
    unique: true,
    trim: true,
  },
  school_name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  district: {
    type: String,
    required: [true, 'District is required'],
    trim: true,
  },
  block: {
    type: String,
    required: [true, 'Block is required'],
    trim: true,
  },
  village: {
    type: String,
    required: [true, 'Village is required'],
    trim: true,
  },
  cluster: {
    type: String,
    trim: true,
  },
  management: {
    type: String,
    enum: ['Government', 'Private Unaided', 'Aided', 'Other'],
    required: true,
  },
  location: {
    type: String,
    enum: ['Rural', 'Urban', 'Other'],
    required: true,
  },
  school_type: {
    type: String,
    enum: ['Co-Ed', 'Girls', 'Boys', 'Other'],
    required: true,
  },
  school_category: {
    type: String,
    trim: true,
  },
  school_status: {
    type: String,
    enum: ['Operational', 'Permanently Closed', 'Other'],
    default: 'Operational',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
schoolSchema.index({ udise_code: 1 });
schoolSchema.index({ state: 1, district: 1, block: 1, village: 1 });
schoolSchema.index({ school_name: 'text', udise_code: 'text' });
schoolSchema.index({ isActive: 1 });

// Distribution aggregation method
// schoolSchema.statics.getDistribution = async function (filters = {}) {
//   const pipeline = [
//     { $match: { ...filters } },
//     {
//       $facet: {
//         managementTypeDistribution: [
//           { $group: { _id: '$management', count: { $sum: 1 } } },
//           { $project: { label: '$_id', count: 1, _id: 0 } },
//           { $sort: { count: -1 } },
//         ],
//         locationDistribution: [
//           { $group: { _id: '$location', count: { $sum: 1 } } },
//           { $project: { label: '$_id', count: 1, _id: 0 } },
//           { $sort: { count: -1 } },
//         ],
//         schoolTypeDistribution: [
//           { $group: { _id: '$school_type', count: { $sum: 1 } } },
//           { $project: { label: '$_id', count: 1, _id: 0 } },
//           { $sort: { count: -1 } },
//         ],
//         totalCounts: [
//           { $count: 'total' },
//         ],
//       },
//     },
//     {
//       $project: {
//         managementTypeDistribution: 1,
//         locationDistribution: 1,
//         schoolTypeDistribution: 1,
//         totalSchools: { $arrayElemAt: ['$totalCounts.total', 0] },
//       },
//     },
//   ];

//   const [result] = await this.aggregate(pipeline);
//   return result || {
//     managementTypeDistribution: [],
//     locationDistribution: [],
//     schoolTypeDistribution: [],
//     totalSchools: 0,
//   };
// };

// In models/School.js
schoolSchema.statics.getDistribution = async function(filters = {}) {
  const matchStage = { ...filters };

  const [managementTypeDistribution, locationDistribution, schoolTypeDistribution] = await Promise.all([
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: "$management", count: { $sum: 1 } } },
      { $project: { label: "$_id", count: 1, _id: 0 } }
    ]),
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $project: { label: "$_id", count: 1, _id: 0 } }
    ]),
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: "$school_type", count: { $sum: 1 } } },
      { $project: { label: "$_id", count: 1, _id: 0 } }
    ]),
  ]);
  
  // const totalSchools = await this.countDocuments(matchStage);

  const totalSchools = managementTypeDistribution.reduce((sum, d) => sum + d.count, 0);

  return {
    managementTypeDistribution,
    locationDistribution,
    schoolTypeDistribution,
    totalSchools,
  };
};


module.exports = mongoose.model('School', schoolSchema);