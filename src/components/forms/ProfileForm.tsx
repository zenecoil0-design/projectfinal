"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import {
  FaFacebook,
  FaLine,
  FaInstagram,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPlus,
  FaTrash,
  FaCamera,
  FaUserCircle,
  FaFolderPlus,
} from "react-icons/fa";

import {
  CustomField,
  SocialMedia,
  useProfileStore,
} from "@/store/useProfileStore";

import {
  createClient,
} from "@/lib/supabase/client";

type ProfileRow = {
  id: string;

  profile_image_url:
    | string
    | null;

  first_name:
    | string
    | null;

  last_name:
    | string
    | null;

  nickname:
    | string
    | null;

  date_of_birth:
    | string
    | null;

  address:
    | string
    | null;

  phone:
    | string
    | null;

  contact_email:
    | string
    | null;

  social_links:
    | unknown
    | null;

  talents:
    | string
    | null;

  motto:
    | string
    | null;

  nationality:
    | string
    | null;

  ethnicity:
    | string
    | null;

  religion:
    | string
    | null;

  school:
    | string
    | null;

  plan:
    | string
    | null;

  gpax:
    | number
    | null;

  custom_fields:
    | unknown
    | null;
};

export default function ProfileForm({
  onNext,
}: {
  onNext: () => void;
}) {
  const searchParams =
    useSearchParams();

  const portfolioId =
    searchParams.get(
      "portfolio"
    );

  const store =
    useProfileStore();

  const [
    pendingProfileFile,
    setPendingProfileFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    removeStoredImage,
    setRemoveStoredImage,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  // =====================================================
  // HELPERS
  // =====================================================

  const createDefaultSocial =
    (): SocialMedia => ({
      id: crypto.randomUUID(),
      platform:
        "facebook",
      link: "",
    });

  const parseSocials = (
    value: unknown
  ): SocialMedia[] => {
    if (
      !Array.isArray(
        value
      )
    ) {
      return [
        createDefaultSocial(),
      ];
    }

    const result =
      value
        .filter(
          (
            item
          ): item is Record<
            string,
            unknown
          > =>
            typeof item ===
              "object" &&
            item !== null
        )
        .map(
          (item) => ({
            id:
              typeof item.id ===
              "string"
                ? item.id
                : crypto.randomUUID(),

            platform:
              typeof item.platform ===
              "string"
                ? item.platform
                : "facebook",

            link:
              typeof item.link ===
              "string"
                ? item.link
                : "",
          })
        );

    return result.length >
      0
      ? result
      : [
          createDefaultSocial(),
        ];
  };

  const parseCustomFields =
    (
      value: unknown
    ): CustomField[] => {
      if (
        !Array.isArray(
          value
        )
      ) {
        return [];
      }

      return value
        .filter(
          (
            item
          ): item is Record<
            string,
            unknown
          > =>
            typeof item ===
              "object" &&
            item !== null
        )
        .map(
          (item) => ({
            id:
              typeof item.id ===
              "string"
                ? item.id
                : crypto.randomUUID(),

            title:
              typeof item.title ===
              "string"
                ? item.title
                : "",

            value:
              typeof item.value ===
              "string"
                ? item.value
                : "",
          })
        );
    };

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    const loadProfile =
      async () => {
        setIsLoading(
          true
        );

        setErrorMessage(
          ""
        );

        setSuccessMessage(
          ""
        );

        setPendingProfileFile(
          null
        );

        setRemoveStoredImage(
          false
        );

        /*
          เคลียร์ข้อมูลของ
          Portfolio ก่อนหน้า
        */
        store.resetProfile();

        if (!portfolioId) {
          setErrorMessage(
            "ไม่พบ Portfolio ID"
          );

          setIsLoading(
            false
          );

          return;
        }

        try {
          const supabase =
            createClient();

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(
                `
                  id,
                  profile_image_url,
                  first_name,
                  last_name,
                  nickname,
                  date_of_birth,
                  address,
                  phone,
                  contact_email,
                  social_links,
                  talents,
                  motto,
                  nationality,
                  ethnicity,
                  religion,
                  school,
                  plan,
                  gpax,
                  custom_fields
                `
              )
              .eq(
                "portfolio_id",
                portfolioId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(1)
              .maybeSingle();

          if (error) {
            throw error;
          }

          if (!data) {
            return;
          }

          const profile =
            data as ProfileRow;

          store.setProfile(
            "profileImage",
            profile.profile_image_url ||
              ""
          );

          store.setProfile(
            "firstName",
            profile.first_name ||
              ""
          );

          store.setProfile(
            "lastName",
            profile.last_name ||
              ""
          );

          store.setProfile(
            "nickname",
            profile.nickname ||
              ""
          );

          store.setProfile(
            "birthday",
            profile.date_of_birth ||
              ""
          );

          store.setProfile(
            "nationality",
            profile.nationality ||
              ""
          );

          store.setProfile(
            "ethnicity",
            profile.ethnicity ||
              ""
          );

          store.setProfile(
            "religion",
            profile.religion ||
              ""
          );

          store.setProfile(
            "phone",
            profile.phone ||
              ""
          );

          store.setProfile(
            "email",
            profile.contact_email ||
              ""
          );

          store.setProfile(
            "address",
            profile.address ||
              ""
          );

          store.setProfile(
            "school",
            profile.school ||
              ""
          );

          store.setProfile(
            "plan",
            profile.plan ||
              ""
          );

          store.setProfile(
            "gpax",
            profile.gpax ===
              null
              ? ""
              : String(
                  profile.gpax
                )
          );

          store.setProfile(
            "skills",
            profile.talents ||
              ""
          );

          store.setProfile(
            "motto",
            profile.motto ||
              ""
          );

          store.setSocials(
            parseSocials(
              profile.social_links
            )
          );

          store.setCustomFields(
            parseCustomFields(
              profile.custom_fields
            )
          );
        } catch (
          error: any
        ) {
          console.error(
            "Load profile error:",
            error
          );

          setErrorMessage(
            error?.message ||
              "ไม่สามารถโหลดข้อมูลประวัติส่วนตัวได้"
          );
        } finally {
          setIsLoading(
            false
          );
        }
      };

    loadProfile();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId]);

  // =====================================================
  // SOCIAL ICON
  // =====================================================

  const renderSocialIcon =
    (
      platform: string
    ) => {
      switch (
        platform
      ) {
        case "facebook":
          return (
            <FaFacebook className="text-base text-[#1877F2]" />
          );

        case "line":
          return (
            <FaLine className="text-base text-[#00B900]" />
          );

        case "instagram":
          return (
            <FaInstagram className="text-base text-[#E4405F]" />
          );

        default:
          return null;
      }
    };

  // =====================================================
  // IMAGE SELECT
  // =====================================================

  const handleImageUpload =
    (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target
          .files?.[0];

      if (!file) {
        return;
      }

      if (
        ![
          "image/jpeg",
          "image/png",
        ].includes(
          file.type
        )
      ) {
        setErrorMessage(
          "รองรับเฉพาะไฟล์ JPG และ PNG"
        );

        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setErrorMessage(
          "รูปภาพต้องมีขนาดไม่เกิน 5MB"
        );

        return;
      }

      setErrorMessage(
        ""
      );

      setSuccessMessage(
        ""
      );

      setRemoveStoredImage(
        false
      );

      setPendingProfileFile(
        file
      );

      const imageUrl =
        URL.createObjectURL(
          file
        );

      store.setProfile(
        "profileImage",
        imageUrl
      );
    };

  // =====================================================
  // REMOVE IMAGE
  // =====================================================

  const handleRemoveImage =
    () => {
      setPendingProfileFile(
        null
      );

      setRemoveStoredImage(
        true
      );

      store.setProfile(
        "profileImage",
        ""
      );

      setSuccessMessage(
        ""
      );
    };

  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  const uploadProfileImage =
    async (
      userId: string
    ) => {
      if (
        !pendingProfileFile ||
        !portfolioId
      ) {
        return store.profileImage;
      }

      const supabase =
        createClient();

      const extension =
        pendingProfileFile.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const filePath =
        `users/${userId}/portfolios/${portfolioId}/profile/` +
        `${crypto.randomUUID()}.${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "portfolio-images"
          )
          .upload(
            filePath,
            pendingProfileFile,
            {
              cacheControl:
                "3600",

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "portfolio-images"
          )
          .getPublicUrl(
            filePath
          );

      return (
        publicUrlData
          .publicUrl ||
        ""
      );
    };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const handleSave =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (!portfolioId) {
        setErrorMessage(
          "ไม่พบ Portfolio ID"
        );

        return;
      }

      setIsSaving(
        true
      );

      setErrorMessage(
        ""
      );

      setSuccessMessage(
        ""
      );

      try {
        const supabase =
          createClient();

        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          throw new Error(
            "ไม่พบข้อมูลผู้ใช้งาน"
          );
        }

        let profileImageUrl =
          store.profileImage;

        if (
          pendingProfileFile
        ) {
          profileImageUrl =
            await uploadProfileImage(
              user.id
            );
        }

        if (
          removeStoredImage
        ) {
          profileImageUrl =
            "";
        }

        // หา Profile เดิม
        const {
          data:
            existingProfile,
          error:
            existingProfileError,
        } =
          await supabase
            .from(
              "profiles"
            )
            .select(
              "id"
            )
            .eq(
              "portfolio_id",
              portfolioId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle();

        if (
          existingProfileError
        ) {
          throw existingProfileError;
        }

        const gpaxValue =
          store.gpax.trim()
            ? Number(
                store.gpax
              )
            : null;

        if (
          gpaxValue !==
            null &&
          Number.isNaN(
            gpaxValue
          )
        ) {
          throw new Error(
            "GPAX ไม่ถูกต้อง"
          );
        }

        const payload = {
          portfolio_id:
            portfolioId,

          profile_image_url:
            profileImageUrl ||
            null,

          first_name:
            store.firstName.trim(),

          last_name:
            store.lastName.trim(),

          nickname:
            store.nickname.trim() ||
            null,

          date_of_birth:
            store.birthday ||
            null,

          nationality:
            store.nationality.trim() ||
            null,

          ethnicity:
            store.ethnicity.trim() ||
            null,

          religion:
            store.religion.trim() ||
            null,

          school:
            store.school.trim() ||
            null,

          plan:
            store.plan.trim() ||
            null,

          gpax:
            gpaxValue,

          phone:
            store.phone.trim() ||
            null,

          contact_email:
            store.email.trim() ||
            null,

          address:
            store.address.trim() ||
            null,

          social_links:
            store.socials,

          talents:
            store.skills.trim() ||
            null,

          motto:
            store.motto.trim() ||
            null,

          custom_fields:
            store.customFields,
        };

        // UPDATE
        if (
          existingProfile?.id
        ) {
          const {
            error:
              updateError,
          } =
            await supabase
              .from(
                "profiles"
              )
              .update(
                payload
              )
              .eq(
                "id",
                existingProfile.id
              );

          if (
            updateError
          ) {
            throw updateError;
          }
        } else {
          // INSERT

          const {
            error:
              insertError,
          } =
            await supabase
              .from(
                "profiles"
              )
              .insert(
                payload
              );

          if (
            insertError
          ) {
            throw insertError;
          }
        }

        store.setProfile(
          "profileImage",
          profileImageUrl ||
            ""
        );

        setPendingProfileFile(
          null
        );

        setRemoveStoredImage(
          false
        );

        setSuccessMessage(
          "บันทึกข้อมูลประวัติส่วนตัวเรียบร้อยแล้ว"
        );

        onNext();
      } catch (
        error: any
      ) {
        console.error(
          "Save profile error:",
          error
        );

        setErrorMessage(
          error?.message ||
            "ไม่สามารถบันทึกข้อมูลประวัติส่วนตัวได้"
        );
      } finally {
        setIsSaving(
          false
        );
      }
    };

  // =====================================================
  // AGE
  // =====================================================

  const calculateAge =
    (
      birthdayString:
        string
    ) => {
      if (
        !birthdayString
      ) {
        return "-";
      }

      const today =
        new Date();

      const birthDate =
        new Date(
          birthdayString
        );

      let age =
        today.getFullYear() -
        birthDate.getFullYear();

      const monthDifference =
        today.getMonth() -
        birthDate.getMonth();

      if (
        monthDifference <
          0 ||
        (monthDifference ===
          0 &&
          today.getDate() <
            birthDate.getDate())
      ) {
        age--;
      }

      return age;
    };

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-xs font-semibold text-slate-500">
            กำลังโหลดข้อมูลประวัติส่วนตัว...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={
        handleSave
      }
      className="flex flex-col gap-6 pb-10"
    >
      {/* PROFILE IMAGE */}

      <div className="flex flex-col gap-3">
        <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
          รูปถ่ายโปรไฟล์
        </h3>

        <div className="flex items-center gap-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="relative flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-200 shadow-inner">
            {store.profileImage ? (
              <img
                src={
                  store.profileImage
                }
                alt="Profile Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <FaUserCircle className="text-5xl text-slate-400" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex w-max cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 shadow-sm transition-colors hover:bg-blue-100">
              <FaCamera className="text-sm" />

              อัปโหลดรูปภาพใหม่

              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={
                  handleImageUpload
                }
              />
            </label>

            {store.profileImage && (
              <button
                type="button"
                onClick={
                  handleRemoveImage
                }
                className="flex w-max items-center gap-1 text-left text-xs font-semibold text-red-500 hover:text-red-700"
              >
                <FaTrash className="text-[10px]" />

                ลบรูปภาพ
              </button>
            )}

            <span className="mt-1 text-[10px] leading-relaxed text-slate-400">
              JPG, PNG ขนาดไม่เกิน 5MB
            </span>
          </div>
        </div>
      </div>

      {/* 1 BASIC */}

      <div className="flex flex-col gap-3">
        <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
          1. ข้อมูลพื้นฐาน
        </h3>

        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              ชื่อจริง

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              type="text"
              value={
                store.firstName
              }
              onChange={(
                event
              ) =>
                store.setProfile(
                  "firstName",
                  event.target
                    .value
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              นามสกุล

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              type="text"
              value={
                store.lastName
              }
              onChange={(
                event
              ) =>
                store.setProfile(
                  "lastName",
                  event.target
                    .value
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              ชื่อเล่น
            </label>

            <input
              type="text"
              value={
                store.nickname
              }
              onChange={(
                event
              ) =>
                store.setProfile(
                  "nickname",
                  event.target
                    .value
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                วันเกิด
              </label>

              <input
                type="date"
                value={
                  store.birthday
                }
                onChange={(
                  event
                ) =>
                  store.setProfile(
                    "birthday",
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                อายุ (ปี)
              </label>

              <div className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-center text-sm font-bold text-slate-500">
                {calculateAge(
                  store.birthday
                )}
              </div>
            </div>
          </div>

          <div className="col-span-2 grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                สัญชาติ
              </label>

              <input
                type="text"
                value={
                  store.nationality
                }
                onChange={(
                  event
                ) =>
                  store.setProfile(
                    "nationality",
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                เชื้อชาติ
              </label>

              <input
                type="text"
                value={
                  store.ethnicity
                }
                onChange={(
                  event
                ) =>
                  store.setProfile(
                    "ethnicity",
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                ศาสนา
              </label>

              <input
                type="text"
                value={
                  store.religion
                }
                onChange={(
                  event
                ) =>
                  store.setProfile(
                    "religion",
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2 EDUCATION */}

      <div className="flex flex-col gap-3">
        <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
          2. ข้อมูลการศึกษา
          (แสดงบนหน้าประวัติ)
        </h3>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              ชื่อโรงเรียนปัจจุบัน
            </label>

            <input
              type="text"
              value={
                store.school
              }
              onChange={(
                event
              ) =>
                store.setProfile(
                  "school",
                  event.target
                    .value
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                แผนการเรียน
              </label>

              <input
                type="text"
                value={
                  store.plan
                }
                onChange={(
                  event
                ) =>
                  store.setProfile(
                    "plan",
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                เกรดเฉลี่ยสะสม
                (GPAX)
              </label>

              <input
                type="number"
                step="0.01"
                value={
                  store.gpax
                }
                onChange={(
                  event
                ) =>
                  store.setProfile(
                    "gpax",
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3 CONTACT */}

      <div className="flex flex-col gap-3">
        <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
          3. ข้อมูลการติดต่อ
        </h3>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <FaPhone className="text-slate-400" />

                เบอร์โทรศัพท์
              </label>

              <input
                type="tel"
                value={
                  store.phone
                }
                onChange={(
                  event
                ) =>
                  store.setProfile(
                    "phone",
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <FaEnvelope className="text-slate-400" />

                อีเมล
              </label>

              <input
                type="email"
                value={
                  store.email
                }
                onChange={(
                  event
                ) =>
                  store.setProfile(
                    "email",
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <FaMapMarkerAlt className="text-slate-400" />

              ที่อยู่ปัจจุบัน
            </label>

            <textarea
              value={
                store.address
              }
              onChange={(
                event
              ) =>
                store.setProfile(
                  "address",
                  event.target
                    .value
                )
              }
              rows={2}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* SOCIAL */}

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              ช่องทางการติดต่ออื่นๆ
              (Social Media)
            </label>

            {store.socials.map(
              (
                social
              ) => (
                <div
                  key={
                    social.id
                  }
                  className="flex overflow-hidden rounded-md border border-slate-300 bg-white transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                >
                  <div className="flex items-center justify-center border-r border-slate-300 bg-slate-100 px-3">
                    {renderSocialIcon(
                      social.platform
                    )}
                  </div>

                  <select
                    value={
                      social.platform
                    }
                    onChange={(
                      event
                    ) =>
                      store.updateSocial(
                        social.id,
                        "platform",
                        event.target
                          .value
                      )
                    }
                    className="w-28 cursor-pointer border-r border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 outline-none"
                  >
                    <option value="facebook">
                      Facebook
                    </option>

                    <option value="line">
                      Line ID
                    </option>

                    <option value="instagram">
                      Instagram
                    </option>
                  </select>

                  <input
                    type="text"
                    value={
                      social.link
                    }
                    onChange={(
                      event
                    ) =>
                      store.updateSocial(
                        social.id,
                        "link",
                        event.target
                          .value
                      )
                    }
                    className="w-full px-3 py-2 text-sm outline-none"
                  />

                  {store.socials.length >
                    1 && (
                    <button
                      type="button"
                      onClick={() =>
                        store.removeSocial(
                          social.id
                        )
                      }
                      className="border-l border-slate-300 px-3 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              )
            )}

            <button
              type="button"
              onClick={
                store.addSocial
              }
              className="mt-1 flex w-max items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <FaPlus />

              กดเพิ่มช่องทาง
            </button>
          </div>
        </div>
      </div>

      {/* 4 ADDITIONAL */}

      <div className="flex flex-col gap-3">
        <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
          4. ข้อมูลเพิ่มเติม{" "}

          <span className="text-xs font-normal text-slate-400">
            (เว้นว่างเพื่อซ่อนได้)
          </span>
        </h3>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              ความสามารถพิเศษ
              (Skills)
            </label>

            <input
              type="text"
              value={
                store.skills
              }
              onChange={(
                event
              ) =>
                store.setProfile(
                  "skills",
                  event.target
                    .value
                )
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              คติประจำใจ
              (Motto)
            </label>

            <input
              type="text"
              value={
                store.motto
              }
              onChange={(
                event
              ) =>
                store.setProfile(
                  "motto",
                  event.target
                    .value
                )
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* CUSTOM FIELDS */}

          {store.customFields.map(
            (
              field
            ) => (
              <div
                key={
                  field.id
                }
                className="group relative flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() =>
                    store.removeCustomField(
                      field.id
                    )
                  }
                  className="absolute right-2 top-2 rounded p-1 text-xs text-slate-400 transition-colors hover:text-red-500"
                  title="ลบหัวข้อนี้"
                >
                  <FaTrash />
                </button>

                <div className="grid grid-cols-3 gap-2 pr-6">
                  <div className="col-span-1">
                    <label className="mb-0.5 block text-[10px] font-bold text-blue-500">
                      ชื่อหัวข้อ
                    </label>

                    <input
                      type="text"
                      value={
                        field.title
                      }
                      onChange={(
                        event
                      ) =>
                        store.updateCustomField(
                          field.id,
                          "title",
                          event.target
                            .value
                        )
                      }
                      placeholder="เช่น ภาษา"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">
                      รายละเอียด
                    </label>

                    <input
                      type="text"
                      value={
                        field.value
                      }
                      onChange={(
                        event
                      ) =>
                        store.updateCustomField(
                          field.id,
                          "value",
                          event.target
                            .value
                        )
                      }
                      placeholder="เช่น ไทย, อังกฤษ"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )
          )}

          <button
            type="button"
            onClick={
              store.addCustomField
            }
            className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 bg-white px-4 py-2.5 text-xs font-bold text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
          >
            <FaFolderPlus className="text-sm" />

            + เพิ่มหัวข้อข้อมูลของตัวเอง
          </button>
        </div>
      </div>

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-600">
          {errorMessage}
        </div>
      )}

      {/* SUCCESS */}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-700">
          {successMessage}
        </div>
      )}

      {/* SAVE */}

      <button
        type="submit"
        disabled={
          isSaving
        }
        className="mt-2 rounded-lg bg-slate-800 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving
          ? "กำลังบันทึก..."
          : "💾 บันทึกข้อมูลประวัติส่วนตัว"}
      </button>
    </form>
  );
}