const express = require("express");
const Event = require("../models/Event");
const TeamMember = require("../models/TeamMember");
const MembershipApplication = require("../models/MembershipApplication");
const ContactMessage = require("../models/ContactMessage");
const Gallery = require("../models/Gallery");
const { protect } = require("../middleware/authMiddleware");
const { migrateLegacyStatuses } = require("../utils/recruitment");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [events, teamMembers, applications, messages, galleryItems] = await Promise.all([
      Event.countDocuments(),
      TeamMember.countDocuments({ active: true }),
      MembershipApplication.countDocuments(),
      ContactMessage.countDocuments(),
      Gallery.countDocuments()
    ]);

    res.json({ events, teamMembers, membershipApplications: applications, contactMessages: messages, galleryItems });
  } catch (error) {
    res.status(500).json({ message: "Could not load stats", error: error.message });
  }
});

router.get("/admin", protect, async (req, res) => {
  try {
    await migrateLegacyStatuses();
    const [events, teamMembers, applications, messages, galleryItems, aptitudePending, interviewPending, selectedApplications, rejectedApplications, newMessages] =
      await Promise.all([
        Event.countDocuments(),
        TeamMember.countDocuments({ active: true }),
        MembershipApplication.countDocuments(),
        ContactMessage.countDocuments(),
        Gallery.countDocuments(),
        MembershipApplication.countDocuments({ status: "aptitude_pending" }),
        MembershipApplication.countDocuments({ status: "interview_pending" }),
        MembershipApplication.countDocuments({ status: "selected" }),
        MembershipApplication.countDocuments({ status: "rejected" }),
        ContactMessage.countDocuments({ status: "new" })
      ]);

    res.json({ events, teamMembers, membershipApplications: applications, contactMessages: messages, galleryItems, aptitudePending, interviewPending, selectedApplications, rejectedApplications, newMessages });
  } catch (error) {
    res.status(500).json({ message: "Could not load admin stats", error: error.message });
  }
});

module.exports = router;