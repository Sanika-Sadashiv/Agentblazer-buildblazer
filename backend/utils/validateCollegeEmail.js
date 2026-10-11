// Only genuine SJEC college email addresses may register as members.
const ALLOWED_DOMAIN = "@sjec.ac.in";

function isCollegeEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
}

module.exports = { isCollegeEmail, ALLOWED_DOMAIN };