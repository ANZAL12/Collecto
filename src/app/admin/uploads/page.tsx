import { redirect } from "next/navigation";

export default function AdminUploadsRedirect() {
  redirect("/admin/dashboard");
}
