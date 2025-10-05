// utils/dniUtils.js

function generateChileanRUT() {
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
  const rut = digits.join('');
  let sum = 0;
  let multiplier = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i] * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const checkDigit = remainder === 11 ? '0' : remainder === 10 ? 'K' : remainder.toString();
  return `${rut}-${checkDigit}`;
}

function generateCountryID(country) {
  const codes = {
    Chile: 'CL',
    Argentina: 'AR',
    Perú: 'PE',
    Brasil: 'BR',
    Colombia: 'CO',
    Uruguay: 'UY',
    Paraguay: 'PY',
    Venezuela: 'VE',
    Bolivia: 'BO',
  };
  const code = codes[country];
  if (!code) return null;
  const number = Math.floor(Math.random() * 90000000) + 10000000;
  return `${code}-${number}`;
}

function calculateAge(birthdate) {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

module.exports = {
  generateChileanRUT,
  generateCountryID,
  calculateAge,
};
