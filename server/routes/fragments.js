const express = require("express");
const router = express.Router();
const { fragments, users } = require("../data/store");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.get("/", (req, res) => {
  res.json(fragments);
});

// FIXED PART 4: Only Contributor and above can create fragments
router.post(
  "/",
  auth,
  roleCheck(["contributor", "curator", "admin"]),
  (req, res) => {
    const { content, parentId } = req.body;
    const newFrag = {
      id: Date.now().toString(),
      content,
      parentId,
      userId: req.user.userId,
      author: users.find((u) => u.id === req.user.userId)?.email,
      status: "pending",
      createdAt: new Date(),
    };
    fragments.push(newFrag);
    res.status(201).json(newFrag);
  },
);

// FIXED PART 4: Only Curator and Admin can edit any fragment
router.put("/:id", auth, roleCheck(["curator", "admin"]), (req, res) => {
  const frag = fragments.find((f) => f.id === req.params.id);
  if (!frag) return res.status(404).json({ error: "Fragment not found" });
  frag.content = req.body.content;
  res.json(frag);
});

// FIXED PART 4: Only Curator and Admin can approve fragments
router.post(
  "/:id/approve",
  auth,
  roleCheck(["curator", "admin"]),
  (req, res) => {
    const frag = fragments.find((f) => f.id === req.params.id);
    if (!frag) return res.status(404).json({ error: "Fragment not found" });
    frag.status = "published";
    res.json(frag);
  },
);

// FIXED PART 4: Only Admin can delete fragments
router.delete("/:id", auth, roleCheck(["admin"]), (req, res) => {
  const index = fragments.findIndex((f) => f.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Not found" });
  fragments.splice(index, 1);
  res.json({ message: "Deleted" });
});

module.exports = router;
