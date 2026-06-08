export default function TagChip({ name, small = false }) {
  return (
    <span
      className={`tag-rgb inline-block ${small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2.5 py-1"} uppercase tracking-widest`}
      style={{ clipPath: "polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)" }}
      data-testid={`tag-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {name}
    </span>
  );
}
