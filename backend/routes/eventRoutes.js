const express = require("express");
const Event = require("../models/Event");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Could not load events", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: "Invalid event id" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: "Could not create event", error: error.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: "Could not update event", error: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(400).json({ message: "Could not delete event", error: error.message });
  }
});

module.exports = router;
