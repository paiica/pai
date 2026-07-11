"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

// Delete a prep-course enrollment — shared by the admin Courses "Enrollments"
// tab (compact icon button, table row) and the Students profile page
// (labeled button, card) so there's one implementation of this mutation.
export function DeleteCourseEnrollmentButton({
  enrollmentId, studentName, courseName, token, onRefresh, variant = "labeled",
}: {
  enrollmentId: string;
  studentName: string;
  courseName: string;
  token: string;
  onRefresh: () => void;
  variant?: "icon" | "labeled";
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete ${studentName}'s enrollment in "${courseName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/courses/enrollments/${enrollmentId}`, token);
      toast.success("Enrollment deleted");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete enrollment");
    } finally {
      setDeleting(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        disabled={deleting}
        onClick={handleDelete}
        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-40"
        title="Delete enrollment"
      >
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    );
  }

  return (
    <button
      disabled={deleting}
      onClick={handleDelete}
      className="flex items-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
    >
      {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      Delete Enrollment
    </button>
  );
}
