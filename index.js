const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
// const { error } = require("console");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("DB connection error:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);
const User = mongoose.model("User", userSchema);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required!" });
    }

    const newUser = new User({ username });
    await newUser.save();

    res.json({
      username: newUser.username,
      _id: newUser._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const { _id } = req.params;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const exerciseDate = date ? new Date(date) : new Date();

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });

    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let filter = { userId: user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).select("description duration date -_id");

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const exercises = await query.exec();

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map((e) => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString(),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
