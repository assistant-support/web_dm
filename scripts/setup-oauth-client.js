// scripts/setup-oauth-client.js
/**
 * Script để tạo hoặc cập nhật OAuth Client App trên Authorization Server (web 3000)
 * Chạy: node scripts/setup-oauth-client.js
 */

const mongoose = require('mongoose');

// Client App Schema (giống trong web_myaccount)
const clientAppSchema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true },
    clientSecret: { type: String, required: true },
    name: { type: String, required: true },
    redirectUris: [String],
    allowedScopes: [String],
    grantTypes: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const ClientApp = mongoose.models.ClientApp || mongoose.model('ClientApp', clientAppSchema);

async function setupClient() {
    try {
        // Kết nối tới database của web MyAccount (3000)
        const MYACCOUNT_DB_URI = 'mongodb+srv://assistantsupdev_db_user:MEeXFG7xbBjRn6Iu@dm.vn2ieif.mongodb.net/database?retryWrites=true&w=majority';
        
        console.log('🔌 Đang kết nối tới Authorization Server database...');
        await mongoose.connect(MYACCOUNT_DB_URI);
        console.log('✅ Kết nối thành công!\n');

        // Client credentials từ .env.local của web 3001
        const clientData = {
            clientId: '3a6b045635f860741031d35903a6b876',
            clientSecret: '7a0e2c88c48647ed48dcf9016a46d5e65b3ecccbeb584d5bd2d323f79a4b3237',
            name: 'ClickUp-like Web Client',
            redirectUris: [
                'http://localhost:3001/api/auth/callback/my-provider',
                'http://localhost:3001/auth/callback',
            ],
            allowedScopes: ['openid', 'profile', 'email'],
            grantTypes: ['authorization_code', 'refresh_token'],
        };

        // Kiểm tra xem client đã tồn tại chưa
        const existingClient = await ClientApp.findOne({ clientId: clientData.clientId });

        if (existingClient) {
            console.log('ℹ️  Client App đã tồn tại:');
            console.log('   Client ID:', existingClient.clientId);
            console.log('   Name:', existingClient.name);
            console.log('   Redirect URIs:', existingClient.redirectUris);
            console.log('\n🔄 Cập nhật thông tin...');
            
            await ClientApp.updateOne(
                { clientId: clientData.clientId },
                { 
                    $set: {
                        ...clientData,
                        updatedAt: new Date()
                    }
                }
            );
            console.log('✅ Đã cập nhật Client App thành công!\n');
        } else {
            console.log('🆕 Tạo Client App mới...');
            const newClient = await ClientApp.create(clientData);
            console.log('✅ Đã tạo Client App thành công!');
            console.log('   Client ID:', newClient.clientId);
            console.log('   Name:', newClient.name);
            console.log('\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✨ Cấu hình OAuth 2.0 hoàn tất!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📋 Thông tin kết nối:');
        console.log('   Authorization Server: http://localhost:3000');
        console.log('   Client Application:   http://localhost:3001');
        console.log('   Client ID:           ', clientData.clientId);
        console.log('   Redirect URI:        ', clientData.redirectUris[0]);
        console.log('\n🚀 Bước tiếp theo:');
        console.log('   1. Khởi động web MyAccount:  cd ../web_myaccount && npm run dev');
        console.log('   2. Khởi động web ClickUp:    cd ../web_dm && npm run dev');
        console.log('   3. Truy cập: http://localhost:3001');
        console.log('   4. Đăng nhập sẽ chuyển sang http://localhost:3000\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

// Chạy script
setupClient();
