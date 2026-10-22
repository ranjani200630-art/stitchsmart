
const mongoose = require('mongoose');
const Fabric = require('../models/Fabric');

const isStaff = (req) =>
  req.user && ['admin', 'tailor'].includes(req.user.role);

const getErrorMessage = (error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return error.message;
  }
  return 'An unexpected server error occurred';
};

// POST /api/fabrics
const createFabric = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or tailor staff can manage fabrics'
      });
    }

    const {
      name, fabricType, color, availableQuantity, unit,
      minimumStockLevel, pricePerUnit, supplierName,
      supplierContact, notes
    } = req.body;

    const fabric = await Fabric.create({
      name, fabricType, color, availableQuantity, unit,
      minimumStockLevel, pricePerUnit, supplierName,
      supplierContact, notes,
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Fabric added successfully',
      fabric
    });
  } catch (error) {
    return res.status(
      error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500
    ).json({
      success: false,
      message: getErrorMessage(error)
    });
  }
};

// GET /api/fabrics
const getFabrics = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or tailor staff can view inventory'
      });
    }

    const { search, fabricType, lowStock } = req.query;
    const filter = {};

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { fabricType: { $regex: safeSearch, $options: 'i' } },
        { color: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (fabricType) filter.fabricType = fabricType;

    let fabrics = await Fabric.find(filter).sort({ createdAt: -1 });

    fabrics = fabrics.map((fabric) => {
      const item = fabric.toJSON();
      item.isLowStock = item.availableQuantity <= item.minimumStockLevel;
      return item;
    });

    if (lowStock === 'true') {
      fabrics = fabrics.filter((fabric) => fabric.isLowStock);
    }

    return res.status(200).json({
      success: true,
      count: fabrics.length,
      lowStockCount: fabrics.filter((fabric) => fabric.isLowStock).length,
      fabrics
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error)
    });
  }
};

// GET /api/fabrics/:id
const getFabricById = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid fabric ID' });
    }

    const fabric = await Fabric.findById(req.params.id);
    if (!fabric) {
      return res.status(404).json({ success: false, message: 'Fabric not found' });
    }

    return res.json({ success: true, fabric });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// PUT /api/fabrics/:id
const updateFabric = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid fabric ID' });
    }

    const allowedFields = [
      'name', 'fabricType', 'color', 'availableQuantity', 'unit',
      'minimumStockLevel', 'pricePerUnit', 'supplierName',
      'supplierContact', 'notes'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    const fabric = await Fabric.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!fabric) {
      return res.status(404).json({ success: false, message: 'Fabric not found' });
    }

    return res.json({ success: true, message: 'Fabric updated successfully', fabric });
  } catch (error) {
    return res.status(
      error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500
    ).json({ success: false, message: getErrorMessage(error) });
  }
};

// DELETE /api/fabrics/:id
const deleteFabric = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid fabric ID' });
    }

    const fabric = await Fabric.findById(req.params.id);
    if (!fabric) {
      return res.status(404).json({ success: false, message: 'Fabric not found' });
    }

    // Historical usage protection will be added with the usage-history model.
    await fabric.deleteOne();

    return res.json({ success: true, message: 'Fabric deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// PATCH /api/fabrics/:id/stock
const updateFabricStock = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid fabric ID' });
    }

    const { availableQuantity } = req.body;
    if (
      typeof availableQuantity !== 'number' ||
      !Number.isFinite(availableQuantity) ||
      availableQuantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'availableQuantity must be a non-negative number'
      });
    }

    const fabric = await Fabric.findByIdAndUpdate(
      req.params.id,
      { $set: { availableQuantity } },
      { new: true, runValidators: true }
    );

    if (!fabric) {
      return res.status(404).json({ success: false, message: 'Fabric not found' });
    }

    return res.json({ success: true, message: 'Stock updated successfully', fabric });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

module.exports = {
  createFabric,
  getFabrics,
  getFabricById,
  updateFabric,
  deleteFabric,
  updateFabricStock
};
