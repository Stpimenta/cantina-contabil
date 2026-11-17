import { redirect } from "next/navigation";
// Preserve existing bookmarks while keeping a single sign-in entry point.
export default function ActivatePage() {
  redirect("/login");
}
