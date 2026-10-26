"use client";
import Paper, { useTemplate } from "./Paper";
import { PageNumber } from "./PageLayout";
import { displayedAge } from "@/lib/age";

import { useProfileStore } from "@/store/useProfileStore";
import { FaFacebook, FaLine, FaInstagram } from "react-icons/fa";

const hasText = (value: string) => value.trim().length > 0;

export default function ProfilePreview() {
  const profileStore = useProfileStore();
  const template = useTemplate();

  const age = displayedAge(profileStore.birthday, profileStore.ageMode, profileStore.manualAge, new Date());
  const socials = profileStore.socials.filter(social => hasText(social.link));
  const customFields = profileStore.customFields.filter(field => hasText(field.title) || hasText(field.value));
  const hasContact = hasText(profileStore.phone) || hasText(profileStore.email) || hasText(profileStore.address) || socials.length > 0;
  const hasAdditional = hasText(profileStore.skills) || hasText(profileStore.motto) || customFields.length > 0;

  const renderSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <FaFacebook className="text-[#1877F2]" />;
      case 'line': return <FaLine className="text-[#00B900]" />;
      case 'instagram': return <FaInstagram className="text-[#E4405F]" />;
      default: return null;
    }
  };

  if (template === "minimal") return <Paper sectionId="profile" data-section="ประวัติส่วนตัว" className="portfolio-page gallery-profile">
    <aside className="gallery-profile-sidebar">
      <div className="gallery-profile-photo">
        {profileStore.profileImage ? <img src={profileStore.profileImage} alt="รูปประวัติส่วนตัว" /> : <span>รูปประวัติส่วนตัว</span>}
      </div>
      {hasContact && <><h3>CONTACT / ติดต่อ</h3>
      <div className="gallery-profile-contact">
        {hasText(profileStore.phone) && <p><strong>โทรศัพท์</strong><span>{profileStore.phone}</span></p>}
        {hasText(profileStore.email) && <p><strong>อีเมล</strong><span>{profileStore.email}</span></p>}
        {hasText(profileStore.address) && <p><strong>ที่อยู่</strong><span>{profileStore.address}</span></p>}
        {socials.map(social => <p key={social.id} className="profile-social-row">
          <span>{renderSocialIcon(social.platform)}</span>
          <span className="capitalize">{social.platform}:</span>
          <span>{social.link}</span>
        </p>)}
      </div></>}
      {hasText(profileStore.skills) && <section className="gallery-profile-side-extra"><h3>SKILLS / ความสามารถ</h3><p>{profileStore.skills}</p></section>}
    </aside>
    <div className="gallery-profile-main">
      <header className="gallery-profile-heading">
        <span>PERSONAL PROFILE</span>
        <h2>ข้อมูลส่วนตัว</h2>
        <p className="gallery-profile-fullname">{[profileStore.firstName, profileStore.lastName].filter(Boolean).join(" ") || "ชื่อ - นามสกุล"}</p>
      </header>
      <div className="gallery-profile-fields">
        <p><strong>ชื่อ - นามสกุล</strong><span>{profileStore.firstName} {profileStore.lastName}</span></p>
        <p><strong>ชื่อเล่น</strong><span>{profileStore.nickname}</span></p>
        <p><strong>วันเดือนปีเกิด</strong><span>{profileStore.birthday || "—"}</span></p>
        <p><strong>อายุ</strong><span>{age === null ? "—" : `${age} ปี`}</span></p>
        <p><strong>สัญชาติ</strong><span>{profileStore.nationality}</span></p>
        <p><strong>เชื้อชาติ</strong><span>{profileStore.ethnicity}</span></p>
        <p><strong>ศาสนา</strong><span>{profileStore.religion}</span></p>
        <p><strong>โรงเรียน</strong><span>{profileStore.school}</span></p>
        <p><strong>แผนการเรียน</strong><span>{profileStore.plan}</span></p>
        <p><strong>GPAX</strong><span>{profileStore.gpax}</span></p>
        {hasText(profileStore.motto) && <p><strong>คติประจำใจ</strong><span>{profileStore.motto}</span></p>}
        {customFields.map(field => <p key={field.id}><strong>{field.title}</strong><span>{field.value}</span></p>)}
      </div>
      <div className="gallery-profile-bottom-rule" aria-hidden="true" />
    </div>
    <PageNumber />
  </Paper>;

  if (template === "modern") return <Paper sectionId="profile" data-section="ประวัติส่วนตัว" className="portfolio-page creative-profile">
    <div className="creative-profile-left">
      <div className="creative-profile-photo">
        {profileStore.profileImage
          ? <img src={profileStore.profileImage} alt="รูปประวัติส่วนตัว" />
          : <span>PROFILE PHOTO</span>}
      </div>
      {(hasText(profileStore.phone) || hasText(profileStore.email) || socials.length > 0) && <><h3>Contact</h3>
      <div className="creative-profile-contact">
        {hasText(profileStore.phone) && <p><strong>โทรศัพท์</strong>{profileStore.phone}</p>}
        {hasText(profileStore.email) && <p><strong>อีเมล</strong>{profileStore.email}</p>}
        {socials.map(social => <p key={social.id}><strong>{social.platform}</strong>{social.link}</p>)}
      </div></>}
      {hasText(profileStore.address) && <><h3>Address</h3><p className="creative-profile-address">{profileStore.address}</p></>}
    </div>
    <div className="creative-profile-right">
      <div className="creative-profile-heading"><p>ABOUT ME</p><h2>Profile</h2></div>
      <div className="creative-profile-information">
        <p><strong>ชื่อ - นามสกุล</strong><span>{profileStore.firstName} {profileStore.lastName}</span></p>
        <p><strong>ชื่อเล่น</strong><span>{profileStore.nickname}</span></p>
        <p><strong>วันเดือนปีเกิด</strong><span>{profileStore.birthday || "—"}</span></p>
        <p><strong>อายุ</strong><span>{age === null ? "—" : `${age} ปี`}</span></p>
        <p><strong>สัญชาติ</strong><span>{profileStore.nationality}</span></p>
        <p><strong>เชื้อชาติ</strong><span>{profileStore.ethnicity}</span></p>
        <p><strong>ศาสนา</strong><span>{profileStore.religion}</span></p>
        <p><strong>ชื่อโรงเรียน</strong><span>{profileStore.school}</span></p>
        <p><strong>แผนการเรียน</strong><span>{profileStore.plan}</span></p>
        <p><strong>GPAX</strong><span>{profileStore.gpax}</span></p>
        {hasText(profileStore.skills) && <p><strong>ความสามารถพิเศษ</strong><span>{profileStore.skills}</span></p>}
        {hasText(profileStore.motto) && <p><strong>คติประจำใจ</strong><span>{profileStore.motto}</span></p>}
        {customFields.map(field => <p key={field.id}><strong>{field.title}</strong><span>{field.value}</span></p>)}
      </div>
    </div>
    <PageNumber />
  </Paper>;

  return (
    <Paper sectionId="profile" data-section="ประวัติส่วนตัว" className="portfolio-page bg-white shadow-2xl rounded-sm relative overflow-hidden flex flex-col justify-between p-16 mx-auto my-auto border border-slate-300 text-slate-800">
      
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
          <div><span className="font-semibold text-slate-600">วันเกิด :</span> {profileStore.birthday || "—"}</div>
          <div><span className="font-semibold text-slate-600">อายุ :</span> {age === null ? "—" : `${age} ปี`}</div>
          <div><span className="font-semibold text-slate-600">สัญชาติ :</span> {profileStore.nationality}</div>
          <div><span className="font-semibold text-slate-600">เชื้อชาติ :</span> {profileStore.ethnicity}</div>
          <div><span className="font-semibold text-slate-600">ศาสนา :</span> {profileStore.religion}</div>
          <div><span className="font-semibold text-slate-600">โรงเรียน :</span> {profileStore.school}</div>
          <div><span className="font-semibold text-slate-600">แผนการเรียน :</span> {profileStore.plan}</div>
          <div><span className="font-semibold text-slate-600">เกรดเฉลี่ย (GPAX) :</span> {profileStore.gpax}</div>
        </div>

        {/* ข้อมูลการติดต่อ */}
        {hasContact && <div className="border-t pt-3 flex flex-col gap-1.5">
          <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600">ข้อมูลการติดต่อ</h3>
          {hasText(profileStore.phone) && <div><span className="font-semibold text-slate-600">เบอร์โทรศัพท์ :</span> {profileStore.phone}</div>}
          {hasText(profileStore.email) && <div><span className="font-semibold text-slate-600">อีเมล :</span> {profileStore.email}</div>}
          {hasText(profileStore.address) && <div><span className="font-semibold text-slate-600">ที่อยู่ :</span> {profileStore.address}</div>}
          
          {/* แสดง Social Media ที่ผู้ใช้เพิ่มเข้ามา */}
          {socials.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              <span className="font-semibold text-slate-600">ช่องทางอื่นๆ :</span>
              <div className="flex flex-col gap-1 pl-2">
                {socials.map((s) => (
                  <div key={s.id} className="profile-social-row flex items-center gap-2 text-xs">
                    <span>{renderSocialIcon(s.platform)}</span>
                    <span className="capitalize font-medium">{s.platform}:</span>
                    <span className="text-slate-600">{s.link}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>}

        {/* ข้อมูลเพิ่มเติมและความสามารถ */}
        {hasAdditional && <div className="border-t pt-3 flex flex-col gap-1.5">
          <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600">ข้อมูลเพิ่มเติม</h3>
          {hasText(profileStore.skills) && <div><span className="font-semibold text-slate-600">ความสามารถพิเศษ (Skills) :</span> {profileStore.skills}</div>}
          {hasText(profileStore.motto) && <div><span className="font-semibold text-slate-600">คติประจำใจ (Motto) :</span> {profileStore.motto}</div>}

          {/* แสดงหัวข้อพิเศษที่ผู้ใช้กดเพิ่มเอง (Custom Fields) */}
          {customFields.map(field => {
            const hasTitle = hasText(field.title), hasValue = hasText(field.value);
            return <div key={field.id}>
              {hasTitle && <span className="font-semibold text-slate-600">{field.title}{hasValue ? " :" : ""}</span>}
              {hasTitle && hasValue && " "}
              {hasValue && field.value}
            </div>;
          })}
        </div>}

      </div>

      {/* ส่วนท้ายกระดาษ */}
      <div className="border-t pt-4 mt-6 text-center text-xs text-slate-400">
        Portfolio - หน้าข้อมูลส่วนตัว
        <PageNumber />
      </div>

    </Paper>
  );
}
