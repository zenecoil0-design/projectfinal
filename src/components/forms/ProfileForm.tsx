// src/components/ProfileForm.tsx
"use client";

import { useProfileStore } from "@/store/useProfileStore";
import { FaFacebook, FaLine, FaInstagram, FaPhone, FaEnvelope, FaMapMarkerAlt, FaPlus, FaTrash, FaCamera, FaUserCircle, FaFolderPlus } from "react-icons/fa";

export default function ProfileForm({ onNext }: { onNext: () => void }) {
  const store = useProfileStore();

  // 🎯 ฟังก์ชันจัดการตอนกดปุ่ม "บันทึกข้อมูล"
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault(); // ป้องกันเว็บรีเฟรช

    // 1. รวมร่างชื่อ + นามสกุล (สำหรับคอลัมน์ full_name)
    const fullNameForDB = `${store.firstName} ${store.lastName}`.trim();

    // 2. แพ็คข้อมูลการติดต่อ (สำหรับคอลัมน์ contact แบบ jsonb)
    const contactForDB = {
      phone: store.phone,
      email: store.email,
      socials: store.socials // ยัด Array โซเชียลมีเดียเข้าไปเลย
    };

    // 3. 🎯 แพ็คข้อมูลเพิ่มเติมทั้งหมด (สำหรับคอลัมน์ additional_info แบบ jsonb)
    const additionalInfoForDB = {
      skills: store.skills,
      motto: store.motto,
      custom_fields: store.customFields // ยัด Array หัวข้อที่สร้างเองเข้าไปเลย
    };

    // โชว์ให้ดูว่าหน้าตาข้อมูลก่อนส่งเข้าฐานข้อมูลเป็นยังไง
    console.log("--- ข้อมูลพร้อมส่งเข้า Supabase ---");
    console.log("full_name:", fullNameForDB);
    console.log("contact (JSON):", contactForDB);
    console.log("additional_info (JSON):", additionalInfoForDB);

    alert(`แพ็คข้อมูลเสร็จแล้ว!`);
    onNext();
      };

  const renderSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <FaFacebook className="text-[#1877F2] text-base" />;
      case 'line': return <FaLine className="text-[#00B900] text-base" />;
      case 'instagram': return <FaInstagram className="text-[#E4405F] text-base" />;
      default: return null;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      store.setProfile("profileImage", imageUrl);
    }
  };

  // 🎯 จุด 2: ฟังก์ชันคำนวณอายุอัตโนมัติจากวันเกิด
  const calculateAge = (birthdayString: string) => {
    if (!birthdayString) return "-";
    const today = new Date();
    const birthDate = new Date(birthdayString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 pb-10">
      
      {/* 📸 อัปโหลดรูปโปรไฟล์ */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">รูปถ่ายโปรไฟล์</h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-5">
           <div className="relative w-24 h-32 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 shrink-0 shadow-inner">
              {store.profileImage ? (
                <img src={store.profileImage} alt="Profile Preview" className="w-full h-full object-cover" />
              ) : (
                <FaUserCircle className="text-5xl text-slate-400" />
              )}
           </div>
           <div className="flex flex-col gap-2">
              <label className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-md text-xs font-bold cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200 w-max shadow-sm">
                <FaCamera className="text-sm" /> อัปโหลดรูปภาพใหม่
                <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleImageUpload} />
              </label>
              {store.profileImage && (
                <button type="button" onClick={() => store.setProfile("profileImage", "")} className="text-xs text-red-500 hover:text-red-700 font-semibold text-left w-max flex items-center gap-1">
                  <FaTrash className="text-[10px]" /> ลบรูปภาพ
                </button>
              )}
              <span className="text-[10px] text-slate-400 mt-1 leading-relaxed">JPG, PNG ขนาดไม่เกิน 5MB</span>
           </div>
        </div>
      </div>

      {/* 👤 1. ข้อมูลพื้นฐาน */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">1. ข้อมูลพื้นฐาน</h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อจริง <span className="text-red-500">*</span></label>
            <input type="text" value={store.firstName} onChange={(e) => store.setProfile("firstName", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">นามสกุล <span className="text-red-500">*</span></label>
            <input type="text" value={store.lastName} onChange={(e) => store.setProfile("lastName", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อเล่น</label>
            <input type="text" value={store.nickname} onChange={(e) => store.setProfile("nickname", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">วันเกิด</label>
              <input type="date" value={store.birthday} onChange={(e) => store.setProfile("birthday", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-2 py-2 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">อายุ (ปี)</label>
              {/* 🎯 จุด 2: โชว์เลขอายุอย่างเดียว พิมพ์แก้ไม่ได้ */}
              <div className="w-full text-sm border border-slate-200 bg-slate-100 rounded-md px-3 py-2 text-slate-500 font-bold text-center">
                {calculateAge(store.birthday)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 col-span-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">สัญชาติ</label>
              <input type="text" value={store.nationality} onChange={(e) => store.setProfile("nationality", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">เชื้อชาติ</label>
              {/* 🎯 จุด 1: เพิ่มช่องเชื้อชาติให้ตรง DB */}
              <input type="text" value={store.ethnicity} onChange={(e) => store.setProfile("ethnicity", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">ศาสนา</label>
              <input type="text" value={store.religion} onChange={(e) => store.setProfile("religion", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 🎓 จุด 3: เพิ่มหมวด ข้อมูลการศึกษา (ฉบับย่อสำหรับหน้า Profile) */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">2. ข้อมูลการศึกษา (แสดงบนหน้าปก/ประวัติ)</h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อโรงเรียนปัจจุบัน</label>
            <input type="text" value={store.school} onChange={(e) => store.setProfile("school", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">แผนการเรียน</label>
              <input type="text" value={store.plan} onChange={(e) => store.setProfile("plan", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">เกรดเฉลี่ยสะสม (GPAX)</label>
              <input type="number" step="0.01" value={store.gpax} onChange={(e) => store.setProfile("gpax", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 📞 3. ข้อมูลการติดต่อ */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">3. ข้อมูลการติดต่อ</h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1"><FaPhone className="text-slate-400" /> เบอร์โทรศัพท์</label>
              <input type="tel" value={store.phone} onChange={(e) => store.setProfile("phone", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1"><FaEnvelope className="text-slate-400" /> อีเมล</label>
              <input type="email" value={store.email} onChange={(e) => store.setProfile("email", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1"><FaMapMarkerAlt className="text-slate-400" /> ที่อยู่ปัจจุบัน</label>
            <textarea value={store.address} onChange={(e) => store.setProfile("address", e.target.value)} rows={2} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 resize-none" />
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ช่องทางการติดต่ออื่นๆ (Social Media)</label>
            {store.socials.map((social) => (
              <div key={social.id} className="flex border border-slate-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-white">
                <div className="bg-slate-100 border-r border-slate-300 px-3 flex items-center justify-center">{renderSocialIcon(social.platform)}</div>
                <select value={social.platform} onChange={(e) => store.updateSocial(social.id, 'platform', e.target.value)} className="bg-slate-50 border-r border-slate-300 text-sm px-2 py-2 outline-none text-slate-700 cursor-pointer w-28">
                  <option value="facebook">Facebook</option>
                  <option value="line">Line ID</option>
                  <option value="instagram">Instagram</option>
                </select>
                <input type="text" value={social.link} onChange={(e) => store.updateSocial(social.id, 'link', e.target.value)} className="w-full text-sm px-3 py-2 outline-none" />
                {store.socials.length > 1 && (
                  <button type="button" onClick={() => store.removeSocial(social.id)} className="px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border-l border-slate-300"><FaTrash /></button>
                )}
              </div>
            ))}
            <button type="button" onClick={store.addSocial} className="mt-1 flex items-center gap-1.5 w-max text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"><FaPlus /> กดเพิ่มช่องทาง</button>
          </div>
        </div>
      </div>

      {/* 🛠️ 4. ข้อมูลเพิ่มเติมรูปแบบใหม่แบบไดนามิก! */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-500 pl-2">
          4. ข้อมูลเพิ่มเติม <span className="text-xs text-slate-400 font-normal">(เว้นว่างเพื่อซ่อนได้)</span>
        </h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ความสามารถพิเศษ (Skills)</label>
            <input type="text" value={store.skills} onChange={(e) => store.setProfile("skills", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 bg-white" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">คติประจำใจ (Motto)</label>
            <input type="text" value={store.motto} onChange={(e) => store.setProfile("motto", e.target.value)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 bg-white" />
          </div>

          {store.customFields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5 p-3 bg-white rounded-lg border border-slate-200 shadow-sm relative group transition-all">
              <button type="button" onClick={() => store.removeCustomField(field.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 rounded transition-colors text-xs" title="ลบหัวข้อนี้"><FaTrash /></button>
              <div className="grid grid-cols-3 gap-2 pr-6">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-blue-500 mb-0.5">ชื่อหัวข้อ</label>
                  <input type="text" value={field.title} onChange={(e) => store.updateCustomField(field.id, 'title', e.target.value)} placeholder="เช่น ภาษา" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 font-bold" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">รายละเอียด</label>
                  <input type="text" value={field.value} onChange={(e) => store.updateCustomField(field.id, 'value', e.target.value)} placeholder="เช่น ไทย, อังกฤษ" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={store.addCustomField} className="flex items-center justify-center gap-2 border border-dashed border-blue-300 bg-white hover:bg-blue-50 text-blue-600 font-bold py-2.5 px-4 rounded-lg text-xs transition-colors shadow-sm mt-1">
            <FaFolderPlus className="text-sm" /> + เพิ่มหัวข้อข้อมูลของตัวเอง
          </button>
        </div>
      </div>

      <button type="submit" className="bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors shadow-md text-sm mt-2">
        💾 บันทึกข้อมูลประวัติส่วนตัว
      </button>

    </form>
  );
}