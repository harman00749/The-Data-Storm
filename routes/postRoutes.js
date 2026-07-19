const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");

const router = express.Router();

const requireDatabase = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is not connected. Add MONGODB_URI to .env and restart the server.",
    });
  }

  return next();
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.use(requireDatabase);

router.get("/top/recent", async (_req, res, next) => {
  try {
    const posts = await Post.find()
      .populate("authorId", "name email")
      .sort({ createdAt: -1 })
      .limit(3);

    return res.json({
      message: "Top 3 most recent posts fetched successfully",
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (_req, res, next) => {
  try {
    const posts = await Post.find()
      .populate("authorId", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      message: "Posts fetched successfully",
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid post id",
      });
    }

    const post = await Post.findById(req.params.id).populate("authorId", "name email");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    return res.json({
      message: "Post fetched successfully",
      data: post,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, content, authorId, author } = req.body || {};
    let resolvedAuthorId = authorId;

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    if (!resolvedAuthorId && author?.name && author?.email) {
      const user = await User.findOneAndUpdate(
        { email: author.email.toLowerCase() },
        { name: author.name, email: author.email },
        { new: true, upsert: true, runValidators: true },
      );

      resolvedAuthorId = user._id;
    }

    if (!resolvedAuthorId || !isValidObjectId(resolvedAuthorId)) {
      return res.status(400).json({
        message: "Valid authorId is required. You can also send author: { name, email }.",
      });
    }

    const post = await Post.create({
      title,
      content,
      authorId: resolvedAuthorId,
    });

    const populatedPost = await post.populate("authorId", "name email");

    return res.status(201).json({
      message: "Post created successfully",
      data: populatedPost,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      error.status = 400;
    }

    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid post id",
      });
    }

    const allowedUpdates = {};
    ["title", "content", "authorId"].forEach((field) => {
      if (req.body[field]) {
        allowedUpdates[field] = req.body[field];
      }
    });

    const post = await Post.findByIdAndUpdate(req.params.id, allowedUpdates, {
      new: true,
      runValidators: true,
    }).populate("authorId", "name email");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    return res.json({
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      error.status = 400;
    }

    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid post id",
      });
    }

    const deletedPost = await Post.findByIdAndDelete(req.params.id);

    if (!deletedPost) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    return res.json({
      message: "Post deleted successfully",
      deletedId: deletedPost._id,
      data: deletedPost,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
