const express = require('express');
const School = require('../models/School');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const buildFilters = (query) => {
    const filters = {};
    
    if (query.state) filters.state = query.state;
    if (query.district) filters.district = query.district;
    if (query.block) filters.block = query.block;
    if (query.village) filters.village = query.village;
    
    if (query.management) filters.management = query.management;
    if (query.location) filters.location = query.location;
    if (query.school_type) filters.school_type = query.school_type;
    
    if (query.search) {
        filters.$or = [
            { school_name: { $regex: query.search, $options: 'i' } },
            { udise_code: { $regex: query.search, $options: 'i' } }
        ];
    }
    
    return filters;
};

const buildPagination = (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
};

router.get('/', optionalAuth, async (req, res) => {
    try {
        const filters = buildFilters(req.query);
        const { page, limit, skip } = buildPagination(req.query);

        const [total, schools] = await Promise.all([
            School.countDocuments(filters),
            School.find(filters)
                .sort({ school_name: 1 })
                .skip(skip)
                .limit(limit)
                .select('-__v')
        ]);

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
            schools,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords: total,
                hasNextPage,
                hasPrevPage,
                limit
            }
        });

    } catch (error) {
        console.error('Get schools error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching schools'
        });
    }
});

router.get('/distribution', async (req, res) => {
    try {
        const filters = buildFilters(req.query);
        const distribution = await School.getDistribution(filters);
        res.json(distribution);

    } catch (error) {
        console.error('Get distribution error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching distribution data'
        });
    }
});

router.get('/filters', async (req, res) => {
    try {
        const { state, district, block } = req.query;

        const [states, districts, blocks, villages] = await Promise.all([
            School.distinct('state'),
            state ? School.distinct('district', { state }) : [],
            state && district ? School.distinct('block', { state, district }) : [],
            state && district && block ? School.distinct('village', { state, district, block }) : []
        ]);

        res.json({
            states: states.sort(),
            districts: districts.sort(),
            blocks: blocks.sort(),
            villages: villages.sort()
        });

    } catch (error) {
        console.error('Get filters error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching filter options'
        });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const schoolData = req.body;

        const existingSchool = await School.findOne({ udise_code: schoolData.udise_code });
        if (existingSchool) {
            return res.status(400).json({
                error: 'School with this UDISE code already exists'
            });
        }

        const school = new School(schoolData);
        await school.save();

        res.status(201).json({
            message: 'School created successfully',
            school
        });

    } catch (error) {
        console.error('Create school error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            error: 'Internal server error while creating school'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const school = await School.findById(req.params.id);
        
        if (!school) {
            return res.status(404).json({
                error: 'School not found'
            });
        }

        res.json({ school });

    } catch (error) {
        console.error('Get school error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid school ID format'
            });
        }

        res.status(500).json({
            error: 'Internal server error while fetching school'
        });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const updates = req.body;
        const schoolId = req.params.id;

        if (updates.udise_code) {
            const existingSchool = await School.findOne({ 
                udise_code: updates.udise_code,
                _id: { $ne: schoolId }
            });
            
            if (existingSchool) {
                return res.status(400).json({
                    error: 'School with this UDISE code already exists'
                });
            }
        }

        const school = await School.findByIdAndUpdate(
            schoolId,
            updates,
            { new: true, runValidators: true }
        );

        if (!school) {
            return res.status(404).json({
                error: 'School not found'
            });
        }

        res.json({
            message: 'School updated successfully',
            school
        });

    } catch (error) {
        console.error('Update school error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            error: 'Internal server error while updating school'
        });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const school = await School.findByIdAndDelete(req.params.id);
        
        if (!school) {
            return res.status(404).json({
                error: 'School not found'
            });
        }

        res.json({
            message: 'School deleted successfully',
            school
        });

    } catch (error) {
        console.error('Delete school error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid school ID format'
            });
        }

        res.status(500).json({
            error: 'Internal server error while deleting school'
        });
    }
});

module.exports = router; 