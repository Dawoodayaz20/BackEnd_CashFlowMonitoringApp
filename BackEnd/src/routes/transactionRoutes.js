const express = require('express');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User'); 

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
    try{
        const { type, amount, category, note, date, recurring } = req.body;
        
        const transaction = new Transaction({
            userId: req.userId,
            type,
            amount,
            category,
            note,
            date,
            recurring
        });
        await transaction.save();
        res.status(201).json({success:true, transaction});

    } catch(error){
        res.status(500).json({ success: false, message: error.message});
    }
});

router.get('/', async(req, res) => {
    try {
        const filter = { userId: req.userId };
        if (req.query.type) filter.type = req.query.type;
        
        const transactions = await Transaction.find(filter).sort({ date: -1})
        
        res.status(200).json({ success: true, transactions });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


router.put('/:id', async(req, res) => {
    try{
        const transaction = await Transaction.findOneAndUpdate(
            {_id: req.params.id, userId: req.userId},
            req.body,
            { new: true }
        );
        if (!transaction) return res.status(404).json({ message: 'Not found' });
        res.json(transaction);
    }catch(err){
        res.status(500).json({ message: err.message });
    }
});

router.delete('/clear-all', async (req, res) => {
  try {
    const { password } = req.body;

    // Verify user and password
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Delete only this user's transactions
    const result = await Transaction.deleteMany({ userId: req.userId });

    res.json({ 
      message: 'All transactions cleared successfully',
      deletedCount: result.deletedCount 
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId  // ensures ownership
    });

    if (!transaction) {
        return res.status(404).json({ message: 'Not found' })
    };
    res.status(200).json({ success: true, message: 'Transaction deleted' });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;