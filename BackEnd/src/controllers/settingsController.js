const Settings = require('../models/Settings');

// GET /api/settings
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.userId });

    // If no settings doc exists yet, create one with defaults
    if (!settings) {
      settings = await Settings.create({ userId: req.userId });
    }

    res.json({ success: true, settings });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/settings
const updateSettings = async (req, res) => {
  try {
    const { currency, dateFormat, defaultPage, budgetLimits, notifications } = req.body;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.userId },
      { currency, dateFormat, defaultPage, budgetLimits, notifications },
      { new: true, upsert: true }  // create if doesn't exist
    );

    res.json({ success: true, settings });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getSettings, updateSettings };