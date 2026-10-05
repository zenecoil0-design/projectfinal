export type PortfolioTemplate = {
  id: string;
  name: string;
  description: string;
  gradient: string;
};

export type RecentPortfolio = {
  id: string;
  title: string;
  template: string;
  updatedAt: string;
  status: string;
};

export const portfolioTemplates: PortfolioTemplate[] = [
  {
    id: "template-1",
    name: "Modern Clean",
    description:
      "เรียบ สะอาด และเป็นทางการ เหมาะสำหรับพอร์ตสมัครเรียนและสายวิชาการ",
    gradient: "from-blue-600 to-cyan-400",
  },
  {
    id: "template-2",
    name: "Creative Soft",
    description:
      "สีสันนุ่มนวลและดูเป็นมิตร เหมาะสำหรับผลงาน กิจกรรม และสายสร้างสรรค์",
    gradient: "from-violet-600 to-fuchsia-400",
  },
  {
    id: "template-3",
    name: "Minimal Pro",
    description:
      "มินิมอล ดูมืออาชีพ เน้นเนื้อหาและผลงาน ใช้ได้กับหลายสายการเรียน",
    gradient: "from-slate-800 to-slate-500",
  },
];

export const recentPortfolios: RecentPortfolio[] = [
  {
    id: "1",
    title: "พอร์ตสมัครคณะวิศวกรรมศาสตร์",
    template: "Modern Clean",
    updatedAt: "แก้ไขล่าสุด 2 ชั่วโมงที่แล้ว",
    status: "พร้อมส่ง",
  },
  {
    id: "2",
    title: "Portfolio กิจกรรมและผลงาน ม.6",
    template: "Creative Soft",
    updatedAt: "แก้ไขล่าสุด เมื่อวานนี้",
    status: "กำลังแก้ไข",
  },
  {
    id: "3",
    title: "แฟ้มสะสมผลงานรอบ TCAS",
    template: "Minimal Pro",
    updatedAt: "แก้ไขล่าสุด 3 วันที่แล้ว",
    status: "ฉบับร่าง",
  },
];