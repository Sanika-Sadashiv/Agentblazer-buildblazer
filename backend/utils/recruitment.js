const MembershipApplication = require("../models/MembershipApplication");

const ROUNDS = ["aptitude", "interview"];
const RESULTS = ["selected", "rejected"];

// Overall status after a round has been decided.
function nextStatus(round, result) {
  if (result === "rejected") return "rejected";
  return round === "aptitude" ? "interview_pending" : "selected";
}

// Applications created before the recruitment workflow existed used the old
// pending / approved / rejected statuses. Convert them once; this is
// idempotent and cheap, so it is safe to call whenever applications are read.
async function migrateLegacyStatuses() {
  const col = MembershipApplication.collection;

  // old "pending"  -> waiting for the aptitude round
  await col.updateMany(
    { status: "pending" },
    { $set: { status: "aptitude_pending", "aptitude.result": "pending", "interview.result": "pending" } }
  );
  // old "approved" -> selected (both rounds treated as cleared, no email history)
  await col.updateMany(
    { status: "approved" },
    { $set: { status: "selected", "aptitude.result": "selected", "interview.result": "selected" } }
  );
  // old "rejected" -> rejected at the aptitude stage
  await col.updateMany(
    { status: "rejected", "aptitude.result": { $exists: false } },
    { $set: { "aptitude.result": "rejected", "interview.result": "pending" } }
  );
}

module.exports = { ROUNDS, RESULTS, nextStatus, migrateLegacyStatuses };
