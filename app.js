const express = require("express");
const path = require("path");
const methodOverride = require("method-override");

const app = express();
const PORT = 3000;

// app setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

//home page
app.get("/", (req, res) => {
  res.render("index");
});

app.listen(PORT, () => {
  console.log(`Dream car build planner running on http://localhost:${PORT}`);
});