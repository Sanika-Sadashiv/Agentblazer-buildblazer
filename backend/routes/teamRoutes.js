const express = require("express");
const TeamMember = require("../models/TeamMember");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Simple, safe "append to the end" — used whenever no explicit position is
// given. It only reads the current highest order in the section and adds 1.
// It never writes to any other document, so nobody else's order can shift.
async function nextOrderInSection(section) {
  const highest = await TeamMember.find({ active: true, section })
    .sort({ order: -1 })
    .limit(1);
  const maxOrder = highest.length ? Number(highest[0].order) || 0 : 0;
  return maxOrder + 1;
}

// Shifts every OTHER active member in `section` to make room at
// `desiredPosition`, then returns the order number the caller should give
// the member being inserted/moved into that spot. Only used when an
// explicit position was actually given — plain appends use
// `nextOrderInSection` above instead, which never touches anyone else.
async function reseatMember({ section, excludeId, desiredPosition }) {
  const others = await TeamMember.find({
    active: true,
    section,
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  }).sort({ order: 1, name: 1 });

  const total = others.length;
  let position = Number(desiredPosition);
  if (!Number.isFinite(position) || position < 1) position = total + 1;
  position = Math.max(1, Math.min(position, total + 1));

  const bulkOps = others
    .map((m, i) => {
      const rank = i + 1;
      const finalOrder = rank >= position ? rank + 1 : rank;
      return finalOrder === m.order
        ? null
        : { updateOne: { filter: { _id: m._id }, update: { $set: { order: finalOrder } } } };
    })
    .filter(Boolean);

  if (bulkOps.length) await TeamMember.bulkWrite(bulkOps);
  return position;
}

router.get("/", async (req, res) => {
  try {
    const members = await TeamMember.find({ active: true }).sort({ section: 1, order: 1, name: 1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: "Could not load team", error: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const section = req.body.section === "committee" ? "committee" : "core";
    const hasExplicitPosition = Number.isFinite(Number(req.body.order)) && Number(req.body.order) >= 1;

    // No position typed in -> just append at the end, touching nobody else.
    // Explicit position typed in -> shift others to make room for it.
    const order = hasExplicitPosition
      ? await reseatMember({ section, excludeId: null, desiredPosition: req.body.order })
      : await nextOrderInSection(section);

    const member = await TeamMember.create({ ...req.body, section, order });
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ message: "Could not create member", error: error.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const existing = await TeamMember.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Member not found" });

    const section = req.body.section === "committee" || req.body.section === "core" ? req.body.section : existing.section;
    const hasExplicitPosition = Number.isFinite(Number(req.body.order)) && Number(req.body.order) >= 1;

    let order;
    if (hasExplicitPosition) {
      // Admin typed a specific position -> shift others to make room for it.
      order = await reseatMember({ section, excludeId: existing._id, desiredPosition: req.body.order });
    } else if (section === existing.section) {
      // No position given, staying in the same section -> leave it exactly
      // where it already was. Nobody's order changes.
      order = existing.order;
    } else {
      // No position given, but moved to a different section -> append at
      // the end of the new section, touching nobody else.
      order = await nextOrderInSection(section);
    }

    const member = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { ...req.body, section, order },
      { new: true, runValidators: true }
    );
    res.json(member);
  } catch (error) {
    res.status(400).json({ message: "Could not update member", error: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });

    member.active = false;
    await member.save();

    // Close the gap left behind so the remaining list stays a clean 1,2,3...
    await reseatMember({ section: member.section, excludeId: member._id, desiredPosition: Number.MAX_SAFE_INTEGER });

    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(400).json({ message: "Could not remove member", error: error.message });
  }
});

module.exports = router;