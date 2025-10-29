// routes/actions.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const actionService = require('../../services/actionService');
const { authenticateAndCheckPermission } = require('../../utils/checkPermission');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});
router.use("/:guildId", authenticateAndCheckPermission);
// const webRoutes = require('./web');
// Get all actions for a guild
router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const actions = await actionService.getServerActions(guildId);
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new action
router.post('/:guildId', upload.single('imageData'), async (req, res) => {
  try {
    const { guildId } = req.params
    const { action, message, imageType, requiresTarget } = req.body;
    const userId = req.user?.id || null; // nếu có xác thực
    let imageData = null;

    // Nếu là upload file
    if (imageType === 'upload') {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required for upload type' });
      }
      imageData = req.file; // multer đã lưu trong memory
    }

    // Nếu là URL
    if (imageType === 'url') {
      if (!req.body.imageData) {
        return res.status(400).json({ error: 'Image URL is required for url type' });
      }
      imageData = req.body.imageData;
    }

    if (!guildId || !action || !message) {
      return res.status(400).json({ error: 'guildId, action, and message are required' });
    }

    const actionData = {
      action,
      message,
      imageType,
      imageData,
      requiresTarget: requiresTarget !== 'false', // convert string -> boolean
    };

    const newAction = await ActionService.addAction(guildId, actionData, userId);
    res.status(201).json({
      message: 'Action added successfully',
      data: newAction,
    });
  } catch (err) {
    console.error('❌ Error adding action:', err);
    res.status(400).json({
      error: err.message || 'Failed to add action',
    });
  }
});

// Delete action
router.delete('/:guildId/:actionName', async (req, res) => {
  try {
    const { guildId, actionName } = req.params;
    await actionService.deleteAction(guildId, actionName);
    res.json({ message: 'Action deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;