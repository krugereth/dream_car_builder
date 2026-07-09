const express = require("express");
const path = require("path");
const methodOverride = require("method-override");

const { db, initDatabase } = require("./database");

const app = express();
const PORT = 3000;

// App setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

// Database setup
initDatabase();

// Home page
app.get("/", (req, res) => {
  res.render("index");
});

// View all builds
app.get("/builds", (req, res) => {
  const sql = `
    SELECT *
    FROM builds
    ORDER BY created_at DESC
  `;

  db.all(sql, [], (err, builds) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while loading builds.");
    }

    res.render("builds/index", { builds });
  });
});

// Show form to create a new build
app.get("/builds/new", (req, res) => {
  res.render("builds/new");
});

// Save new build
app.post("/builds", (req, res) => {
  const {
    build_name,
    make,
    model,
    year,
    goal,
    budget,
    notes,
  } = req.body;

  if (!build_name || !make || !model) {
    return res.status(400).send("Build name, make, and model are required.");
  }

  const sql = `
    INSERT INTO builds (
      build_name,
      make,
      model,
      year,
      goal,
      budget,
      notes,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    build_name,
    make,
    model,
    year || null,
    goal || null,
    budget || null,
    notes || null,
    new Date().toISOString(),
  ];

  db.run(sql, values, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while creating build.");
    }

    res.redirect(`/builds/${this.lastID}`);
  });
});

// View one build
app.get("/builds/:id", (req, res) => {
  const buildId = req.params.id;

  const sql = `
    SELECT *
    FROM builds
    WHERE id = ?
  `;

  db.get(sql, [buildId], (err, build) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while loading build.");
    }

    if (!build) {
      return res.status(404).send("Build not found.");
    }

    res.render("builds/show", { build });
  });
});

app.listen(PORT, () => {
  console.log(`AutoBuilder running on http://localhost:${PORT}`);
});

// Show form to edit a build
app.get("/builds/:id/edit", (req, res) => {
  const buildId = req.params.id;

  const sql = `
    SELECT *
    FROM builds
    WHERE id = ?
  `;

  db.get(sql, [buildId], (err, build) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while loading build.");
    }

    if (!build) {
      return res.status(404).send("Build not found.");
    }

    res.render("builds/edit", { build });
  });
});

// Update a build
app.put("/builds/:id", (req, res) => {
  const buildId = req.params.id;

  const {
    build_name,
    make,
    model,
    year,
    goal,
    budget,
    notes,
  } = req.body;

  if (!build_name || !make || !model) {
    return res.status(400).send("Build name, make, and model are required.");
  }

  const sql = `
    UPDATE builds
    SET
      build_name = ?,
      make = ?,
      model = ?,
      year = ?,
      goal = ?,
      budget = ?,
      notes = ?
    WHERE id = ?
  `;

  const values = [
    build_name,
    make,
    model,
    year || null,
    goal || null,
    budget || null,
    notes || null,
    buildId,
  ];

  db.run(sql, values, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while updating build.");
    }

    if (this.changes === 0) {
      return res.status(404).send("Build not found.");
    }

    res.redirect(`/builds/${buildId}`);
  });
});

// Delete a build
app.delete("/builds/:id", (req, res) => {
  const buildId = req.params.id;

  const sql = `
    DELETE FROM builds
    WHERE id = ?
  `;

  db.run(sql, [buildId], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while deleting build.");
    }

    if (this.changes === 0) {
      return res.status(404).send("Build not found.");
    }

    res.redirect("/builds");
  });
});