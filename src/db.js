const fs = require("fs");
const path = require("path");
const dbFile = path.join(__dirname, "..", "data", "strings.json");

function readDB() {
  if (!fs.existsSync(dbFile)) return [];
  try {
    const content = fs.readFileSync(dbFile, "utf8");
    return JSON.parse(content || "[]");
  } catch (e) {
    return [];
  }
}

function writeDB(rows) {
  fs.writeFileSync(dbFile, JSON.stringify(rows, null, 2), "utf8");
}

function insert(row) {
  const rows = readDB();
  rows.push(row);
  writeDB(rows);
}

function findById(id) {
  const rows = readDB();
  return rows.find((r) => r.id === id);
}

function findByValue(value) {
  const rows = readDB();
  return rows.find((r) => r.value === value);
}

function all(filterFn) {
  const rows = readDB();
  return filterFn ? rows.filter(filterFn) : rows;
}

function removeByValue(value) {
  let rows = readDB();
  const before = rows.length;
  rows = rows.filter((r) => r.value !== value);
  writeDB(rows);
  return rows.length !== before;
}

module.exports = { insert, findById, findByValue, all, removeByValue };
