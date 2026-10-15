"use client";
import CropInput from "@/components/images/CropInput";

import { useEditorSession } from "@/components/editor/EditorSession";
import { errorMessage as getErrorMessage } from "@/lib/errors";

import {
  useEffect,
  useRef,
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

const inputClassName = "min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 sm:text-sm";
const labelClassName = "mb-2 block text-sm font-semibold leading-5 text-slate-700";

export default function ProfileForm({
  onNext,
  active = true,
}: {
  onNext: () => void;
  active?: boolean;
}) {
  const { reportLoaded, markSaved, status, exporting } = useEditorSession();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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

  useEffect(() => {
    const url = store.profileImage;
    return () => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); };
  }, [store.profileImage]);

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
    const store = useProfileStore.getState();
    let cancelled = false;
    let loadSucceeded = true;
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

          if (cancelled) return;
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
          error: unknown
        ) {
          if (cancelled) return;
          loadSucceeded = false;
          console.error(
            "Load profile error:",
            error
          );

          setErrorMessage(
            getErrorMessage(error) ||
              "ไม่สามารถโหลดข้อมูลประวัติส่วนตัวได้"
          );
        } finally {
          if (!cancelled) {
            reportLoaded("profile", loadSucceeded);
          setIsLoading(
            false
          );
        }
          }
      };

    loadProfile();
    return () => { cancelled = true; };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId, reportLoaded]);

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

      if (!mounted.current) return;
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

        markSaved("profile");
      setSuccessMessage(
          "บันทึกข้อมูลประวัติส่วนตัวเรียบร้อยแล้ว"
        );

        onNext();
      } catch (
        error: unknown
      ) {
        console.error(
          "Save profile error:",
          error
        );

        setErrorMessage(
          getErrorMessage(error) ||
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
      className="@container flex min-w-0 flex-col gap-5 pb-6"
    >
      <fieldset disabled={exporting || isSaving || isLoading || status.profile === "error"} className="contents">
      {/* PROFILE IMAGE */}

      <div className="flex flex-col gap-3">
        <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-bold text-slate-800">
          รูปถ่ายโปรไฟล์
        </h3>

        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
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

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label className="flex min-h-11 w-fit max-w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100 focus-within:ring-2 focus-within:ring-blue-500">
              <FaCamera className="text-sm" />

              อัปโหลดรูปภาพใหม่

              <CropInput active={active}
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
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
                className="flex min-h-11 w-fit items-center gap-2 rounded-md px-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                <FaTrash className="text-[10px]" />

                ลบรูปภาพ
              </button>
            )}

            <span className="text-xs leading-5 text-slate-500">
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

        <div className="grid min-w-0 grid-cols-1 gap-5 rounded-xl border border-slate-100 bg-slate-50 p-4 @min-[24rem]:grid-cols-2">
          <div>
            <label htmlFor="profile-firstName" className={labelClassName}>
              ชื่อจริง

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              id="profile-firstName"
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
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label htmlFor="profile-lastName" className={labelClassName}>
              นามสกุล

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              id="profile-lastName"
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
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label htmlFor="profile-nickname" className={labelClassName}>
              ชื่อเล่น
            </label>

            <input
              id="profile-nickname"
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
              className={inputClassName}
            />
          </div>

          <div className="col-span-full grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
            <div>
              <label htmlFor="profile-birthday" className={labelClassName}>
                วันเกิด
              </label>

              <input
                id="profile-birthday"
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
                className={inputClassName}
              />
            </div>

            <div>
              <p id="profile-age-label" className={labelClassName}>
                อายุ (ปี)
              </p>

              <output aria-labelledby="profile-age-label" className="flex min-h-11 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-base font-semibold text-slate-600 sm:text-sm">
                {calculateAge(
                  store.birthday
                )}
              </output>
            </div>
          </div>

          <div className="col-span-full grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
            <div>
              <label htmlFor="profile-nationality" className={labelClassName}>
                สัญชาติ
              </label>

              <input
                id="profile-nationality"
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
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="profile-ethnicity" className={labelClassName}>
                เชื้อชาติ
              </label>

              <input
                id="profile-ethnicity"
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
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="profile-religion" className={labelClassName}>
                ศาสนา
              </label>

              <input
                id="profile-religion"
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
                className={inputClassName}
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

        <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <label htmlFor="profile-school" className={labelClassName}>
              ชื่อโรงเรียนปัจจุบัน
            </label>

            <input
              id="profile-school"
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
              className={inputClassName}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
            <div>
              <label htmlFor="profile-plan" className={labelClassName}>
                แผนการเรียน
              </label>

              <input
                id="profile-plan"
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
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="profile-gpax" className={labelClassName}>
                เกรดเฉลี่ยสะสม
                (GPAX)
              </label>

              <input
                id="profile-gpax"
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
                className={inputClassName}
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

        <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
            <div>
              <label htmlFor="profile-phone" className={`${labelClassName} flex items-center gap-2`}>
                <FaPhone className="text-slate-400" />

                เบอร์โทรศัพท์
              </label>

              <input
                id="profile-phone"
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
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="profile-email" className={`${labelClassName} flex items-center gap-2`}>
                <FaEnvelope className="text-slate-400" />

                อีเมล
              </label>

              <input
                id="profile-email"
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
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-address" className={`${labelClassName} flex items-center gap-2`}>
              <FaMapMarkerAlt className="text-slate-400" />

              ที่อยู่ปัจจุบัน
            </label>

            <textarea
              id="profile-address"
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
              className={`${inputClassName} min-h-24 resize-y leading-7`}
            />
          </div>

          {/* SOCIAL */}

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
            <p className={labelClassName}>
              ช่องทางการติดต่ออื่นๆ
              (Social Media)
            </p>

            {store.socials.map(
              (
                social, index
              ) => (
                <div
                  key={
                    social.id
                  }
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-md border border-slate-300 bg-white transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
                >
                  <div className="flex items-center justify-center border-r border-slate-300 bg-slate-100 px-3">
                    {renderSocialIcon(
                      social.platform
                    )}
                  </div>

                  <select
                    aria-label={`แพลตฟอร์มช่องทางติดต่อ ${index + 1}`}
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
                    className={`${store.socials.length > 1 ? "col-span-1" : "col-span-2"} min-h-11 min-w-0 cursor-pointer bg-slate-50 px-3 py-2 text-base text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:text-sm`}
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
                    aria-label={`ข้อมูลช่องทางติดต่อ ${index + 1}`}
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
                    className="col-span-full row-start-2 min-h-11 w-full min-w-0 border-t border-slate-300 px-3 py-2 text-base text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:text-sm"
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
                      aria-label={`ลบช่องทางติดต่อ ${index + 1}`}
                      className="col-start-3 row-start-1 flex min-h-11 min-w-11 items-center justify-center border-l border-slate-300 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
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
              className="flex min-h-11 w-fit max-w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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

        <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <label htmlFor="profile-skills" className={labelClassName}>
              ความสามารถพิเศษ
              (Skills)
            </label>

            <input
              id="profile-skills"
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
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="profile-motto" className={labelClassName}>
              คติประจำใจ
              (Motto)
            </label>

            <input
              id="profile-motto"
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
              className={inputClassName}
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
                className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    store.removeCustomField(
                      field.id
                    )
                  }
                  aria-label="ลบหัวข้อนี้"
                  className="flex min-h-11 min-w-11 items-center justify-center self-end rounded-md text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  title="ลบหัวข้อนี้"
                >
                  <FaTrash />
                </button>

                <div className="grid min-w-0 grid-cols-1 gap-5 @min-[24rem]:grid-cols-2">
                  <div className="min-w-0">
                    <label htmlFor={`profile-custom-title-${field.id}`} className={labelClassName}>
                      ชื่อหัวข้อ
                    </label>

                    <input
                      id={`profile-custom-title-${field.id}`}
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
                      className={inputClassName}
                    />
                  </div>

                  <div className="min-w-0">
                    <label htmlFor={`profile-custom-value-${field.id}`} className={labelClassName}>
                      รายละเอียด
                    </label>

                    <input
                      id={`profile-custom-value-${field.id}`}
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
                      className={inputClassName}
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
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <FaFolderPlus className="text-sm" />

            + เพิ่มหัวข้อข้อมูลของตัวเอง
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <p className="text-sm leading-6 text-slate-600">
          กดบันทึกเพื่อเก็บประวัติส่วนตัวและไปเลือกประวัติการศึกษา
        </p>

        {/* ERROR */}

        {errorMessage && (
          <div role="alert" className="break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
            {errorMessage}
          </div>
        )}

        {/* SUCCESS */}

        {successMessage && (
          <div role="status" className="break-words rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700">
            {successMessage}
          </div>
        )}

        {/* SAVE */}

        <button
          type="submit"
          disabled={
            isSaving
          }
          aria-busy={isSaving}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? "กำลังบันทึก..."
            : "บันทึกและไปหน้าถัดไป"}
        </button>
      </div>
      </fieldset>
    </form>
  );
}