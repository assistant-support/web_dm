// File này chỉ đơn giản là xuất ra các handlers từ file cấu hình auth.js
// NextAuth sẽ tự động xử lý mọi thứ ở đây.
import { handlers } from "@/auth";
export const { GET, POST } = handlers;