import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            }
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  /*
    ใช้ getUser() เพราะ Supabase จะตรวจสอบ
    session กับ Auth server จริง
  */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const protectedRoutes = [
    "/dashboard",
    "/editor",
  ];

  const authRoutes = [
    "/login",
    "/register",
  ];

  const isProtectedRoute =
    protectedRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

  const isAuthRoute =
    authRoutes.includes(pathname);

  /*
    กรณีที่ 1:
    ยังไม่ได้ Login
    แต่พยายามเข้า Dashboard / Editor
  */
  if (!user && isProtectedRoute) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    /*
      จำหน้าที่ผู้ใช้พยายามเข้าเอาไว้
      เพื่ออนาคตเราจะ redirect กลับมาได้
    */
    loginUrl.searchParams.set(
      "next",
      pathname
    );

    const redirectResponse =
      NextResponse.redirect(loginUrl);

    response.cookies
      .getAll()
      .forEach((cookie) => {
        redirectResponse.cookies.set(
          cookie.name,
          cookie.value
        );
      });

    return redirectResponse;
  }

  /*
    กรณีที่ 2:
    Login อยู่แล้ว
    แต่พยายามเข้า Login/Register
  */
  if (user && isAuthRoute) {
    const dashboardUrl =
      request.nextUrl.clone();

    dashboardUrl.pathname =
      "/dashboard";

    dashboardUrl.search = "";

    const redirectResponse =
      NextResponse.redirect(
        dashboardUrl
      );

    response.cookies
      .getAll()
      .forEach((cookie) => {
        redirectResponse.cookies.set(
          cookie.name,
          cookie.value
        );
      });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
      ไม่ต้องรัน middleware กับ
      Next static files / รูปภาพ / favicon
    */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};