// cấu trúc thư mục hiện tại: /lib/errors.js
// Tác dụng file: Chuẩn hoá kết quả trả về (ok/err) và util xử lý lỗi (AppError, toErr).

/** Chuẩn dữ liệu thành công */
export function ok(data, meta = {}) {
    return { ok: true, data, ...meta };
}

/** Chuẩn dữ liệu lỗi */
export function err(message, { code = 'ERROR', status, issues } = {}) {
    return { ok: false, message, code, status, issues };
}

/** Lỗi ứng dụng có code/status để UI/Client xử lý */
export class AppError extends Error {
    constructor(message, code = 'ERROR', status = 400, issues) {
        super(message);
        this.code = code;
        this.status = status;
        if (issues) this.issues = issues;
    }
}

/** Ép mọi exception về object err chuẩn */
export function toErr(e, fallbackCode = 'ERROR') {
    if (!e) return err('Unknown error', { code: fallbackCode });
    if (e.ok === false) return e;
    if (e instanceof AppError) return err(e.message, { code: e.code, status: e.status, issues: e.issues });
    const status = e.status || e.statusCode;
    const code = e.code || fallbackCode;
    return err(e.message || 'Unexpected error', { code, status });
}
