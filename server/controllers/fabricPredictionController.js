
const { Order } = require('../models/Order');
const Fabric = require('../models/Fabric');

const getFabricDemandPrediction = async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const demand = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: ninetyDaysAgo },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: {
            $toLower: {
              $trim: {
                input: {
                  $ifNull: ['$fabricDetails.fabricType', '']
                }
              }
            }
          },
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const fabrics = await Fabric.find().lean();

    const predictions = fabrics.map((fabric) => {
      const fabricType = (fabric.fabricType || '')
        .trim()
        .toLowerCase();

      const matchingDemand = demand.find(
        (item) => item._id === fabricType
      );

      const totalOrders = matchingDemand?.totalOrders || 0;
      const totalQuantity = matchingDemand?.totalQuantity || 0;

      const estimatedDemand = Math.ceil(totalQuantity / 3);

      const suggestedRestockQuantity = Math.max(
        0,
        estimatedDemand - (fabric.availableQuantity || 0)
      );

      let stockStatus = 'Stock Available';

      if (fabric.availableQuantity <= fabric.minimumStockLevel) {
        stockStatus = 'Low Stock';
      } else if (suggestedRestockQuantity > 0) {
        stockStatus = 'Restock Recommended';
      }

      return {
        fabricId: fabric._id,
        fabricName: fabric.name,
        fabricType: fabric.fabricType,
        color: fabric.color,
        availableQuantity: fabric.availableQuantity,
        unit: fabric.unit,
        minimumStockLevel: fabric.minimumStockLevel,
        ordersInLast90Days: totalOrders,
        orderedQuantityInLast90Days: totalQuantity,
        estimatedDemandNext30Days: estimatedDemand,
        suggestedRestockQuantity,
        stockStatus
      };
    });

    res.status(200).json({
      success: true,
      period: 'Last 90 days',
      predictionPeriod: 'Next 30 days',
      method: 'Historical order-based estimate',
      count: predictions.length,
      predictions
    });
  } catch (error) {
    console.error('[Fabric Prediction Error]', error);

    res.status(500).json({
      success: false,
      message: 'Unable to generate fabric demand predictions'
    });
  }
};

module.exports = { getFabricDemandPrediction };
