const express = require('express');
const mongoose = require('mongoose');
const School = require('../models/School');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Valid enum values from School schema
const validManagement = ['Government', 'Private Unaided', 'Aided', 'Other'];
const validLocation = ['Rural', 'Urban', 'Other'];
const validSchoolType = ['Co-Ed', 'Girls', 'Boys', 'Other'];
const validSchoolStatus = ['Operational', 'Permanently Closed', 'Other'];

// Helper function to build hierarchical filters
const buildHierarchicalFilters = (query) => {
  const filters = {};

  if (query.state) {
    filters.state = query.state;
    if (query.district) {
      filters.district = query.district;
      if (query.block) {
        filters.block = query.block;
        if (query.village) {
          filters.village = query.village;
        }
      }
    }
  }

  return filters;
};

// Helper function for pagination
const buildPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// @route   GET /api/data
// @desc    Get School Records (with Hierarchical Filters)
// @access  Private (JWT required)
router.get('/', auth, async (req, res) => {
  try {
    const filters = buildHierarchicalFilters(req.query);
    const { page, limit, skip } = buildPagination(req.query);

    const [total, schools] = await Promise.all([
      School.countDocuments(filters),
      School.find(filters)
        .select('udise_code school_name state district block village cluster management location school_type school_category school_status isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: schools,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching schools',
    });
  }
});

// @route   POST /api/data
// @desc    Add New School Record
// @access  Private (JWT required)
router.post('/', auth, async (req, res) => {
  try {
    const {
      udise_code,
      school_name,
      state,
      district,
      block,
      village,
      cluster,
      management,
      location,
      school_type,
      school_category,
      school_status,
    } = req.body;

    // Validate mandatory fields
    if (!udise_code || !school_name || !state || !district || !block || !village) {
      return res.status(400).json({
        success: false,
        error: 'Missing mandatory fields: udise_code, school_name, state, district, block, village are required',
      });
    }

    // Validate enum fields
    if (management && !validManagement.includes(management)) {
      return res.status(400).json({
        success: false,
        error: `Invalid management value. Must be one of: ${validManagement.join(', ')}`,
      });
    }
    if (location && !validLocation.includes(location)) {
      return res.status(400).json({
        success: false,
        error: `Invalid location value. Must be one of: ${validLocation.join(', ')}`,
      });
    }
    if (school_type && !validSchoolType.includes(school_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid school_type value. Must be one of: ${validSchoolType.join(', ')}`,
      });
    }
    if (school_status && !validSchoolStatus.includes(school_status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid school_status value. Must be one of: ${validSchoolStatus.join(', ')}`,
      });
    }

    // Check for duplicate UDISE code
    const existingSchool = await School.findOne({ udise_code });
    if (existingSchool) {
      return res.status(400).json({
        success: false,
        error: 'School with this UDISE code already exists',
      });
    }

    // Create new school record
    const school = new School({
      udise_code,
      school_name,
      state,
      district,
      block,
      village,
      cluster,
      management: management || 'Government',
      location: location || 'Rural',
      school_type: school_type || 'Co-Ed',
      school_category,
      school_status: school_status || 'Operational',
      isActive: school_status !== 'Permanently Closed',
      created_by: req.user._id,
      updated_by: req.user._id,
    });

    await school.save();

    res.status(201).json({
      success: true,
      message: 'School record created successfully',
      data: school,
    });
  } catch (error) {
    console.error('Create school error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'School with this UDISE code already exists',
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating school',
    });
  }
});

// @route   PUT /api/data/:id
// @desc    Update School Record
// @access  Private (JWT required)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid school ID',
      });
    }

    // Validate enum fields
    const { management, location, school_type, school_status } = req.body;
    if (management && !validManagement.includes(management)) {
      return res.status(400).json({
        success: false,
        error: `Invalid management value. Must be one of: ${validManagement.join(', ')}`,
      });
    }
    if (location && !validLocation.includes(location)) {
      return res.status(400).json({
        success: false,
        error: `Invalid location value. Must be one of: ${validLocation.join(', ')}`,
      });
    }
    if (school_type && !validSchoolType.includes(school_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid school_type value. Must be one of: ${validSchoolType.join(', ')}`,
      });
    }
    if (school_status && !validSchoolStatus.includes(school_status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid school_status value. Must be one of: ${validSchoolStatus.join(', ')}`,
      });
    }

    // Update fields
    const updateData = {
      ...req.body,
      updated_by: req.user._id,
      isActive: school_status ? school_status !== 'Permanently Closed' : undefined,
    };

    const school = await School.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School record not found',
      });
    }

    res.json({
      success: true,
      message: 'School record updated successfully',
      data: school,
    });
  } catch (error) {
    console.error('Update school error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'School with this UDISE code already exists',
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating school',
    });
  }
});

// @route   DELETE /api/data/:id
// @desc    Delete School Record (Soft Delete)
// @access  Private (JWT required)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid school ID',
      });
    }

    const school = await School.findByIdAndUpdate(
      id,
      {
        isActive: false,
        school_status: 'Permanently Closed',
        updated_by: req.user._id,
      },
      { new: true },
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School record not found',
      });
    }

    res.json({
      success: true,
      message: 'School record deleted successfully',
      data: school,
    });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while deleting school',
    });
  }
});

// @route   GET /api/data/distribution
// @desc    Dynamic Distribution Data for Charts
// @access  Private (JWT required)
router.get('/distribution', auth, async (req, res) => {
  try {
    const filters = buildHierarchicalFilters(req.query);
    const distribution = await School.getDistribution(filters);

    res.json({
      success: true,
      data: {
        managementTypeDistribution: distribution.managementTypeDistribution,
        locationDistribution: distribution.locationDistribution,
        schoolTypeDistribution: distribution.schoolTypeDistribution,
        totalSchools: distribution.totalSchools || 0,
      },
    });
  } catch (error) {
    console.error('Distribution data error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching distribution data',
    });
  }
});

// // @route   GET /api/data/filters
// // @desc    Get Filter Options for Hierarchical Dropdowns
// // @access  Private (JWT required)
// router.get('/filters', auth, async (req, res) => {
//   try {
//     const { state, district, block } = req.query;

//     const filters = { isActive: true };
//     if (state) filters.state = state;
//     if (district) filters.district = district;
//     if (block) filters.block = block;

//     const [states, districts, blocks, villages] = await Promise.all([
//       School.distinct('state', { isActive: { $ne: false } }),
//       state ? School.distinct('district', { state, isActive: { $ne: false } }) : [],
//       state && district ? School.distinct('block', { state, district, isActive: { $ne: false } }) : [],
//       state && district && block ? School.distinct('village', { state, district, block, isActive: { $ne: false } }) : [],
//     ]);

//     res.json({
//       success: true,
//       data: {
//         states: states.sort(),
//         districts: districts.sort(),
//         blocks: blocks.sort(),
//         villages: villages.sort(),
//       },
//     });
//   } catch (error) {
//     console.error('Filter options error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Internal server error while fetching filter options',
//     });
//   }
// });

// @route   GET /api/data/filters
// @desc    Get Filter Options for Hierarchical Dropdowns
// @access  Public
router.get('/filters', async (req, res) => {
  try {
    const { state, district, block } = req.query;

    const [states, districts, blocks, villages] = await Promise.all([
      School.distinct('state'),
      state ? School.distinct('district', { state }) : [],
      state && district ? School.distinct('block', { state, district }) : [],
      state && district && block ? School.distinct('village', { state, district, block }) : [],
    ]);

    res.json({
      success: true,
      data: {
        states: states.sort(),
        districts: districts.sort(),
        blocks: blocks.sort(),
        villages: villages.sort(),
      },
    });
  } catch (error) {
    console.error('Filter options error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching filter options',
    });
  }
});


module.exports = router;