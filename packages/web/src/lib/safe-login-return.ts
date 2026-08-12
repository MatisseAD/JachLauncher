/** Only the admin application may request a post-login route override. */
export function safeLoginReturn(value: string | null | undefined): string {
  return value === "/admin" ? "/admin" : "/dashboard";
}
