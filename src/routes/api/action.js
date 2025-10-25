// routes/actions.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const actionService = require('../../services/actionService');

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
// const webRoutes = require('./web');
// Get all actions for a guild
router.get('/:guildId/actions', async (req, res) => {
  try {
    const { guildId } = req.params;
    const actions = await actionService.getServerActions(guildId);
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new action
router.post('/:guildId/actions', upload.single('image'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { action, message, imageType, imageUrl, requiresTarget } = req.body;
    const userId = req.user?.userId; // Assuming you have authentication middleware

    const actionData = {
      action,
      message,
      imageType,
      imageData: imageType === 'upload' ? req.file : imageUrl,
      requiresTarget: requiresTarget !== 'false'
    };

    const newAction = await actionService.addAction(guildId, actionData, userId);
    res.json(newAction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete action
router.delete('/:guildId/actions/:actionName', async (req, res) => {
  try {
    const { guildId, actionName } = req.params;
    await actionService.deleteAction(guildId, actionName);
    res.json({ message: 'Action deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;