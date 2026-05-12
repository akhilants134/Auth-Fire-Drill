const roleCheck = (roles) => {
  return (req, res, next) => {
    // FIXED PART 2: role is now present in JWT, so req.user.role has the actual role
    // FIXED PART 4: Now we properly check if user's role is in the allowed roles list
    if (!roles.includes(req.user?.role)) {
      return res
        .status(403)
        .json({ error: "Permission denied", role: req.user?.role });
    }
    next();
  };
};

module.exports = roleCheck;
