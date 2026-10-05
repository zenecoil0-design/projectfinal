"use client";

import { useProfileStore } from "@/store/useProfileStore";
import { FaFacebook, FaLine, FaInstagram } from "react-icons/fa";

export default function ProfilePreview() {
  const profileStore = useProfileStore();

  // ฟังก์ชันคำนวณอายุอัตโนมัติจากวันเกิด
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

  const renderSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <FaFacebook className="text-[#1877F2]" />;
      case 'line': return <FaLine className="text-[#00B900]" />;
      case 'instagram': return <FaInstagram className="text-[#E4405F]" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl rounded-sm relative overflow-hidden flex flex-col justify-between p-16 mx-auto my-auto border border-slate-300 text-slate-800">
      
      {/* ส่วนหัว */}
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <h2 className="text-3xl font-bold tracking-wider">ประวัติส่วนตัว</h2>
        
        <div className="w-24 h-24 rounded-full border-2 border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
          {profileStore.profileImage ? (
            <img src={profileStore.profileImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-slate-400 text-xs">รูปภาพ</span>
          )}
        </div>
      </div>

      {/* ส่วนเนื้อหาข้อมูลส่วนตัว */}
      <div className="flex-1 flex flex-col gap-4 text-sm">
        
        {/* ข้อมูลพื้นฐาน */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <div><span className="font-semibold text-slate-600">ชื่อ - นามสกุล :</span> {profileStore.firstName} {profileStore.lastName}</div>
          <div><span className="font-semibold text-slate-600">ชื่อเล่น :</span> {profileStore.nickname}</div>
          <div><span className="font-semibold text-slate-600">วันเกิด :</span> {profileStore.birthday}</div>
          <div><span className="font-semibold text-slate-600">อายุ :</span> {calculateAge(profileStore.birthday)} ปี</div>
          <div><span className="font-semibold text-slate-600">สัญชาติ :</span> {profileStore.nationality}</div>
          <div><span className="font-semibold text-slate-600">เชื้อชาติ :</span> {profileStore.ethnicity}</div>
          <div><span className="font-semibold text-slate-600">ศาสนา :</span> {profileStore.religion}</div>
          <div><span className="font-semibold text-slate-600">โรงเรียน :</span> {profileStore.school}</div>
          <div><span className="font-semibold text-slate-600">แผนการเรียน :</span> {profileStore.plan}</div>
          <div><span className="font-semibold text-slate-600">เกรดเฉลี่ย (GPAX) :</span> {profileStore.gpax}</div>
        </div>

        {/* ข้อมูลการติดต่อ */}
        <div className="border-t pt-3 flex flex-col gap-1.5">
          <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600">ข้อมูลการติดต่อ</h3>
          <div><span className="font-semibold text-slate-600">เบอร์โทรศัพท์ :</span> {profileStore.phone}</div>
          <div><span className="font-semibold text-slate-600">อีเมล :</span> {profileStore.email}</div>
          <div><span className="font-semibold text-slate-600">ที่อยู่ :</span> {profileStore.address}</div>
          
          {/* แสดง Social Media ที่ผู้ใช้เพิ่มเข้ามา */}
          {profileStore.socials && profileStore.socials.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              <span className="font-semibold text-slate-600">ช่องทางอื่นๆ :</span>
              <div className="flex flex-col gap-1 pl-2">
                {profileStore.socials.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span>{renderSocialIcon(s.platform)}</span>
                    <span className="capitalize font-medium">{s.platform}:</span>
                    <span className="text-slate-600">{s.link}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ข้อมูลเพิ่มเติมและความสามารถ */}
        <div className="border-t pt-3 flex flex-col gap-1.5">
          <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600">ข้อมูลเพิ่มเติม</h3>
          <div><span className="font-semibold text-slate-600">ความสามารถพิเศษ (Skills) :</span> {profileStore.skills}</div>
          <div><span className="font-semibold text-slate-600">คติประจำใจ (Motto) :</span> {profileStore.motto}</div>

          {/* แสดงหัวข้อพิเศษที่ผู้ใช้กดเพิ่มเอง (Custom Fields) */}
          {profileStore.customFields && profileStore.customFields.map((field) => (
            <div key={field.id}>
              <span className="font-semibold text-slate-600">{field.title} :</span> {field.value}
            </div>
          ))}
        </div>

      </div>

      {/* ส่วนท้ายกระดาษ */}
      <div className="border-t pt-4 mt-6 text-center text-xs text-slate-400">
        Portfolio - หน้าข้อมูลส่วนตัว
      </div>

    </div>
  );
}