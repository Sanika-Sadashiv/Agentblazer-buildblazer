const express = require("express");
const SiteSettings = require("../models/SiteSettings");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const THEMES = [
  {
    id: "violet",
    name: "Violet",
    icon: "⚡",
    description: "Purple / cyan futuristic theme"
  },
  {
    id: "inferno",
    name: "Inferno",
    icon: "🔥",
    description: "Orange / red warm theme"
  },
  {
    id: "frost",
    name: "Frost",
    icon: "❄️",
    description: "Light blue / white theme"
  }
];

router.get("/themes", (req, res) => {
  res.json({ themes: THEMES });
});

router.get("/", async (req, res) => {
  try {
    let settings = await SiteSettings.findOne({ key: "main" });

    if (!settings) {
      settings = await SiteSettings.create({ key: "main" });
    }

    // Never let the browser / Vercel edge cache this response,
    // otherwise the user page keeps showing old settings.
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store"
    });
    res.removeHeader("ETag");

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Could not load site settings", error: error.message });
  }
});

/*
  The three theme choices are:
  violet, inferno, frost.

  The selected theme can be stored as the site's default theme.
  Individual visitors should normally store their own selection in
  localStorage so one visitor does not change the theme for everyone.
*/
router.put("/theme", protect, async (req, res) => {
  try {
    const { theme } = req.body;

    if (!THEMES.some((item) => item.id === theme)) {
      return res.status(400).json({
        message: "Invalid theme",
        allowedThemes: THEMES.map((item) => item.id)
      });
    }

    const settings = await SiteSettings.findOneAndUpdate(
      { key: "main" },
      { defaultTheme: theme },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "Default theme updated",
      defaultTheme: settings.defaultTheme
    });
  } catch (error) {
    res.status(400).json({ message: "Could not update theme", error: error.message });
  }
});

router.put("/", protect, async (req, res) => {
  try {
    const allowed = [
      "clubName",
      "academicYear",
      "defaultTheme",
      "contactEmail",
      "address",
      "stats"
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (update.defaultTheme && !THEMES.some((item) => item.id === update.defaultTheme)) {
      return res.status(400).json({ message: "Invalid defaultTheme" });
    }

    const settings = await SiteSettings.findOneAndUpdate(
      { key: "main" },
      update,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: "Could not update settings", error: error.message });
  }
});

module.exports = router;
