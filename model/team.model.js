// cấu trúc thư mục hiện tại: /model/team.model.js
// Tác dụng file: Định nghĩa Mongoose Model Team (nhóm làm việc) và membership.

import mongoose from 'mongoose';
import { TEAM_ROLE } from '@/model/common/enums.js';

const TeamMembershipSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // externalUserId
    role: { type: String, enum: Object.values(TEAM_ROLE), required: true },
}, { _id: false, timestamps: true });

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    description: String,
    members: { type: [TeamMembershipSchema], default: [] },
    isActive: { type: Boolean, default: true },
    
    // ---- Drive: tạo folder khi tạo team
    driveFolderId: { type: String, index: true }, // ID folder của team trên Google Drive
    driveFolderName: { type: String }, // Tên folder (để hiển thị)
    driveParentId: { type: String }, // ID folder cha (thường là DRIVE_SHARED_DRIVE_ID)
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

// Tìm team theo user
TeamSchema.index({ 'members.userId': 1 });

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
