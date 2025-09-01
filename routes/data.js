const express = require('express');
const mongoose = require('mongoose');
const School = require('../models/School');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper function to build hierarchical filters
const buildHierarchicalFilters = (query) => {
    const filters = { isActive: true };
    
    // Hierarchical filtering as per JD requirements
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
// @desc    Get School Records (with Hierarchical Filters) - JD Requirement
// @access  Private (JWT required)
router.get('/', auth, async (req, res) => {
    try {
        const filters = buildHierarchicalFilters(req.query);
        const { page, limit, skip } = buildPagination(req.query);

        // Get total count and records
        const [total, schools] = await Promise.all([
            School.countDocuments(filters),
            School.find(filters)
                .select('udise_code school_name state district block village management location school_type total_students total_teachers')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
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
                limit
            }
        });

    } catch (error) {
        console.error('Get schools error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching schools'
        });
    }
});

// @route   POST /api/data
// @desc    Add New Record - JD Requirement
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
            management,
            location,
            school_type,
            ...otherFields
        } = req.body;

        // Validation for mandatory fields as per JD
        if (!udise_code || !school_name || !state || !district || !block || !village) {
            return res.status(400).json({
                success: false,
                error: 'Missing mandatory fields: udise_code, school_name, state, district, block, village are required'
            });
        }

        // Check if UDISE code already exists
        const existingSchool = await School.findOne({ udise_code });
        if (existingSchool) {
            return res.status(400).json({
                success: false,
                error: 'School with this UDISE code already exists'
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
            management: management || 'Government',
            location: location || 'Rural',
            school_type: school_type || 'Co-Ed',
            created_by: req.user._id,
            ...otherFields
        });

        await school.save();

        res.status(201).json({
            success: true,
            message: 'School record created successfully',
            data: school
        });

    } catch (error) {
        console.error('Create school error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'School with this UDISE code already exists'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error while creating school'
        });
    }
});

// @route   PUT /api/data/:id
// @desc    Update Record - JD Requirement
// @access  Private (JWT required)
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school ID'
            });
        }

        // Update only fields that need to be updated as per JD
        const updateData = {
            ...req.body,
            updated_by: req.user._id
        };

        const school = await School.findByIdAndUpdate(
            id,
            updateData,
            { 
                new: true, 
                runValidators: true 
            }
        );

        if (!school) {
            return res.status(404).json({
                success: false,
                error: 'School record not found'
            });
        }

        res.json({
            success: true,
            message: 'School record updated successfully',
            data: school
        });

    } catch (error) {
        console.error('Update school error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'School with this UDISE code already exists'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error while updating school'
        });
    }
});

// @route   DELETE /api/data/:id
// @desc    Delete Record - JD Requirement
// @access  Private (JWT required)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school ID'
            });
        }

        const school = await School.findByIdAndUpdate(
            id,
            { 
                isActive: false,
                updated_by: req.user._id
            },
            { new: true }
        );

        if (!school) {
            return res.status(404).json({
                success: false,
                error: 'School record not found'
            });
        }

        res.json({
            success: true,
            message: 'School record deleted successfully',
            data: school
        });

    } catch (error) {
        console.error('Delete school error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while deleting school'
        });
    }
});

// @route   GET /api/data/distribution
// @desc    Dynamic Distribution Data - JD Requirement
// @access  Private (JWT required)
router.get('/distribution', auth, async (req, res) => {
    try {
        const filters = buildHierarchicalFilters(req.query);

        // Aggregate distribution data as per JD specification
        const [managementDist, locationDist, schoolTypeDist] = await Promise.all([
            // Management Type Distribution
            School.aggregate([
                { $match: filters },
                { 
                    $group: {
                        _id: '$management',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // Location Distribution  
            School.aggregate([
                { $match: filters },
                {
                    $group: {
                        _id: '$location',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // School Type Distribution
            School.aggregate([
                { $match: filters },
                {
                    $group: {
                        _id: '$school_type',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ])
        ]);

        // Format response as per JD specification
        const response = {
            managementTypeDistribution: managementDist.map(item => ({
                label: item._id || 'Unknown',
                count: item.count
            })),
            locationDistribution: locationDist.map(item => ({
                label: item._id || 'Unknown', 
                count: item.count
            })),
            schoolTypeDistribution: schoolTypeDist.map(item => ({
                label: item._id || 'Unknown',
                count: item.count
            }))
        };

        res.json({
            success: true,
            ...response
        });

    } catch (error) {
        console.error('Distribution data error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching distribution data'
        });
    }
});

// @route   GET /api/data/filters
// @desc    Get filter options for hierarchical dropdowns
// @access  Private (JWT required)
router.get('/filters', auth, async (req, res) => {
    try {
        const { state, district, block } = req.query;

        const [states, districts, blocks, villages] = await Promise.all([
            // Get all states
            School.distinct('state', { isActive: true }),
            
            // Get districts for selected state
            state ? School.distinct('district', { state, isActive: true }) : [],
            
            // Get blocks for selected state and district
            state && district ? School.distinct('block', { state, district, isActive: true }) : [],
            
            // Get villages for selected state, district, and block
            state && district && block ? School.distinct('village', { state, district, block, isActive: true }) : []
        ]);

        res.json({
            success: true,
            data: {
                states: states.sort(),
                districts: districts.sort(),
                blocks: blocks.sort(),
                villages: villages.sort()
            }
        });

    } catch (error) {
        console.error('Filter options error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching filter options'
        });
    }
});

module.exports = router;