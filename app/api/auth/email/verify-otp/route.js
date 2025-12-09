import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, createAuthCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    await connectDB();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Thiếu email hoặc mã OTP" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: "Không tìm thấy tài khoản với email này" },
        { status: 404 }
      );
    }

    // 🔍 Chuẩn hoá OTP: ép về string + trim khoảng trắng
    const rawOtp = String(otp).trim();
    const storedOtp = String(user.otpCode || "").trim();

    //console.log("VERIFY OTP:", { rawOtp, storedOtp, expires: user.otpExpires });

    if (!storedOtp || storedOtp !== rawOtp) {
      return NextResponse.json(
        { message: "Mã OTP không hợp lệ" },
        { status: 400 }
      );
    }

    // 🔥 Check hết hạn
    if (!user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      return NextResponse.json(
        { message: "Mã OTP đã hết hạn" },
        { status: 400 }
      );
    }

    // Xoá OTP sau khi dùng
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    // Tạo token giống login thường
    const token = signToken({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(createAuthCookie(token));

    return NextResponse.json(
      {
        message: "Đăng nhập thành công",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return NextResponse.json({ message: "Lỗi server" }, { status: 500 });
  }
}
