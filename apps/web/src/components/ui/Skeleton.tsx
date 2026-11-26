// Shimmering placeholder shaped like the content that's loading.
const Skeleton = ({ className = '' }: { className?: string }) => (
    <div aria-hidden="true" className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-700/60 ${className}`} />
);

export default Skeleton;
