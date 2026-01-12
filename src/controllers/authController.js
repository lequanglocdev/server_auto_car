import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Sesstion.js";

const ACCESS_TOKEN_TTL = "30m"; // thời gian sống của access token
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // thời gian sống của refresh token (7 ngày)

export const signUp = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        message: "Username, password và email không được để trống",
      });
    }
    // kiểm tra username tồn tại chưa
    const duplicate = await User.findOne({ username });

    if (duplicate) {
      return res.status(409).json({ message: "Username đã tồn tại" });
    }
    // mã hoá password
    const hashedPassword = await bcrypt.hash(password, 10); // salt = 10

    const otp = crypto.randomInt(100000, 999999);
    const otp_expiry = Date.now() + 10 * 60 * 1000; // OTP hết hạn sau 10 phút

    // tạo user mới
    await User.create({
      username,
      hashedPassword,
      email,
      role: "customer",
    });

    return res
      .sendStatus(204)
      .json({
        message:
          "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
      });
  } catch (error) {
    console.error("Lỗi khi gọi signUp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signIn = async (req, res) => {
  // lấy inputs
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password." });
    }
    // lấy hashedPassword trong db để so với password input
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email hoặc password không chính xác" });
    }
    // kiểm tra password
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordCorrect) {
      return res
        .status(401)
        .json({ message: "Email hoặc password không chính xác" });
    }
    // tạo access token và refresh token
    const accessToken = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");

    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });

    return res
      .status(200)
      .json({ message: "Đăng nhập thành công", accessToken });
  } catch (error) {
    console.error("Lỗi khi gọi signIn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signOut = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await Session.deleteOne({ refreshToken: token });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
    }
    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi gọi signOut", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Không tìm thấy refresh token" });
    }
    const session = await Session.findOne({ refreshToken: token });
    if (!session) {
      return res.status(403).json({ message: "Refresh token không hợp lệ" });
    }
    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }
    const newAccessToken = jwt.sign(
      { userId: user._id, username: user.username,role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    return res
      .status(200)
      .json({
        message: "Tạo access token thành công",
        accessToken: newAccessToken,
      });
  } catch (error) {
    console.error("Lỗi khi gọi refreshToken", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const acctiveAccountWithOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tài khoản với email này" });
    }
    if (user.is_active) {
      return res.status(400).json({ message: "Tài khoản đã được kích hoạt" });
    }
    if (user.otp !== presenInt(otp) || Date.now() > user.otp_expiry) {
      return res
        .status(400)
        .json({ message: "OTP không hợp lệ hoặc đã hết hạn" });
    }
    user.is_active = true;
    user.otp = null;
    user.otp_expiry = null;
    await user.save();
    return res.status(200).json({ message: "Kích hoạt tài khoản thành công" });
  } catch (error) {
    console.error("Lỗi khi gọi acctiveAccountWithOtp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
