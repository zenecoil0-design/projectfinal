"use client";

import { useProfileStore } from "@/store/useProfileStore";
import { FaFacebook, FaInstagram, FaLine } from "react-icons/fa";
import A4Page from "@/components/preview/A4Page";

export default function ProfilePreview() {
  const profileStore = useProfileStore();

  const calculateAge = (birthdayString: string) => {
    if (!birthdayString) return "-";

    const today = new Date();
    const birthDate = new Date(birthdayString);

    if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
      return "-";
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age -= 1;
    }

    return age;
  };

  const renderSocialIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return <FaFacebook className="text-[#1877F2]" />;
      case "line":
        return <FaLine className="text-[#00B900]" />;
      case "instagram":
        return <FaInstagram className="text-[#E4405F]" />;
      default:
        return null;
    }
  };

  return (
    <A4Page className="flex flex-col justify-between p-16 text-slate-800">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h2 className="text-3xl font-bold tracking-wider">ประวัติส่วนตัว</h2>

        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-300 bg-slate-100">
          {profileStore.profileImage ? (
            <img
              src={profileStore.profileImage}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-slate-400">รูปภาพ</span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden text-sm">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <div><b>ชื่อ - นามสกุล :</b> {profileStore.firstName} {profileStore.lastName}</div>
          <div><b>ชื่อเล่น :</b> {profileStore.nickname}</div>
          <div><b>วันเกิด :</b> {profileStore.birthday}</div>
          <div><b>อายุ :</b> {calculateAge(profileStore.birthday)} ปี</div>
          <div><b>สัญชาติ :</b> {profileStore.nationality}</div>
          <div><b>เชื้อชาติ :</b> {profileStore.ethnicity}</div>
          <div><b>ศาสนา :</b> {profileStore.religion}</div>
          <div><b>โรงเรียน :</b> {profileStore.school}</div>
          <div><b>แผนการเรียน :</b> {profileStore.plan}</div>
          <div><b>เกรดเฉลี่ย (GPAX) :</b> {profileStore.gpax}</div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5 border-t pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">
            ข้อมูลการติดต่อ
          </h3>
          <div><b>เบอร์โทรศัพท์ :</b> {profileStore.phone}</div>
          <div><b>อีเมล :</b> {profileStore.email}</div>
          <div className="break-words"><b>ที่อยู่ :</b> {profileStore.address}</div>

          {profileStore.socials.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {profileStore.socials.map((social) => (
                <div
                  key={social.id}
                  className="flex min-w-0 items-center gap-2 text-xs"
                >
                  {renderSocialIcon(social.platform)}
                  <span className="font-medium capitalize">{social.platform}:</span>
                  <span className="min-w-0 break-all text-slate-600">
                    {social.link}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5 border-t pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">
            ข้อมูลเพิ่มเติม
          </h3>
          <div className="break-words"><b>ความสามารถพิเศษ :</b> {profileStore.skills}</div>
          <div className="break-words"><b>คติประจำใจ :</b> {profileStore.motto}</div>
          {profileStore.customFields.map((field) => (
            <div key={field.id} className="break-words">
              <b>{field.title} :</b> {field.value}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t pt-4 text-center text-xs text-slate-400">
        Portfolio - หน้าข้อมูลส่วนตัว
      </div>
    </A4Page>
  );
}
