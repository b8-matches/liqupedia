const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { getMatches } = require("./utils")
require("dotenv").config();

//express config
const app = express();
app.use(cors({ origin: "*" }));
const port = process.env.PORT || 4000;

app.get("/matches", async (req, res) => {
  try {
    const matches = await getMatches();
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
