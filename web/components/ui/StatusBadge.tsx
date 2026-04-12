interface StatusBadgeProps {
  isVerified: boolean;
  isSuspended: boolean;
}

export default function StatusBadge({ isVerified, isSuspended }: StatusBadgeProps) {
  if (isSuspended) {
    return (
      <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Suspended
      </span>
    );
  }
  if (isVerified) {
    return (
      <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        Verified
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
      Pending
    </span>
  );
}
