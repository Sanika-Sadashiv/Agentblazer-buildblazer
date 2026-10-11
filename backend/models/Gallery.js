const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    title: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    caption: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gallery", gallerySchema);
