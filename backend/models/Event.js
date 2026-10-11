const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "Event" },
    description: { type: String, default: "" },
    speaker: { type: String, default: "" },
    venue: { type: String, default: "" },
    track: { type: String, default: "" },
    galleryCount: { type: Number, default: 0 },
    shortlistedStudents: { type: Number, default: 0 },
    image: { type: String, default: "" },
    gallery: [{ type: String }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
