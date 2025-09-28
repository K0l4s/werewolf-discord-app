const express = require('express');
const PetService = require('../../services/petService');
const router = express.Router();


router.get("/server", async (req, res) => {
    try {
        const guildId = req.query.guildId;
        if (!guildId) {
            return res.status(400).json({ error: "guildId is required" });
        }

        const serverPet = await PetService.getServerPet(guildId);
        if (!serverPet) {
            return res.status(404).json({ error: "Server pet not found" });
        }

        return res.json(serverPet);
    } catch (error) {
        console.error("Error fetching server pet:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router;