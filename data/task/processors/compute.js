// /data/task/processors/compute.js
// Cấu trúc: /data/task/processors/*
// Mục đích: Helper quy đổi input approve-completion (theo B9) → tham số đúng với Task model.
// - Input B9: workerSplitPoints[] (userId, points), payouts[] (userId, amount)
// - Output cho Task.approveCompletionWithSplit: { workerSplitPoints:number, payouts:[{userId, points}] }
// - Ràng buộc: tổng (sum(workerSplitPoints[].points) + sum(payouts[].amount)) === totalPoints
// - Assignee nhận phần workerSplitPoints; những người còn lại → payouts (points)

function sum(arr, pick) {
    return (arr || []).reduce((acc, x) => acc + (Number(pick ? x[pick] : x) || 0), 0);
}

/**
 * Tính workerSplitPoints (numeric, cho assignee) & payouts[] (points) từ input B9.
 * @param {Object} params
 * @param {string|null} params.assigneeId
 * @param {number} params.totalPoints
 * @param {Array<{userId:string, points:number}>} params.workerSplitItems
 * @param {Array<{userId:string, amount:number, ref?:string}>} [params.payoutItems]
 * @returns {{ workerSplitPoints:number, payouts:Array<{userId:string, points:number}>, issues?:Array<{field:string,message:string}> }}
 */
export function computeFromB9Input({ assigneeId, totalPoints, workerSplitItems, payoutItems }) {
    const issues = [];

    // Chuẩn hoá workerSplitItems (gộp trùng userId)
    const wsMap = new Map();
    for (const s of workerSplitItems || []) {
        const id = String(s.userId);
        const p = Number(s.points) || 0;
        wsMap.set(id, (wsMap.get(id) || 0) + p);
    }
    const ws = Array.from(wsMap.entries()).map(([userId, points]) => ({ userId, points }));

    // Chuẩn hoá payouts input (amount -> points) + gộp trùng userId
    const poMap = new Map();
    for (const p of payoutItems || []) {
        const id = String(p.userId);
        const val = Number(p.amount) || 0;
        poMap.set(id, (poMap.get(id) || 0) + val);
    }
    const po = Array.from(poMap.entries()).map(([userId, points]) => ({ userId, points }));

    // Kiểm tra tổng điểm
    const total = sum(ws, 'points') + sum(po, 'points');
    if (total !== Number(totalPoints)) {
        issues.push({ field: 'totalPoints', message: 'Tổng điểm (workerSplit + payouts) phải bằng totalPoints.' });
    }

    // Phân bổ: assignee → workerSplitPoints; những người còn lại → payouts
    let workerSplitPoints = 0;
    const payouts = [];

    for (const x of ws) {
        if (assigneeId && String(x.userId) === String(assigneeId)) {
            workerSplitPoints += Number(x.points) || 0;
        } else {
            payouts.push({ userId: String(x.userId), points: Number(x.points) || 0 });
        }
    }

    // Thêm các payouts "tiền thưởng" khác (po)
    for (const x of po) {
        // gộp nếu đã có cùng user
        const idx = payouts.findIndex((i) => String(i.userId) === String(x.userId));
        if (idx >= 0) {
            payouts[idx].points += Number(x.points) || 0;
        } else {
            payouts.push({ userId: String(x.userId), points: Number(x.points) || 0 });
        }
    }

    return { workerSplitPoints, payouts, issues: issues.length ? issues : undefined };
}
