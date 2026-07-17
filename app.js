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

// View one build and its modifications
app.get("/builds/:id", (req, res) => {
  const buildId = req.params.id;

  const buildSql = `
    SELECT *
    FROM builds
    WHERE id = ?
  `;

  db.get(buildSql, [buildId], (err, build) => {
    if (err) {
      console.error(err);

      return res
        .status(500)
        .send("Database error while loading build.");
    }

    if (!build) {
      return res.status(404).send("Build not found.");
    }

    const modificationsSql = `
      SELECT *
      FROM modifications
      WHERE build_id = ?
      ORDER BY created_at DESC
    `;

    db.all(modificationsSql, [buildId], (err, modifications) => {
      if (err) {
        console.error(err);

        return res
          .status(500)
          .send("Database error while loading modifications.");
      }

              const totalModificationCost = modifications.reduce(
          (total, modification) => {
            return total + Number(modification.cost || 0);
          },
          0
        );

        const plannedCount = modifications.filter(
          (modification) => modification.status === "Planned"
        ).length;

        const purchasedCount = modifications.filter(
          (modification) => modification.status === "Purchased"
        ).length;

        const installedCount = modifications.filter(
          (modification) => modification.status === "Installed"
        ).length;

        const totalParts = modifications.length;

        const completionPercentage =
          totalParts === 0 ? 0 : Math.round((installedCount / totalParts) * 100);

        const buildBudget = Number(build.budget || 0);

        const remainingBudget = buildBudget - totalModificationCost;

        const budgetUsedPercentage =
          buildBudget === 0
            ? 0
            : Math.min(Math.round((totalModificationCost / buildBudget) * 100), 100);

            res.render("builds/show", {
        build,
        modifications,
        totalModificationCost,
        plannedCount,
        purchasedCount,
        installedCount,
        completionPercentage,
        remainingBudget,
        budgetUsedPercentage,
      });
    });
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

// Show form to add a modification
app.get("/builds/:id/modifications/new", (req, res) => {
  const buildId = req.params.id;

  const sql = `
    SELECT *
    FROM builds
    WHERE id = ?
  `;

  db.get(sql, [buildId], (err, build) => {
    if (err) {
      console.error(err);

      return res
        .status(500)
        .send("Database error while loading build.");
    }

    if (!build) {
      return res.status(404).send("Build not found.");
    }

    res.render("modifications/new", { build });
  });
});

// Save a new modification
app.post("/builds/:id/modifications", (req, res) => {
  const buildId = req.params.id;

  const {
    part_name,
    category,
    brand,
    cost,
    status,
    notes,
  } = req.body;

  if (!part_name || !category || !status) {
    return res
      .status(400)
      .send("Part name, category, and status are required.");
  }

  const sql = `
    INSERT INTO modifications (
      build_id,
      part_name,
      category,
      brand,
      cost,
      status,
      notes,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    buildId,
    part_name,
    category,
    brand || null,
    cost || 0,
    status,
    notes || null,
    new Date().toISOString(),
  ];

  db.run(sql, values, function (err) {
    if (err) {
      console.error(err);

      return res
        .status(500)
        .send("Database error while creating modification.");
    }

    res.redirect(`/builds/${buildId}`);
  });
});

// Show form to edit a modification
app.get("/builds/:buildId/modifications/:modificationId/edit", (req, res) => {
  const { buildId, modificationId } = req.params;

  const buildSql = `
    SELECT *
    FROM builds
    WHERE id = ?
  `;

  db.get(buildSql, [buildId], (err, build) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while loading build.");
    }

    if (!build) {
      return res.status(404).send("Build not found.");
    }

    const modificationSql = `
      SELECT *
      FROM modifications
      WHERE id = ? AND build_id = ?
    `;

    db.get(modificationSql, [modificationId, buildId], (err, modification) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database error while loading modification.");
      }

      if (!modification) {
        return res.status(404).send("Modification not found.");
      }

      res.render("modifications/edit", {
        build,
        modification,
      });
    });
  });
});

// Update a modification
app.put("/builds/:buildId/modifications/:modificationId", (req, res) => {
  const { buildId, modificationId } = req.params;

  const {
    part_name,
    category,
    brand,
    cost,
    status,
    notes,
  } = req.body;

  if (!part_name || !category || !status) {
    return res
      .status(400)
      .send("Part name, category, and status are required.");
  }

  const sql = `
    UPDATE modifications
    SET
      part_name = ?,
      category = ?,
      brand = ?,
      cost = ?,
      status = ?,
      notes = ?
    WHERE id = ? AND build_id = ?
  `;

  const values = [
    part_name,
    category,
    brand || null,
    cost || 0,
    status,
    notes || null,
    modificationId,
    buildId,
  ];

  db.run(sql, values, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while updating modification.");
    }

    if (this.changes === 0) {
      return res.status(404).send("Modification not found.");
    }

    res.redirect(`/builds/${buildId}`);
  });
});

// Delete a modification
app.delete("/builds/:buildId/modifications/:modificationId", (req, res) => {
  const { buildId, modificationId } = req.params;

  const sql = `
    DELETE FROM modifications
    WHERE id = ? AND build_id = ?
  `;

  db.run(sql, [modificationId, buildId], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error while deleting modification.");
    }

    if (this.changes === 0) {
      return res.status(404).send("Modification not found.");
    }

    res.redirect(`/builds/${buildId}`);
  });
});