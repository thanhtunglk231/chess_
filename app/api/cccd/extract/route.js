// ============================================
// FILE: app/api/cccd/extract/route.js (REFACTORED)
// Dùng Gemini AI để OCR CCCD
// ============================================

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const PROMPT_TEXT = `
Bạn là trợ lý AI chuyên trích xuất thông tin từ CCCD Việt Nam.
Phân tích hình ảnh và trích xuất các thông tin sau, trả về dưới dạng JSON:
* ho_va_ten (Họ và tên)
* ngay_sinh (Ngày sinh, định dạng DD/MM/YYYY)
* gioi_tinh (Giới tính: Nam hoặc Nữ)
* noi_thuong_tru (Nơi thường trú/địa chỉ đầy đủ)

Lưu ý:
- Chỉ trả về JSON thuần túy, không có markdown, không có giải thích
- Nếu không tìm thấy thông tin nào, để giá trị là chuỗi rỗng ""
- Giới tính chỉ có 2 giá trị: "Nam" hoặc "Nữ"
- Trả về định dạng: {"ho_va_ten": "", "ngay_sinh": "", "gioi_tinh": "", "noi_thuong_tru": ""}
`;

// Helper: Convert file to base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes).toString("base64");
}

// Helper: Lấy MIME type
function getMimeType(file) {
  const type = file.type;
  if (type.includes("jpeg") || type.includes("jpg")) return "image/jpeg";
  if (type.includes("png")) return "image/png";
  return type;
}

// Helper: Convert ngày sinh DD/MM/YYYY -> YYYY-MM-DD
function convertToISODate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  try {
    const parts = dateStr.trim().split("/");
    if (parts.length !== 3) return "";

    let day = parts[0].trim();
    let month = parts[1].trim();
    const year = parts[2].trim();

    // Xử lý trường hợp không có padding
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");

    // Validate
    if (isNaN(day) || isNaN(month) || isNaN(year)) return "";
    if (parseInt(day) > 31 || parseInt(month) > 12) return "";

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("❌ Date conversion error:", error);
    return "";
  }
}

export async function POST(request) {
  try {
    // Lấy FormData
    const formData = await request.formData();
    const file = formData.get("cccd_image");

    // Validate file
    if (!file) {
      return NextResponse.json(
        { message: "Vui lòng tải lên ảnh CCCD" },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "Ảnh quá lớn (tối đa 5MB)" },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Chỉ chấp nhận ảnh JPG, JPEG hoặc PNG" },
        { status: 400 }
      );
    }

    console.log("📸 Processing CCCD image:", file.name, `(${file.size} bytes)`);

    // Convert file to base64
    const base64 = await fileToBase64(file);
    const mimeType = getMimeType(file);

    // Gọi Gemini AI
    const result = await model.generateContent([
      PROMPT_TEXT,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ]);

    let responseText = result.response.text();
    console.log("🤖 Gemini response:", responseText);

    // Làm sạch JSON (loại bỏ markdown nếu có)
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse JSON
    let cccdData;
    try {
      cccdData = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "❌ JSON parse error:",
        parseError,
        "Response:",
        responseText
      );
      return NextResponse.json(
        {
          message:
            "Không thể đọc thông tin từ ảnh. Vui lòng thử lại hoặc nhập thủ công.",
          error: parseError.message,
        },
        { status: 400 }
      );
    }

    // Normalize & validate data
    const extractedData = {
      fullName: (cccdData.ho_va_ten || "").trim(),
      birthDay: convertToISODate(cccdData.ngay_sinh) || "",
      sex: (cccdData.gioi_tinh || "").trim(),
      address: (cccdData.noi_thuong_tru || "").trim(),
    };

    console.log("✅ Extracted data:", extractedData);

    return NextResponse.json({
      message: "Trích xuất thông tin CCCD thành công",
      data: extractedData,
    });
  } catch (error) {
    console.error("❌ CCCD extraction error:", error);

    return NextResponse.json(
      {
        message: "Lỗi xử lý ảnh. Vui lòng thử lại hoặc nhập thủ công.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
