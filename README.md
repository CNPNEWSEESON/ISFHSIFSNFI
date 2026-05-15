# Discord OAuth Verification System

Discord bot สำหรับระบบ OAuth authentication และการให้ role อัตโนมัติ

## การติดตั้ง

1. Clone repository นี้
```bash
git clone <your-repo-url>
cd <repo-name>
```

2. ติดตั้ง dependencies
```bash
npm install
```

3. สร้างไฟล์ `.env` จาก template
```bash
cp .env.example .env
```

4. แก้ไขค่าใน `.env` ให้ตรงกับข้อมูลของคุณ

## Environment Variables

ตั้งค่าตัวแปรเหล่านี้ใน `.env` (local) หรือใน Vercel dashboard:

- `BOT_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord OAuth client ID
- `CLIENT_SECRET` - Discord OAuth client secret
- `REDIRECT_URI` - URL callback หลัง OAuth (e.g., https://yourdomain.com/callback)
- `ADMIN_ID` - Discord user ID ของ admin
- `API_KEY` - API key สำหรับ protected endpoints

## การรัน

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Deploy บน Vercel

1. Push code ขึ้น GitHub (ไฟล์ .env จะไม่ถูก push ตาม .gitignore)
2. Import project ใน Vercel
3. ตั้งค่า Environment Variables ใน Vercel dashboard:
   - ไปที่ Settings → Environment Variables
   - เพิ่มตัวแปรทั้งหมดจากไฟล์ .env ของคุณ
4. Deploy!

## API Endpoints

- `GET /` - Health check
- `GET /callback` - OAuth callback
- `GET /api/users` - ดึงรายชื่อผู้ใช้ทั้งหมด (ต้องมี API key)
- `GET /api/users/:id` - ดึงข้อมูลผู้ใช้เฉพาะ (ต้องมี API key)
- `PUT /api/users/:id` - อัพเดทข้อมูลผู้ใช้ (ต้องมี API key)
- `GET /api/config` - ดึง config (ต้องมี API key)

## Security Notes

⚠️ **ห้าม commit ไฟล์ .env ขึ้น GitHub!**
- ไฟล์ .env อยู่ใน .gitignore แล้ว
- ใช้ Environment Variables บน Vercel แทน
- เก็บ tokens และ secrets ไว้เป็นความลับ
