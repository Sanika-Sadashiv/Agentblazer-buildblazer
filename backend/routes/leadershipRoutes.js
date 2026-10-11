const express = require("express");
const LeadershipMember = require("../models/LeadershipMember");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const members = await LeadershipMember.find({ active: true }).sort({ kind: 1, order: 1, name: 1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: "Could not load leadership", error: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const kind = req.body.kind === "faculty" ? "faculty" : "guest";
    const count = await LeadershipMember.countDocuments({ active: true, kind });

    let order = Number(req.body.order);
    if (!Number.isFinite(order) || order < 1) order = count + 1;
    order = Math.max(1, Math.min(order, count + 1));

    await LeadershipMember.updateMany(
      { active: true, kind, order: { $gte: order } },
      { $inc: { order: 1 } }
    );

    const member = await LeadershipMember.create({ ...req.body, kind, order });
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ message: "Could not create leadership member", error: error.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const existing = await LeadershipMember.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Member not found" });

    const kind = req.body.kind === "faculty" || req.body.kind === "guest" ? req.body.kind : existing.kind;
    const oldOrder = existing.order;
    const kindChanged = kind !== existing.kind;

    const countInNewKind = await LeadershipMember.countDocuments({
      active: true,
      kind,
      _id: { $ne: existing._id }
    });

    let newOrder = Number(req.body.order);
    if (!Number.isFinite(newOrder) || newOrder < 1) newOrder = kindChanged ? countInNewKind + 1 : oldOrder;
    newOrder = Math.max(1, Math.min(newOrder, countInNewKind + 1));

    if (kindChanged) {
      await LeadershipMember.updateMany(
        { active: true, kind: existing.kind, order: { $gt: oldOrder } },
        { $inc: { order: -1 } }
      );
      await LeadershipMember.updateMany(
        { active: true, kind, order: { $gte: newOrder } },
        { $inc: { order: 1 } }
      );
    } else if (newOrder !== oldOrder) {
      if (newOrder < oldOrder) {
        await LeadershipMember.updateMany(
          { active: true, kind, order: { $gte: newOrder, $lt: oldOrder }, _id: { $ne: existing._id } },
          { $inc: { order: 1 } }
        );
      } else {
        await LeadershipMember.updateMany(
          { active: true, kind, order: { $gt: oldOrder, $lte: newOrder }, _id: { $ne: existing._id } },
          { $inc: { order: -1 } }
        );
      }
    }

    const member = await LeadershipMember.findByIdAndUpdate(
      req.params.id,
      { ...req.body, kind, order: newOrder },
      { new: true, runValidators: true }
    );
    res.json(member);
  } catch (error) {
    res.status(400).json({ message: "Could not update leadership member", error: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const member = await LeadershipMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });

    member.active = false;
    await member.save();

    await LeadershipMember.updateMany(
      { active: true, kind: member.kind, order: { $gt: member.order } },
      { $inc: { order: -1 } }
    );

    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(400).json({ message: "Could not remove leadership member", error: error.message });
  }
});

module.exports = router;