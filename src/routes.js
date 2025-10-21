const express = require("express");
const router = express.Router();
const db = require("./db");
const { analyzeString } = require("./analysis");
const { body, query, validationResult } = require("express-validator");

const { insert, findById, findByValue, all, removeByValue } = db;

function rowToResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    value: row.value,
    properties: {
      length: row.length,
      is_palindrome: Boolean(row.is_palindrome),
      unique_characters: row.unique_characters,
      word_count: row.word_count,
      sha256_hash: row.sha256_hash,
      character_frequency_map: row.character_frequency_map,
    },
    created_at: row.created_at,
  };
}

// POST /strings
router.post(
  "/strings",
  body("value")
    .exists()
    .withMessage("value is required")
    .bail()
    .isString()
    .withMessage("value must be a string"),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      if (err.msg.includes("required"))
        return res.status(400).json({ error: err.msg });
      return res.status(422).json({ error: err.msg });
    }
    const { value } = req.body;
    const props = analyzeString(value);
    const id = props.sha256_hash;
    const exists = findById(id);
    if (exists) {
      return res.status(409).json({ error: "String already exists" });
    }
    const now = new Date().toISOString();
    const row = {
      id,
      value,
      length: props.length,
      is_palindrome: props.is_palindrome,
      unique_characters: props.unique_characters,
      word_count: props.word_count,
      sha256_hash: props.sha256_hash,
      character_frequency_map: props.character_frequency_map,
      created_at: now,
    };
    insert(row);
    return res.status(201).json(rowToResponse(row));
  }
);

// GET /strings (with filters)
router.get(
  "/strings",
  // validation of query params
  query("is_palindrome")
    .optional()
    .isBoolean()
    .withMessage("is_palindrome must be boolean"),
  query("min_length")
    .optional()
    .isInt({ min: 0 })
    .withMessage("min_length must be integer >= 0"),
  query("max_length")
    .optional()
    .isInt({ min: 0 })
    .withMessage("max_length must be integer >= 0"),
  query("word_count")
    .optional()
    .isInt({ min: 0 })
    .withMessage("word_count must be integer >= 0"),
  query("contains_character")
    .optional()
    .isString()
    .isLength({ min: 1, max: 1 })
    .withMessage("contains_character must be a single character"),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: errors.array()[0].msg });

    const filters_applied = {};
    const rows = all();
    let filtered = rows;
    if (req.query.is_palindrome !== undefined) {
      const val = req.query.is_palindrome === "true";
      filtered = filtered.filter((r) => Boolean(r.is_palindrome) === val);
      filters_applied.is_palindrome = val;
    }
    if (req.query.min_length !== undefined) {
      const v = parseInt(req.query.min_length, 10);
      filtered = filtered.filter((r) => r.length >= v);
      filters_applied.min_length = v;
    }
    if (req.query.max_length !== undefined) {
      const v = parseInt(req.query.max_length, 10);
      filtered = filtered.filter((r) => r.length <= v);
      filters_applied.max_length = v;
    }
    if (req.query.word_count !== undefined) {
      const v = parseInt(req.query.word_count, 10);
      filtered = filtered.filter((r) => r.word_count === v);
      filters_applied.word_count = v;
    }
    if (req.query.contains_character !== undefined) {
      const ch = req.query.contains_character;
      filtered = filtered.filter((r) =>
        Object.prototype.hasOwnProperty.call(r.character_frequency_map, ch)
      );
      filters_applied.contains_character = ch;
    }

    const data = filtered.map(rowToResponse);
    return res.json({ data, count: data.length, filters_applied });
  }
);

// GET /strings/filter-by-natural-language
router.get(
  "/strings/filter-by-natural-language",
  query("query").exists().withMessage("query is required"),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: errors.array()[0].msg });
    const q = req.query.query.toLowerCase();
    // very small heuristic parser
    const filters = {};
    if (/single word|one word/.test(q)) filters.word_count = 1;
    if (/palindromic|palindrome|palindromic strings|palindromic string/.test(q))
      filters.is_palindrome = true;
    const mLonger = q.match(/longer than (\d+)/);
    if (mLonger) filters.min_length = parseInt(mLonger[1], 10) + 0;
    const mLongerAlt = q.match(/longer than (\d+) characters/);
    if (mLongerAlt) filters.min_length = parseInt(mLongerAlt[1], 10) + 0;
    const mLongerGT = q.match(/strings longer than (\d+)/);
    if (mLongerGT) filters.min_length = parseInt(mLongerGT[1], 10) + 1;
    const mContains = q.match(/contain(?:ing|s)? the letter (\w)/);
    if (mContains) filters.contains_character = mContains[1];
    const mContainsSimple = q.match(/containing the letter (\w)/);
    if (mContainsSimple) filters.contains_character = mContainsSimple[1];
    const mContainsSingle = q.match(/contain the first vowel/);
    if (mContainsSingle) filters.contains_character = "a";

    if (Object.keys(filters).length === 0)
      return res
        .status(400)
        .json({ error: "Unable to parse natural language query" });

    // apply filters using same logic as /strings
    const rows = all();
    let filtered = rows;
    if (filters.is_palindrome !== undefined)
      filtered = filtered.filter(
        (r) => Boolean(r.is_palindrome) === filters.is_palindrome
      );
    if (filters.min_length !== undefined)
      filtered = filtered.filter((r) => r.length >= filters.min_length);
    if (filters.max_length !== undefined)
      filtered = filtered.filter((r) => r.length <= filters.max_length);
    if (filters.word_count !== undefined)
      filtered = filtered.filter((r) => r.word_count === filters.word_count);
    if (filters.contains_character !== undefined)
      filtered = filtered.filter((r) =>
        Object.prototype.hasOwnProperty.call(
          r.character_frequency_map,
          filters.contains_character
        )
      );
    const data = filtered.map(rowToResponse);
    return res.json({
      data,
      count: data.length,
      interpreted_query: { original: req.query.query, parsed_filters: filters },
    });
  }
);

// GET /strings/:value
router.get("/strings/:value", (req, res) => {
  const val = req.params.value;
  const row = findByValue(val);
  if (!row) return res.status(404).json({ error: "String not found" });
  return res.json(rowToResponse(row));
});

// DELETE /strings/:value
router.delete("/strings/:value", (req, res) => {
  const val = req.params.value;
  const row = findByValue(val);
  if (!row) return res.status(404).json({ error: "String not found" });
  removeByValue(val);
  return res.status(204).send();
});

module.exports = router;
