const validator = require("validator");

const normalizeString = (v) => (typeof v === "string" ? v.trim() : "");

const validateEmail = (email) => {
  const e = normalizeString(email);
  if (!e) return false;
  return validator.isEmail(e, {
    allow_utf8_local_part: true,
    ignore_max_length: true,
  });
};

const validateCedulaLuhn = (input) => {
  const digits = normalizeString(String(input)).replace(/\D+/g, "");
  if (digits.length < 7) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits.charAt(i), 10);
    if (Number.isNaN(d)) return false;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
};

const validateCedulaEcuador = (input) => {
  const ced = normalizeString(String(input)).replace(/\D+/g, "");
  if (ced.length !== 10) return false;
  const province = parseInt(ced.slice(0, 2), 10);
  if (!(province >= 1 && province <= 24)) return false;
  const third = parseInt(ced[2], 10);
  if (Number.isNaN(third) || third >= 6) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(ced[i], 10) * coef[i];
    if (Number.isNaN(val)) return false;
    if (val >= 10) val -= 9;
    sum += val;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(ced[9], 10);
};

module.exports = {
  normalizeString,
  validateEmail,
  validateCedulaLuhn,
  validateCedulaEcuador,
};
