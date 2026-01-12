// src/middlewares/checkAdmin.js

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      msg: "Bạn không có quyền thực hiện hành động này",
    });
  }
  next();
};

export default isAdmin;
